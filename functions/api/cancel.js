// POST /api/cancel  { id: token }
// Cancela una reserva: borra el evento, libera el bloque, elimina el registro y
// avisa al cliente. Sin ADMIN_KEY solo se permite hasta 48 h antes (hoy la web
// no ofrece cancelar al cliente: las cancelaciones se gestionan por WhatsApp).
import { parseConfig } from "../_lib/slots.js";
import { getBooking, deleteBooking, isModifiable } from "../_lib/booking.js";
import { deleteEvent } from "../_lib/google.js";
import { sendEmail, studioRecipients, formatSession, cancelEmailHtml, whatsappLink } from "../_lib/email.js";

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
    return json({ error: "Ya no se puede cancelar (menos de 48 horas para la grabación)." }, 409);
  }

  try {
    await deleteEvent(env, b.eventId);
  } catch (e) {
    return json({ error: "No se pudo cancelar, intenta de nuevo", detail: String(e) }, 502);
  }
  await deleteBooking(env, b.token);
  // La visita gratuita bloquea el correo hasta su fecha: al cancelarla, se libera.
  if (b.tipo === "visita" && b.email && env.HOLDS) await env.HOLDS.delete(`visita-email:${b.email.toLowerCase()}`);

  // Aviso al cliente y al estudio — best-effort. Se puede silenciar con notify:false
  // (lo usa el portal al cancelar una grabación: el correo "Pod Factory" no aplica a Doppel).
  if (body.notify === false) return json({ ok: true });
  try {
    const { fecha, hora } = formatSession(b.start, config.timeZone);
    if (b.email) {
      await sendEmail(env, {
        to: b.email, subject: "Reserva cancelada · Pod Factory",
        html: cancelEmailHtml({ name: b.name, fecha, hora, whatsappUrl: whatsappLink(env, `Hola Pod Factory, sobre mi reserva cancelada del ${fecha}:`) }),
      });
    }
    if (env.STUDIO_EMAIL) {
      await sendEmail(env, { to: studioRecipients(env), subject: `Reserva CANCELADA: ${b.name} · ${fecha} ${hora} hrs`, html: cancelEmailHtml({ name: b.name, fecha, hora }) });
    }
  } catch (e) {
    console.log("email cancel error:", String(e));
  }

  return json({ ok: true });
}
