// GET /r/<token> — enlace corto para «Gestionar mi reserva» (botón URL de las plantillas de WhatsApp pf_*_v2, que solo admiten un sufijo).
// Redirige (302) al MISMO destino que usa el correo de la reserva:
//   · grabaciones del portal (postpago / compras): b.portalUrl + "#agendar"  → se cambian y cancelan en el portal del cliente;
//   · el resto: la página de gestión de podfactory.cl (manageUrl).
// Reserva que no existe, ya cancelada o ya pasada → portada de podfactory.cl. La respuesta nunca lleva datos de la reserva (solo el destino).
import { getBooking, manageUrl } from "../_lib/booking.js";

const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;
// portalUrl lo manda el hub (con el secreto de intake), pero igual solo se redirige a los portales de los clientes: nunca a un dominio ajeno.
const PORTAL_RE = /^https:\/\/clientes\.(doppel|podfactory)\.cl\//;

const salto = (url) => new Response(null, { status: 302, headers: { location: url, "cache-control": "no-store", "referrer-policy": "no-referrer" } });

// Destino de la gestión para una reserva guardada (misma regla que el correo: schedule.js y cron/reminders.js).
function destinoGestion(origin, b) {
  if (b.portalUrl && PORTAL_RE.test(String(b.portalUrl))) return String(b.portalUrl) + "#agendar";
  return manageUrl(origin, b.token);
}

export async function onRequestGet({ request, env, params }) {
  const origin = new URL(request.url).origin;
  const inicio = env.SITE_URL || "https://podfactory.cl/";
  const token = String(params?.token || "");
  if (!TOKEN_RE.test(token)) return salto(inicio);
  let b = null;
  try { b = await getBooking(env, token); } catch (e) { console.log("r/token: no se pudo leer la reserva:", String(e)); }
  if (!b) return salto(inicio);
  const fin = Date.parse(b.end || b.start);
  if (!(fin > Date.now())) return salto(inicio); // ya pasó
  return salto(destinoGestion(origin, { ...b, token }));
}
