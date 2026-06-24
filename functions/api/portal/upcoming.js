// GET /api/portal/upcoming  (header x-intake-secret == PORTAL_INTAKE_SECRET)
// Próximas grabaciones (reservas futuras), para mostrarlas en el portal.
import { parseConfig } from "../../_lib/slots.js";
import { formatSession } from "../../_lib/email.js";

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
        return { name: b.name, email: b.email, start: b.start, end: b.end, fecha, hora, tipo: b.tipo, personas: b.personas, brand: b.brand || "podfactory", projectName: b.projectName || null, token: b.token };
      });
  }
  return new Response(JSON.stringify({ upcoming }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
