// GET /condiciones — «Tarifas y condiciones del estudio» (antes condiciones.pdf), armada con la tarifa vigente del hub. Imprimible / «Guardar como PDF».
// Nunca falla por el hub: cargarTarifas() no lanza y, sin respuesta, usa la última versión buena o los valores de respaldo (los de siempre).
import { cargarTarifas, tarifaActual } from "./_lib/tarifas.js";
import { paginaCondiciones } from "./_lib/documentos.js";

export async function onRequestGet({ env }) {
  await cargarTarifas(env);
  return new Response(paginaCondiciones(tarifaActual()), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=60" } });
}
