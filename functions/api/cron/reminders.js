// GET /api/cron/reminders?key=<CRON_KEY>
// Llamado cada hora por un cron externo (cron-job.org). Envía el recordatorio
// a las reservas cuya sesión es dentro de las próximas 24 h y aún no avisadas.
import { parseConfig } from "../../_lib/slots.js";
import { listBookings, saveBooking, manageUrl } from "../../_lib/booking.js";
import { sendEmail, formatSession, reminderEmailHtml } from "../../_lib/email.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function onRequestGet({ request, env }) {
  // Autenticación simple por clave compartida.
  const key = new URL(request.url).searchParams.get("key");
  if (!env.CRON_KEY || key !== env.CRON_KEY) {
    return new Response("forbidden", { status: 403 });
  }

  const config = parseConfig(env);
  const origin = new URL(request.url).origin;
  const now = Date.now();
  const bookings = await listBookings(env);

  let sent = 0;
  for (const b of bookings) {
    const ms = Date.parse(b.start) - now;
    if (b.reminded || ms <= 0 || ms > DAY_MS) continue; // ya avisada, pasada, o aún lejos
    try {
      const { fecha, hora } = formatSession(b.start, config.timeZone);
      const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
      if (b.email) {
        await sendEmail(env, {
          to: b.email,
          subject: "Recordatorio: tu sesión en Pod Factory es mañana 🎙️",
          html: reminderEmailHtml({ name: b.name, fecha, hora, address, manageUrl: manageUrl(origin, b.token) }),
        });
      }
      await saveBooking(env, { ...b, reminded: true });
      sent++;
    } catch (e) {
      // No marcamos reminded: se reintenta en la próxima corrida.
      console.log("reminder error:", b.token, String(e));
    }
  }

  return new Response(JSON.stringify({ checked: bookings.length, sent }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
