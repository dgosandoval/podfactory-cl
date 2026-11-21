// HORARIO de grabación del estudio: la fuente es el hub (clientes.doppel.cl → Ajustes → «Horario del estudio»), igual que las tarifas.
//  · cargarHorario(env) lee https://clientes.doppel.cl/api/public/horario (JSON público, sin datos sensibles) y deja el horario «vivo» que usa recParams() (slots.js) para ofrecer y validar
//    las horas de las grabaciones. La llama functions/api/_middleware.js junto con cargarTarifas; caché de 60 s por instancia.
//  · Si el hub no responde sigue con el último horario bueno que ya tenía en memoria; si no tiene ninguno, rige el de siempre: la variable REC_HOURS si existe o, si no, 10:00-20:00 (HORARIO_RESPALDO).
//    Siempre lo deja en el log (console.log «horario: …»).
// Solo se lee lo que el hub edita (hora de apertura y de cierre). Los días abiertos, el paso (REC_STEP) y el margen (REC_MARGEN) siguen en la configuración de este sitio.

export const URL_HORARIO = "https://clientes.doppel.cl/api/public/horario";
/** Horario de respaldo = el vigente al 21-nov-2026 (10:00 a 20:00, hora de Chile). */
export const HORARIO_RESPALDO = "10:00-20:00";
export const TTL_HORARIO_MS = 60_000;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** ¿El JSON trae un horario usable? (horas válidas y cierre posterior a la apertura). */
export function horarioValido(j) {
  return !!j && typeof j === "object" && HHMM.test(String(j.desde || "")) && HHMM.test(String(j.hasta || "")) && String(j.desde) < String(j.hasta);
}

let vivo = null;   // { desde, hasta, origen } del hub, o null si todavía no se leyó
/** «10:00-20:00» según el hub, o null si el hub nunca respondió en esta instancia (entonces manda REC_HOURS o el respaldo). */
export const horarioVivo = () => (vivo ? `${vivo.desde}-${vivo.hasta}` : null);
/** De dónde sale el horario que rige ahora: «hub» o «respaldo» (para el endpoint /api/tarifas y las pruebas). */
export const origenHorario = () => (vivo ? "hub" : "respaldo");

let cargadoEn = 0, fallaEn = 0;
/** Lee el horario del hub (con caché de 60 s). Nunca lanza. `fetchFn` y `ahora` existen para las pruebas. */
export async function cargarHorario(env = {}, { fetchFn = fetch, ahora = Date.now(), forzar = false } = {}) {
  if (!forzar && cargadoEn && ahora - cargadoEn < TTL_HORARIO_MS) return horarioVivo();
  if (!forzar && fallaEn && ahora - fallaEn < 10_000) return horarioVivo();
  try {
    const r = await fetchFn(env.HUB_HORARIO_URL || URL_HORARIO, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!horarioValido(j)) throw new Error("el JSON del hub no trae un horario válido");
    vivo = { desde: j.desde, hasta: j.hasta, origen: j.origen || null }; cargadoEn = ahora; fallaEn = 0;
  } catch (e) {
    fallaEn = ahora;
    console.log("horario: el hub no respondió (" + String(e?.message || e).slice(0, 160) + "); uso " + (vivo ? "el último que ya tenía cargado (" + horarioVivo() + ")" : "el de respaldo (" + (env.REC_HOURS || HORARIO_RESPALDO) + ")"));
  }
  return horarioVivo();
}
/** Solo para pruebas: olvida lo cargado. */
export function reiniciarHorario() { vivo = null; cargadoEn = 0; fallaEn = 0; }
