import { NextRequest } from "next/server";
import { musementConfiguration, musementRequest, MusementError, normalizeActivities } from "@/lib/musement";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const status = musementConfiguration();
  if (!status.ready) return Response.json({ provider: "Musement", mode: "sandbox", configured: false, testOrdersEnabled: status.testOrdersEnabled, missing: status.missing, activities: [] });
  if (query.length < 2) return Response.json({ error: "Escribe una ciudad o actividad para buscar." }, { status: 400 });

  try {
    const params = new URLSearchParams({ text: query, text_operator: "AND", limit: "12", sort_by: "rating" });
    const result = await musementRequest(`/activities?${params}`);
    return Response.json({ provider: "Musement", mode: "sandbox", configured: true, testOrdersEnabled: status.testOrdersEnabled, activities: normalizeActivities(result) });
  } catch (error) {
    const statusCode = error instanceof MusementError ? error.status : 502;
    const message = error instanceof Error ? error.message : "No se pudo consultar Musement.";
    return Response.json({ error: message }, { status: statusCode });
  }
}
