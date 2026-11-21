// GET / — la portada (index.html) con el texto de respaldo para buscadores al día: el «desde $… + IVA» de la locación sale de la tarifa vigente del hub (functions/_lib/pagina-inicio.js).
// Es solo un reemplazo de texto sobre el mismo archivo: si algo falla, se sirve index.html tal cual (con el valor de siempre) y se deja en el log.
import { cargarTarifas, tarifaActual } from "./_lib/tarifas.js";
import { rellenarTarifas } from "./_lib/pagina-inicio.js";

export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  if (!res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  const respaldo = res.clone();
  try {
    await cargarTarifas(env);
    const html = rellenarTarifas(await res.text(), tarifaActual());
    const h = new Headers(res.headers); h.delete("content-length"); h.delete("etag");
    return new Response(html, { status: res.status, headers: h });
  } catch (e) { console.log("portada: no pude poner la tarifa en el texto de respaldo (" + String(e?.message || e).slice(0, 160) + "); sirvo index.html tal cual"); return respaldo; }
}
