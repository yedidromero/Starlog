"use client";

import { usePollar } from "@pollar/react";
import { useEffect, useState } from "react";
import { ApiError, post } from "@/lib/api";
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

type Purchase = { busy: boolean; message?: string; error?: string; errorCode?: string };

/** Upcoming events with a "buy ticket" flow: reserve, pay with Pollar, confirm. */
export function EventsList({ signedIn, id, className }: { signedIn: boolean; id?: string; className?: string }) {
  const { signAndSubmitTx, wallet, openLoginModal } = usePollar();
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
        track(event.id, { busy: true, message: "Approve the payment in Pollar…" });
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
      track(event.id, {
        busy: false,
        error: err instanceof Error ? err.message : String(err),
        errorCode: err instanceof ApiError ? err.code : undefined,
      });
    }
  }

  if (events === null) return <p className="text-sm opacity-70">Loading events…</p>;

  return (
    <section id={id} className={className ?? "event-list"}>
      {events.length === 0 && <p className="event-list-empty">There are no upcoming events.</p>}

      {events.map((event) => {
        const purchase = purchases[event.id];
        return (
          <article key={event.id} className="event-card">
            <h2 className="event-card-title">{event.title}</h2>
            <p className="event-card-meta">
              {new Date(event.startsAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} ·{" "}
              {[event.venue, event.city].filter(Boolean).join(", ")}
            </p>
            {event.description && <p className="event-card-description">{event.description}</p>}
            {event.ticketPrice && (
              <div className="event-card-purchase">
                <span className="event-card-price">
                  {formatAmount(BigInt(event.ticketPrice))} {event.currency}
                </span>
                <button
                  onClick={() => signedIn ? buy(event) : openLoginModal()}
                  disabled={purchase?.busy}
                  className="event-card-buy"
                >
                  {purchase?.busy ? "Waiting for Pollar…" : signedIn ? `Buy with ${event.currency} via Pollar` : "Sign in with Pollar to buy"}
                </button>
              </div>
            )}
            {purchase?.message && <p className="event-purchase-result">{purchase.message}</p>}
            {purchase?.error && (
              <div className="event-purchase-error" role="alert">
                <p>{purchase.error}</p>
                {purchase.errorCode === "wallet_not_activated" && wallet?.address && (
                  <div className="event-purchase-recovery">
                    <a
                      href={`https://friendbot.stellar.org/?addr=${encodeURIComponent(wallet.address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Activate wallet on Stellar Testnet
                    </a>
                    <button onClick={() => buy(event)} disabled={purchase.busy} className="event-purchase-retry">
                      Retry purchase
                    </button>
                  </div>
                )}
              </div>
            )}
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
