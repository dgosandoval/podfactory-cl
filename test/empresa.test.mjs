// Prueba del pie «Datos de facturación y pago» de /condiciones e /informacion, leído del hub (clientes.doppel.cl/api/public/empresa; Ajustes → Datos de la empresa).
// Comprueba: (1) con los valores de respaldo el bloque dice EXACTAMENTE lo que decía la página escrita a mano; (2) los dos documentos muestran el mismo bloque, con la misma estructura;
// (3) con datos del hub aparecen los nuevos y no queda ningún dato viejo, y se escapa el HTML; (4) RESPALDO: si el hub falla (red caída, HTTP 500, JSON roto, datos incompletos, tiempo agotado)
// las páginas siguen mostrando los datos de respaldo —o los últimos buenos— y nunca se rompen; (5) los handlers reales (/condiciones y /informacion) con el hub caído y con el hub bueno; (6) caché de 60 s.
// Corre el código REAL de functions/ sin red (se reemplaza fetch). Uso: node test/empresa.test.mjs → termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import { EMPRESA_RESPALDO, URL_EMPRESA, cargarEmpresa, empresaActual, origenEmpresa, reiniciarEmpresa, empresaValida } from "../functions/_lib/empresa.js";
import { TARIFAS_DEFECTO, reiniciarTarifas } from "../functions/_lib/tarifas.js";
import { paginaCondiciones, paginaInformacion, bloqueFacturacion } from "../functions/_lib/documentos.js";
import { onRequestGet as handCond } from "../functions/condiciones.js";
import { onRequestGet as handInfo } from "../functions/informacion.js";

const resultados = [];
const salida = console.log.bind(console);   // el log de la app se silencia en algunos tramos; los resultados siempre salen
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); salida(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };
const texto = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");
/** El bloque «Datos de facturación y pago» de una página, como texto plano. */
const bloque = (h) => { const i = h.indexOf("Datos de facturación y pago"); return i < 0 ? "" : texto(h.slice(i, h.indexOf("</div>", i))).trim(); };
const REAL_FETCH = globalThis.fetch;

const HUB = { esquema: 1, razon_social: "Productora Domingo Ignacio Sandoval Piña E.I.R.L.", rut: "76.268.307-5", giro: "Producción audiovisual", direccion: "Eduardo Marquina 3937, Vitacura", correo: "hola@doppel.cl", whatsapp: "56927970014",
  banco: { titular: "Productora Domingo Sandoval EIRL", rut_titular: "76.268.307-5", banco: "Banco Santander", tipo_cuenta: "Cuenta corriente", numero_cuenta: "71647560", correo_comprobantes: "pagos@podfactory.cl" } };
const NUEVO = { ...HUB, razon_social: "Mi Empresa <SpA> & Cía", rut: "11.111.111-1", giro: "Servicios de prueba", banco: { ...HUB.banco, banco: "Banco de Chile", tipo_cuenta: "Cuenta vista", numero_cuenta: "99887766", correo_comprobantes: "cobros@ejemplo.cl" } };
const ok = (j) => async () => ({ ok: true, status: 200, json: async () => j });

// ── 1. Respaldo = lo que estaba escrito a mano ──
const ESCRITO_A_MANO = "Datos de facturación y pago Productora Domingo Ignacio Sandoval Piña EIRL RUT 76.268.307-5 · Producción audiovisual Banco Santander · Cuenta corriente 71647560 Comprobantes a pagos@podfactory.cl";
const c0 = paginaCondiciones(TARIFAS_DEFECTO), i0 = paginaInformacion(TARIFAS_DEFECTO);
check("1a. condiciones con el respaldo: el pie dice exactamente lo que decía escrito a mano", bloque(c0) === ESCRITO_A_MANO, bloque(c0));
check("1b. información con el respaldo: el mismo pie", bloque(i0) === ESCRITO_A_MANO, bloque(i0));
check("1c. empresaActual() sin haber leído el hub es el respaldo (origen «respaldo»)", empresaActual() === EMPRESA_RESPALDO && origenEmpresa() === "respaldo");
check("1d. pasar undefined o un objeto parcial también cae a los valores de respaldo (nunca «undefined» en la página)", bloque(paginaCondiciones(TARIFAS_DEFECTO, undefined)) === ESCRITO_A_MANO && bloque(paginaInformacion(TARIFAS_DEFECTO, { banco: "Banco X" })).includes("Banco X · Cuenta corriente 71647560") && !/undefined/.test(paginaInformacion(TARIFAS_DEFECTO, {})));

