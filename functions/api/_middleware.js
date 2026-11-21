// CORS para la landing en doppel.cl/podfactory, que llama a esta API desde otro origen.
// Además carga las TARIFAS del hub (clientes.doppel.cl, pantalla «Tarifas») antes de atender cualquier /api/*: precio del mini-piloto, recargo nocturno, ventana de cambio sin costo
// y los montos de los correos salen de ahí (functions/_lib/tarifas.js; con caché de 60 s y respaldo si el hub no responde). Con el mismo patrón carga el HORARIO de grabación del estudio (functions/_lib/horario.js).
import { cargarTarifas } from "../_lib/tarifas.js";
import { cargarHorario } from "../_lib/horario.js";
const ALLOWED = new Set(["https://doppel.cl", "https://www.doppel.cl", "https://podfactory.cl"]);

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export async function onRequest({ request, next, env }) {
  const origin = request.headers.get("origin");
  const allowed = origin && ALLOWED.has(origin);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: allowed ? 204 : 403, headers: allowed ? corsHeaders(origin) : {} });
  }
  await Promise.all([cargarTarifas(env), cargarHorario(env)]);   // nunca lanza; si el hub no responde sigue con la última buena o con los valores de respaldo (y lo deja en el log)
  const res = await next();
  if (!allowed) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(corsHeaders(origin))) out.headers.set(k, v);
  return out;
}
