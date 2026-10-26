import { randomUUID } from "node:crypto";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { AccessToken } from "livekit-server-sdk";

const AGENT_NAME = "starlog-guide";

function safeRoomName(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : `starlog-${randomUUID()}`;
}

export async function POST(request: Request) {
  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    return Response.json({ error: "LiveKit is not configured on the server." }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // A session can request a token without optional participant details.
  }

  const room = safeRoomName(body.room_name ?? body.roomName);
  const identity = `traveler-${randomUUID()}`;
  const name = typeof body.participant_name === "string" ? body.participant_name.slice(0, 80) : "Starlog traveler";
  const token = new AccessToken(apiKey, apiSecret, { identity, name, ttl: "10m" });
  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  token.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
  });

  return Response.json({
    server_url: livekitUrl,
    participant_token: await token.toJwt(),
  }, { status: 201 });
}
