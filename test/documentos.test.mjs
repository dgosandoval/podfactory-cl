// Prueba de las páginas /condiciones y /informacion (antes PDF con cifras escritas a mano) y del texto de respaldo de la portada: todas las cifras salen de la tarifa vigente del hub.
// Comprueba: (1) con los valores de respaldo salen EXACTAMENTE las cifras de los PDF publicados (se compararon con pdftotext al hacer el cambio); (2) con una tarifa distinta no queda NINGUNA cifra vieja
// escrita a mano y aparecen las nuevas (precios, recargo y su hora, tiempo extra y sus minutos, locación, horas de cambio, plazos, mes de vigencia); (3) un JSON viejo sin tabla de capítulos cae a los valores
// de respaldo; (4) la portada reemplaza el «desde $…» y, si algo falla, sirve index.html tal cual; (5) los enlaces .pdf viejos redirigen a las páginas.
// Corre el código REAL de functions/ sin red. Uso: node test/documentos.test.mjs → termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import fs from "node:fs";
import { TARIFAS_DEFECTO, cargarTarifas, reiniciarTarifas } from "../functions/_lib/tarifas.js";
import { paginaCondiciones, paginaInformacion, tarifaParaDocumentos, plazoLargo, plazoCorto, vigenciaTexto, m } from "../functions/_lib/documentos.js";
import { rellenarTarifas } from "../functions/_lib/pagina-inicio.js";
import { onRequestGet as portada } from "../functions/index.js";
import { onRequestGet as paginaCond } from "../functions/condiciones.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };
const texto = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");
const cifras = (h) => [...texto(h).matchAll(/\$[0-9][0-9.]*/g)].map((x) => x[0]);

// ── 1. Respaldo = lo publicado ──
const c0 = paginaCondiciones(TARIFAS_DEFECTO), i0 = paginaInformacion(TARIFAS_DEFECTO), tc0 = texto(c0), ti0 = texto(i0);
const FILAS = ["1 capítulo $250.000 $250.000 $350.000 $350.000", "2 capítulos $245.000 $490.000 $345.000 $690.000", "3 capítulos $240.000 $720.000 $340.000 $1.020.000", "4 capítulos $235.000 $940.000 $335.000 $1.340.000", "8 capítulos $220.000 $1.760.000 $320.000 $2.560.000", "12 capítulos $200.000 $2.400.000 $300.000 $3.600.000"];
check("1a. condiciones con el respaldo: la tabla de capítulos es la publicada (6 filas, 1 a 12)", FILAS.every((f) => tc0.includes(f)), FILAS.filter((f) => !tc0.includes(f)).join(" | "));
check("1b. información con el respaldo: la misma tabla", FILAS.every((f) => ti0.includes(f)));
const FRASES_C = ["Tarifas vigentes desde noviembre 2026", "Compras de 1 a 12 capítulos", "$30.000 + IVA · mini-piloto", "Mini-piloto: $30.000 + IVA al reservar", "3 reels Verticales, con subtítulos, listos para Instagram, TikTok y Shorts. $120.000", "Cámaras por separado Archivo de cada cámara + pistas de audio. $50.000",
  "Incluye hasta 10 cortes. $50.000", "Imágenes de apoyo Hasta 10 imágenes o gráficas entregadas por el cliente. $50.000", "Un avance corto del capítulo, para redes. $100.000", "Cada 30 minutos, solo si la grabación se pasa de la hora y el estudio está libre. $100.000",
  "Las grabaciones que empiezan a las 19:00 o después tienen un recargo de $100.000 + IVA. $100.000", "Si pides una ronda adicional después de la entrega. $50.000", "desde $950.000 + IVA la jornada", "V y VI Región: +$250.000.", "Hasta 36 horas antes : se cambia la fecha o se cancela sin costo",
  "Con menos de 36 horas , o si no llegan", "1 a 4 capítulos en 2 meses; 5 a 7 en 3 meses; 8 a 12 en 4 meses", "el tiempo extra cuesta $100.000 + IVA cada 30 minutos", "La Edición avanzada ($50.000 + IVA por capítulo) incluye hasta 10", "cuenta como una ronda nueva ($50.000 + IVA)",
  "se cobra aparte: $50.000 + IVA", "Vigentes desde noviembre de 2026", "48 horas antes te pedimos confirmar", "no hay descuento por pagar todo"];
