// POST /api/reserve
// Valida el bloque, lo "congela" en KV durante HOLD_MINUTES y crea la preferencia
// de pago de MercadoPago. Devuelve { init_point } para redirigir al checkout.
import { parseConfig, buildSlots, weekday, overlapsBusy } from "../_lib/slots.js";
import { getBusy } from "../_lib/google.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const config = parseConfig(env);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const { date, start, label, name, email, phone } = body || {};
  if (!date || !start || !label || !name || !email || !phone) {
    return json({ error: "Faltan datos de la reserva" }, 400);
  }
  // Servicios (opcionales) — saneados.
  const ALLOWED_ADDONS = ["Teaser", "3 Reels adicionales"];
  const tipo = body.tipo === "Webinar / Streaming" ? "Webinar / Streaming" : "Podcast";
  const personas = Math.min(4, Math.max(1, parseInt(body.personas, 10) || 1));
  const addons = Array.isArray(body.addons) ? body.addons.filter((a) => ALLOWED_ADDONS.includes(a)) : [];
  const comentarios = String(body.comentarios || "").slice(0, 500);
  if (!/\S+@\S+\.\S+/.test(email)) return json({ error: "Email inválido" }, 400);

  // 1) El bloque debe ser uno válido de la grilla y en día abierto.
  if (!config.openDays.includes(weekday(date, config.timeZone))) return json({ error: "Día no disponible" }, 400);
  const slot = buildSlots(date, config).find((s) => s.start === start && s.label === label);
  if (!slot) return json({ error: "Bloque no válido" }, 400);
  if (Date.parse(slot.start) <= Date.now()) return json({ error: "Ese bloque ya pasó" }, 400);

  const holdKey = `hold:${date}:${label}`;

  // 2) ¿Sigue libre? (otro hold vigente o evento en el calendario)
  if (env.HOLDS) {
    const existing = await env.HOLDS.get(holdKey);
    if (existing) return json({ error: "Ese bloque está siendo reservado por otra persona. Elige otro." }, 409);
  }
  try {
    const busy = await getBusy(env, slot.start, slot.end);
    if (overlapsBusy(slot, busy)) return json({ error: "Ese bloque ya no está disponible." }, 409);
  } catch (e) {
    // Si Google no está configurado aún, no bloqueamos la prueba pero avisamos.
    if (!env.MOCK_AVAILABILITY) return json({ error: "No se pudo verificar disponibilidad", detail: String(e) }, 502);
  }

  if (!env.MP_ACCESS_TOKEN) {
    return json({ error: "MercadoPago aún no está configurado (falta MP_ACCESS_TOKEN)." }, 503);
  }

  // 3) Congelar el bloque (expira solo si no se paga).
  const holdPayload = { start: slot.start, end: slot.end, label, name, email, phone, date, tipo, personas, addons, comentarios };
  if (env.HOLDS) await env.HOLDS.put(holdKey, JSON.stringify(holdPayload), { expirationTtl: config.holdMinutes * 60 });

  // 4) Crear preferencia de pago en MercadoPago (Checkout Pro).
  const origin = new URL(request.url).origin;
  const expiresAt = new Date(Date.now() + config.holdMinutes * 60000).toISOString();
  const pref = {
    items: [{
      title: `Reserva Pod Factory · ${date} ${label} hrs`,
      description: "Adelanto de sesión de grabación (se descuenta del total).",
      quantity: 1,
      currency_id: "CLP",
      unit_price: config.depositCLP,
    }],
    payer: { name, email },
    external_reference: `${date}__${label}`,
    back_urls: {
      success: `${origin}/?reserva=ok`,
      failure: `${origin}/?reserva=error`,
      pending: `${origin}/?reserva=pendiente`,
    },
    auto_return: "approved",
    notification_url: `${origin}/api/mp-webhook`,
    expires: true,
    expiration_date_to: expiresAt,
    statement_descriptor: "POD FACTORY",
  };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(pref),
  });
  if (!res.ok) {
    if (env.HOLDS) await env.HOLDS.delete(holdKey); // libera si falló el pago
    return json({ error: "No se pudo iniciar el pago", detail: await res.text() }, 502);
  }
  const out = await res.json();
  return json({ init_point: out.init_point, preference_id: out.id });
}
