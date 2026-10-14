// GET /api/portal/upcoming  (header x-intake-secret == PORTAL_INTAKE_SECRET)
// Próximas grabaciones (reservas futuras), para mostrarlas en el portal.
import { parseConfig } from "../../_lib/slots.js";
import { formatSession, salidaDe, minutosDe, finDe } from "../../_lib/email.js";

export async function onRequestGet({ request, env }) {
  if (!env.PORTAL_INTAKE_SECRET || request.headers.get("x-intake-secret") !== env.PORTAL_INTAKE_SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
  }
  const config = parseConfig(env);
  const now = Date.now();
  let upcoming = [];
  if (env.HOLDS) {
    const list = await env.HOLDS.list({ prefix: "booking:" });
    const recs = await Promise.all(list.keys.map((k) => env.HOLDS.get(k.name, "json")));
    upcoming = recs
      .filter((b) => b && Date.parse(b.start) > now)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
      .slice(0, 50)
      .map((b) => {
        const { fecha, hora } = formatSession(b.start, config.timeZone);
        // phone/confirmado/salida/minutos/estado/compraId: los usa el hub para los recordatorios por WhatsApp (48 h y 24 h).
        // salida = hora de término REAL (finDe descuenta el margen de las reservas postpago viejas), igual que en el correo.
        return { name: b.name, email: b.email, phone: b.phone || "", start: b.start, end: b.end, fecha, hora, tipo: b.tipo, personas: b.personas, brand: b.brand || "podfactory", projectName: b.projectName || null, token: b.token,
          estado: b.estado || null, confirmado: !!b.confirmedAt, compraId: b.compraId || null, minutos: minutosDe(b.start, finDe(b)), salida: salidaDe(b.start, config.timeZone, finDe(b)) };
      });
  }
  return new Response(JSON.stringify({ upcoming }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
