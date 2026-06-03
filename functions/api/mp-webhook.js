// POST /api/mp-webhook
// MercadoPago notifica aquí cada cambio de pago. Si el pago está aprobado,
// creamos el evento confirmado en Google Calendar y liberamos el hold.
import { parseConfig } from "../_lib/slots.js";
import { createEvent } from "../_lib/google.js";

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

  const holdKey = `hold:${date}:${label}`;
  const hold = env.HOLDS ? await env.HOLDS.get(holdKey, "json") : null;
  // Reconstruir datos desde el hold (o desde el pago si el hold ya expiró).
  const start = hold?.start;
  const end = hold?.end;
  const name = hold?.name || pay.payer?.first_name || "Cliente";
  const email = hold?.email || pay.payer?.email || "";
  const phone = hold?.phone || "";
  if (!start || !end) return ok(); // sin ventana horaria no podemos agendar

  try {
    await createEvent(env, {
      summary: `🎙️ Reserva: ${name}`,
      description: `Reserva confirmada vía web.\nCliente: ${name}\nEmail: ${email}\nTel: ${phone}\nAdelanto pagado: $${config.depositCLP.toLocaleString("es-CL")} (MercadoPago ${paymentId})\nSaldo a pagar el día de la sesión.`,
      startISO: start,
      endISO: end,
      timeZone: config.timeZone,
    });
    if (env.HOLDS) {
      await env.HOLDS.put(dedupeKey, "1", { expirationTtl: 60 * 60 * 24 * 7 });
      await env.HOLDS.delete(holdKey);
    }
  } catch (e) {
    // No marcamos como confirmado: MercadoPago reintentará y volveremos a intentar.
    return new Response(`retry: ${e}`, { status: 500 });
  }

  return ok();
}