check("1c. condiciones con el respaldo: cada frase con cifras dice lo mismo que el PDF publicado", FRASES_C.every((f) => tc0.includes(f)), FRASES_C.filter((f) => !tc0.includes(f)).join(" | "));
const FRASES_I = ["Plazo para grabar: 2 meses (1 a 4 capítulos), 3 (5 a 7) o 4 (8 a 12). Las grabaciones que empiezan a las 19:00 o después tienen un recargo de $100.000 + IVA.", "tiempo extra, $100.000 cada 30 minutos; ronda de cambios extra, $50.000.", "desde $950.000 + IVA", "V y VI Región: +$250.000.",
  "3 reels $120.000", "Tráiler del capítulo $100.000", "Grabas 10 minutos en el set y ves tu podcast. $30.000 + IVA", "Valores vigentes desde noviembre 2026", "Condiciones completas: podfactory.cl/condiciones"];
check("1d. información con el respaldo: cada frase con cifras dice lo mismo que el PDF publicado (el enlace a las condiciones apunta a la página)", FRASES_I.every((f) => ti0.includes(f)), FRASES_I.filter((f) => !ti0.includes(f)).join(" | "));
check("1e. el total de cifras es el de los PDF: condiciones 41 cifras, información 35 (las que tenía cada hoja)", cifras(c0).length === 41 && cifras(i0).length === 35, `${cifras(c0).length} / ${cifras(i0).length}`);

// ── 2. Tarifa distinta: no queda nada viejo ──
const base = Array.from({ length: 12 }, (_, i) => 261000 - i * 3300);   // ninguna coincide con un valor de la tabla de siempre
const NUEVA = { ...TARIFAS_DEFECTO, version: 9, vigente_desde: "2026-12-01T03:00:00Z",
  capitulos: base.map((b, i) => ({ caps: i + 1, base_neto: b, base_bruto: b, full_neto: b + 100000, full_bruto: b, meses_plazo: i < 3 ? 1 : i < 8 ? 3 : 5 })),
  opcionales: [["reels", 133000], ["camaras", 61000], ["cortes", 67000], ["imagenes", 71000], ["trailer", 113000]].map(([id, neto]) => ({ id, nombre: id, neto, bruto: neto })),
  mini_piloto: { neto: 32000, bruto: 38080 }, recargo_nocturno: { desde: "18:30", neto: 123000, bruto: 0 }, tiempo_extra: { minutos: 45, neto: 117000, bruto: 0 }, ronda_cambios_extra: { neto: 57000, bruto: 0 },
  cambio_sin_costo_horas: 48, locacion: { desde_neto: 1010000, desde_bruto: 0, regiones_extra_neto: 270000 } };
const c1 = paginaCondiciones(NUEVA), i1 = paginaInformacion(NUEVA), tc1 = texto(c1), ti1 = texto(i1);
const VIEJAS = ["$250.000", "$245.000", "$240.000", "$235.000", "$220.000", "$200.000", "$350.000", "$345.000", "$340.000", "$335.000", "$320.000", "$300.000", "$490.000", "$940.000", "$1.760.000", "$2.400.000", "$690.000", "$1.340.000", "$2.560.000", "$3.600.000",
  "$30.000", "$120.000", "$50.000", "$100.000", "$950.000"];
