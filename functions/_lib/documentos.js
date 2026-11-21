// Las páginas «Tarifas y condiciones» (/condiciones) e «Información del estudio» (/informacion) de podfactory.cl, armadas SIEMPRE desde la tarifa vigente del hub
// (functions/_lib/tarifas.js: lo que leyó de clientes.doppel.cl/api/public/tarifas o, si el hub no responde, la última buena o los valores de respaldo).
// Antes eran dos PDF con las cifras escritas a mano (condiciones.pdf y pod-factory-informacion.pdf) que se desactualizaban al cambiar una tarifa. El texto es el mismo de esos PDF;
// las plantillas (documentos-plantillas.js) tienen las cifras como huecos. Cada página sirve en pantalla (se adapta al teléfono) y al imprimir o «Guardar como PDF» sale en hojas A4 como el PDF.
import { TARIFAS_DEFECTO } from "./tarifas.js";
import { CSS_CONDICIONES, CSS_INFORMACION, cuerpoCondiciones, cuerpoInformacion } from "./documentos-plantillas.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** Cantidades que muestra la tabla corta (las del PDF): el portal da el valor exacto de cualquiera de 1 a 12. */
export const CAPS_TABLA = [1, 2, 3, 4, 8, 12];
const CAPS_DESTACADA = 4;

/** $250.000 (sin depender de la configuración regional del servidor). */
export const m = (n) => "$" + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const entero = (n) => Number.isInteger(n) && n >= 0;
/** La tarifa con huecos completados por los valores de respaldo (un JSON viejo guardado en KV puede no traer la tabla de capítulos ni los opcionales). */
export function tarifaParaDocumentos(t) {
  const x = { ...TARIFAS_DEFECTO, ...(t || {}) };
  const capsOk = Array.isArray(x.capitulos) && x.capitulos.length > 0 && x.capitulos.every((c) => entero(c?.caps) && entero(c?.base_neto) && entero(c?.full_neto) && entero(c?.meses_plazo));
  if (!capsOk) x.capitulos = TARIFAS_DEFECTO.capitulos;
  const ops = Array.isArray(x.opcionales) ? x.opcionales : [];
  const faltan = ["reels", "camaras", "cortes", "imagenes", "trailer"].some((id) => !entero(ops.find((o) => o?.id === id)?.neto));
  if (faltan) x.opcionales = TARIFAS_DEFECTO.opcionales;
  return x;
}

/** Fila-resumen de los capítulos: «4 capítulos | $235.000 | $940.000 | $335.000 | $1.340.000». */
export function filasCaps(t) {
  return CAPS_TABLA.map((n) => t.capitulos.find((c) => c.caps === n)).filter(Boolean).map((c) =>
    `<tr${c.caps === CAPS_DESTACADA ? ' class="hi"' : ""}><td><b>${c.caps} capítulo${c.caps === 1 ? "" : "s"}</b></td><td class="n">${m(c.base_neto)}</td><td class="n price">${m(c.base_neto * c.caps)}</td><td class="n">${m(c.full_neto)}</td><td class="n price">${m(c.full_neto * c.caps)}</td></tr>`).join("\n      ");
}

/** Tramos de plazo según la tabla: [{ desde: 1, hasta: 4, meses: 2 }, …]. */
export function tramosPlazo(t) {
  const out = [];
  for (const c of [...t.capitulos].sort((a, b) => a.caps - b.caps)) {
    const u = out[out.length - 1];
    if (u && u.meses === c.meses_plazo) u.hasta = c.caps; else out.push({ desde: c.caps, hasta: c.caps, meses: c.meses_plazo });
  }
  return out;
}
const rangoCaps = (x) => (x.desde === x.hasta ? String(x.desde) : `${x.desde} a ${x.hasta}`);
const meses = (n) => `${n} ${n === 1 ? "mes" : "meses"}`;
/** «1 a 4 capítulos en 2 meses; 5 a 7 en 3 meses; 8 a 12 en 4 meses» (condiciones). */
export const plazoLargo = (t) => tramosPlazo(t).map((x, i) => `${rangoCaps(x)}${i === 0 ? " capítulos" : ""} en ${meses(x.meses)}`).join("; ");
/** «2 meses (1 a 4 capítulos), 3 (5 a 7) o 4 (8 a 12)» (información). */
export function plazoCorto(t) {
  const xs = tramosPlazo(t).map((x, i) => `${i === 0 ? meses(x.meses) : x.meses} (${rangoCaps(x)}${i === 0 ? " capítulos" : ""})`);
  return xs.length > 1 ? `${xs.slice(0, -1).join(", ")} o ${xs[xs.length - 1]}` : xs[0] || "";
}

/** «noviembre 2026»: el mes (hora de Chile) desde el que rige la tarifa; sin fecha (valores de respaldo), noviembre de 2026, como en los PDF publicados. */
export function vigenciaTexto(t) {
  const ms = Date.parse(t.vigente_desde || "");
  if (!Number.isFinite(ms)) return { corto: "noviembre 2026", de: "noviembre de 2026" };
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "numeric" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const mes = MESES[Number(p.month) - 1], anio = p.year;
  return { corto: `${mes} ${anio}`, de: `${mes} de ${anio}` };
}

function ayudas(t) {
  const op = Object.fromEntries(t.opcionales.map((o) => [o.id, o.neto]));
  const maxCaps = Math.max(...t.capitulos.map((c) => c.caps)), minCaps = Math.min(...t.capitulos.map((c) => c.caps));
  const v = vigenciaTexto(t);
  return { m, filasCaps, op, rango: `${minCaps} a ${maxCaps}`, vig: v.corto, vigDe: v.de, h36: t.cambio_sin_costo_horas, plazoLargo: plazoLargo(t), plazoCorto: plazoCorto(t) };
}

