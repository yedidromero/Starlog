// Demo data for testnet: one organizer, one XLM event, and the homepage's six
// sample trip cards as internal Starlog demo listings (not official venue tickets).
// Run from apps/web: node --env-file=.env.local scripts/seed-demo.mjs
// Safe to run again: existing rows are reused.
import postgres from "postgres";

// testOrganizer in deploy/testnet.json: receives the organizer's share on release.
const ORGANIZER_WALLET = "GAKMO2MGYQOR5ICOACHRB7MYBMSA6YO3H4MCULGD7HRKOSBGZNQ45NGJ";
const EVENT_TITLE = "Stellar Builders Night Madrid";
const DAY = 24 * 60 * 60 * 1000;
const TRIP_DEMOS = [
  { title: "Sons del Cabanyal", description: "Testnet demo listing. This Starlog ticket is not valid for venue admission.", venue: "Teatre El Musical", city: "Valencia", airport: "VLC", startsAt: "2026-11-15T18:00:00Z", price: "100000000" },
  { title: "Albufera · bus & boat", description: "Testnet demo listing. This Starlog ticket is not valid for venue admission.", venue: "Albufera Natural Park", city: "Valencia", airport: "VLC", startsAt: "2026-12-05T10:00:00Z", price: "220000000" },
  { title: "Park Güell · guided visit", description: "Testnet demo listing. This Starlog ticket is not valid for venue admission.", venue: "Park Güell", city: "Barcelona", airport: "BCN", startsAt: "2026-12-06T10:00:00Z", price: "170000000" },
  { title: "La Oreja de Van Gogh", description: "Testnet demo listing. This Starlog ticket is not valid for venue admission.", venue: "Palau Sant Jordi", city: "Barcelona", airport: "BCN", startsAt: "2026-11-26T20:30:00Z", price: "380000000" },
  { title: "Bryan Adams", description: "Testnet demo listing. This Starlog ticket is not valid for venue admission.", venue: "Movistar Arena", city: "Madrid", airport: "MAD", startsAt: "2026-11-10T20:30:00Z", price: "430000000" },
  { title: "Royal Palace of Madrid", description: "Testnet demo listing. This Starlog ticket is not valid for venue admission.", venue: "Royal Palace of Madrid", city: "Madrid", airport: "MAD", startsAt: "2026-12-07T10:00:00Z", price: "180000000" },
];

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const [user] = await sql`
    insert into users (wallet, role) values (${ORGANIZER_WALLET}, 'organizer')
    on conflict (wallet) do update set role = 'organizer'
    returning id`;
  const [organizer] = await sql`
    insert into organizers (user_id, name, payout_wallet, commission_bps)
    values (${user.id}, 'Stellar Builders Madrid', ${ORGANIZER_WALLET}, 800)
    on conflict (user_id) do update set name = excluded.name
    returning id`;

  const [existing] = await sql`select id from events where title = ${EVENT_TITLE}`;
  if (existing) {
    console.log(`event already exists: #${existing.id}`);
  } else {
    const startsAt = new Date(Date.now() + 30 * DAY);
    const [event] = await sql`
      insert into events (organizer_id, source, title, description, venue, city, airport, country,
                          starts_at, ends_at, ticket_price, currency, capacity, refund_policy, status)
      values (${organizer.id}, 'partner', ${EVENT_TITLE},
              'Demos, charlas cortas y networking del ecosistema Stellar.',
              'Impact Hub Picasso', 'Madrid', 'MAD', 'ES',
              ${startsAt}, ${new Date(startsAt.getTime() + 4 * 3_600_000)},
              ${"50000000"}, 'XLM', 50, ${sql.json({ fullRefundUntilHours: 48 })}, 'published')
      returning id`;
    console.log(`event created: #${event.id} (5 XLM, organizer ${ORGANIZER_WALLET.slice(0, 8)}…)`);
  }

  for (const trip of TRIP_DEMOS) {
    const [existingTrip] = await sql`select id from events where title = ${trip.title}`;
    if (existingTrip) {
      console.log(`demo trip already exists: ${trip.title} (#${existingTrip.id})`);
      continue;
    }
    const startsAt = new Date(trip.startsAt);
    const [event] = await sql`
      insert into events (organizer_id, source, title, description, venue, city, airport, country,
                          starts_at, ends_at, ticket_price, currency, capacity, refund_policy, status)
      values (${organizer.id}, 'partner', ${trip.title}, ${trip.description}, ${trip.venue}, ${trip.city},
              ${trip.airport}, 'ES', ${startsAt}, ${new Date(startsAt.getTime() + 2 * 3_600_000)},
              ${trip.price}, 'USDC', 100, ${sql.json({ fullRefundUntilHours: 48 })}, 'published')
      returning id`;
    console.log(`testnet demo trip created: ${trip.title} (#${event.id}, ${Number(trip.price) / 10_000_000} USDC)`);
  }
} finally {
  await sql.end();
}
