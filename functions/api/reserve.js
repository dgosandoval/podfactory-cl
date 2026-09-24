// POST /api/reserve — reserva web de la visita al estudio (gratis) o del mini-piloto (pagado).
//  · visita: se confirma al tiro (evento + correos), sin pago.
//  · minipiloto: "congela" el bloque en KV durante HOLD_MINUTES y crea la preferencia de
//    MercadoPago; se confirma en /api/mp-webhook cuando el pago queda aprobado.
import { parseConfig, configFor, buildSlots, weekday, overlapsBusy, SERVICES } from "../_lib/slots.js";
import { getBusy } from "../_lib/google.js";
import { confirmBooking } from "../_lib/confirm.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const svc = SERVICES[body?.tipo];
  if (!svc) return json({ error: "Elige visita o mini-piloto" }, 400);
  const config = configFor(parseConfig(env), svc.key);

  const { date, start, label } = body;
  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 160);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const empresa = String(body.empresa || "").trim().slice(0, 120);
  const comentarios = String(body.comentarios || "").slice(0, 500);
  const personas = Math.min(4, Math.max(1, parseInt(body.personas, 10) || 1));
  const rut = String(body.rut || "").trim().slice(0, 20);
  const razonSocial = String(body.razonSocial || "").trim().slice(0, 120);
  const giro = String(body.giro || "").trim().slice(0, 120);
  if (!date || !start || !label || !name || !email || !phone) return json({ error: "Faltan datos de la reserva" }, 400);
  if (!/\S+@\S+\.\S+/.test(email)) return json({ error: "Email inválido" }, 400);
  if (phone.replace(/\D/g, "").length < 8) return json({ error: "Teléfono inválido" }, 400);
  if (rut && !/^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/.test(rut)) return json({ error: "RUT inválido (ej: 12.345.678-9)" }, 400);
  if (body.acepta !== true) return json({ error: "Debes aceptar las condiciones" }, 400);

  // Anti-abuso de la visita gratuita: máx. 3 por IP al día y 1 visita futura por correo.
  if (svc.key === "visita" && env.HOLDS) {
    const ip = request.headers.get("cf-connecting-ip") || "0";
    const k = `visita-rate:${ip}`;
    const n = parseInt((await env.HOLDS.get(k)) || "0", 10);
    if (n >= 3) return json({ error: "Demasiadas reservas desde esta conexión. Escríbenos por WhatsApp." }, 429);
    await env.HOLDS.put(k, String(n + 1), { expirationTtl: 86400 });
    const ek = `visita-email:${email.toLowerCase()}`;
    if (await env.HOLDS.get(ek)) return json({ error: "Ya tienes una visita agendada. Si necesitas cambiarla, usa el link del correo de confirmación." }, 409);
  }

  // 1) El bloque debe ser uno válido de la grilla del servicio, en día abierto y futuro.
  if (!config.openDays.includes(weekday(date, config.timeZone))) return json({ error: "Día no disponible" }, 400);
  const slot = buildSlots(date, config).find((s) => s.start === start && s.label === label);
  if (!slot) return json({ error: "Bloque no válido" }, 400);
  if (Date.parse(slot.start) <= Date.now()) return json({ error: "Ese bloque ya pasó" }, 400);

  // 2) ¿Sigue libre? (hold vigente o evento en el calendario)
  const holdKey = `hold:${date}:${label}`;
  if (env.HOLDS && (await env.HOLDS.get(holdKey))) return json({ error: "Ese horario está siendo reservado por otra persona. Elige otro." }, 409);
  try {
    const busy = await getBusy(env, slot.start, slot.end);
    if (overlapsBusy(slot, busy)) return json({ error: "Ese horario ya no está disponible." }, 409);
  } catch (e) {
    if (!env.MOCK_AVAILABILITY) return json({ error: "No se pudo verificar disponibilidad", detail: String(e) }, 502);
  }

  const origin = new URL(request.url).origin;
  const data = { consent: body.acepta === true, tipo: svc.key, start: slot.start, end: slot.end, date, label, name, email, phone, empresa, personas, comentarios, rut, razonSocial, giro };

  // Visita: confirmación inmediata.
  if (svc.key === "visita") {
    try {
      const r = await confirmBooking(env, config, origin, { ...data, paid: 0 });
      if (env.HOLDS) await env.HOLDS.put(`visita-email:${email.toLowerCase()}`, r.token, { expirationTtl: Math.max(60, Math.floor((Date.parse(slot.start) - Date.now()) / 1000)) });
      return json({ ok: true, confirmed: true, fecha: r.fecha, hora: r.hora });
    } catch (e) {
      return json({ error: "No pudimos agendar la visita", detail: String(e) }, 502);
    }
  }

  // Mini-piloto: pago por MercadoPago.
  if (!env.MP_ACCESS_TOKEN) return json({ error: "MercadoPago aún no está configurado (falta MP_ACCESS_TOKEN)." }, 503);
  if (env.HOLDS) await env.HOLDS.put(holdKey, JSON.stringify({ ...data, amount: svc.price }), { expirationTtl: config.holdMinutes * 60 });
  const expiresAt = new Date(Date.now() + config.holdMinutes * 60000).toISOString();
  const pref = {
    items: [{ title: `Mini-piloto Pod Factory · ${date} ${label} hrs`, description: "10 minutos de grabación en el estudio, IVA incluido.", quantity: 1, currency_id: "CLP", unit_price: svc.price }],
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
    if (env.HOLDS) await env.HOLDS.delete(holdKey);
    return json({ error: "No se pudo iniciar el pago", detail: await res.text() }, 502);
  }
  const out = await res.json();
  return json({ init_point: out.init_point, preference_id: out.id });
}
