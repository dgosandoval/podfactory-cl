// POST /api/reserve
// Reserva del capítulo piloto (se paga completo, IVA incluido). Valida el bloque,
// lo "congela" en KV durante HOLD_MINUTES y crea la preferencia de pago de
// MercadoPago. Devuelve { init_point } para redirigir al checkout.
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
  const tipo = "Capítulo piloto";
  const personas = Math.min(4, Math.max(1, parseInt(body.personas, 10) || 1));
  const addons = [];
  const comentarios = String(body.comentarios || "").slice(0, 500);
  // Datos de facturación (la factura se emite con el pago).
  const rut = String(body.rut || "").trim().slice(0, 20);
  const razonSocial = String(body.razonSocial || "").trim().slice(0, 120);
  const giro = String(body.giro || "").trim().slice(0, 120);
  if (!/\S+@\S+\.\S+/.test(email)) return json({ error: "Email inválido" }, 400);
  if (!/^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/.test(rut)) return json({ error: "RUT inválido (ej: 12.345.678-9)" }, 400);
  if (!razonSocial) return json({ error: "Falta la razón social o el nombre para la factura" }, 400);
  if (body.acepta !== true) return json({ error: "Debes aceptar las condiciones del estudio" }, 400);

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
  const holdPayload = { start: slot.start, end: slot.end, label, name, email, phone, date, tipo, personas, addons, comentarios, rut, razonSocial, giro };
  if (env.HOLDS) await env.HOLDS.put(holdKey, JSON.stringify(holdPayload), { expirationTtl: config.holdMinutes * 60 });

  // 4) Crear preferencia de pago en MercadoPago (Checkout Pro).
  const origin = new URL(request.url).origin;
  const expiresAt = new Date(Date.now() + config.holdMinutes * 60000).toISOString();
  const pref = {
    items: [{
      title: `Capítulo piloto Pod Factory · ${date} ${label} hrs`,
      description: "Pago total del capítulo piloto, IVA incluido.",
      quantity: 1,
      currency_id: "CLP",
      unit_price: config.depositCLP,
    }],
    payer: { name, email },
    external_reference: `${date}__${label}`,
    back_urls: {
      success: `${config.siteUrl}?reserva=ok`,
      failure: `${config.siteUrl}?reserva=error`,
      pending: `${config.siteUrl}?reserva=pendiente`,
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