// ── 2. Mismo bloque, mismo diseño, en las dos ──
check("2a. el HTML del bloque es el mismo en /condiciones y en /informacion (mismo diseño: <div class=\"fact\"> con su h4)", c0.includes(bloqueFacturacion()) && i0.includes(bloqueFacturacion()) && /<div class="fact">\s*<h4>Datos de facturación y pago<\/h4>/.test(bloqueFacturacion()));
check("2b. el bloque va dentro de «.contact» (el pie de la última hoja) en las dos", [c0, i0].every((h) => { const k = h.lastIndexOf('<div class="contact">'); return k > 0 && h.indexOf('class="fact"', k) > k && h.indexOf('class="foot"', k) > h.indexOf('class="fact"', k); }));
check("2c. «Datos de facturación y pago» aparece una sola vez por documento", (c0.match(/Datos de facturación y pago/g) || []).length === 1 && (i0.match(/Datos de facturación y pago/g) || []).length === 1);
check("2d. información conserva sus datos de contacto y el botón de WhatsApp", i0.includes("hola@podfactory.cl") && i0.includes("Eduardo Marquina 3937, Vitacura") && i0.includes('href="https://wa.me/56927970014"') && i0.includes("WhatsApp +56 9 2797 0014"));

// ── 3. Datos del hub ──
reiniciarEmpresa();
await cargarEmpresa({}, { fetchFn: ok(HUB), forzar: true });
check("3a. con los datos de Ajustes de hoy: razón social E.I.R.L. (la de Ajustes), RUT, giro, banco, tipo y número de cuenta, correo de comprobantes; origen «hub»",
  origenEmpresa() === "hub" && bloque(paginaCondiciones(TARIFAS_DEFECTO, empresaActual())) === "Datos de facturación y pago Productora Domingo Ignacio Sandoval Piña E.I.R.L. RUT 76.268.307-5 · Producción audiovisual Banco Santander · Cuenta corriente 71647560 Comprobantes a pagos@podfactory.cl", bloque(paginaCondiciones(TARIFAS_DEFECTO, empresaActual())));
