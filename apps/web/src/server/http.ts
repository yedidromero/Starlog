import "server-only";
import { NextResponse } from "next/server";
import { BookingError } from "./bookings";
import { ChainError } from "./chain";
import { DuffelError } from "./duffel";

/** JSON that may contain bigints (token amounts), sent as strings. */
export function json(data: unknown, init?: ResponseInit) {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return new NextResponse(body, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
}

// During fund(), the token contract uses error #10 for a balance below zero.
// Escrow's create_booking() also has an unrelated #10, so scope this to fund.
const INSUFFICIENT = /Error\(Contract, #10\)|insufficient|balance is not sufficient|not enough balance/i;

/**
 * Maps errors to HTTP answers with a message the traveler can act on. Technical
 * details only go to the server log.
 */
export function errorResponse(err: unknown) {
  if (err instanceof BookingError) {
    return json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, { status: err.status });
  }
  console.error(err);
  if (err instanceof ChainError) {
    if (err.message.startsWith("fund simulation:") && INSUFFICIENT.test(err.message)) {
      return json(
        { error: "Tu wallet no tiene saldo suficiente en la moneda elegida. Añade fondos o elige otra moneda y vuelve a intentar.", code: "insufficient_balance" },
        { status: 402 },
      );
    }
    return json(
      { error: "No pudimos completar la operación en la red Stellar. Inténtalo de nuevo en unos minutos.", code: "chain_error" },
      { status: 502 },
    );
  }
  if (err instanceof DuffelError) {
    return json(
      { error: "El proveedor de vuelos no respondió como esperábamos. Inténtalo de nuevo.", code: "supplier_error" },
      { status: 502 },
    );
  }
  return json({ error: "Algo salió mal. Inténtalo de nuevo.", code: "internal_error" }, { status: 500 });
}

export const unauthorized = () => json({ error: "Inicia sesión para continuar." }, { status: 401 });
