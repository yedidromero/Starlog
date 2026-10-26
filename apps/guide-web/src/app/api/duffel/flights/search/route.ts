import { NextRequest } from "next/server";
import {
  buildOfferRequest,
  duffelConfigured,
  duffelRequest,
  normalizeDuffelOffer,
  resolveDuffelPlace,
} from "@/lib/duffel";

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

export async function POST(request: NextRequest) {
  if (!duffelConfigured()) {
    return Response.json({ provider: "Duffel", mode: "test", configured: false, error: "Agrega DUFFEL_ACCESS_TOKEN a apps/guide-web/.env.local para consultar ofertas reales del sandbox." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "La búsqueda debe enviarse como JSON." }, { status: 400 });
  }

  const origin = typeof body.origin === "string" ? body.origin.trim().slice(0, 100) : "";
  const destination = typeof body.destination === "string" ? body.destination.trim().slice(0, 100) : "";
  const departureDate = body.departureDate;
  const returnDate = body.returnDate === "" || body.returnDate == null ? undefined : body.returnDate;
  const adults = Number(body.adults);

  if (!origin || !destination || origin.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
    return Response.json({ error: "Indica un origen y un destino diferentes." }, { status: 400 });
  }
  if (!isDate(departureDate) || (returnDate !== undefined && !isDate(returnDate))) {
    return Response.json({ error: "Indica fechas de salida y regreso válidas." }, { status: 400 });
  }
  if (returnDate && returnDate < departureDate) {
    return Response.json({ error: "La fecha de regreso no puede ser anterior a la salida." }, { status: 400 });
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > 6) {
    return Response.json({ error: "Elige entre 1 y 6 viajeros adultos." }, { status: 400 });
  }

  try {
    const [resolvedOrigin, resolvedDestination] = await Promise.all([
      resolveDuffelPlace(origin),
      resolveDuffelPlace(destination),
    ]);
    if (resolvedOrigin.iataCode === resolvedDestination.iataCode) {
      return Response.json({ error: "El origen y el destino corresponden al mismo lugar." }, { status: 400 });
    }

    const payload = await duffelRequest("/air/offer_requests?return_offers=true&supplier_timeout=20000", {
      method: "POST",
      body: JSON.stringify({
        data: buildOfferRequest({ origin, destination, departureDate, returnDate, adults }, resolvedOrigin.iataCode, resolvedDestination.iataCode).data,
      }),
    });
    const offerRequest = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
    const offers = Array.isArray(offerRequest.offers) ? offerRequest.offers.map(normalizeDuffelOffer).filter(Boolean) : [];
    return Response.json({
      provider: "Duffel",
      mode: "test",
      configured: true,
      offerRequestId: typeof offerRequest.id === "string" ? offerRequest.id : null,
      places: { origin: resolvedOrigin, destination: resolvedDestination },
      offers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar Duffel.";
    return Response.json({ provider: "Duffel", mode: "test", configured: true, error: message }, { status: 502 });
  }
}
