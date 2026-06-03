// GET /api/admin/bookings  (header x-admin-key: <ADMIN_KEY>)
// Lista todas las reservas para el panel de administración.
import { parseConfig } from "../../_lib/slots.js";
import { listBookings } from "../../_lib/booking.js";
import { formatSession } from "../../_lib/email.js";

export async function onRequestGet({ request, env }) {
  const key = request.headers.get("x-admin-key") || new URL(request.url).searchParams.get("key");
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
  }

  const config = parseConfig(env);
  const now = Date.now();
  const bookings = (await listBookings(env))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .map((b) => {
      const { fecha, hora } = formatSession(b.start, config.timeZone);
      return {
        token: b.token, name: b.name, email: b.email, phone: b.phone,
        date: b.date, label: b.label, start: b.start, fecha, hora,
        tipo: b.tipo || "Podcast", personas: b.personas || 1, addons: b.addons || [],
        comentarios: b.comentarios || "", deposit: b.deposit,
        past: Date.parse(b.start) <= now,
      };
    });

  return new Response(JSON.stringify({ bookings }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
