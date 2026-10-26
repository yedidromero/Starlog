import { config } from "dotenv";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cli,
  defineAgent,
  inference,
  llm,
  voice,
  WorkerOptions,
  type JobContext,
} from "@livekit/agents";
import { z } from "zod";
import { searchStarlog } from "./catalog.js";
import { searchDestinationKnowledge } from "./destinationKnowledge.js";
import { searchSampleRecommendations } from "./sampleRecommendations.js";
import { compareIntercityOptions, getLocalDateTime } from "./travelPlanning.js";

config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env.local" });
const mcpDirectory = process.env.STARLOG_MCP_DIR ? resolve(process.env.STARLOG_MCP_DIR) : null;
if (mcpDirectory) config({ path: join(mcpDirectory, ".env.local") });

function createEstelaToolset() {
  if (!mcpDirectory || !existsSync(join(mcpDirectory, "src", "index.mjs")) || !process.env.ESTELA_AGENT_SECRET) {
    console.warn("[starlog] Estela MCP is not configured; payment tools are unavailable.");
    return null;
  }

  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[name] = value;
  }
  env.NODE_USE_SYSTEM_CA = "1";

  return new llm.MCPToolset({
    id: "estela-payments",
    mcpServer: new llm.MCPServerStdio({
      command: process.execPath,
      args: ["src/index.mjs"],
      cwd: mcpDirectory,
      env,
      clientSessionTimeout: 60_000,
    }),
  });
}

const searchExperiences = llm.tool({
  name: "search_starlog_experiences",
  description: "Search Starlog sample catalog for relevant trips and meetups. Use this before recommending an event or trip. Never invent listings, dates, or prices.",
  parameters: z.object({
    query: z.string().describe("The traveler's destination, dates, interests, or preferred event topic"),
  }),
  execute: async ({ query }) => searchStarlog(query),
});

const searchDestinationGuide = llm.tool({
  name: "search_starlog_destination_guide",
  description: "Search Starlog's Madrid, València and Barcelona destination guides for experiences, events, hostels, local areas and reference prices. Use this for destination questions and before stating destination facts or prices. Never invent unavailable details.",
  parameters: z.object({
    query: z.string().describe("The traveler's city, travel dates, interests, event, experience, hostel or price question"),
  }),
  execute: async ({ query }) => searchDestinationKnowledge(query),
});

const searchSampleCityRecommendations = llm.tool({
  name: "search_starlog_demo_recommendations",
  description: "Get clearly labeled fictional sample itinerary ideas for Madrid, València, or Barcelona. Use these after the traveler names one of these destinations. These are not events, live listings, ticket offers, or verified prices.",
  parameters: z.object({
    destination: z.string().min(2).describe("Destination city named by the traveler"),
  }),
  execute: async ({ destination }) => searchSampleRecommendations(destination),
});

const searchDuffelFlights = llm.tool({
  name: "search_starlog_duffel_flights",
  description: "Search live Duffel sandbox flight offers for the traveler's named route and departure date. Call only after origin, destination, and departure date are known. Use an empty returnDate for a one-way trip; use adults=1 unless the traveler gives another number. If the result says configured=false, tell the traveler flight search is waiting for the Duffel sandbox token, then continue with destination events and sample recommendations. Never invent flights, fares, or availability.",
  parameters: z.object({
    origin: z.string().min(2).describe("Departure city or airport the traveler named"),
    destination: z.string().min(2).describe("Destination city the traveler named"),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Departure date in YYYY-MM-DD format"),
    returnDate: z.string().describe("Return date in YYYY-MM-DD format, or an empty string for one-way"),
    adults: z.number().int().min(1).max(6).describe("Number of adult travelers; use 1 if not specified"),
  }),
  execute: async ({ origin, destination, departureDate, returnDate, adults }) => {
    const baseUrl = process.env.STARLOG_WEB_API_URL ?? process.env.ESTELA_WEB_API_URL ?? "http://127.0.0.1:3000";
    let response: Response;
    try {
      response = await fetch(new URL("/api/duffel/flights/search", baseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origin, destination, departureDate, returnDate, adults }),
        signal: AbortSignal.timeout(35_000),
      });
    } catch (error) {
      return {
        configured: false,
        error: error instanceof Error ? error.message : "The Duffel sandbox search could not be reached.",
        route: `${origin} → ${destination}`,
        departureDate,
      };
    }

    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    return { ...result, httpStatus: response.status };
  },
});

