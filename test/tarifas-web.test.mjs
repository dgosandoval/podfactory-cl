// Prueba de src/tarifas.jsx (lo que corre en el NAVEGADOR de podfactory.cl): lee la tarifa del hub, y si el hub no responde o manda algo raro se queda con los valores de respaldo.
// Corre el archivo tal cual en un «navegador» de juguete (vm con window, fetch y React simulados). Sin red.
// Uso:  node test/tarifas-web.test.mjs      → OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import { readFileSync } from "node:fs";
import vm from "node:vm";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };
const codigo = readFileSync(new URL("../src/tarifas.jsx", import.meta.url), "utf8");

const HUB = {
  esquema: 1, mini_piloto: { neto: 32000, bruto: 38080 }, cambio_sin_costo_horas: 48,
  locacion: { desde_neto: 990000, desde_bruto: 1178100, regiones_extra_neto: 260000 }, recargo_nocturno: { desde: "18:30", neto: 120000, bruto: 142800 },
};
async function navegador(respuesta) {
  const oyentes = {}; const avisos = [];
  const window = { addEventListener: (n, f) => { (oyentes[n] ||= []).push(f); }, removeEventListener: () => {}, dispatchEvent: (e) => { (oyentes[e.type] || []).forEach((f) => f(e)); } };
  const sandbox = { window, console: { warn: (...a) => avisos.push(a.join(" ")), log: () => {} }, setTimeout, clearTimeout, AbortController, Event: class { constructor(t) { this.type = t; } },
    fetch: async (url) => { sandbox.__url = String(url); return respuesta(); }, React: { useState: (v) => [v, () => {}], useEffect: () => {} }, Math, Number, Intl };
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox);
  await new Promise((r) => setTimeout(r, 30));   // deja correr la promesa de fetch
  return { window, avisos, sandbox };
}

let n = await navegador(() => new Response(JSON.stringify(HUB), { status: 200 }));
check("1a. al cargar, el navegador pide https://clientes.doppel.cl/api/public/tarifas", n.sandbox.__url === "https://clientes.doppel.cl/api/public/tarifas", n.sandbox.__url);
check("1b. con el hub arriba, window.PF_TARIFAS trae el mini-piloto del hub ($32.000 neto → $38.080), 48 horas y la locación desde $990.000", n.window.PF_TARIFAS.origen === "hub" && n.window.PF_TARIFAS.mini_piloto.bruto === 38080 && n.window.PF_TARIFAS.cambio_sin_costo_horas === 48 && n.window.PF_TARIFAS.locacion.desde_neto === 990000);
check("1c. pfClp da el formato chileno: 38.080 → $38.080", n.window.pfClp(38080) === "$38.080" && n.window.pfClp(990000) === "$990.000", n.window.pfClp(38080));

n = await navegador(() => { throw new Error("sin red"); });
check("2a. sin red: se queda con los valores de respaldo de siempre (mini-piloto $30.000 → $35.700, 36 horas, locación $950.000) y avisa en la consola", n.window.PF_TARIFAS.origen === "respaldo" && n.window.PF_TARIFAS.mini_piloto.neto === 30000 && n.window.PF_TARIFAS.mini_piloto.bruto === 35700 && n.window.PF_TARIFAS.cambio_sin_costo_horas === 36 && n.window.PF_TARIFAS.locacion.desde_neto === 950000 && n.avisos.some((a) => /tarifas:/.test(a)), JSON.stringify(n.avisos));
n = await navegador(() => new Response("caído", { status: 503 }));
check("2b. hub con error 503: respaldo", n.window.PF_TARIFAS.origen === "respaldo" && n.window.PF_TARIFAS.mini_piloto.bruto === 35700);
n = await navegador(() => new Response(JSON.stringify({ ...HUB, mini_piloto: { neto: "mucho", bruto: 5 } }), { status: 200 }));
check("2c. un JSON del hub con forma inesperada se ignora (no se muestra un monto absurdo)", n.window.PF_TARIFAS.origen === "respaldo" && n.window.PF_TARIFAS.mini_piloto.bruto === 35700);
n = await navegador(() => new Response(JSON.stringify({ ...HUB, cambio_sin_costo_horas: 9999 }), { status: 200 }));
check("2d. una ventana de cambio fuera de rango (9.999 horas) se ignora", n.window.PF_TARIFAS.origen === "respaldo" && n.window.PF_TARIFAS.cambio_sin_costo_horas === 36);

const fallas = resultados.filter((x) => !x).length;
console.log(fallas === 0 ? `\nTODO OK (${resultados.length} comprobaciones)` : `\nHAY FALLAS: ${fallas}`);
process.exit(fallas === 0 ? 0 : 1);
