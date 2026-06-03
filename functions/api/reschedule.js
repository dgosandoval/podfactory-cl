// POST /api/reschedule  { id: token, date, start, label }
// Mueve la reserva a un nuevo bloque (hasta 24 h antes de la sesión actual).
// El adelanto ya pagado se mantiene. No cobra de nuevo.
import { parseConfig, buildSlots, weekday, overlapsBusy } from "../_lib/slots.js";
import { getBooking, saveBooking, isModifiable, manageUrl } from "../_lib/booking.js";
import { getBusy, patchEvent } from "../_lib/google.js";
import { sendEmail, formatSession, rescheduleEmailHtml } from "../_lib/email.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const config = parseConfig(env);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const { id, date, start, label } = body || {};
  const b = await getBooking(env, id);
  if (!b) return json({ error: "Reserva no encontrada" }, 404);
  if (!isModifiable(b.start)) {
    return json({ error: "Ya no se puede reagendar (menos de 24 horas para la sesión)." }, 409);
  }

  // Validar el nuevo bloque
  if (!date || !start || !label) return json({ error: "Falta el nuevo bloque" }, 400);
  if (!config.openDays.includes(weekday(date, config.timeZone))) return json({ error: "Día no disponible" }, 400);
  const slot = buildSlots(date, config).find((s) => s.start === start && s.label === label);
  if (!slot) return json({ error: "Bloque no válido" }, 400);
  if (Date.parse(slot.start) <= Date.now()) return json({ error: "Ese bloque ya pasó" }, 400);

  // ¿Nuevo bloque libre? (hold vigente o evento en el calendario)
  if (env.HOLDS && (await env.HOLDS.get(`hold:${date}:${label}`))) {
    return json({ error: "Ese bloque está siendo reservado por otra persona. Elige otro." }, 409);
  }
  try {
    const busy = await getBusy(env, slot.start, slot.end);
    if (overlapsBusy(slot, busy)) return json({ error: "Ese bloque ya no está disponible." }, 409);
    await patchEvent(env, b.eventId, { startISO: slot.start, endISO: slot.end, timeZone: config.timeZone });
  } catch (e) {
    return json({ error: "No se pudo reagendar, intenta de nuevo", detail: String(e) }, 502);
  }

  // Actualizar registro (nuevo horario, reactivar recordatorio)
  const updated = { ...b, date, label, start: slot.start, end: slot.end, reminded: false };
  await saveBooking(env, updated);

  // Aviso al cliente y al estudio — best-effort.
  try {
    const { fecha, hora } = formatSession(slot.start, config.timeZone);
    const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
    const origin = new URL(request.url).origin;
    if (b.email) {
      await sendEmail(env, {
        to: b.email,
        subject: "Tu reserva fue reagendada · Pod Factory",
        html: rescheduleEmailHtml({ name: b.name, fecha, hora, address, manageUrl: manageUrl(origin, b.token) }),
      });
    }
    if (env.STUDIO_EMAIL) {
      await sendEmail(env, { to: env.STUDIO_EMAIL, subject: `Reserva REAGENDADA: ${b.name} · ${fecha} ${hora} hrs`, html: rescheduleEmailHtml({ name: b.name, fecha, hora, address }) });
    }
  } catch (e) {
    console.log("email reschedule error:", String(e));
  }

  return json({ ok: true });
}
