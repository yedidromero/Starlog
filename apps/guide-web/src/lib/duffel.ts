const DUFFEL_API = "https://api.duffel.com";

type JsonRecord = Record<string, unknown>;

export type DuffelFlightSlice = {
  origin: string;
  destination: string;
  departureDate: string;
};

export type DuffelFlightSearch = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function duffelConfigured() {
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN?.trim());
}

export async function duffelRequest(path: string, init: RequestInit = {}) {
  const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("Falta DUFFEL_ACCESS_TOKEN en apps/guide-web/.env.local.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Duffel-Version", "v2");
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${DUFFEL_API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });

  let payload: unknown = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  const body = asRecord(payload);
  if (!response.ok) {
    const errors = asArray(body?.errors).map((entry) => text(asRecord(entry)?.message)).filter(Boolean);
    throw new Error(errors.join(" ") || `Duffel respondió con estado ${response.status}.`);
  }
  return body ?? {};
}

export async function resolveDuffelPlace(query: string): Promise<{ iataCode: string; label: string }> {
  const cleanQuery = query.trim();
  if (/^[a-z]{3}$/i.test(cleanQuery)) return { iataCode: cleanQuery.toUpperCase(), label: cleanQuery.toUpperCase() };

  const params = new URLSearchParams({ query: cleanQuery });
  const payload = await duffelRequest(`/places/suggestions?${params}`);
  const places = asArray(payload.data).map(asRecord).filter((place): place is JsonRecord => Boolean(place));
  if (!places.length) throw new Error(`Duffel no encontró una ciudad o aeropuerto para “${cleanQuery}”.`);

  const normalizedQuery = cleanQuery.toLocaleLowerCase();
  const exactCity = places.find((place) => text(place.type) === "city" && text(place.name).toLocaleLowerCase() === normalizedQuery);
  const exactAirport = places.find((place) => text(place.type) === "airport" && text(place.name).toLocaleLowerCase() === normalizedQuery);
  const city = places.find((place) => text(place.type) === "city");
  const place = exactCity ?? exactAirport ?? city ?? places[0];
  const iataCode = text(place.iata_code);
  if (!iataCode) throw new Error(`Duffel no devolvió un código IATA utilizable para “${cleanQuery}”.`);
  return { iataCode, label: text(place.name) || cleanQuery };
}

function formatDuration(start: string, end: string) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return "";
  const minutes = Math.round((endMs - startMs) / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours} h ${remainingMinutes} min` : `${remainingMinutes} min`;
}

function time(value: unknown) {
  const date = text(value);
  if (!date) return "";
  const localTime = date.match(/T(\d{2}:\d{2})/)?.[1];
  return localTime || new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function normalizeDuffelOffer(raw: unknown) {
  const offer = asRecord(raw);
  if (!offer) return null;
  const slices = asArray(offer.slices).map(asRecord).filter((slice): slice is JsonRecord => Boolean(slice));
  const sliceViews = slices.map((slice) => {
    const segments = asArray(slice.segments).map(asRecord).filter((segment): segment is JsonRecord => Boolean(segment));
    const first = segments[0];
    const last = segments.at(-1);
    if (!first || !last) return null;
    const origin = asRecord(first.origin);
    const destination = asRecord(last.destination);
    const carriers = segments.map((segment) => text(asRecord(segment.operating_carrier)?.name) || text(asRecord(segment.marketing_carrier)?.name)).filter(Boolean);
    const flightNumbers = segments.map((segment) => {
      const carrier = asRecord(segment.marketing_carrier);
      const code = text(carrier?.iata_code);
      const number = text(segment.marketing_carrier_flight_number);
      return code && number ? `${code} ${number}` : "";
    }).filter(Boolean);
    const departure = text(first.departing_at);
    const arrival = text(last.arriving_at);
    return {
      origin: { code: text(origin?.iata_code), name: text(origin?.name) },
      destination: { code: text(destination?.iata_code), name: text(destination?.name) },
      departAt: departure,
      arriveAt: arrival,
      departTime: time(departure),
      arriveTime: time(arrival),
      duration: formatDuration(departure, arrival),
      stops: Math.max(0, segments.length - 1),
      carriers: [...new Set(carriers)],
      flightNumbers,
    };
  }).filter((slice): slice is NonNullable<typeof slice> => Boolean(slice));

  if (!text(offer.id) || !sliceViews.length) return null;
  const owner = asRecord(offer.owner);
  return {
    id: text(offer.id),
    amount: text(offer.total_amount),
    currency: text(offer.total_currency),
    owner: text(owner?.name),
    expiresAt: text(offer.expires_at),
    slices: sliceViews,
  };
}

export function buildOfferRequest(search: DuffelFlightSearch, originCode: string, destinationCode: string) {
  const slices: Array<{ origin: string; destination: string; departure_date: string }> = [
    { origin: originCode, destination: destinationCode, departure_date: search.departureDate },
  ];
  if (search.returnDate) {
    slices.push({ origin: destinationCode, destination: originCode, departure_date: search.returnDate });
  }

  return {
    data: {
      slices,
      passengers: Array.from({ length: search.adults }, () => ({ type: "adult" })),
      cabin_class: "economy",
    },
  };
}
