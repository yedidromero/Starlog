import { currentSession } from "@/server/auth/current-user";
import { myBookings } from "@/server/account";
import { errorResponse, json, unauthorized } from "@/server/http";

/** The signed-in traveler's bookings, newest first. */
export async function GET() {
  const session = await currentSession();
  if (!session) return unauthorized();
  try {
    return json(await myBookings(session));
  } catch (err) {
    return errorResponse(err);
  }
}