const getDestinationLocalTime = llm.tool({
  name: "get_starlog_local_date_time",
  description: "Get the current local date and time for a supported city when the traveler asks about today, tonight, tomorrow, or a time-sensitive activity. This does not reveal the traveler's location; use only a city the traveler has stated or explicitly shared.",
  parameters: z.object({
    city: z.string().min(2).describe("The city the traveler explicitly named or shared, such as Lisbon, Madrid, Valencia or Barcelona"),
  }),
  execute: async ({ city }) => getLocalDateTime(city),
});

const compareTransportOptions = llm.tool({
  name: "compare_starlog_intercity_transport_options",
  description: "Compare general transport modes and official operator websites for an intercity journey. Use this for requests such as Madrid to Barcelona. This tool does not have live departures, ticket prices, seat availability, or booking access; ask for date/time, passengers, luggage and budget before narrowing options.",
  parameters: z.object({
    from: z.string().min(2).describe("Departure city or station named by the traveler"),
    to: z.string().min(2).describe("Destination city or station named by the traveler"),
    date: z.string().describe("Requested travel date, or an empty string if unknown"),
  }),
  execute: async ({ from, to, date }) => compareIntercityOptions(from, to, date || undefined),
});

const createMeetupDraft = llm.tool({
  name: "create_meetup_draft",
  description: "Save a meetup as a draft for Starlog's human review after the organizer clearly asks to create or submit it. First gather the title, city, date and time, venue, description, admission type, and capacity; use 0 when there is no limit or the capacity is unknown. Saving a draft does not publish the event; it stays pending human review.",
  parameters: z.object({
    title: z.string().min(3).max(100).describe("The event title confirmed by the organizer"),
    city: z.string().min(2).max(80).describe("The event city"),
    date: z.string().min(3).max(80).describe("The date and local start time"),
    location: z.string().min(2).max(160).describe("The venue or address"),
    description: z.string().min(10).max(1200).describe("A short description confirmed by the organizer"),
    capacity: z.number().int().nonnegative().describe("Maximum attendee count; use 0 when there is no limit or it is unknown"),
    admission: z.enum(["free", "paid"]).describe("Whether the event is free RSVP or has paid tickets"),
  }),
  execute: async (draft, { ctx }) => {
    ctx.disallowInterruptions();

    const baseUrl = (process.env.STARLOG_WEB_API_URL ?? process.env.ESTELA_WEB_API_URL);
    const internalToken = (process.env.STARLOG_INTERNAL_API_TOKEN ?? process.env.ESTELA_INTERNAL_API_TOKEN);
    if (!baseUrl || !internalToken) {
      throw new llm.ToolError("The Starlog draft service is not configured. Explain that the event was not saved and ask the organizer to try again later.");
    }

    let response: Response;
    try {
      response = await fetch(new URL("/api/meetups/drafts", baseUrl), {
        method: "POST",
        headers: {
          authorization: `Bearer ${internalToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...draft, capacity: draft.capacity === 0 ? null : draft.capacity }),
      });
    } catch {
      throw new llm.ToolError("The Starlog draft service could not be reached. Explain that the event was not saved.");
    }

    if (!response.ok) {
      throw new llm.ToolError("The event draft could not be saved. Explain that it was not submitted and ask the organizer to try again.");
    }

    return response.json();
  },
});

const makeStarlogGuide = (estelaTools: llm.MCPToolset | null) => voice.Agent.create({
  instructions: `You are Starlog, a warm, concise, practical travel planner. At the beginning of a new conversation, ask which language the traveler prefers (Spanish or English). If they choose, keep using that language; otherwise mirror the language they write in. Tool results may be in Spanish; translate their relevant content into the traveler's preferred language. Be concise and guide the traveler one step at a time.

For destination-first trip planning: when the traveler says they want to go to a destination but has not said where they depart from, ask where they are leaving from and keep the destination in context. Once origin and destination are known, if the traveler gave no date, call get_starlog_local_date_time for the origin and use its local calendar date as a clearly stated same-day, one-way search assumption; the traveler can correct the date or request a return trip. If the city has no time-zone mapping, ask for the departure date instead. Default to one adult unless the traveler says otherwise. ${estelaTools ? "When origin, destination, and date are known, use buscar_vuelos for one adult in economy; it automatically spends 0.01 testnet USDC per search, so call it once for the requested route and date. Use airport codes LIS for Lisboa/Lisbon, MAD for Madrid, VLC for València/Valencia, and BCN for Barcelona. Call buscar_eventos for current Estela event listings. Do not call cotizar until the traveler chooses an offer or asks for its final total; cotizar spends 0.005 testnet USDC. Tell the traveler these are Duffel sandbox offers and Stellar testnet payments." : "When origin, destination, and date are known, call search_starlog_duffel_flights."} Also call search_starlog_destination_guide for listed events/experiences that match the destination and date, and call search_starlog_demo_recommendations for that destination. Return flight offers if available, dated events separately from clearly fictional demo itinerary ideas, and ask what they want to refine. If a connected search returns no offers, say so plainly and still provide the available event and idea recommendations. Never invent flight fares, schedules, event dates, ticket availability, or prices.

For activity requests, first establish the city and the date or time window. If the traveler says “here” or “near me” but no location has been explicitly shared in the conversation, ask which city they are in; never claim access to device location. If they say “today”, “tonight” or “tomorrow”, call get_starlog_local_date_time for that city and use its local date and time. Search Starlog's catalog and destination guide, then give a balanced first set of suitable ideas without blocking on optional preferences. Exclude events whose dates have passed. Clearly say when a guide entry is only a dated reference and link its source. Do not imply that a guide snapshot is a live agenda, that an event is open today, or that tickets are available unless a connected live source confirms it. If the sources return no suitable current activity, say so and offer a source link or a useful follow-up. Invite the traveler to narrow the ideas by activity type, budget, accessibility or duration.

For intercity travel, collect origin, destination, travel date/time, passenger count, luggage and budget as needed. Use compare_starlog_intercity_transport_options for general train, bus, and car trade-offs. ${estelaTools ? "For flights on supported routes, use buscar_vuelos and show the live sandbox offer, amount, currency, and expiry from its result." : "Clearly tell the traveler when no live transport offer is connected."} Never invent specific schedules, durations or prices, and do not call any option “the cheapest” or “the fastest” without current sourced results.

Use search_starlog_experiences for Starlog's sample trips and meetups. Use search_starlog_destination_guide for Madrid, València, Barcelona, their attractions, real events, hostels, neighborhoods, and reference prices. Use search_starlog_demo_recommendations only for clearly fictional sample itineraries; call them “ideas de muestra” or “demo”, never events. Treat guide prices as dated references, not live quotes; state their snapshot date and link the source. Ask for travel dates and party size before discussing a hostel total. If no guide section matches, say that the guide does not contain the information and do not guess.

For a new meetup, collect and confirm its title, city, date and time, venue, short description, free/paid admission, and capacity (use 0 if there is no limit). Do not guess missing details. Only call create_meetup_draft after the organizer explicitly asks to save or submit it. Tell them it is saved as pending human review. Never claim it has been published, and never claim the event has been published.

${estelaTools ? "To book, first call cotizar for the selected offer and any event ticket. Gather confirmed passenger name, surname, date of birth, email and international phone. Show the exact total, currency, offer ID, event ID if included, and testnet/sandbox nature. Ask the traveler to explicitly confirm that specific booking and amount. Only after their confirmation may you call reservar. If reservar succeeds, report the returned booking ID, status and payment transaction; if it fails, say that the booking was not confirmed. Never claim that payment or a Duffel order happened from a quote alone. Do not call reservar for an unconfirmed offer or with invented passenger data." : "Do not claim that a booking, crypto payment, or escrow release happened."} Do not claim freelance payouts or carbon calculations.`,
  tools: [searchExperiences, searchDestinationGuide, searchSampleCityRecommendations, ...(estelaTools ? [estelaTools] : [searchDuffelFlights]), getDestinationLocalTime, compareTransportOptions, createMeetupDraft],
});

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const travelModel = new inference.LLM({ model: "openai/gpt-4o-mini" });
    travelModel.on("error", (event) => {
      const error = event.error as Error & { cause?: Error & { code?: string } };
      console.error("[starlog] LLM request failed", {
        name: error.name,
        message: error.message,
        causeCode: error.cause?.code,
        cause: error.cause?.message,
      });
    });
    const session = new voice.AgentSession({
      stt: new inference.STT({ model: "deepgram/nova-3", language: "multi" }),
      llm: travelModel,
      tts: new inference.TTS({
        model: "cartesia/sonic-3",
        voice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
        language: "en",
      }),
      turnDetection: new inference.TurnDetector(),
    });

    await session.start({
      agent: makeStarlogGuide(createEstelaToolset()),
      room: ctx.room,
      // Text-first sessions should answer the message directly. Avoid interrupting
      // an automatic greeting or letting audio VAD cancel a typed response.
      inputOptions: {
        textInputCallback: (activeSession, event) => {
          console.info("[starlog] received typed message", { length: event.text.length });
          activeSession.generateReply({ userInput: event.text, allowInterruptions: false });
        },
      },
      outputOptions: { transcriptionEnabled: true, syncTranscription: false },
    });
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url), agentName: "starlog-guide" }));
