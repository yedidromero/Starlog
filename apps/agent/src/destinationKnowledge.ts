import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const knowledgeDirectory = fileURLToPath(new URL("../../../knowledge/", import.meta.url));
const stopWords = new Set([
  "a", "al", "con", "de", "del", "el", "en", "for", "from", "i", "in", "is",
  "la", "las", "los", "me", "my", "of", "on", "que", "the", "to", "un", "una", "with", "y",
  "qué", "que", "cuanto", "cuánto", "cuesta", "quiero", "hay", "para", "por", "donde", "dónde",
]);

const cityAliases: Record<string, string[]> = {
  madrid: ["madrid"],
  valencia: ["valencia", "valència"],
  barcelona: ["barcelona"],
};

const topicAliases: Record<string, string[]> = {
  price: ["precio", "precios", "tarifa", "tarifas", "coste", "costo", "€"],
  prices: ["precio", "precios", "tarifa", "tarifas", "coste", "costo", "€"],
  precio: ["price", "prices", "tarifa", "coste", "costo"],
  precios: ["price", "prices", "tarifas", "coste", "costo"],
  hostel: ["hostel", "hostels", "dormitorio", "alojamiento", "hostal"],
  hostels: ["hostel", "dormitorio", "alojamiento", "hostal"],
  hostal: ["hostel", "hostels", "dormitorio", "alojamiento"],
  hostales: ["hostel", "hostels", "dormitorio", "alojamiento", "hostal"],
  albergue: ["hostel", "hostels", "dormitorio", "alojamiento"],
  albergues: ["hostel", "hostels", "dormitorio", "alojamiento"],
  alojamiento: ["hostel", "hostels", "hostal", "dormitorio"],
  event: ["evento", "eventos", "agenda", "festival", "concierto"],
  events: ["evento", "eventos", "agenda", "festival", "concierto"],
  evento: ["event", "events", "agenda", "festival", "concierto"],
  eventos: ["event", "events", "agenda", "festival", "concierto"],
  experience: ["experiencia", "experiencias", "actividad", "visita"],
  experiences: ["experiencia", "experiencias", "actividad", "visita"],
  experiencia: ["experience", "experiences", "actividad", "visita"],
  gratis: ["gratuito", "gratuita", "free", "gratuitos", "gratuitas"],
  free: ["gratis", "gratuito", "gratuita", "gratuitos", "gratuitas"],
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function readDestinationFiles() {
  return readdirSync(knowledgeDirectory)
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .sort()
    .map((name) => {
      const markdown = readFileSync(new URL(`../../../knowledge/${name}`, import.meta.url), "utf8");
      const city = name.replace(/\.md$/i, "");
      const sections = markdown
        .replace(/^---[\s\S]*?---\s*/m, "")
        .split(/(?=^#{2,3} )/m)
        .map((content) => content.trim())
        .filter(Boolean);
      return sections.map((content) => ({ city, content }));
    })
    .flat();
}

export function searchDestinationKnowledge(query: string) {
  const normalizedQuery = normalize(query);
  const queryTerms = normalizedQuery.split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !stopWords.has(term));
  const cityTerms = new Set(Object.values(cityAliases).flat().map(normalize));
  const terms = new Set(queryTerms.filter((term) => !cityTerms.has(term)));
  for (const term of terms) {
    for (const alias of topicAliases[term] ?? []) terms.add(normalize(alias));
  }

  const requestedCity = Object.entries(cityAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizedQuery.includes(normalize(alias))),
  )?.[0];

  let sections: ReturnType<typeof readDestinationFiles>;
  try {
    sections = readDestinationFiles();
  } catch {
    return {
      results: [],
      note: "The destination knowledge files could not be read. Do not guess destination facts, event dates, or prices.",
    };
  }

  const candidates = requestedCity ? sections.filter((section) => section.city === requestedCity) : sections;
  const ranked = candidates
    .map((section) => {
      const normalizedContent = normalize(section.content);
      const score = terms.size === 0
        ? 1
        : [...terms].reduce((total, term) => total + (normalizedContent.includes(term) ? 1 : 0), 0);
      return { ...section, score };
    })
    .filter((section) => section.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ city, content }) => ({ city, content: content.slice(0, 4200) }));

  if (ranked.length === 0) {
    return {
      results: [],
      note: requestedCity
        ? `No matching section found for ${requestedCity}. Do not invent a result; say the guide has no matching information.`
        : "No matching section found. Available destination guides: Madrid, València, and Barcelona. Do not invent a result.",
    };
  }

  return {
    results: ranked,
    note: "Use only the returned guide content for destination facts. Prices and event details are snapshots; state the source date and link, and ask the traveler to verify current availability and totals. The guide does not confirm bookings.",
  };
}
