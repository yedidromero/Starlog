import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Session } from "./auth/session";
import { db, schema } from "./db";
import * as duffel from "./duffel";
import { env } from "./env";
import { formatAmount } from "./pricing";

type ItineraryLeg = {
  origin: string;
  destination: string;
  departingAt: string;
  arrivingAt: string;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function itinerary(value: unknown): ItineraryLeg[] {
  const raw = object(value).itinerary;
  if (!Array.isArray(raw)) return [];
  return raw.filter((leg): leg is ItineraryLeg => {
    const item = object(leg);
    return typeof item.origin === "string" && typeof item.destination === "string" &&
      typeof item.departingAt === "string" && typeof item.arrivingAt === "string";
  });
}

function bookingReference(value: unknown): string | null {
  const order = object(object(value).order);
  return typeof order.bookingReference === "string" ? order.bookingReference : null;
}

/** The signed-in traveler's bookings, with flight/event details from their saved quote. */
export async function myBookings(session: Session) {
  const { bookings, events, quotes } = schema;
  const rows = await db()
    .select({
      id: bookings.id,
      kind: bookings.kind,
      currency: bookings.currency,
      amount: bookings.amount,
      status: bookings.status,
      createdAt: bookings.createdAt,
      returnDate: bookings.returnDate,
      duffelOrderId: bookings.duffelOrderId,
      quoteItems: quotes.items,
      eventTitle: events.title,
      eventCity: events.city,
      eventCountry: events.country,
      eventStartsAt: events.startsAt,
    })
    .from(bookings)
    .innerJoin(quotes, eq(bookings.quoteId, quotes.id))
    .leftJoin(events, eq(bookings.eventId, events.id))
    .where(eq(bookings.userId, session.userId))
    .orderBy(desc(bookings.createdAt));

  const accountBookings = await Promise.all(rows.map(async (row, index) => {
    let legs = itinerary(row.quoteItems);
    let liveBookingReference = bookingReference(row.quoteItems);
    // Older quotes did not persist the route. Hydrate only the 10 most recent such
    // orders from Duffel; a supplier outage never hides the Starlog booking itself.
    if (!legs.length && row.duffelOrderId && index < 10) {
      try {
        const order = await duffel.getOrderItinerary(row.duffelOrderId);
        legs = order.itinerary;
        liveBookingReference = liveBookingReference ?? order.bookingReference;
      } catch {
        // Keep the local booking history available if Duffel is temporarily unreachable.
      }
    }
    const outbound = legs[0];
    const returning = legs[1];
    return {
      id: row.id,
      kind: row.kind,
      currency: row.currency,
      amount: formatAmount(BigInt(row.amount)),
      status: row.status,
      createdAt: row.createdAt,
      destination: outbound?.destination ?? row.eventCity,
      origin: outbound?.origin ?? null,
      departureAt: outbound?.departingAt ?? row.eventStartsAt,
      returnAt: returning?.departingAt ?? row.returnDate,
      eventTitle: row.eventTitle,
      eventCity: row.eventCity,
      eventCountry: row.eventCountry,
      airlineBookingReference: liveBookingReference,
      hasDuffelOrder: Boolean(row.duffelOrderId),
    };
  }));

  return {
    bookings: accountBookings,
    // Sample profile history is only enabled on Stellar testnet and only for an
    // account with no real bookings. It is never written to the database or chain.
    demoMode: accountBookings.length === 0 && env().STELLAR_NETWORK_PASSPHRASE === "Test SDF Network ; September 2015",
  };
}
