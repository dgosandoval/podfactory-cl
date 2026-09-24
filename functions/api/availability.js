// GET /api/availability?date=YYYY-MM-DD
// Devuelve los bloques del día con su estado (disponible / ocupado).
import { parseConfig, getOffset, availabilityForDate, configFor, SERVICES } from "../_lib/slots.js";
import { getBusy } from "../_lib/google.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Ocupados de mentira para probar el calendario sin Google (modo MOCK_AVAILABILITY).
function mockBusy(dateStr, config) {
  const off = getOffset(dateStr, config.timeZone);
  // Ocupa el 2º y 4º bloque del día como ejemplo.
  return [config.slotStarts[1], config.slotStarts[3]].filter(Boolean).map((hhmm) => {
    const s = Date.parse(`${dateStr}T${hhmm}:00${off}`);
    return { start: new Date(s).toISOString(), end: new Date(s + config.slotMinutes * 60000).toISOString() };
  });
}

// Holds temporales (reservas en proceso de pago) guardados en KV.
async function getHolds(env, dateStr) {
  if (!env.HOLDS) return [];
  const list = await env.HOLDS.list({ prefix: `hold:${dateStr}:` });
  const holds = await Promise.all(list.keys.map((k) => env.HOLDS.get(k.name, "json")));
  return holds.filter(Boolean).map((h) => ({ start: h.start, end: h.end }));
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");
  const config = configFor(parseConfig(env), tipo);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "Parámetro 'date' inválido (YYYY-MM-DD)" }, 400);
  }

  try {
    let busy;
    if (env.MOCK_AVAILABILITY) {
      busy = mockBusy(date, config);
    } else {
      const off = getOffset(date, config.timeZone);
      const timeMin = `${date}T00:00:00${off}`;
      const timeMax = `${date}T23:59:59${off}`;
      busy = await getBusy(env, timeMin, timeMax);
    }
    busy = busy.concat(await getHolds(env, date));

    const result = availabilityForDate(date, config, busy, new Date().toISOString());
    const svc = SERVICES[tipo];
    return json({ ...result, slotMinutes: config.slotMinutes, depositCLP: config.depositCLP, tipo: svc ? svc.key : null, price: svc ? svc.price : null });
  } catch (err) {
    return json({ error: "No se pudo consultar disponibilidad", detail: String(err) }, 500);
  }
}
