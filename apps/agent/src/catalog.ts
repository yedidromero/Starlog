export const trips = [
  {
    title: "Meridian Lisbon",
    destination: "Lisbon, Portugal",
    dates: "Oct 25–28, 2026",
    interests: "Meridian conference founders dinner local city walk fundadores cena paseo Lisboa",
    summary: "Three nights, a community dinner, and an old town walk with a local host.",
  },
  {
    title: "Valencia Web3 Weekend",
    destination: "Valencia, Spain",
    dates: "Nov 13–15, 2026",
    interests: "Mediterranean food community meetup maker studios beach playa costa comida paella comunidad",
    summary: "A weekend with a market food walk, a community meetup, and independent maker studios.",
  },
  {
    title: "Barcelona Founders Retreat",
    destination: "Barcelona, Spain",
    dates: "Dec 4–7, 2026",
    interests: "founders builders dinner design coastal walk fundadores emprendedores diseño costa paseo",
    summary: "A small-group retreat with a founders' dinner and a coastal walk with a local guide.",
  },
] as const;

export const meetups = [
  { title: "Stellar Builders Breakfast", city: "Lisbon", date: "Oct 26 · 09:30", location: "Café Janis", interests: "builders breakfast startup desarrolladores desayuno" },
  { title: "Women in Web3 Valencia", city: "Valencia", date: "Nov 14 · 18:00", location: "Veles e Vents", interests: "women web3 founders community mujeres fundadoras comunidad" },
  { title: "Barcelona Onchain Social", city: "Barcelona", date: "Dec 5 · 19:00", location: "Casa Bonay", interests: "onchain builders social constructores encuentro" },
  { title: "Porto Protocol Picnic", city: "Porto", date: "Dec 12 · 12:00", location: "Jardins do Palácio", interests: "protocol picnic community protocolo picnic comunidad" },
] as const;

export function searchStarlog(query: string) {
  const stopWords = new Set(["a", "al", "con", "de", "del", "el", "en", "for", "from", "i", "in", "is", "la", "las", "los", "me", "my", "of", "on", "que", "the", "to", "un", "una", "with", "y"]);
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const terms = normalize(query).split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !stopWords.has(term));
  const score = (value: string) => terms.reduce((total, term) => total + (normalize(value).includes(term) ? 1 : 0), 0);
  const matchingTrips = trips.map((trip) => ({ item: trip, score: score(`${trip.title} ${trip.destination} ${trip.interests}`) }))
    .filter((match) => match.score > 0).sort((a, b) => b.score - a.score).map((match) => match.item);
  const matchingMeetups = meetups.map((meetup) => ({ item: meetup, score: score(`${meetup.title} ${meetup.city} ${meetup.interests}`) }))
    .filter((match) => match.score > 0).sort((a, b) => b.score - a.score).map((match) => match.item);
  const showAll = terms.length === 0;

  return {
    trips: showAll ? trips : matchingTrips,
    meetups: showAll ? meetups : matchingMeetups,
    catalogNote: "Only these curated Starlog sample listings are available. An empty list means the catalog has no match. Do not invent listings, dates, or prices.",
  };
}
