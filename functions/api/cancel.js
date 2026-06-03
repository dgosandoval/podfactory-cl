// POST /api/cancel  { id: token }
// Cancela una reserva (hasta 24 h antes): borra el evento, libera el bloque,
// elimina el registro y avisa al cliente. El adelanto no se reembolsa.
import { parseConfig } from "../_lib/slots.js";
import { getBooking, deleteBooking, isModifiable } from "../_lib/booking.js";
import { deleteEvent } from "../_lib/google.js";
import { sendEmail, formatSession, cancelEmailHtml } from "../_lib/email.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const config = parseConfig(env);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const b = await getBooking(env, body?.id);
  if (!b) return json({ error: "Reserva no encontrada" }, 404);
  const isAdmin = env.ADMIN_KEY && request.headers.get("x-admin-key") === env.ADMIN_KEY;
  if (!isAdmin && !isModifiable(b.start)) {
    return json({ error: "Ya no se puede cancelar (menos de 24 horas para la sesión)." }, 409);
  }

  try {
    await deleteEvent(env, b.eventId);
  } catch (e) {
    return json({ error: "No se pudo cancelar, intenta de nuevo", detail: String(e) }, 502);
  }
  await deleteBooking(env, b.token);

  // Aviso al cliente y al estudio — best-effort.
  try {
    const { fecha, hora } = formatSession(b.start, config.timeZone);
    if (b.email) {
      await sendEmail(env, { to: b.email, subject: "Reserva cancelada · Pod Factory", html: cancelEmailHtml({ name: b.name, fecha, hora }) });
    }
    if (env.STUDIO_EMAIL) {
      await sendEmail(env, { to: env.STUDIO_EMAIL, subject: `Reserva CANCELADA: ${b.name} · ${fecha} ${hora} hrs`, html: cancelEmailHtml({ name: b.name, fecha, hora }) });
    }
  } catch (e) {
    console.log("email cancel error:", String(e));
  }

  return json({ ok: true });
}
