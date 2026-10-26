"use client";

import { usePollar } from "@pollar/react";
import { useState } from "react";
import { post } from "@/lib/api";
import { confirmWithRetry } from "@/lib/bookings";
import { formatAmount } from "@/server/pricing";

type Offer = {
  id: string;
  totalAmount: string;
  totalCurrency: string;
  airline: string;
  slices: { segments: { from: string; to: string; departingAt: string; arrivingAt: string; carrier: string; flight: string }[] }[];
};

type EventInfo = { id: number; title: string; airport: string | null; startsAt: string; currency: string; ticketPrice: string | null };
type PayWith = "EURC" | "USDC" | "XLM";

type Started = {
  bookingId: number;
  fundXdr: string | null;
  price: { amount: string; discount: string };
};

const compactInput = "rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 h-9 text-sm";
const time = (iso: string) => iso.slice(11, 16);

/** "Add a flight": search Duffel, pick an offer, enter the passenger, pay with Pollar. */
export function FlightPackage({ event, onBooked, profileSearch = false, openByDefault = false }: { event?: EventInfo; onBooked?: () => void; profileSearch?: boolean; openByDefault?: boolean }) {
  const { signAndSubmitTx } = usePollar();
  const input = profileSearch
    ? "rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-4 h-12 text-base"
    : compactInput;
  const dayBefore = event ? new Date(new Date(event.startsAt).getTime() - 86_400_000).toISOString().slice(0, 10) : "";
  const [open, setOpen] = useState(openByDefault);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState(event?.airport ?? "");
  const [date, setDate] = useState(dayBefore);
  const [withTicket, setWithTicket] = useState(Boolean(event?.ticketPrice));
  const [payWith, setPayWith] = useState<PayWith>((event?.currency as PayWith) ?? "EURC");
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [chosen, setChosen] = useState<Offer | null>(null);
  const [pax, setPax] = useState({ title: "ms", gender: "f", givenName: "", familyName: "", bornOn: "", email: "", phoneNumber: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOffers(null);
    setChosen(null);
    setBusy("Searching flights…");
    try {
      setOffers(await post<Offer[]>("/api/flights/search", { origin, destination: event?.airport ?? destination, departureDate: date }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    setError(null);
    try {
      setBusy("Creating your secure booking…");
      const started = await post<Started>("/api/bookings/package", {
        offerId: chosen.id,
        payWith: event?.currency ?? payWith,
        eventId: withTicket && event ? event.id : undefined,
        passenger: pax,
      });
      let fundHash: string | undefined;
      if (started.fundXdr) {
        setBusy(`Confirm the ${formatAmount(BigInt(started.price.amount))} ${event?.currency ?? payWith} payment in your wallet…`);
        const outcome = await signAndSubmitTx(started.fundXdr);
        if (outcome.status !== "success" && outcome.status !== "pending") {
          const detail = "details" in outcome ? outcome.details : undefined;
          throw new Error(`Your wallet did not submit the payment (${outcome.status}${detail ? `: ${detail}` : ""})`);
        }
        fundHash = outcome.hash;
      }
      setBusy("Payment received. Booking your flight…");
      const confirmed = await confirmWithRetry<{ bookingReference: string | null }>(started.bookingId, fundHash);
      setDone(
        `Done! Booking #${started.bookingId} is confirmed. Airline reference: ${confirmed.bookingReference ?? "—"}` +
          (withTicket && event ? " · ticket issued." : "."),
      );
      setChosen(null);
      setOffers(null);
      onBooked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={profileSearch ? "account-button account-button-copper" : "self-start text-sm underline mt-1"}>
        {profileSearch ? <>SEARCH FLIGHTS <span aria-hidden="true">↗</span></> : <>✈ Add a flight to {event?.airport}</>}
      </button>
    );
  }

  return (
    <div className={`mt-2 rounded-lg bg-black/[.03] dark:bg-white/[.04] ${profileSearch ? "p-5 text-base" : "p-3 text-sm"} flex flex-col gap-3`}>
      {profileSearch && <p className="opacity-80">Find your flight and pay securely with crypto.</p>}
      <form onSubmit={search} className="flex flex-wrap items-center gap-2">
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value.toUpperCase().slice(0, 3))}
            placeholder={profileSearch ? "From (LIS)" : "Origin (LIS)"}
          aria-label="Origin airport code"
            className={`${input} ${profileSearch ? "w-36" : "w-28"} uppercase`}
          required
        />
        {profileSearch && (
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="To (MAD)"
            aria-label="Destination airport code"
            className={`${input} w-40 uppercase`}
            required
          />
        )}
        {!profileSearch && <span>→ {event?.airport}</span>}
        <input type="date" aria-label="Departure date" value={date} onChange={(e) => setDate(e.target.value)} className={input} required />
        {profileSearch && (
          <select aria-label="Payment currency" value={payWith} onChange={(e) => setPayWith(e.target.value as PayWith)} className={input}>
            <option value="EURC">Pay with EURC</option>
            <option value="USDC">Pay with USDC</option>
            <option value="XLM">Pay with XLM</option>
          </select>
        )}
        <button disabled={busy !== null || origin.length !== 3 || (profileSearch && destination.length !== 3)} className={`${profileSearch ? "rounded-full border px-5 h-12 text-base" : "rounded-full border px-3 h-9"} disabled:opacity-40`}>
          Search
        </button>
      </form>

      {offers && offers.length === 0 && <p className="opacity-70">No flights found for those dates.</p>}
      {offers && offers.length > 0 && !chosen && (
        <ul className="flex flex-col gap-2">
          {offers.map((o) => {
            const segs = o.slices[0].segments;
            return (
              <li key={o.id}>
                <button
                  onClick={() => {
                    setChosen(o);
                    if (profileSearch && payWith !== "XLM") {
                      setPayWith(o.totalCurrency === "USD" ? "USDC" : o.totalCurrency === "EUR" ? "EURC" : "XLM");
                    }
                  }}
                  className="w-full text-left rounded-lg border border-black/10 dark:border-white/15 p-2 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="font-medium">{segs.map((s) => s.carrier).join(" + ")}</span> · {time(segs[0].departingAt)} →{" "}
                  {time(segs.at(-1)!.arrivingAt)} · {segs.length === 1 ? "nonstop" : `${segs.length - 1} stop(s)`} ·{" "}
                  <span className="font-medium">
                    {o.totalAmount} {o.totalCurrency}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {chosen && (
        <form onSubmit={book} className="flex flex-col gap-2">
          <p>
            <span className="font-medium">{chosen.airline}</span> · {chosen.totalAmount} {chosen.totalCurrency} + service fee{" "}
            <button type="button" onClick={() => setChosen(null)} className="underline">
              change
            </button>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder="First name" value={pax.givenName} onChange={(e) => setPax({ ...pax, givenName: e.target.value })} required />
            <input className={input} placeholder="Last name" value={pax.familyName} onChange={(e) => setPax({ ...pax, familyName: e.target.value })} required />
            <select className={input} value={`${pax.title}/${pax.gender}`} onChange={(e) => { const [title, gender] = e.target.value.split("/"); setPax({ ...pax, title, gender }); }}>
              <option value="ms/f">Ms.</option>
              <option value="mr/m">Mr.</option>
            </select>
            <input className={input} type="date" title="Date of birth" value={pax.bornOn} onChange={(e) => setPax({ ...pax, bornOn: e.target.value })} required />
            <input className={input} type="email" placeholder="Email" value={pax.email} onChange={(e) => setPax({ ...pax, email: e.target.value })} required />
            <input className={input} placeholder="Phone (+34…)" value={pax.phoneNumber} onChange={(e) => setPax({ ...pax, phoneNumber: e.target.value.replace(/\s/g, "") })} required />
          </div>
          {event?.ticketPrice && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={withTicket} onChange={(e) => setWithTicket(e.target.checked)} />
              Include the {event.title} ticket ({formatAmount(BigInt(event.ticketPrice))} {event.currency})
            </label>
          )}
          <button disabled={busy !== null} className="self-start rounded-full bg-foreground text-background px-4 h-9 font-medium disabled:opacity-40">
            Book {withTicket && event ? "flight + ticket" : "flight"} · pay in {event?.currency ?? payWith}
          </button>
        </form>
      )}

      {busy && <p className="opacity-70">{busy}</p>}
      {error && <p className="text-red-600">{error}</p>}
      {done && <p className="text-green-700 dark:text-green-400">{done}</p>}
    </div>
  );
}