await cargarEmpresa({}, { fetchFn: ok(NUEVO), forzar: true });
const cN = paginaCondiciones(TARIFAS_DEFECTO, empresaActual()), iN = paginaInformacion(TARIFAS_DEFECTO, empresaActual());
const VIEJOS = ["Productora Domingo", "76.268.307-5", "Producción audiovisual", "Santander", "71647560", "Cuenta corriente", "pagos@podfactory.cl"];
const nuevoTxt = "Datos de facturación y pago Mi Empresa &lt;SpA&gt; &amp; Cía RUT 11.111.111-1 · Servicios de prueba Banco de Chile · Cuenta vista 99887766 Comprobantes a cobros@ejemplo.cl";
const sinEscapar = (h) => texto(h.slice(h.indexOf("Datos de facturación y pago"), h.indexOf("</div>", h.indexOf("Datos de facturación y pago")))).trim();
check("3b. si Ajustes cambia la cuenta y la razón social, las dos páginas muestran lo nuevo y no queda ningún dato viejo en el pie", [cN, iN].every((h) => { const b = bloque(h); return b.includes("Mi Empresa") && b.includes("11.111.111-1") && b.includes("Banco de Chile · Cuenta vista 99887766") && b.includes("cobros@ejemplo.cl") && VIEJOS.every((v) => !b.includes(v)); }), bloque(cN));
check("3c. el HTML de los datos se escapa (un «<» o «&» en la razón social no rompe la página)", cN.includes("Mi Empresa &lt;SpA&gt; &amp; Cía") && !cN.includes("<SpA>"));
check("3d. empresaValida rechaza lo incompleto: sin banco, sin número de cuenta, número con letras, correo sin arroba, razón social vacía, tipos equivocados, null",
  !empresaValida(null) && !empresaValida({}) && !empresaValida({ ...HUB, banco: undefined }) && !empresaValida({ ...HUB, banco: { ...HUB.banco, numero_cuenta: "" } }) && !empresaValida({ ...HUB, banco: { ...HUB.banco, numero_cuenta: "12ab" } })
  && !empresaValida({ ...HUB, banco: { ...HUB.banco, correo_comprobantes: "sin-arroba" } }) && !empresaValida({ ...HUB, razon_social: "  " }) && !empresaValida({ ...HUB, rut: 5 }) && !empresaValida({ ...HUB, giro: "x".repeat(300) }) && empresaValida(HUB));

// ── 4. El hub falla: se sigue con respaldo / lo último bueno ──
const FALLAS = {
  "red caída": async () => { throw new Error("fetch failed"); },
  "HTTP 500": async () => ({ ok: false, status: 500, json: async () => ({}) }),
  "JSON roto": async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <"); } }),
  "datos incompletos": ok({ esquema: 1, razon_social: "Solo razón social" }),
  "tiempo agotado": async () => { throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }); },
};
const lineasLog = []; const logOrig = console.log; console.log = (...a) => { lineasLog.push(a.join(" ")); };
for (const [nombre, fetchFn] of Object.entries(FALLAS)) {
  reiniciarEmpresa();
  const e = await cargarEmpresa({}, { fetchFn, forzar: true });
  check(`4a. hub caído (${nombre}), sin nada cargado antes: rigen los valores de respaldo y las dos páginas muestran el pie de siempre`, e === EMPRESA_RESPALDO && origenEmpresa() === "respaldo" && bloque(paginaCondiciones(TARIFAS_DEFECTO, e)) === ESCRITO_A_MANO && bloque(paginaInformacion(TARIFAS_DEFECTO, e)) === ESCRITO_A_MANO);
}
reiniciarEmpresa(); await cargarEmpresa({}, { fetchFn: ok(NUEVO), forzar: true });
const despues = await cargarEmpresa({}, { fetchFn: FALLAS["red caída"], forzar: true });
check("4b. hub bueno y luego caído: se queda con los ÚLTIMOS BUENOS que ya tenía (no vuelve al respaldo ni muestra nada a medias)", despues.razonSocial.startsWith("Mi Empresa") && origenEmpresa() === "hub" && bloque(paginaInformacion(TARIFAS_DEFECTO, despues)).includes("99887766"));
console.log = logOrig;
check("4c. cada falla quedó en el log («empresa: el hub no respondió … uso …»)", lineasLog.filter((l) => /^empresa: el hub no respondió/.test(l)).length === 6 && lineasLog.some((l) => /uso los de respaldo del código/.test(l)) && lineasLog.some((l) => /uso los últimos que ya tenía cargados/.test(l)), lineasLog.join(" | "));

