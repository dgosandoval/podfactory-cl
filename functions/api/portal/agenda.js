// GET /api/portal/agenda?days=21  (header x-intake-secret == PORTAL_INTAKE_SECRET)
// Agenda del estudio para el panel del hub: TODOS los eventos del calendario del estudio
// (reservas web y los que se agregan a mano), cruzados con la reserva web cuando existe
// (tipo, contacto, pago). El calendario es la fuente única de lo que ocupa el estudio.
import { parseConfig } from "../../_lib/slots.js";
import { listEvents } from "../../_lib/google.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  if (!env.PORTAL_INTAKE_SECRET || request.headers.get("x-intake-secret") !== env.PORTAL_INTAKE_SECRET) return json({ error: "forbidden" }, 403);
  const config = parseConfig(env);
  const days = Math.min(60, Math.max(1, parseInt(new URL(request.url).searchParams.get("days") || "21", 10) || 21));
  const now = Date.now();
  const timeMin = new Date(now - 6 * 3600 * 1000).toISOString(); // incluye lo de hoy que ya empezó
  const timeMax = new Date(now + days * 86400 * 1000).toISOString();

  // Reservas web, indexadas por id del evento.
  const byEvent = new Map();
  if (env.HOLDS) {
    const list = await env.HOLDS.list({ prefix: "booking:" });
    const recs = await Promise.all(list.keys.map((k) => env.HOLDS.get(k.name, "json")));
    for (const b of recs) if (b && b.eventId) byEvent.set(b.eventId, b);
  }

  let items;
  try { items = await listEvents(env, timeMin, timeMax); }
  catch (e) { return json({ error: String(e).slice(0, 300) }, 502); }

  const tz = config.timeZone;
  const fDia = new Intl.DateTimeFormat("es-CL", { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  const fKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const fHora = new Intl.DateTimeFormat("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const events = items.map((e) => {
    const allDay = !e.start?.dateTime;
    const start = e.start?.dateTime || `${e.start?.date}T00:00:00`;
    const end = e.end?.dateTime || null;
    const d = new Date(start);
    const b = byEvent.get(e.id);
    return {
      id: e.id, title: e.summary || "(sin título)", start, end, allDay,
      dia: fKey.format(d), diaLabel: fDia.format(d),
      hora: allDay ? "Todo el día" : fHora.format(d), horaFin: end ? fHora.format(new Date(end)) : null,
      reserva: b ? { tipo: b.tipo, name: b.name, email: b.email, phone: b.phone, personas: b.personas, empresa: b.empresa || "", pagado: b.deposit || 0, comentarios: b.comentarios || "" } : null,
    };
  });
  return json({ events, days });
}