// Estilos de pantalla (la hoja original es A4 fija para imprimir): en pantalla las hojas fluyen, se adaptan al ancho y llevan una barra con «Guardar como PDF». Al imprimir rige la hoja original.
const CSS_PANTALLA = String.raw`
  .barra { display: none; }
  @media screen {
    html, body { background: #E7DCC3; }
    .barra { display: flex; position: sticky; top: 0; z-index: 10; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 10px 18px; background: #0A0A0A; color: #FCEFD4; font: 600 14px 'Archivo', sans-serif; }
    .barra a { color: #FCEFD4; }
    .barra button { font: 800 13px 'Archivo', sans-serif; background: #F4B81C; color: #0A0A0A; border: 0; padding: 9px 14px; cursor: pointer; min-height: 40px; }
    .barra button:focus-visible, .barra a:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    .page { width: min(210mm, 100%); height: auto; margin: 18px auto; padding: 0 15mm 24mm; overflow: visible; box-shadow: 0 2px 18px rgba(0,0,0,.14); }
    .page:first-of-type { margin-top: 18px; }
    .foot { position: static; margin-top: 12mm; }
    .contact { position: static; margin-top: 12mm; }
    .hero { height: auto; padding-bottom: 0; }
    .hero .kick { position: static; text-align: left; margin-top: 8mm; }
    .hero h1 { margin-top: 6mm; }
    .hero .stripes { position: static; width: 40mm; margin-top: 6mm; }
    .hero .ph { position: relative; height: 52mm; margin: 8mm -15mm 0; }
    .cover .kick { position: static; text-align: left; margin-top: 6mm; }
    .tw { overflow-x: auto; }
    .page table { min-width: 0; }
  }
  @media screen and (max-width: 720px) {
    .page { width: 100%; margin: 0 0 14px; padding: 0 18px 22px; box-shadow: none; }
    .hero, .cover, .faces, .stats, .gal { margin-left: -18px; margin-right: -18px; }
    .hero { padding: 24px 18px 0; }
    .cover { padding: 24px 18px 0; }
    .hero .ph { margin: 8mm -18px 0; height: 120px; }
    .hero h1 { font-size: 30pt; } .cover h1 { font-size: 32pt; } .cover h1 .serif { font-size: 36pt; }
    .inc, .conds, .steps, .sets, .two, .next { grid-template-columns: 1fr !important; }
    .piloto { grid-template-columns: 1fr; padding: 22px 18px; }
    .piloto .v { text-align: left; }
    .faces { grid-template-columns: repeat(2, 1fr); } .faces div { height: 46vw; }
    .stats { grid-template-columns: repeat(2, 1fr); }
    .stats div { border-bottom: .35mm solid var(--ink); }
    .gal { grid-template-columns: 1fr; grid-template-rows: auto; margin-bottom: 8mm; }
    .gal > div { height: 54vw; } .gal .g3 { grid-column: auto; grid-template-columns: repeat(2, 1fr); } .gal .g3 div { height: 34vw; }
    .thumbs { grid-template-columns: repeat(2, 1fr); }
    table { font-size: 8.4pt; } th, td { padding: 8px 5px; } td.n, th.n { white-space: normal; } .price { font-size: 9pt; }
    .seasons td:first-child { white-space: normal; }
    .contact { flex-direction: column; align-items: flex-start; gap: 14px; display: flex; } .contact { grid-template-columns: 1fr; }
    h2 { font-size: 21pt; }
    .caps { font-size: 6.9pt; } .caps th, .caps td { padding: 8px 3px; } .caps th { font-size: 5.4pt; letter-spacing: .04em; } .caps .price { font-size: 7.4pt; } .caps td:first-child { white-space: nowrap; }
  }
  @media print { .barra { display: none !important; } }
`;

const CABEZA = (titulo, descripcion, url) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="https://podfactory.cl${url}">
<link rel="icon" type="image/png" href="/assets/favicon.png?v=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">`;
const BARRA = `<div class="barra"><a href="/">← podfactory.cl</a><button type="button" onclick="window.print()">Imprimir o guardar como PDF</button></div>`;

// Las tablas anchas se envuelven para poder desplazarse en teléfonos muy angostos sin romper la hoja.
const envolverTablas = (html) => html.replace(/<table(\s[^>]*)?>(\s*<tr><th>Capítulos)/g, '<table class="caps">$2').replace(/<table(\s[^>]*)?>/g, (x) => `<div class="tw">${x}`).replace(/<\/table>/g, "</table></div>");

export function paginaCondiciones(tarifa) {
  const t = tarifaParaDocumentos(tarifa);
  return `${CABEZA("Pod Factory · Tarifas y condiciones del estudio", "Tarifas y condiciones del estudio de Pod Factory: capítulos, edición, opcionales, pago, plazos y cambios de fecha.", "/condiciones")}
<style>${CSS_CONDICIONES}${CSS_PANTALLA}</style>
</head>
<body>
${BARRA}
${envolverTablas(cuerpoCondiciones(t, ayudas(t)))}
</body>
</html>`;
}

export function paginaInformacion(tarifa) {
  const t = tarifaParaDocumentos(tarifa);
  return `${CABEZA("Pod Factory · Información del estudio", "Información del estudio de Pod Factory en Vitacura: el set, cómo trabajamos y los precios vigentes.", "/informacion")}
<style>${CSS_INFORMACION}${CSS_PANTALLA}</style>
</head>
<body>
${BARRA}
${envolverTablas(cuerpoInformacion(t, ayudas(t)))}
</body>
</html>`;
}
