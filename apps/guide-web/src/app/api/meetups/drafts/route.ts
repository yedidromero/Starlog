import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type MeetupDraft = {
  id: string;
  title: string;
  city: string;
  date: string;
  location: string;
  description: string;
  capacity: number | null;
  admission: "free" | "paid";
  approved: false;
  mapX: string;
  mapY: string;
  createdAt: string;
  createdBy: "starlog-agent";
};

const dataDirectory = path.join(process.cwd(), ".data");
const draftsFile = path.join(dataDirectory, "meetup-drafts.json");
let writeQueue: Promise<void> = Promise.resolve();

async function readDrafts(): Promise<MeetupDraft[]> {
  try {
    const value: unknown = JSON.parse(await readFile(draftsFile, "utf8"));
    return Array.isArray(value) ? value as MeetupDraft[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function hasValidToken(request: Request, expected: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

export async function GET() {
  return Response.json(await readDrafts());
}

export async function POST(request: Request) {
  const expectedToken = (process.env.STARLOG_INTERNAL_API_TOKEN ?? process.env.ESTELA_INTERNAL_API_TOKEN);
  if (!expectedToken) return Response.json({ error: "Meetup draft service is not configured." }, { status: 503 });
  if (!hasValidToken(request, expectedToken)) return Response.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }

  const textFields = ["title", "city", "date", "location", "description"] as const;
  const lengths = { title: 100, city: 80, date: 80, location: 160, description: 1200 };
  for (const field of textFields) {
    const value = body[field];
    if (typeof value !== "string" || value.trim().length < 2 || value.length > lengths[field]) {
      return Response.json({ error: `Invalid ${field}.` }, { status: 400 });
    }
  }
  if (body.capacity !== null && (!Number.isInteger(body.capacity) || Number(body.capacity) < 1)) {
    return Response.json({ error: "Capacity must be a positive whole number or null." }, { status: 400 });
  }
  if (body.admission !== "free" && body.admission !== "paid") {
    return Response.json({ error: "Admission must be free or paid." }, { status: 400 });
  }

  const draft: MeetupDraft = {
    id: `agent-${randomUUID()}`,
    title: (body.title as string).trim(),
    city: (body.city as string).trim(),
    date: (body.date as string).trim(),
    location: (body.location as string).trim(),
    description: (body.description as string).trim(),
    capacity: body.capacity as number | null,
    admission: body.admission,
    approved: false,
    mapX: "52%",
    mapY: "53%",
    createdAt: new Date().toISOString(),
    createdBy: "starlog-agent",
  };

  const write = writeQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const current = await readDrafts();
    const temporaryFile = `${draftsFile}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, JSON.stringify([draft, ...current], null, 2), "utf8");
    await rename(temporaryFile, draftsFile);
  });
  writeQueue = write.catch(() => undefined);
  await write;

  return Response.json({ status: "pending_review", draft }, { status: 201 });
}
