// POST /api/cancel  { id: token }
// Cancela una reserva: borra el evento, libera el bloque, elimina el registro y
// avisa al cliente. Sin ADMIN_KEY solo se permite hasta 36 h antes (hoy la web
// no ofrece cancelar al cliente: las cancelaciones se gestionan por WhatsApp).
import { parseConfig, esFlex } from "../_lib/slots.js";
import { getBooking, deleteBooking, isModifiable } from "../_lib/booking.js";
import { deleteEvent } from "../_lib/google.js";
import { sendEmail, studioRecipients, formatSession, cancelEmailHtml, whatsappLink, correosDe } from "../_lib/email.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const config = parseConfig(env);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const b = await getBooking(env, body?.id);
  if (!b) return json({ error: "Reserva no encontrada" }, 404);
  const isAdmin = env.ADMIN_KEY && request.headers.get("x-admin-key") === env.ADMIN_KEY;
  const esHub = env.PORTAL_INTAKE_SECRET && request.headers.get("x-intake-secret") === env.PORTAL_INTAKE_SECRET;
  // Grabación comprada en el portal: el cambio va por el portal (si no, el hub no descuenta ni devuelve el capítulo).
  if (b.compraId && !esHub && !isAdmin) return json({ error: "Esta grabación se cambia o cancela desde tu portal de cliente.", portalUrl: b.portalUrl || null }, 409);
  // Las grabaciones de Doppel (calendario de Domingo) las gestiona Domingo desde el hub: la regla de 36 h es de Pod Factory y no les aplica.
  if (!isAdmin && !(esHub && b.calendarId) && !esFlex(b.tipo) && !isModifiable(b.start)) {
    return json({ error: "Ya no se puede cancelar (menos de 36 horas para la grabación)." }, 409);
  }

  try {
    // Adoptada (el evento ya estaba en el calendario de Domingo, p. ej. la invitación del cliente): solo se desvincula, NUNCA se borra un evento ajeno.
    if (!b.adoptado) await deleteEvent(env, b.eventId, b.calendarId); // calendarId: solo las reservas de Doppel (calendario de Domingo); el resto, el del estudio
  } catch (e) {
    return json({ error: "No se pudo cancelar, intenta de nuevo", detail: String(e) }, 502);
  }
  await deleteBooking(env, b.token);
  // Lo gratuito (visita, llamada) bloquea el correo hasta su fecha: al cancelarlo, se libera.
  if ((b.tipo === "visita" || b.tipo === "llamada") && b.email && env.HOLDS) await env.HOLDS.delete(`${b.tipo}-email:${b.email.toLowerCase()}`);

  // Aviso al cliente y al estudio — best-effort. Se puede silenciar con notify:false
  // (lo usa el portal al cancelar una grabación: el correo "Pod Factory" no aplica a Doppel).
  // Los datos de la reserva cancelada van en la respuesta: el hub los usa para avisar por WhatsApp (el registro ya no existe).
  const datos = { ok: true, start: b.start, end: b.end, name: b.name, email: b.email, phone: b.phone || "", tipo: b.tipo, brand: b.brand || "podfactory", projectName: b.projectName || null, adoptado: !!b.adoptado, eventoTitulo: b.eventoTitulo || null };
  if (body.notify === false) return json(datos);
  try {
    const { fecha, hora } = formatSession(b.start, config.timeZone);
    if (correosDe(b.email).length) {
      await sendEmail(env, {
        to: correosDe(b.email), subject: "Reserva cancelada · Pod Factory",
        html: cancelEmailHtml({ name: b.name, fecha, hora, portalUrl: b.portalUrl || null, whatsappUrl: whatsappLink(env, `Hola Pod Factory, sobre mi reserva cancelada del ${fecha}:`) }),
      });
    }
    if (env.STUDIO_EMAIL) {
      await sendEmail(env, { to: studioRecipients(env), subject: `Reserva CANCELADA: ${b.name} · ${fecha} ${hora} hrs`, html: cancelEmailHtml({ name: b.name, fecha, hora }) });
    }
  } catch (e) {
    console.log("email cancel error:", String(e));
  }

  return json(datos);
}
