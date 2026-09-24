// GET /api/cron/reminders?key=<CRON_KEY>
// Llamado cada hora por un cron externo (cron-job.org). Envía dos avisos por reserva:
//  · 72 h antes: último aviso para cambiar la fecha (el plazo vence 48 h antes).
//  · 24 h antes: recordatorio con las reglas del día de grabación.
import { parseConfig } from "../../_lib/slots.js";
import { listBookings, saveBooking, manageUrl } from "../../_lib/booking.js";
import { sendEmail, formatSession, reminderEmailHtml, reminder72EmailHtml, whatsappLink } from "../../_lib/email.js";

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
    const { fecha, hora } = formatSession(b.start, config.timeZone);
    const wa = whatsappLink(env, `Hola Pod Factory, sobre mi grabación del ${fecha} a las ${hora} hrs:`);
    try {
      if (!b.reminded72 && b.tipo !== "visita" && ms <= 72 * HOUR_MS && ms > 49 * HOUR_MS) { // la visita es gratis: no hay plazo que recordar
        const dl = formatSession(new Date(Date.parse(b.start) - 48 * HOUR_MS).toISOString(), config.timeZone);
        if (b.email) {
          await sendEmail(env, {
            to: b.email,
            subject: "Tu grabación en Pod Factory es en 3 días 🎙️",
            html: reminder72EmailHtml({ name: b.name, fecha, hora, deadline: `${dl.fecha} a las ${dl.hora} hrs`, address, manageUrl: manageUrl(origin, b.token), whatsappUrl: wa }),
          });
        }
        await saveBooking(env, { ...b, reminded72: true });
        sent72++;
      } else if (!b.reminded && ms <= 24 * HOUR_MS) {
        if (b.email) {
          await sendEmail(env, {
            to: b.email,
            subject: b.tipo === "visita" ? "Recordatorio: tu visita a Pod Factory es mañana 👀" : "Recordatorio: tu grabación en Pod Factory es mañana 🎙️",
            html: reminderEmailHtml({ name: b.name, fecha, hora, address, manageUrl: manageUrl(origin, b.token), whatsappUrl: wa, conditionsUrl, tipo: b.tipo }),
          });
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
