// GET /api/booking?id=<token> — datos de una reserva para la página de gestión.
import { parseConfig } from "../_lib/slots.js";
import { getBooking, isModifiable } from "../_lib/booking.js";
import { formatSession } from "../_lib/email.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  const config = parseConfig(env);
  const token = new URL(request.url).searchParams.get("id");
  const b = await getBooking(env, token);
  if (!b) return json({ found: false }, 404);

  const { fecha, hora } = formatSession(b.start, config.timeZone);
  return json({
    found: true,
    name: b.name,
    date: b.date,
    label: b.label,
    start: b.start,
    fecha,
    hora,
    deposit: b.deposit,
    address: env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago",
    modifiable: isModifiable(b.start),
    pastSession: Date.parse(b.start) <= Date.now(),
  });
}
