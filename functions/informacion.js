// GET /informacion — «Información del estudio» (antes pod-factory-informacion.pdf), con los precios de la tarifa vigente del hub. Imprimible / «Guardar como PDF».
import { cargarTarifas, tarifaActual } from "./_lib/tarifas.js";
import { paginaInformacion } from "./_lib/documentos.js";

export async function onRequestGet({ env }) {
  await cargarTarifas(env);
  return new Response(paginaInformacion(tarifaActual()), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=60" } });
}
