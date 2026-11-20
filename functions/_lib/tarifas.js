// TARIFAS de Pod Factory en podfactory.cl: la fuente es el hub (clientes.doppel.cl), pantalla «Tarifas» (editable por Domingo e Iván). Aquí NO se escriben precios a mano:
// solo hay unos VALORES DE RESPALDO (los de siempre) por si el hub no responde.
//
//  · cargarTarifas(env) lee https://clientes.doppel.cl/api/public/tarifas (JSON público, sin datos sensibles) y deja los valores «vivos» aplicados en slots.js, booking.js y los correos.
//    La llama functions/api/_middleware.js en cada petición a /api/*; con caché de 60 s por instancia.
//  · Si el hub no responde: usa la ÚLTIMA versión buena que guardó en KV (HOLDS, clave tarifas:ultima) y, si tampoco hay, los valores de respaldo de este archivo. Siempre lo deja en el log (console.log «tarifas: …»).
//  · El navegador (landing y reserva.html) lee el mismo JSON directamente del hub (CORS abierto para podfactory.cl) y también tiene los de respaldo.
// El hub ya valida lo que se publica (no negativos, la tabla no sube al comprar más…): aquí solo se comprueba que el JSON traiga la forma esperada.

export const URL_TARIFAS = "https://clientes.doppel.cl/api/public/tarifas";
const IVA = 0.19;
const bruto = (n) => n + Math.round(n * IVA);

/** Valores de respaldo = los vigentes al 20-nov-2026. Misma forma que el JSON público del hub. */
export const TARIFAS_DEFECTO = Object.freeze({
  esquema: 1, moneda: "CLP", iva: IVA, version: null, vigente_desde: null, origen: "respaldo",
  mini_piloto: { neto: 30000, bruto: bruto(30000) },
  recargo_nocturno: { desde: "19:00", neto: 100000, bruto: bruto(100000) },
  tiempo_extra: { minutos: 30, neto: 100000, bruto: bruto(100000) },
  ronda_cambios_extra: { neto: 50000, bruto: bruto(50000) },
  cambio_sin_costo_horas: 36,
  locacion: { desde_neto: 950000, desde_bruto: bruto(950000), regiones_extra_neto: 250000 },
});

const entero = (n) => Number.isInteger(n) && n >= 0;
/** ¿El JSON trae la forma que usa podfactory.cl? (no repite las reglas del hub: solo que no falte nada ni venga con otro tipo). */
export function tarifasValidas(j) {
  return !!j && typeof j === "object"
    && entero(j.mini_piloto?.neto) && entero(j.mini_piloto?.bruto) && j.mini_piloto.neto > 0 && j.mini_piloto.bruto >= j.mini_piloto.neto
    && entero(j.recargo_nocturno?.neto) && j.recargo_nocturno.neto > 0 && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(j.recargo_nocturno?.desde || ""))
    && entero(j.tiempo_extra?.neto) && entero(j.tiempo_extra?.minutos) && entero(j.ronda_cambios_extra?.neto)
    && Number.isInteger(j.cambio_sin_costo_horas) && j.cambio_sin_costo_horas >= 1 && j.cambio_sin_costo_horas <= 168
    && entero(j.locacion?.desde_neto);
}

let vivas = JSON.parse(JSON.stringify(TARIFAS_DEFECTO));
const suscriptores = [];
/** Tarifa que rige ahora en esta instancia (la última cargada; al arrancar, el respaldo). */
export const tarifaActual = () => vivas;
/** Quien necesita reaccionar al cambio (slots.js, booking.js) se suscribe y recibe la tarifa ahora y cada vez que cambia. */
export function suscribirTarifas(fn) { suscriptores.push(fn); fn(vivas); }
function aplicar(t, origen) {
  vivas = { ...JSON.parse(JSON.stringify(t)), origen };
  for (const fn of suscriptores) fn(vivas);
}

export const TTL_TARIFAS_MS = 60_000;
let cargadaEn = 0, fallaEn = 0, versionGuardada = undefined;
/** Lee la tarifa del hub (con caché de 60 s) y la deja aplicada. Nunca lanza. `fetchFn` y `ahora` existen para las pruebas. */
export async function cargarTarifas(env = {}, { fetchFn = fetch, ahora = Date.now(), forzar = false } = {}) {
  if (!forzar && cargadaEn && ahora - cargadaEn < TTL_TARIFAS_MS) return vivas;
  if (!forzar && fallaEn && ahora - fallaEn < 10_000) return vivas;   // tras una falla se reintenta cada 10 s, no en cada petición
  try {
    const r = await fetchFn(env.HUB_TARIFAS_URL || URL_TARIFAS, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!tarifasValidas(j)) throw new Error("el JSON del hub no trae la forma esperada");
    aplicar(j, "hub"); cargadaEn = ahora; fallaEn = 0;
    // Última versión buena en KV (solo se escribe cuando cambia la versión: no en cada lectura).
    if (env.HOLDS && j.version !== versionGuardada) {
      try { await env.HOLDS.put("tarifas:ultima", JSON.stringify(j), { expirationTtl: 60 * 86400 }); versionGuardada = j.version; }
      catch (e) { console.log("tarifas: no pude guardar la última versión buena en KV: " + String(e?.message || e)); }
    }
  } catch (e) {
    fallaEn = ahora;
    let usadas = vivas.origen === "hub" ? "la última del hub que ya tenía cargada" : "los valores de respaldo del código";
    if (vivas.origen === "respaldo" && env.HOLDS) {
      try {
        const g = await env.HOLDS.get("tarifas:ultima", "json");
        if (tarifasValidas(g)) { aplicar(g, "ultima-guardada"); usadas = "la última versión buena guardada en KV (v" + g.version + ")"; }
      } catch (e2) { console.log("tarifas: no pude leer la última versión buena de KV: " + String(e2?.message || e2)); }
    } else if (vivas.origen === "ultima-guardada") usadas = "la última versión buena guardada en KV";
    console.log("tarifas: el hub no respondió (" + String(e?.message || e).slice(0, 160) + "); uso " + usadas);
  }
  return vivas;
}
/** Solo para pruebas: vuelve a los valores de respaldo y olvida la caché. */
export function reiniciarTarifas() { cargadaEn = 0; fallaEn = 0; versionGuardada = undefined; aplicar(TARIFAS_DEFECTO, "respaldo"); }

// Textos que arman varios archivos (siempre desde la tarifa viva).
export const clp = (n) => "$" + Math.round(n).toLocaleString("es-CL");
export const horasCambio = () => vivas.cambio_sin_costo_horas;
