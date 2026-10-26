import { NextRequest } from "next/server";
import { musementConfiguration, musementRequest, MusementError } from "@/lib/musement";

export async function GET(_request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  if (!/^[a-f0-9-]{16,64}$/i.test(orderId)) return Response.json({ error: "Identificador de orden no válido." }, { status: 400 });
  const config = musementConfiguration();
  if (!config.ready) return Response.json({ error: "Configura las credenciales de sandbox de Musement." }, { status: 503 });

  try {
    const order = await musementRequest(`/orders/${encodeURIComponent(orderId)}`);
    return Response.json({ mode: "sandbox", order });
  } catch (error) {
    const statusCode = error instanceof MusementError ? error.status : 502;
    const message = error instanceof Error ? error.message : "No se pudo consultar la orden.";
    return Response.json({ error: message }, { status: statusCode });
  }
}
