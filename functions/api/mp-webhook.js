// POST /api/mp-webhook
// MercadoPago notifica aquí cada cambio de pago. Si el pago está aprobado, se confirma
// la reserva (mini-piloto) con confirmBooking y se libera el hold.
import { parseConfig } from "../_lib/slots.js";
import { configFor } from "../_lib/slots.js";
import { confirmBooking } from "../_lib/confirm.js";
import { sendEmail } from "../_lib/email.js";

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
  if (!hold?.start || !hold?.end) {
    // El pago se aprobó después de que venció el bloqueo del horario (ej. pago tardío):
    // no hay horario seguro. Se avisa al estudio para agendarlo a mano y se responde OK
    // (reintentar no lo arreglaría). El pago queda registrado en el correo.
    console.log("mp-webhook: pago aprobado sin hold", paymentId, date, label);
    try {
      await sendEmail(env, {
        to: env.STUDIO_EMAIL || "hola@doppel.cl",
        subject: `⚠️ Pago aprobado sin horario confirmado · ${date} ${label} hrs`,
        html: `<p>MercadoPago aprobó un pago pero el bloqueo del horario ya había vencido, así que <b>no se agendó automáticamente</b>.</p>
          <p>Pago: ${paymentId} · $${Number(pay.transaction_amount || 0).toLocaleString("es-CL")}<br>
          Horario pedido: ${date} ${label} hrs<br>
          Pagador: ${pay.payer?.email || "—"}</p>
          <p>Revisa si el horario sigue libre y agéndalo desde el hub, o contacta al cliente.</p>`,
      });
    } catch (e) { console.log("aviso de pago sin hold falló:", String(e)); }
    return ok();
  }
  const origin = new URL(request.url).origin;
  // ID determinístico del evento = idempotencia fuerte (Google Calendar rechaza el 2º insert).
  const eventId = ("pf" + String(paymentId)).toLowerCase().replace(/[^a-v0-9]/g, "");
  try {
    await confirmBooking(env, configFor(config, hold.tipo), origin, {
      ...hold, eventId, paid: Number(pay.transaction_amount) || hold.amount || 0, paymentId: String(paymentId),
      name: hold.name || pay.payer?.first_name || "Cliente", email: hold.email || pay.payer?.email || "",
    });
    if (env.HOLDS) await env.HOLDS.delete(holdKey);
  } catch (e) {
    if (String(e.message) === "DUPLICATE_EVENT") return ok(); // notificación repetida
    if (env.HOLDS) await env.HOLDS.delete(dedupeKey);          // que MercadoPago reintente
    return new Response(`retry: ${e}`, { status: 500 });
  }
  return ok();
}
