// GET /api/availability-range?from=YYYY-MM-DD&to=YYYY-MM-DD
// Disponibilidad de varios días en una sola consulta al calendario (máx. 70 días). La usa el portal
// de clientes para pintar el calendario del mes y proponer fechas recurrentes. Mismas reglas que
// /api/availability: días abiertos, bloques de grabación, ocupados del calendario + holds de pago.
import { parseConfig, getOffset, availabilityForDate } from "../_lib/slots.js";
import { getBusy } from "../_lib/google.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "", to = url.searchParams.get("to") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) return json({ error: "Rango inválido (from/to YYYY-MM-DD)" }, 400);
  const dias = [];
  for (let d = new Date(`${from}T12:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10));
    if (dias.length > 70) return json({ error: "Máximo 70 días" }, 400);
  }
  const config = parseConfig(env);
  try {
    // Google responde a veces 5xx pasajeros (ej. 520): hasta 3 intentos antes de dar error.
    const tMin = `${from}T00:00:00${getOffset(from, config.timeZone)}`, tMax = `${to}T23:59:59${getOffset(to, config.timeZone)}`;
    let busy;
    for (let i = 0; ; i++) {
      try { busy = await getBusy(env, tMin, tMax); break; }
      catch (e) { if (i >= 2) throw e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
    }
    // Holds (reservas en proceso de pago): una sola lectura del prefijo.
    if (env.HOLDS) {
      const list = await env.HOLDS.list({ prefix: "hold:" });
      const holds = await Promise.all(list.keys.filter((k) => { const f = k.name.split(":")[1]; return f >= from && f <= to; }).map((k) => env.HOLDS.get(k.name, "json")));
      for (const h of holds) if (h?.start && h?.end) busy.push({ start: h.start, end: h.end });
    }
    const now = new Date().toISOString();
    return json({ from, to, days: dias.map((date) => availabilityForDate(date, config, busy, now)) });
  } catch (e) {
    return json({ error: "No se pudo consultar disponibilidad", detail: String(e) }, 500);
  }
}
