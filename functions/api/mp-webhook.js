// POST /api/mp-webhook
// MercadoPago notifica aquí cada cambio de pago. Si el pago está aprobado,
// creamos el evento confirmado en Google Calendar y liberamos el hold.
import { parseConfig } from "../_lib/slots.js";
import { createEvent } from "../_lib/google.js";
import { sendEmail, formatSession, customerEmailHtml, studioEmailHtml, icsAttachment, whatsappLink } from "../_lib/email.js";
import { newToken, saveBooking, manageUrl } from "../_lib/booking.js";

// MercadoPago espera 200 siempre que recibamos la notificación; reintenta si no.
const ok = () => new Response("ok", { status: 200 });

export async function onRequestPost({ request, env }) {
  const config = parseConfig(env);
  const url = new URL(request.url);

  // El id del pago llega por query (?type=payment&data.id=) o por body JSON.
  let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
  let topic = url.searchParams.get("type") || url.searchParams.get("topic");
  try {
    const body = await request.json();
    paymentId = paymentId || body?.data?.id || body?.id;
    topic = topic || body?.type || body?.action;
  } catch { /* sin body, usamos query */ }

  if (!paymentId || (topic && !String(topic).includes("payment"))) return ok();
  if (!env.MP_ACCESS_TOKEN) return ok();

  // Evitar procesar dos veces el mismo pago (MercadoPago reintenta).
  const dedupeKey = `confirmed:${paymentId}`;
  if (env.HOLDS && (await env.HOLDS.get(dedupeKey))) return ok();

  // Consultar el pago real (nunca confiar en el body).
  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!payRes.ok) return ok();
  const pay = await payRes.json();
  if (pay.status !== "approved") return ok();

  // external_reference = "YYYY-MM-DD__HH:MM"
  const [date, label] = String(pay.external_reference || "").split("__");
  if (!date || !label) return ok();

  // Anti-duplicado: re-chequear y "reclamar" el pago ANTES de crear el evento.
  // (MercadoPago entrega la misma notificación más de una vez.)
  if (env.HOLDS) {
    if (await env.HOLDS.get(dedupeKey)) return ok();
    await env.HOLDS.put(dedupeKey, "1", { expirationTtl: 60 * 60 * 24 * 7 });
  }

  const holdKey = `hold:${date}:${label}`;
  const hold = env.HOLDS ? await env.HOLDS.get(holdKey, "json") : null;
  // Reconstruir datos desde el hold (o desde el pago si el hold ya expiró).
  const start = hold?.start;
  const end = hold?.end;
  const name = hold?.name || pay.payer?.first_name || "Cliente";
  const email = hold?.email || pay.payer?.email || "";
  const phone = hold?.phone || "";
  const tipo = hold?.tipo || "Podcast";
  const personas = hold?.personas || 1;
  const addons = hold?.addons || [];
  const comentarios = hold?.comentarios || "";
  if (!start || !end) return ok(); // sin ventana horaria no podemos agendar

  const serviciosTxt = `Tipo: ${tipo} · Personas: ${personas}${addons.length ? ` · Adicionales: ${addons.join(", ")}` : ""}${comentarios ? `\nComentarios: ${comentarios}` : ""}`;

  const token = newToken();
  try {
    const ev = await createEvent(env, {
      summary: `🎙️ Reserva: ${name}`,
      description: `Reserva confirmada vía web.\nCliente: ${name}\nEmail: ${email}\nTel: ${phone}\n${serviciosTxt}\nAdelanto pagado: $${config.depositCLP.toLocaleString("es-CL")} (MercadoPago ${paymentId})\nSaldo a pagar el día de la sesión.\nGestión: ${date} ${label} · token ${token}`,
      startISO: start,
      endISO: end,
      timeZone: config.timeZone,
    });
    // Persistir la reserva para gestión (cancelar/reagendar) y recordatorio.
    await saveBooking(env, { token, eventId: ev.id, date, label, start, end, name, email, phone, tipo, personas, addons, comentarios, deposit: config.depositCLP, reminded: false });
    if (env.HOLDS) await env.HOLDS.delete(holdKey);
  } catch (e) {
    // Falló: liberamos la marca para que MercadoPago pueda reintentar.
    if (env.HOLDS) await env.HOLDS.delete(dedupeKey);
    return new Response(`retry: ${e}`, { status: 500 });
  }

  // Correos de confirmación — best-effort: un fallo aquí NO debe revertir la reserva.
  try {
    const { fecha, hora } = formatSession(start, config.timeZone);
    const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
    const origin = new URL(request.url).origin;
    if (email) {
      const ics = icsAttachment({
        uid: token, start, end,
        summary: "Sesión Pod Factory", location: address,
        description: `Tu sesión de grabación en Pod Factory (${tipo}, ${personas} personas). Saldo a pagar el día de la sesión.`,
      });
      await sendEmail(env, {
        to: email,
        subject: "Tu reserva en Pod Factory está confirmada 🎙️",
        html: customerEmailHtml({
          name, fecha, hora, deposit: config.depositCLP, address,
          manageUrl: manageUrl(origin, token),
          whatsappUrl: whatsappLink(env, `Hola Pod Factory, sobre mi reserva del ${fecha} a las ${hora} hrs:`),
        }),
        attachments: [ics],
      });
    }
    if (env.STUDIO_EMAIL) {
      await sendEmail(env, {
        to: env.STUDIO_EMAIL,
        subject: `Nueva reserva: ${name} · ${fecha} ${hora} hrs`,
        html: studioEmailHtml({ name, email, phone, fecha, hora, deposit: config.depositCLP, tipo, personas, addons, comentarios }),
        replyTo: email,
      });
    }
  } catch (e) {
    console.log("email error (reserva igual confirmada):", String(e));
  }

  return ok();
}
