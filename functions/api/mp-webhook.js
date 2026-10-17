// POST /api/mp-webhook
// MercadoPago notifica aquí cada cambio de pago. Si el pago está aprobado, se confirma
// la reserva (mini-piloto) con confirmBooking y se libera el hold.
import { parseConfig } from "../_lib/slots.js";
import { configFor } from "../_lib/slots.js";
import { confirmBooking } from "../_lib/confirm.js";
import { sendEmail, studioRecipients } from "../_lib/email.js";

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
  const ref = String(pay.external_reference || "");

  // Pack de créditos de Pulse · Autoservicio: external_reference = "hubcreditos:<compraCreditosId>". Es la ÚNICA rama que también reenvía los pagos revertidos
  // (refunded / charged_back / cancelled), con su status: el hub descuenta los créditos que ya había dado. El hub es idempotente por compra y por pago.
  if (ref.startsWith("hubcreditos:")) {
    const REVERSAS = ["refunded", "charged_back", "cancelled"];
    if (pay.status !== "approved" && !REVERSAS.includes(pay.status)) return ok(); // pending, in_process, rejected…: aún no hay nada que hacer
    const compraCreditosId = Number(ref.split(":")[1]);
    if (!Number.isInteger(compraCreditosId) || compraCreditosId < 1) { console.log("mp-webhook: hubcreditos con referencia inválida", paymentId, ref); return ok(); }
    // Los packs se cobran SIEMPRE en CLP. Otra moneda no se manda al hub: se avisa al estudio para revisarlo a mano.
    if (String(pay.currency_id || "") !== "CLP") {
      console.error("mp-webhook: hubcreditos con moneda distinta de CLP", paymentId, pay.currency_id);
      try {
        await sendEmail(env, { to: studioRecipients(env), subject: `⚠️ Pago de créditos Pulse en moneda ${pay.currency_id || "desconocida"} (no se acreditó)`,
          html: `<p>MercadoPago informó el pago <b>${String(paymentId)}</b> (${pay.status}) de la compra de créditos <b>${ref}</b> en moneda <b>${pay.currency_id || "?"}</b>, no CLP. No se mandó al hub; revísalo a mano.</p>` });
      } catch (e) { console.log("aviso de moneda distinta falló:", String(e)); }
      return ok();
    }
    if (!env.HUB_LEAD_URL || !env.PORTAL_INTAKE_SECRET) return new Response("hub no configurado", { status: 500 });
    const r = await fetch(new URL("/api/intake/pulse-creditos", env.HUB_LEAD_URL).toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-intake-secret": env.PORTAL_INTAKE_SECRET },
      body: JSON.stringify({ compraCreditosId, paymentId: String(paymentId), amount: Number(pay.transaction_amount) || 0, status: pay.status }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (r.ok) return ok();
    const detalle = (await r.text()).slice(0, 200);
    // Un 4xx del hub es definitivo (datos que reintentar no arregla: compra inexistente, cuerpo inválido): se registra y se responde 200 para que MercadoPago deje de reintentar.
    // Salvo 401/403 (secreto mal configurado: se arregla y el reintento sí sirve), 408 y 429 (transitorios). 5xx y errores de red (status 0): 500 → MercadoPago reintenta.
    if (r.status >= 400 && r.status < 500 && ![401, 403, 408, 429].includes(r.status)) {
      console.log("mp-webhook: hub rechazó definitivamente el pago de créditos", paymentId, pay.status, r.status, detalle);
      try {
        await sendEmail(env, { to: studioRecipients(env), subject: `⚠️ El hub rechazó un pago de créditos Pulse (${r.status})`,
          html: `<p>MercadoPago informó el pago <b>${String(paymentId)}</b> (${pay.status}, $${Number(pay.transaction_amount) || 0}) de <b>${ref}</b>, pero el hub respondió <b>${r.status}</b>: ${detalle.replace(/</g, "&lt;")}. No se reintentará; revísalo a mano.</p>` });
      } catch (e) { console.log("aviso de rechazo del hub falló:", String(e)); }
      return ok();
    }
    return new Response(`retry: hub ${r.status} ${detalle}`, { status: 500 });
  }

  if (pay.status !== "approved") return ok();

  // Compra de capítulos desde el portal del hub: external_reference = "hubcompra:<id>:<cuota>".
  // El hub confirma el pago (idempotente) y habilita agendar. Si el hub falla, 500 → MercadoPago reintenta.
  if (ref.startsWith("hubcompra:")) {
    const [, compraId, cuota] = ref.split(":");
    if (!env.HUB_LEAD_URL || !env.PORTAL_INTAKE_SECRET) return new Response("hub no configurado", { status: 500 });
    const r = await fetch(new URL("/api/intake/pago-compra", env.HUB_LEAD_URL).toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-intake-secret": env.PORTAL_INTAKE_SECRET },
      body: JSON.stringify({ compraId: Number(compraId), cuota: Number(cuota), paymentId: String(paymentId), amount: Number(pay.transaction_amount) || 0 }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (!r.ok) return new Response(`retry: hub ${r.status} ${(await r.text()).slice(0, 200)}`, { status: 500 });
    return ok();
  }

  // Pago de una factura desde el correo del hub: external_reference = "hubfactura:<id>". El hub la marca pagada (idempotente).
  if (ref.startsWith("hubfactura:")) {
    const facturaId = Number(ref.split(":")[1]);
    if (!env.HUB_LEAD_URL || !env.PORTAL_INTAKE_SECRET) return new Response("hub no configurado", { status: 500 });
    const r = await fetch(new URL("/api/intake/pago-factura", env.HUB_LEAD_URL).toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-intake-secret": env.PORTAL_INTAKE_SECRET },
      body: JSON.stringify({ facturaId, paymentId: String(paymentId), amount: Number(pay.transaction_amount) || 0 }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (!r.ok) return new Response(`retry: hub ${r.status} ${(await r.text()).slice(0, 200)}`, { status: 500 });
    return ok();
  }

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
        to: studioRecipients(env),
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
