"use client";

import { usePollar } from "@pollar/react";
import { useEffect, useState } from "react";
import { post } from "@/lib/api";
import { confirmWithRetry } from "@/lib/bookings";
import { formatAmount } from "@/server/pricing";
import { FlightPackage } from "./flight-package";

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  venue: string | null;
  city: string;
  airport: string | null;
  startsAt: string;
  ticketPrice: string | null;
  currency: string;
};

type Started = {
  bookingId: number;
  /** Null when the booking was already paid and only needs confirming. */
  fundXdr: string | null;
  alreadyPaid: boolean;
  price: { amount: string; discount: string };
};

type Purchase = { busy: boolean; message?: string; error?: string };

/** Upcoming events with a "buy ticket" flow: reserve, pay with Pollar, confirm. */
export function EventsList({ signedIn }: { signedIn: boolean }) {
  const { signAndSubmitTx } = usePollar();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [purchases, setPurchases] = useState<Record<number, Purchase>>({});

  useEffect(() => {
    fetch("/api/events")
      .then((res) => (res.ok ? res.json() : []))
      .then(setEvents);
  }, []);

  const track = (id: number, p: Purchase) => setPurchases((all) => ({ ...all, [id]: p }));

  async function buy(event: EventItem) {
    track(event.id, { busy: true, message: "Creating your secure booking…" });
    try {
      const started = await post<Started>("/api/bookings", { eventId: event.id });

      let fundHash: string | undefined;
      if (started.fundXdr) {
        track(event.id, { busy: true, message: "Confirma el pago en Pollar…" });
        const outcome = await signAndSubmitTx(started.fundXdr);
        if (outcome.status !== "success" && outcome.status !== "pending") {
          const detail = "details" in outcome ? outcome.details : undefined;
          throw new Error(`Pollar did not submit the payment (${outcome.status}${detail ? `: ${detail}` : ""})`);
        }
        fundHash = outcome.hash;
      }

      track(event.id, { busy: true, message: "Payment received. Confirming your booking…" });
      const confirmed = await confirmWithRetry(started.bookingId, fundHash);
      const saved = BigInt(started.price.discount) > BigInt(0)
        ? ` You saved ${formatAmount(BigInt(started.price.discount))} ${event.currency} with your member level.`
        : "";
      track(event.id, {
        busy: false,
        message: `Done! Booking #${confirmed.bookingId} is confirmed and your ticket is ready.${saved}`,
      });
    } catch (err) {
      track(event.id, { busy: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (events === null) return <p className="text-sm opacity-70">Loading events…</p>;

  return (
    <section id="viajes" className="w-full max-w-xl flex flex-col gap-4">
      {events.length === 0 && <p className="text-sm opacity-70">There are no upcoming events.</p>}

      {events.map((event) => {
        const purchase = purchases[event.id];
        return (
          <article key={event.id} className="rounded-xl border border-black/10 dark:border-white/15 p-4 flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <p className="text-sm opacity-70">
              {new Date(event.startsAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} ·{" "}
              {[event.venue, event.city].filter(Boolean).join(", ")}
            </p>
            {event.description && <p className="text-sm">{event.description}</p>}
            {event.ticketPrice && (
              <div className="flex items-center gap-3 mt-1">
                <span className="font-medium">
                  {formatAmount(BigInt(event.ticketPrice))} {event.currency}
                </span>
                <button
                  onClick={() => buy(event)}
                  disabled={!signedIn || purchase?.busy}
                  className="rounded-full bg-foreground text-background px-4 h-9 text-sm font-medium disabled:opacity-40"
                >
                  {signedIn ? "Buy ticket" : "Sign in to book"}
                </button>
              </div>
            )}
            {purchase?.message && <p className="text-sm">{purchase.message}</p>}
            {purchase?.error && <p className="text-sm text-red-600">{purchase.error}</p>}
            {signedIn && event.airport && (
              <FlightPackage
                event={event}
              />
            )}
          </article>
        );
      })}
    </section>
  );
}
