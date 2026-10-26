const API_VERSION = "3.4.0";
const SANDBOX_BASE_URL = "https://sandbox.musement.com/api/v3";

type MusementConfig = {
  clientId: string;
  clientSecret: string;
  application: string;
  market: string;
  currency: string;
};

type MusementToken = { value: string; expiresAt: number };
let cachedToken: MusementToken | null = null;

export class MusementError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "MusementError";
    this.status = status;
  }
}

export function musementConfiguration() {
  const missing = [
    ["MUSEMENT_CLIENT_ID", process.env.MUSEMENT_CLIENT_ID],
    ["MUSEMENT_CLIENT_SECRET", process.env.MUSEMENT_CLIENT_SECRET],
    ["MUSEMENT_APPLICATION", process.env.MUSEMENT_APPLICATION],
  ].filter(([, value]) => !value).map(([name]) => name as string);

  return {
    ready: missing.length === 0,
    missing,
    testOrdersEnabled: process.env.MUSEMENT_SANDBOX_ORDERS_ENABLED === "true",
  };
}

function config(): MusementConfig {
  const { ready, missing } = musementConfiguration();
  if (!ready) {
    throw new MusementError(`Musement sandbox is not configured. Add: ${missing.join(", ")}.`, 503);
  }

  return {
    clientId: process.env.MUSEMENT_CLIENT_ID!,
    clientSecret: process.env.MUSEMENT_CLIENT_SECRET!,
    application: process.env.MUSEMENT_APPLICATION!,
    market: process.env.MUSEMENT_MARKET || "es",
    currency: process.env.MUSEMENT_CURRENCY || "EUR",
  };
}

async function token(settings: MusementConfig) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const response = await fetch(`${SANDBOX_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "X-Musement-Application": settings.application,
      "X-Musement-Version": API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  const result = await readResponse(response);
  const accessToken = typeof result.access_token === "string" ? result.access_token : "";
  if (!response.ok || !accessToken) {
    throw new MusementError("Musement sandbox authentication failed. Check the partner credentials and application value.", response.status || 502);
  }

  const expiresIn = typeof result.expires_in === "number" ? result.expires_in : 3600;
  cachedToken = { value: accessToken, expiresAt: Date.now() + expiresIn * 1000 };
  return accessToken;
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    value = {};
  }
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

export async function musementRequest(path: string, init: RequestInit = {}) {
  const settings = config();
  const accessToken = await token(settings);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("X-Musement-Application", settings.application);
  headers.set("X-Musement-Version", API_VERSION);
  headers.set("X-Musement-Market", settings.market);
  headers.set("X-Musement-Currency", settings.currency);
  headers.set("Accept-Language", "es-ES");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${SANDBOX_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  const payload = await readResponse(response);
  if (!response.ok) {
    const providerMessage = typeof payload.message === "string" ? payload.message : "request failed";
    throw new MusementError(`Musement sandbox ${response.status}: ${providerMessage}`, response.status);
  }
  return payload;
}

export function normalizeActivities(payload: Record<string, unknown>) {
  const data = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return data.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const activity = raw as Record<string, unknown>;
    const id = activity.uuid ?? activity.id;
    const title = activity.title ?? activity.name;
    if (typeof id !== "string" && typeof id !== "number") return [];
    if (typeof title !== "string") return [];
    const price = (activity.default_price ?? activity.price ?? activity.retail_price) as Record<string, unknown> | undefined;
    return [{
      id: String(id),
      title,
      description: typeof activity.description === "string" ? activity.description : "",
      image: typeof activity.cover_image_url === "string" ? activity.cover_image_url : null,
      url: typeof activity.url === "string" ? activity.url : null,
      price: price && typeof price.formatted_value === "string" ? price.formatted_value : null,
      currency: price && typeof price.currency === "string" ? price.currency : null,
      bookingType: typeof activity.booking_type === "string" ? activity.booking_type : null,
    }];
  });
}

export function normalizeProducts(payload: Record<string, unknown>) {
  const products: Array<{ id: string; type: string; name: string; price: string | null; holder: string | null }> = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if ((typeof item.product_id === "string" || typeof item.product_id === "number") && typeof item.type === "string") {
      const price = (item.retail_price ?? item.price) as Record<string, unknown> | undefined;
      products.push({
        id: String(item.product_id),
        type: item.type,
        name: typeof item.name === "string" ? item.name : typeof item.holder_code === "string" ? item.holder_code : "Entrada",
        price: price && typeof price.formatted_value === "string" ? price.formatted_value : null,
        holder: typeof item.holder_code_normalized === "string" ? item.holder_code_normalized : null,
      });
    }
    Object.values(item).forEach(visit);
  };
  visit(payload);
  return products.filter((product, index) => products.findIndex((other) => other.id === product.id && other.type === product.type) === index);
}
