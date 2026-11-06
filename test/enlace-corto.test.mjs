// Prueba del enlace corto /r/<token> (botón «Gestionar mi reserva» de las plantillas de WhatsApp _v2).
// Corre el código REAL de functions/r/[token].js con un KV simulado: no sale ninguna llamada de red.
// Uso:  node test/enlace-corto.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import { onRequestGet as corto } from "../functions/r/[token].js";
import { saveBooking, manageUrl } from "../functions/_lib/booking.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };

const kv = new Map();
const HOLDS = {
  async get(k, tipo) { const v = kv.get(k); return v === undefined ? null : (tipo === "json" ? JSON.parse(v) : v); },
  async put(k, v) { kv.set(k, String(v)); },
  async delete(k) { kv.delete(k); },
};
const env = { HOLDS };
const ORIGIN = "https://podfactory.cl";
const ir = (token) => corto({ request: new Request(`${ORIGIN}/r/${token}`), env, params: { token } });
const H = 3600 * 1000;
const futuro = (h) => new Date(Date.now() + h * H).toISOString();

const T1 = "a".repeat(32), T2 = "b".repeat(32), T3 = "c".repeat(32), T4 = "d".repeat(32), T5 = "e".repeat(32), T6 = "f".repeat(32);
await saveBooking(env, { token: T1, start: futuro(72), end: futuro(73), name: "Victoria", email: "v@x.cl", phone: "56998270488", brand: "podfactory", compraId: null, portalUrl: null });
await saveBooking(env, { token: T2, start: futuro(72), end: futuro(73), name: "Ana", brand: "podfactory", compraId: 12, portalUrl: "https://clientes.podfactory.cl/compras/12" });
await saveBooking(env, { token: T3, start: futuro(72), end: futuro(73), name: "Beto", brand: "podfactory", compraId: "postpago", portalUrl: "https://clientes.doppel.cl/project/77" });
await saveBooking(env, { token: T4, start: futuro(-48), end: futuro(-47), name: "Pasada", brand: "podfactory" });
await saveBooking(env, { token: T5, start: futuro(72), end: futuro(73), name: "Malo", brand: "podfactory", compraId: 1, portalUrl: "https://evil.example.com/robo" });
await saveBooking(env, { token: T6, start: futuro(-0.5), end: futuro(0.5), name: "En curso", brand: "podfactory" });

{
  const r = await ir(T1);
  check("reserva normal → 302 a la página de gestión de podfactory.cl (manageUrl)", r.status === 302 && r.headers.get("location") === manageUrl(ORIGIN, T1) && r.headers.get("location") === `${ORIGIN}/reserva?id=${T1}`, r.headers.get("location"));
  check("la redirección no lleva datos personales (nombre, correo, teléfono) y no se cachea", !/Victoria|v@x\.cl|56998270488/.test(r.headers.get("location")) && r.headers.get("cache-control") === "no-store" && (await r.text()) === "");
}
{
  const r = await ir(T2);
  check("compra del portal → 302 a portalUrl + #agendar (igual que el correo)", r.status === 302 && r.headers.get("location") === "https://clientes.podfactory.cl/compras/12#agendar", r.headers.get("location"));
  const r3 = await ir(T3);
  check("postpago → 302 al proyecto en el hub + #agendar", r3.status === 302 && r3.headers.get("location") === "https://clientes.doppel.cl/project/77#agendar", r3.headers.get("location"));
}
{
  const r = await ir(T5);
  check("portalUrl de un dominio ajeno NO se sigue: cae a la página de gestión", r.headers.get("location") === manageUrl(ORIGIN, T5), r.headers.get("location"));
  const ra = await ir("z".repeat(32));
  check("reserva inexistente → 302 a la portada de podfactory.cl", ra.status === 302 && ra.headers.get("location") === "https://podfactory.cl/", ra.headers.get("location"));
  const rp = await ir(T4);
  check("reserva ya pasada → 302 a la portada", rp.status === 302 && rp.headers.get("location") === "https://podfactory.cl/", rp.headers.get("location"));
  const rc = await ir(T6);
  check("grabación en curso (aún no termina) → sigue llevando a gestión", rc.headers.get("location") === manageUrl(ORIGIN, T6), rc.headers.get("location"));
  const rx = await ir("../../etc/passwd");
  check("token con forma inválida → portada (no toca KV)", rx.status === 302 && rx.headers.get("location") === "https://podfactory.cl/");
  const rv = await corto({ request: new Request(`${ORIGIN}/r/`), env, params: {} });
  check("sin token → portada", rv.status === 302 && rv.headers.get("location") === "https://podfactory.cl/");
  const rs = await corto({ request: new Request(`${ORIGIN}/r/${T1}`), env: {}, params: { token: T1 } });
  check("sin KV (HOLDS) → portada, sin lanzar", rs.status === 302 && rs.headers.get("location") === "https://podfactory.cl/");
}

const fallas = resultados.filter((x) => !x).length;
console.log(fallas ? `\nHAY FALLAS (${fallas} de ${resultados.length})` : `\nTODO OK (${resultados.length} comprobaciones)`);
process.exit(fallas ? 1 : 0);