check("2a. con otra tarifa no queda NINGUNA cifra vieja en condiciones", VIEJAS.filter((v) => tc1.includes(v)).length === 0, VIEJAS.filter((v) => tc1.includes(v)).join(" "));
check("2b. ni en información", VIEJAS.filter((v) => ti1.includes(v)).length === 0, VIEJAS.filter((v) => ti1.includes(v)).join(" "));
const NUEVAS = [m(261000), m(361000), m(261000 * 1), m(3 * (261000 - 6600)), m(3 * (361000 - 6600)), "$32.000", "$133.000", "$61.000", "$67.000", "$71.000", "$113.000", "$123.000", "$117.000", "$57.000", "$1.010.000", "$270.000"];
check("2c. aparecen las cifras nuevas en condiciones (precios, opcionales, mini-piloto, recargo, tiempo extra, ronda, locación)", NUEVAS.every((v) => tc1.includes(v)), NUEVAS.filter((v) => !tc1.includes(v)).join(" "));
check("2d. y las horas y minutos: recargo desde las 18:30, tiempo extra cada 45 minutos, 48 horas, vigente desde diciembre 2026", tc1.includes("a las 18:30 o después") && tc1.includes("Cada 45 minutos") && tc1.includes("cada 45 minutos") && tc1.includes("Hasta 48 horas antes") && tc1.includes("menos de 48 horas") && tc1.includes("Tarifas vigentes desde diciembre 2026") && tc1.includes("Vigentes desde diciembre de 2026"));
check("2e. los plazos siguen la tabla del hub (1 mes / 3 meses / 5 meses)", plazoLargo(tarifaParaDocumentos(NUEVA)) === "1 a 3 capítulos en 1 mes; 4 a 8 en 3 meses; 9 a 12 en 5 meses" && plazoCorto(tarifaParaDocumentos(NUEVA)) === "1 mes (1 a 3 capítulos), 3 (4 a 8) o 5 (9 a 12)" && tc1.includes("1 a 3 capítulos en 1 mes; 4 a 8 en 3 meses; 9 a 12 en 5 meses") && ti1.includes("1 mes (1 a 3 capítulos), 3 (4 a 8) o 5 (9 a 12)"),
  `${plazoLargo(tarifaParaDocumentos(NUEVA))} | ${plazoCorto(tarifaParaDocumentos(NUEVA))}`);
check("2f. la tabla corta usa los precios nuevos por cantidad (1, 2, 3, 4, 8 y 12) y la fila destacada es la de 4", ti1.includes(`4 capítulos ${m(261000 - 9900)} ${m(4 * (261000 - 9900))} ${m(361000 - 9900)} ${m(4 * (361000 - 9900))}`) && ti1.includes(`12 capítulos ${m(261000 - 36300)} ${m(12 * (261000 - 36300))} ${m(361000 - 36300)} ${m(12 * (361000 - 36300))}`) && /<tr class="hi"><td><b>4 capítulos/.test(i1));
check("2g. la vigencia sale en hora de Chile (el 1-dic a las 00:00 de Chile = diciembre; el 30-nov a las 23:00 de Chile = noviembre)", vigenciaTexto({ vigente_desde: "2026-12-01T03:00:00Z" }).corto === "diciembre 2026" && vigenciaTexto({ vigente_desde: "2026-12-01T02:00:00Z" }).corto === "noviembre 2026" && vigenciaTexto({}).corto === "noviembre 2026");

// ── 3. JSON viejo sin tabla ──
const VIEJO = { ...TARIFAS_DEFECTO, capitulos: undefined, opcionales: undefined, mini_piloto: { neto: 40000, bruto: 47600 } };
const c2 = texto(paginaCondiciones(VIEJO));
check("3. un JSON sin tabla de capítulos ni opcionales (versión vieja guardada en KV) usa la de respaldo y sigue las cifras que sí trae (mini-piloto $40.000)", FILAS.every((f) => c2.includes(f)) && c2.includes("Mini-piloto: $40.000 + IVA") && !c2.includes("$30.000"));
const MALO = { ...TARIFAS_DEFECTO, capitulos: [{ caps: "uno", base_neto: -5 }] };
check("3b. una tabla mal formada también cae al respaldo", FILAS.every((f) => texto(paginaCondiciones(MALO)).includes(f)));

