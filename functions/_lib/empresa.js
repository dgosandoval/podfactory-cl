// DATOS DE FACTURACIÓN Y PAGO de Pod Factory (razón social, RUT, giro, cuenta para transferencias y correo de comprobantes): la fuente es el hub (clientes.doppel.cl → Ajustes → «Datos de la empresa»),
// igual que las tarifas y el horario. Si cambia la cuenta en Ajustes, /condiciones e /informacion cambian solas.
//  · cargarEmpresa(env) lee https://clientes.doppel.cl/api/public/empresa (JSON público: solo datos que ya estaban publicados en la web) y deja los datos «vivos» que usan las dos páginas. Caché de 60 s por instancia.
//  · Si el hub no responde (o trae algo incompleto) sigue con los últimos buenos que ya tenía en memoria; si no tiene ninguno, rigen los de RESPALDO de este archivo (los que estaban escritos a mano en la página:
//    la página nunca queda sin datos ni se rompe). Siempre lo deja en el log (console.log «empresa: …»).

export const URL_EMPRESA = "https://clientes.doppel.cl/api/public/empresa";
export const TTL_EMPRESA_MS = 60_000;
/** Valores de respaldo = los que mostraba el pie de /condiciones al 21-nov-2026 (escritos a mano). Misma forma que lo que usa la página (no el JSON completo del hub). */
export const EMPRESA_RESPALDO = Object.freeze({
  razonSocial: "Productora Domingo Ignacio Sandoval Piña EIRL",
  rut: "76.268.307-5",
  giro: "Producción audiovisual",
  banco: "Banco Santander",
  tipoCuenta: "Cuenta corriente",
  numeroCuenta: "71647560",
  correoComprobantes: "pagos@podfactory.cl",
  origen: "respaldo",
});

const txt = (s) => typeof s === "string" && s.trim() !== "" && s.length <= 200;
/** ¿El JSON del hub trae todos los datos que muestra el pie? (si falta uno, no se usa a medias: se sigue con los de antes). */
export function empresaValida(j) {
  return !!j && typeof j === "object" && !!j.banco && typeof j.banco === "object"
    && txt(j.razon_social) && txt(j.rut) && txt(j.giro) && txt(j.banco.banco) && txt(j.banco.tipo_cuenta) && /^\d{4,20}$/.test(String(j.banco.numero_cuenta || "")) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(j.banco.correo_comprobantes || ""));
}

let vivos = null;   // datos del hub, o null si todavía no se leyeron
/** Los datos de facturación y pago que rigen ahora: los del hub o, si nunca respondió en esta instancia, los de respaldo. */
export const empresaActual = () => vivos || EMPRESA_RESPALDO;
export const origenEmpresa = () => (vivos ? "hub" : "respaldo");

let cargadoEn = 0, fallaEn = 0;
/** Lee los datos del hub (con caché de 60 s). Nunca lanza. `fetchFn` y `ahora` existen para las pruebas. */
export async function cargarEmpresa(env = {}, { fetchFn = fetch, ahora = Date.now(), forzar = false } = {}) {
  if (!forzar && cargadoEn && ahora - cargadoEn < TTL_EMPRESA_MS) return empresaActual();
  if (!forzar && fallaEn && ahora - fallaEn < 10_000) return empresaActual();   // tras una falla se reintenta cada 10 s, no en cada visita
  try {
    const r = await fetchFn(env.HUB_EMPRESA_URL || URL_EMPRESA, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!empresaValida(j)) throw new Error("el JSON del hub no trae los datos de facturación completos");
    vivos = Object.freeze({ razonSocial: j.razon_social.trim(), rut: j.rut.trim(), giro: j.giro.trim(), banco: j.banco.banco.trim(), tipoCuenta: j.banco.tipo_cuenta.trim(),
      numeroCuenta: String(j.banco.numero_cuenta), correoComprobantes: j.banco.correo_comprobantes.trim(), origen: "hub" });
    cargadoEn = ahora; fallaEn = 0;
  } catch (e) {
    fallaEn = ahora;
    console.log("empresa: el hub no respondió (" + String(e?.message || e).slice(0, 160) + "); uso " + (vivos ? "los últimos que ya tenía cargados" : "los de respaldo del código"));
  }
  return empresaActual();
}
/** Solo para pruebas: olvida lo cargado. */
export function reiniciarEmpresa() { vivos = null; cargadoEn = 0; fallaEn = 0; }
