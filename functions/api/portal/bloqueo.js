// POST   /api/portal/bloqueo  { date, start, end, motivo?, actor? }   (header x-intake-secret == PORTAL_INTAKE_SECRET)
// DELETE /api/portal/bloqueo?id=<id del evento>                      (mismo secreto)
// Bloquear horario desde el hub (calendario del estudio de clientes.doppel.cl): crea el evento «Bloqueo · <motivo>» en el calendario del estudio. freeBusy lo cuenta como ocupado,
// así que la reserva web, el portal de clientes, el bot de WhatsApp y «Nueva grabación» ya no ofrecen ese tramo. NO crea reserva (no hay cliente ni cobro) y NO revisa choques: el hub
// avisa si pisa algo y el equipo decide.
// Quitar: borra el evento SOLO si el evento real es un «Bloqueo…» y no está vinculado a ninguna reserva. Nunca borra una grabación ni un evento ajeno.
// Es aditivo: no toca /api/reserve, /api/availability ni /api/portal/schedule.
import { parseConfig } from "../../_lib/slots.js";
import { createEvent, getEvent, deleteEvent } from "../../_lib/google.js";
import { bookingPorEvento } from "../../_lib/booking.js";
import { armarBloqueo, esBloqueo } from "../../_lib/bloqueo.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const autorizado = (request, env) => !!env.PORTAL_INTAKE_SECRET && request.headers.get("x-intake-secret") === env.PORTAL_INTAKE_SECRET;

export async function onRequestPost({ request, env }) {
  if (!autorizado(request, env)) return json({ error: "forbidden" }, 403);
  const config = parseConfig(env);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const b = armarBloqueo(body, config.timeZone);
  if (!b.ok) return json({ error: b.error }, 400);
  const actor = String(body.actor || "hub").slice(0, 80);
  try {
    const ev = await createEvent(env, {
      summary: b.titulo,
      description: `Bloqueo de horario creado desde el hub (clientes.doppel.cl) por ${actor}. El estudio no se puede reservar en este tramo.`,
      startISO: b.startISO, endISO: b.endISO, timeZone: config.timeZone, colorId: "8",
    });
    return json({ ok: true, eventId: ev.id, titulo: b.titulo, start: b.startISO, end: b.endISO });
  } catch (e) {
    return json({ error: "No se pudo crear el bloqueo en el calendario", detail: String(e).slice(0, 300) }, 502);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!autorizado(request, env)) return json({ error: "forbidden" }, 403);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_@.-]{1,200}$/.test(id)) return json({ error: "Id de evento inválido" }, 400);
  let ev;
  try { ev = await getEvent(env, id); } catch (e) { return json({ error: "No se pudo leer el evento del calendario", detail: String(e).slice(0, 300) }, 502); }
  if (!ev) return json({ error: "Ese evento ya no está en el calendario del estudio." }, 404);
  if (!esBloqueo(ev.summary)) return json({ error: "Ese evento no es un bloqueo (su título no empieza por «Bloqueo»): no se borra." }, 409);
  let reserva;
  try { reserva = await bookingPorEvento(env, ev.id); } catch (e) { return json({ error: "No se pudo revisar si el evento es una reserva", detail: String(e).slice(0, 300) }, 502); }
  if (reserva) return json({ error: "Ese evento es una grabación (tiene una reserva): no se borra como bloqueo." }, 409);
  try { await deleteEvent(env, ev.id); } catch (e) { return json({ error: "No se pudo quitar el bloqueo, intenta de nuevo", detail: String(e).slice(0, 300) }, 502); }
  return json({ ok: true, titulo: String(ev.summary || "") });
}