// ── 4. Estructura imprimible ──
check("4a. las hojas son A4 (4 de condiciones, 3 de información), con botón de imprimir que no sale en papel", (c0.match(/<section class="page"/g) || []).length === 4 && (i0.match(/<section class="page"/g) || []).length === 3 && /window\.print\(\)/.test(c0) && /@media print \{ \.barra \{ display: none/.test(c0));
check("4b. las imágenes salen de /assets/doc/ y existen", [...c0.matchAll(/\/assets\/doc\/[\w.-]+\.(?:jpg|png)/g), ...i0.matchAll(/\/assets\/doc\/[\w.-]+\.(?:jpg|png)/g)].every((x) => fs.existsSync(new URL("../" + x[0].slice(1), import.meta.url))));
check("4c. el título y la descripción cambian por página y hay enlace canónico", /<title>Pod Factory · Tarifas y condiciones del estudio<\/title>/.test(c0) && /<title>Pod Factory · Información del estudio<\/title>/.test(i0) && /canonical" href="https:\/\/podfactory.cl\/condiciones"/.test(c0));

// ── 5. Portada ──
const idx = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const r1 = rellenarTarifas(idx, NUEVA);
check("5a. la portada reemplaza el «desde $950.000 + IVA» del texto de respaldo por la tarifa vigente", /desde <span data-tarifa="locacion_desde">\$1\.010\.000<\/span> \+ IVA/.test(r1) && !/\$950\.000/.test(r1));
check("5b. con la tarifa de respaldo la portada queda idéntica a index.html", rellenarTarifas(idx, TARIFAS_DEFECTO) === idx);
check("5c. una tarifa sin número válido deja el HTML como está", rellenarTarifas(idx, { locacion: { desde_neto: "x" } }) === idx && rellenarTarifas(idx, null) === idx);
const hubSim = async () => ({ ok: true, status: 200, json: async () => NUEVA });
reiniciarTarifas(); await cargarTarifas({}, { fetchFn: hubSim, forzar: true });
const assets = { fetch: async () => new Response(idx, { status: 200, headers: { "content-type": "text/html; charset=utf-8", etag: "abc", "content-length": String(idx.length) } }) };
const rp = await portada({ request: new Request("https://podfactory.cl/"), env: { ASSETS: assets } });
const tp = await rp.text();
check("5d. functions/index.js sirve la portada con la tarifa vigente, conserva el tipo de contenido y no arrastra content-length ni etag", rp.status === 200 && /\$1\.010\.000/.test(tp) && /text\/html/.test(rp.headers.get("content-type")) && !rp.headers.get("etag") && !rp.headers.get("content-length"));
const assetsRoto = { fetch: async () => new Response("<html>x</html>", { status: 200, headers: { "content-type": "image/png" } }) };
const rr = await portada({ request: new Request("https://podfactory.cl/"), env: { ASSETS: assetsRoto } });
check("5e. si el recurso no es HTML lo devuelve sin tocar", (await rr.text()) === "<html>x</html>");
const rc = await paginaCond({ env: {} });
check("5f. /condiciones responde 200, HTML, caché de 60 s", rc.status === 200 && /text\/html/.test(rc.headers.get("content-type")) && /max-age=60/.test(rc.headers.get("cache-control")) && (await rc.text()).includes("Tarifas y"));
reiniciarTarifas();

// ── 6. Redirecciones de los PDF viejos ──
const red = fs.readFileSync(new URL("../_redirects", import.meta.url), "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
check("6. los enlaces .pdf viejos redirigen a las páginas, y ya no hay PDF con cifras a mano en el repo", red.includes("/condiciones.pdf /condiciones 302") && red.includes("/pod-factory-informacion.pdf /informacion 302") && !fs.existsSync(new URL("../condiciones.pdf", import.meta.url)) && !fs.existsSync(new URL("../pod-factory-informacion.pdf", import.meta.url)));
check("7. m(): formato de pesos independiente del servidor", m(1130500) === "$1.130.500" && m(950000) === "$950.000" && m(0) === "$0" && m("x") === "$0");

const fallas = resultados.filter((x) => !x).length;
console.log(fallas ? `\nHAY FALLAS (${fallas})` : `\nTODO OK (${resultados.length} comprobaciones)`);
process.exit(fallas ? 1 : 0);