// ── 5. Handlers reales: /condiciones e /informacion con el hub caído y con el hub bueno ──
const pedidos = []; const llamar = (h) => h({ env: {} });
const stub = (empresaFn) => { globalThis.fetch = async (url) => { pedidos.push(String(url)); return empresaFn(String(url)); }; };
console.log = (...a) => { lineasLog.push(a.join(" ")); };
reiniciarEmpresa(); reiniciarTarifas();
stub(async () => { throw new Error("sin red"); });
let rc = await llamar(handCond), ri = await llamar(handInfo), hc = await rc.text(), hi = await ri.text();
check("5a. hub caído: /condiciones e /informacion responden 200 HTML con el pie de respaldo y sus tablas intactas (la página nunca queda sin datos ni se rompe)",
  rc.status === 200 && ri.status === 200 && /text\/html/.test(rc.headers.get("content-type")) && /text\/html/.test(ri.headers.get("content-type")) && bloque(hc) === ESCRITO_A_MANO && bloque(hi) === ESCRITO_A_MANO
  && hc.includes("Tarifas y") && hi.includes("Información del estudio") && hc.includes("</html>") && hi.includes("</html>") && (hc.match(/<section class="page"/g) || []).length === 4 && (hi.match(/<section class="page"/g) || []).length === 3);
check("5b. y en la misma visita pidió los datos al endpoint del hub (GET /api/public/empresa)", pedidos.some((u) => u === URL_EMPRESA) && URL_EMPRESA === "https://clientes.doppel.cl/api/public/empresa", pedidos.join(" "));
reiniciarEmpresa(); reiniciarTarifas();
stub(async (u) => (u === URL_EMPRESA ? { ok: true, status: 200, json: async () => NUEVO } : { ok: false, status: 503, json: async () => ({}) }));
rc = await llamar(handCond); ri = await llamar(handInfo); hc = await rc.text(); hi = await ri.text();
check("5c. hub con datos nuevos (y las tarifas caídas): las dos páginas muestran los datos nuevos de Ajustes", bloque(hc).includes("Banco de Chile · Cuenta vista 99887766") && bloque(hi).includes("Banco de Chile · Cuenta vista 99887766") && bloque(hc) === bloque(hi), bloque(hc));
check("5d. caché de 60 s: la segunda visita seguida no vuelve a pedir los datos al hub", await (async () => { const antes = pedidos.length; await llamar(handCond); return pedidos.length === antes + 0 || pedidos.slice(antes).every((u) => u !== URL_EMPRESA); })());
globalThis.fetch = REAL_FETCH; console.log = logOrig;
reiniciarEmpresa(); reiniciarTarifas();

// ── 6. Caché y reintento ──
const llamadas = []; const f = (j) => async (u) => { llamadas.push(u); return { ok: true, status: 200, json: async () => j }; };
reiniciarEmpresa(); const t0 = 1_000_000;
await cargarEmpresa({}, { fetchFn: f(HUB), ahora: t0 }); await cargarEmpresa({}, { fetchFn: f(NUEVO), ahora: t0 + 30_000 });
check("6a. dentro de los 60 s no vuelve a pedir (sigue con lo leído)", llamadas.length === 1 && empresaActual().razonSocial.endsWith("E.I.R.L."));
await cargarEmpresa({}, { fetchFn: f(NUEVO), ahora: t0 + 61_000 });
check("6b. pasados los 60 s relee y toma el cambio hecho en Ajustes", llamadas.length === 2 && empresaActual().numeroCuenta === "99887766");
console.log = (...a) => { lineasLog.push(a.join(" ")); };
reiniciarEmpresa(); let n = 0; const rota = async () => { n++; throw new Error("x"); };
await cargarEmpresa({}, { fetchFn: rota, ahora: t0 }); await cargarEmpresa({}, { fetchFn: rota, ahora: t0 + 5_000 }); await cargarEmpresa({}, { fetchFn: rota, ahora: t0 + 11_000 });
console.log = logOrig;
check("6c. tras una falla reintenta cada 10 s, no en cada visita (3 visitas en 11 s = 2 intentos)", n === 2, String(n));
reiniciarEmpresa();

const fallas = resultados.filter((x) => !x).length;
salida(fallas ? `\nHAY FALLAS (${fallas})` : `\nTODO OK (${resultados.length} comprobaciones)`);
process.exit(fallas ? 1 : 0);
