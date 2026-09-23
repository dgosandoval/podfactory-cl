// CORS para la landing en doppel.cl/podfactory, que llama a esta API desde otro origen.
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

export async function onRequest({ request, next }) {
  const origin = request.headers.get("origin");
  const allowed = origin && ALLOWED.has(origin);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: allowed ? 204 : 403, headers: allowed ? corsHeaders(origin) : {} });
  }
  const res = await next();
  if (!allowed) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(corsHeaders(origin))) out.headers.set(k, v);
  return out;
}
