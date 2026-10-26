import { NextRequest } from "next/server";
import { musementConfiguration, musementRequest, MusementError, normalizeProducts } from "@/lib/musement";

export async function GET(request: NextRequest, context: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await context.params;
  if (!/^[a-f0-9-]{16,64}$/i.test(activityId)) return Response.json({ error: "Identificador de actividad no válido." }, { status: 400 });
  const status = musementConfiguration();
  if (!status.ready) return Response.json({ error: "Configura las credenciales de sandbox de Musement." }, { status: 503 });
  const from = request.nextUrl.searchParams.get("from") ?? new Date(Date.now() + 35 * 86_400_000).toISOString().slice(0, 10);
  const to = request.nextUrl.searchParams.get("to") ?? new Date(Date.now() + 65 * 86_400_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return Response.json({ error: "Selecciona un rango de fechas válido." }, { status: 400 });
  }

  try {
    const selectedDate = request.nextUrl.searchParams.get("date");
    if (selectedDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return Response.json({ error: "Fecha no válida." }, { status: 400 });
      const schedule = await musementRequest(`/activities/${encodeURIComponent(activityId)}/dates/${selectedDate}`);
      return Response.json({ date: selectedDate, products: normalizeProducts(schedule), mode: "sandbox" });
    }
    const params = new URLSearchParams({ date_from: from, date_to: to });
    const result = await musementRequest(`/activities/${encodeURIComponent(activityId)}/dates?${params}`);
    const dates = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    return Response.json({ dates, range: { from, to }, mode: "sandbox" });
  } catch (error) {
    const statusCode = error instanceof MusementError ? error.status : 502;
    const message = error instanceof Error ? error.message : "No se pudo consultar la disponibilidad.";
    return Response.json({ error: message }, { status: statusCode });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await context.params;
  if (!/^[a-f0-9-]{16,64}$/i.test(activityId)) return Response.json({ error: "Identificador de actividad no válido." }, { status: 400 });
  const status = musementConfiguration();
  if (!status.ready) return Response.json({ error: "Configura las credenciales de sandbox de Musement." }, { status: 503 });
  if (!status.testOrdersEnabled) return Response.json({ error: "Las órdenes de prueba están desactivadas. Activa MUSEMENT_SANDBOX_ORDERS_ENABLED=true después de cargar credenciales sandbox." }, { status: 403 });

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return Response.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const productIdentifier = typeof input.productIdentifier === "string" ? input.productIdentifier : "";
  const productType = input.productType === "musement-realtime" ? "musement-realtime" : input.productType === "musement" ? "musement" : "";
  const quantity = Number(input.quantity ?? 1);
  const date = typeof input.date === "string" ? input.date : "";
  if (!productIdentifier || productIdentifier.length > 500 || !productType || !Number.isInteger(quantity) || quantity < 1 || quantity > 8 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Selecciona una fecha, tipo de entrada y cantidad válidos." }, { status: 400 });
  }

  try {
    const cart = await musementRequest("/carts", { method: "POST", body: JSON.stringify({}) });
    if (typeof cart.uuid !== "string") throw new MusementError("Musement no devolvió el carrito de prueba.");
    const cartUuid = cart.uuid;
    await musementRequest(`/carts/${encodeURIComponent(cartUuid)}/items`, {
      method: "POST",
      body: JSON.stringify([{ type: productType, product_identifier: productIdentifier, quantity }]),
    });
    await musementRequest(`/carts/${encodeURIComponent(cartUuid)}/customer`, {
      method: "PUT",
      body: JSON.stringify({
        firstname: "TEST",
        lastname: "TEST",
        email: "test@test.com",
        musement_newsletter: "NO",
        allow_profiling: "NO",
        thirdparty_newsletter: "NO",
        events_related_newsletter: "NO",
      }),
    });
    const order = await musementRequest("/orders", {
      method: "POST",
      body: JSON.stringify({ cart_uuid: cartUuid, email_notification: "NONE", source: "starlog-sandbox" }),
    });
    if (typeof order.uuid !== "string") throw new MusementError("Musement no devolvió la orden de prueba.");

    let payment: Record<string, unknown> | null = null;
    let paymentNeedsMerchantPermission = false;
    try {
      payment = await musementRequest("/payments/no/payment", { method: "POST", body: JSON.stringify({ uuid: order.uuid }) });
    } catch (error) {
      if (!(error instanceof MusementError) || ![401, 403].includes(error.status)) throw error;
      paymentNeedsMerchantPermission = true;
    }

    return Response.json({ mode: "sandbox", order, payment, paymentNeedsMerchantPermission, message: "Orden de prueba creada en Musement Sandbox. No se cobró cripto ni tarjeta y no se emitieron tickets reales." }, { status: 201 });
  } catch (error) {
    const statusCode = error instanceof MusementError ? error.status : 502;
    const message = error instanceof Error ? error.message : "No se pudo crear la orden de prueba.";
    return Response.json({ error: message, mode: "sandbox" }, { status: statusCode });
  }
}
