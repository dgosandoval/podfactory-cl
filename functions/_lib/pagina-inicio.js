// El texto de respaldo para buscadores de index.html trae el «desde $950.000 + IVA» de la locación dentro de <span data-tarifa="locacion_desde">: aquí se reemplaza por el valor
// vigente de la tarifa del hub (functions/index.js). El valor escrito en el HTML es solo el respaldo (el de siempre) por si algo falla.
import { m } from "./documentos.js";

/** Reemplaza el hueco de la locación por la tarifa vigente. Si la tarifa no trae un número válido, deja el HTML como está. */
export function rellenarTarifas(html, t) {
  const n = t?.locacion?.desde_neto;
  if (!Number.isInteger(n) || n <= 0) return html;
  // Con función (no con texto): el valor empieza con «$» y en un texto de reemplazo «$1» significaría «el primer grupo».
  return html.replace(/(<span data-tarifa="locacion_desde">)[^<]*(<\/span>)/g, (_, a, b) => a + m(n) + b);
}
