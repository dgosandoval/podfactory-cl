// GET /api/tarifas — la tarifa que este sitio está usando AHORA (lo que leyó del hub, o los valores de respaldo) y de dónde salió: origen = "hub" | "ultima-guardada" | "respaldo".
// Sirve para comprobar que podfactory.cl y el hub dicen lo mismo (compararlo con https://clientes.doppel.cl/api/public/tarifas). Solo precios públicos, sin ningún dato sensible.
import { tarifaActual } from "../_lib/tarifas.js";

export async function onRequestGet() {
  const t = tarifaActual();
  return new Response(JSON.stringify({ origen: t.origen, version: t.version ?? null, mini_piloto: t.mini_piloto, recargo_nocturno: t.recargo_nocturno, tiempo_extra: t.tiempo_extra,
    ronda_cambios_extra: t.ronda_cambios_extra, cambio_sin_costo_horas: t.cambio_sin_costo_horas, locacion: t.locacion }),
  { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
