// /api/confirm?id=<token>  Confirmación de asistencia a una grabación (link de los recordatorios).
// GET muestra la reserva y un botón; POST confirma. No se confirma en el GET: los filtros de correo
// (Outlook, antivirus) abren los links solos y confirmarían sin que la persona lo haya hecho.
import { parseConfig } from "../_lib/slots.js";
import { getBooking, saveBooking } from "../_lib/booking.js";
import { formatSession, salidaDe } from "../_lib/email.js";

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const page = (inner) => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmar grabación · Pod Factory</title><meta name="robots" content="noindex"></head>
<body style="margin:0;background:#F5EBD6;font-family:Arial,Helvetica,sans-serif;color:#0A0A0A">
<div style="max-width:480px;margin:32px auto;background:#fff;border:2px solid #0A0A0A">
<div style="background:#000;padding:18px;text-align:center"><img src="https://podfactory.cl/assets/podfactory-logo.png" alt="Pod Factory" height="44"></div>
<div style="padding:26px 22px;text-align:center">${inner}</div></div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

function detalle(b, config) {
  const { fecha, hora } = formatSession(b.start, config.timeZone);
  return `<p style="font-size:15px;text-transform:capitalize;margin:0 0 6px"><b>${esc(fecha)}</b></p>
    <p style="font-size:30px;font-weight:800;margin:6px 0">${hora} → ${salidaDe(b.start, config.timeZone)}</p>
    <p style="font-size:13px;color:#555;margin:0 0 18px">Llegada ${hora} · salida ${salidaDe(b.start, config.timeZone)} hrs. Es 1 hora de estudio: si llegas tarde, igual terminamos a la hora de salida.</p>`;
}

export async function onRequestGet({ request, env }) {
  const config = parseConfig(env);
  const id = new URL(request.url).searchParams.get("id");
  const b = await getBooking(env, id);
  if (!b) return page(`<h1 style="font-size:20px">No encontramos esta reserva</h1><p>Puede que se haya cancelado o cambiado. Escríbenos por WhatsApp si tienes dudas.</p>`);
  if (b.confirmedAt) return page(`<h1 style="font-size:22px;color:#1a7f37">✓ Ya está confirmada</h1>${detalle(b, config)}<p>¡Te esperamos!</p>`);
  return page(`<h1 style="font-size:22px">¿Confirmas tu grabación?</h1>${detalle(b, config)}
    <form method="post"><input type="hidden" name="id" value="${esc(b.token)}">
    <button type="submit" style="background:#D92E2E;color:#fff;border:0;padding:14px 26px;font-weight:800;font-size:15px;border-radius:999px;cursor:pointer">Sí, confirmo mi asistencia</button></form>`);
}

export async function onRequestPost({ request, env }) {
  const config = parseConfig(env);
  const f = await request.formData();
  const b = await getBooking(env, String(f.get("id") || ""));
  if (!b) return page(`<h1 style="font-size:20px">No encontramos esta reserva</h1>`);
  if (!b.confirmedAt) await saveBooking(env, { ...b, confirmedAt: new Date().toISOString(), confirmedVia: "correo" });
  return page(`<h1 style="font-size:22px;color:#1a7f37">✓ ¡Gracias! Confirmaste tu grabación</h1>${detalle(b, config)}<p style="font-size:13px;color:#555">Eduardo Marquina 3937, Vitacura. Llega puntual: la hora es la hora.</p>`);
}
