// GET /api/cron/reminders?key=<CRON_KEY>
// Llamado cada hora por un cron externo (cron-job.org). Envía dos avisos por reserva:
//  · 72 h antes: último aviso para cambiar la fecha (el plazo vence 48 h antes).
//  · 24 h antes: recordatorio con las reglas del día de grabación.
import { parseConfig, esFlex } from "../../_lib/slots.js";
import { resolverUrl } from "../../_lib/solicitud.js";
import { listBookings, saveBooking, manageUrl } from "../../_lib/booking.js";
import { sendEmail, formatSession, solicitudPendienteHtml, reminderEmailHtml, reminder72EmailHtml, whatsappLink, salidaDe, confirmUrlDe, studioRecipients } from "../../_lib/email.js";

const HOUR_MS = 60 * 60 * 1000;

export async function onRequestGet({ request, env }) {
  // Autenticación simple por clave compartida.
  const key = new URL(request.url).searchParams.get("key");
  if (!env.CRON_KEY || key !== env.CRON_KEY) {
    return new Response("forbidden", { status: 403 });
  }

  const config = parseConfig(env);
  const origin = new URL(request.url).origin;
  const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
  const conditionsUrl = `${config.siteUrl}condiciones.pdf`;
  const now = Date.now();
  const bookings = await listBookings(env);

  let sent72 = 0, sent24 = 0;
  for (const b of bookings) {
    const ms = Date.parse(b.start) - now;
    if (ms <= 0) continue;
    // Solicitud (reunión Meet / visita) todavía sin confirmar: no se recuerda al cliente; si lleva más de 12 h, aviso al equipo (una vez).
    if (b.estado === "pendiente") {
      if (!b.avisoPend && now - Date.parse(b.solicitadoAt || b.start) > 12 * HOUR_MS) {
        try {
          const { fecha, hora } = formatSession(b.start, config.timeZone);
          await sendEmail(env, { to: studioRecipients(env), subject: `Solicitud sin responder: ${b.name} · ${fecha} ${hora} hrs`,
            html: solicitudPendienteHtml({ name: b.name, fecha, hora, tipo: b.tipo, resolverUrl: await resolverUrl(env, origin, b.token) }) });
          await saveBooking(env, { ...b, avisoPend: true });
        } catch (e) { console.log("aviso solicitud pendiente error:", String(e)); }
      }
      continue;
    }
    const { fecha, hora } = formatSession(b.start, config.timeZone);
    const wa = whatsappLink(env, `Hola Pod Factory, sobre mi grabación del ${fecha} a las ${hora} hrs:`);
    // Grabaciones (no visita/llamada/mini-piloto): horario de llegada y salida + pedido de confirmación.
    const esGrabacion = b.tipo !== "visita" && b.tipo !== "llamada" && b.tipo !== "minipiloto";
    const extra = esGrabacion ? {
      salida: salidaDe(b.start, config.timeZone), confirmUrl: confirmUrlDe(origin, b.token), confirmado: !!b.confirmedAt,
      waConfirmUrl: whatsappLink(env, `Confirmo mi grabación del ${fecha} a las ${hora} hrs (reserva ${String(b.token).slice(0, 6)}).`),
    } : {};
    try {
      if (!b.reminded72 && b.tipo !== "visita" && b.tipo !== "llamada" && ms <= 72 * HOUR_MS && ms > 49 * HOUR_MS) { // la visita es gratis: no hay plazo que recordar
        const dl = formatSession(new Date(Date.parse(b.start) - 48 * HOUR_MS).toISOString(), config.timeZone);
        if (b.email) {
          await sendEmail(env, {
            to: b.email,
            subject: "Tu grabación en Pod Factory es en 3 días 🎙️",
            html: reminder72EmailHtml({ name: b.name, fecha, hora, deadline: `${dl.fecha} a las ${dl.hora} hrs`, address, manageUrl: b.portalUrl ? b.portalUrl + '#agendar' : manageUrl(origin, b.token), whatsappUrl: wa, ...extra }),
          });
        }
        await saveBooking(env, { ...b, reminded72: true });
        sent72++;
      } else if (!b.reminded && ms <= (esFlex(b.tipo) ? 3 : 24) * HOUR_MS) { // reunión/visita: aviso el mismo día (3 h antes)
        if (b.email) {
          await sendEmail(env, {
            to: b.email,
            subject: b.tipo === "visita" ? "Recordatorio: tu visita a Pod Factory es hoy 👀" : b.tipo === "llamada" ? "Recordatorio: tu reunión con Pod Factory es hoy 📹" : "Recordatorio: tu grabación en Pod Factory es mañana 🎙️",
            html: reminderEmailHtml({ name: b.name, fecha, hora, address, manageUrl: b.portalUrl ? b.portalUrl + '#agendar' : manageUrl(origin, b.token), whatsappUrl: wa, conditionsUrl, tipo: b.tipo, meetUrl: b.meetUrl, mismoDia: esFlex(b.tipo), ...extra }),
          });
        }
        // Grabación sin confirmar a 24 h: aviso al equipo para llamar o escribir por WhatsApp.
        if (esGrabacion && !b.confirmedAt) {
          const tel = String(b.phone || "").replace(/\D/g, "");
          const waCliente = tel ? `https://wa.me/${tel.length === 9 ? "56" + tel : tel}?text=${encodeURIComponent(`Hola ${b.name || ""}, te escribimos de Pod Factory para confirmar tu grabación de mañana ${fecha}: llegada ${hora} y salida ${extra.salida} hrs. ¿Nos confirmas?`)}` : "";
          try {
            await sendEmail(env, { to: studioRecipients(env), subject: `Sin confirmar: ${b.projectName || b.name} mañana ${hora} hrs`,
              html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5"><p><b>${b.projectName || b.name}</b> no ha confirmado su grabación de mañana <b>${fecha}, ${hora} a ${extra.salida} hrs</b>.</p><p>Contacto: ${b.name || "—"} · ${b.email || "—"} · ${b.phone || "sin teléfono"}</p>${waCliente ? `<p><a href="${waCliente}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:700">Escribirle por WhatsApp</a></p>` : ""}</div>` });
          } catch (e) { console.log("aviso sin confirmar error:", String(e)); }
        }
        await saveBooking(env, { ...b, reminded: true });
        sent24++;
      }
    } catch (e) {
      // No marcamos el aviso: se reintenta en la próxima corrida.
      console.log("reminder error:", b.token, String(e));
    }
  }

  return new Response(JSON.stringify({ checked: bookings.length, sent72, sent24 }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
