import { getDbPool } from "@/lib/db";

export async function GET() {
  try {
    await getDbPool().query("SELECT 1");
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json(
      { ok: false, error: "No se pudo conectar con la base de datos." },
      { status: 503 },
    );
  }
}
