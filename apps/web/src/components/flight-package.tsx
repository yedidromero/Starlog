"use client";

import { usePollar } from "@pollar/react";
import { useEffect, useState } from "react";
import { post } from "@/lib/api";
import { confirmWithRetry, payErrorMessage } from "@/lib/bookings";
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
  // Flight-only bookings can be paid in the stablecoin matching the fare; with the
  // ticket included, the event's currency applies.
  const [flightPayWith, setFlightPayWith] = useState<PayWith>("EURC");
  // Travelers who already hold a ticket for this event only need the flight.
  const [hasTicket, setHasTicket] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    fetch("/api/me/tickets")
      .then((res) => (res.ok ? res.json() : []))
      .then((tickets: { eventId: number }[]) => {
        const owned = tickets.some((t) => Number(t.eventId) === event.id);
        setHasTicket(owned);
        if (owned) setWithTicket(false);
      });
  }, [open, event]);
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
        payWith,
        eventId: withTicket && event ? event.id : undefined,
        passenger: pax,
      });
      let fundHash: string | undefined;
      if (started.fundXdr) {
        setBusy(`Confirma en Pollar el pago de ${formatAmount(BigInt(started.price.amount))} ${payWith}…`);
        const outcome = await signAndSubmitTx(started.fundXdr);
        if (outcome.status !== "success" && outcome.status !== "pending") {
          console.warn("Pollar did not send the payment", outcome);
          throw new Error(payErrorMessage(outcome));
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

  const payWith = withTicket && event ? event.currency : flightPayWith;
  // Adults only (18+); the server re-checks against the actual flight date.
  const adultCutoff = new Date();
  adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
  const latestBirthDate = adultCutoff.toISOString().slice(0, 10);
  const stablecoin = chosen?.totalCurrency === "USD" ? "USDC" : "EURC";

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
          <select aria-label="Payment currency" value={flightPayWith} onChange={(e) => setFlightPayWith(e.target.value as PayWith)} className={input}>
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
                    if (flightPayWith !== "XLM") setFlightPayWith(o.totalCurrency === "USD" ? "USDC" : "EURC");
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
            <label className="flex flex-col gap-0.5 text-xs opacity-80 col-span-2 sm:col-span-1">
              Fecha de nacimiento del pasajero
              <input
                className={`${input} opacity-100`}
                type="date"
                max={latestBirthDate}
                value={pax.bornOn}
                onChange={(e) => setPax({ ...pax, bornOn: e.target.value })}
                required
              />
            </label>
            <input className={input} type="email" placeholder="Email" value={pax.email} onChange={(e) => setPax({ ...pax, email: e.target.value })} required />
            <input className={input} placeholder="Phone (+34…)" value={pax.phoneNumber} onChange={(e) => setPax({ ...pax, phoneNumber: e.target.value.replace(/\s/g, "") })} required />
          </div>
          {hasTicket && event && <p className="opacity-70">Ya tienes ticket para este evento: reservas solo el vuelo.</p>}
          {event?.ticketPrice && !hasTicket && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={withTicket} onChange={(e) => setWithTicket(e.target.checked)} />
              Include the {event.title} ticket ({formatAmount(BigInt(event.ticketPrice))} {event.currency})
            </label>
          )}
          {!withTicket && (
            <label className="flex items-center gap-2">
              Pagar en
              <select className={input} value={flightPayWith} onChange={(e) => setFlightPayWith(e.target.value as PayWith)}>
                <option value={stablecoin}>{stablecoin}</option>
                <option value="XLM">XLM (demo)</option>
              </select>
            </label>
          )}
          <button disabled={busy !== null} className="self-start rounded-full bg-foreground text-background px-4 h-9 font-medium disabled:opacity-40">
            Reservar {withTicket ? "vuelo + ticket" : "vuelo"} · pagar en {payWith}
          </button>
        </form>
      )}

      {busy && <p className="opacity-70">{busy}</p>}
      {error && <p className="text-red-600">{error}</p>}
      {done && <p className="text-green-700 dark:text-green-400">{done}</p>}
    </div>
  );
}
