// /api/solicitud?id=<token>&k=<firma>  El equipo confirma o responde una solicitud de reunión por Meet / visita.
// GET muestra la solicitud (no actúa: los filtros de correo abren los links solos). POST decide.
import { parseConfig } from "../_lib/slots.js";
import { getBooking } from "../_lib/booking.js";
import { formatSession } from "../_lib/email.js";
import { firmaValida, confirmarSolicitud, rechazarSolicitud } from "../_lib/solicitud.js";

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const page = (inner) => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solicitud · Pod Factory</title><meta name="robots" content="noindex"></head>
<body style="margin:0;background:#F5EBD6;font-family:Arial,Helvetica,sans-serif;color:#0A0A0A">
<div style="max-width:520px;margin:32px auto;background:#fff;border:2px solid #0A0A0A">
<div style="background:#000;padding:18px;text-align:center"><img src="https://podfactory.cl/assets/podfactory-logo.png" alt="Pod Factory" height="44"></div>
<div style="padding:26px 22px">${inner}</div></div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
const btn = (bg, extra = "") => `background:${bg};color:#fff;border:0;padding:13px 24px;font-weight:800;font-size:15px;border-radius:999px;cursor:pointer;${extra}`;

function detalle(b, config) {
  const { fecha, hora } = formatSession(b.start, config.timeZone);
  return `<p style="font-size:13px;color:#555;margin:0 0 4px">${b.tipo === "llamada" ? "Reunión por Meet" : "Visita al estudio"}</p>
    <p style="font-size:17px;margin:0 0 4px;text-transform:capitalize"><b>${esc(fecha)}</b> · <b>${hora} hrs</b> (30 min)</p>
    <p style="font-size:14px;line-height:1.5;margin:10px 0">${esc(b.name)}${b.empresa ? ` · ${esc(b.empresa)}` : ""}<br>${esc(b.email)} · ${esc(b.phone)}${b.comentarios ? `<br><i>${esc(b.comentarios)}</i>` : ""}</p>`;
}

async function cargar(request, env) {
  const u = new URL(request.url);
  const id = u.searchParams.get("id"), k = u.searchParams.get("k");
  if (!(await firmaValida(env, id, k))) return { error: page(`<h1 style="font-size:20px">Link no válido</h1><p>Este link no corresponde a una solicitud.</p>`) };
  const b = await getBooking(env, id);
  if (!b) return { error: page(`<h1 style="font-size:20px">Solicitud no encontrada</h1><p>Ya fue respondida, cancelada por la persona o venció.</p>`) };
  return { b, id, k };
}

export async function onRequestGet({ request, env }) {
  const config = parseConfig(env);
  const r = await cargar(request, env); if (r.error) return r.error;
  const { b, id, k } = r;
  if (b.estado === "confirmada") return page(`<h1 style="font-size:22px;color:#1a7f37">✓ Ya está confirmada</h1>${detalle(b, config)}${b.meetUrl ? `<p>Meet: <a href="${esc(b.meetUrl)}">${esc(b.meetUrl)}</a></p>` : ""}`);
  return page(`<h1 style="font-size:22px;margin-top:0">Solicitud pendiente</h1>${detalle(b, config)}
    <form method="post" style="margin:18px 0 6px">
      <input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="k" value="${esc(k)}"><input type="hidden" name="accion" value="confirmar">
      ${b.tipo === "llamada" ? `<label style="display:block;font-size:12px;color:#555;margin-bottom:4px">Link de Meet propio (opcional; si lo dejas vacío se crea uno automático)</label>
      <input name="meet" placeholder="https://meet.google.com/..." style="width:100%;box-sizing:border-box;padding:10px;border:1.5px solid #0A0A0A;margin-bottom:12px">` : ""}
      <button type="submit" style="${btn("#1a7f37")}">Confirmar</button>
    </form>
    <form method="post" style="border-top:1px solid #0A0A0A22;padding-top:14px;margin-top:16px">
      <input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="k" value="${esc(k)}"><input type="hidden" name="accion" value="rechazar">
      <label style="display:block;font-size:12px;color:#555;margin-bottom:4px">¿No puedes esa hora? Escríbele un mensaje (le llega con un link para elegir otra)</label>
      <textarea name="mensaje" rows="3" placeholder="Ej.: Ese día estamos grabando. ¿Te sirve el jueves en la tarde?" style="width:100%;box-sizing:border-box;padding:10px;border:1.5px solid #0A0A0A;margin-bottom:10px"></textarea>
      <button type="submit" style="${btn("#0A0A0A")}">Liberar la hora y responder</button>
    </form>`);
}

export async function onRequestPost({ request, env }) {
  const config = parseConfig(env);
  const f = await request.formData();
  const url = new URL(request.url);
  url.searchParams.set("id", String(f.get("id") || "")); url.searchParams.set("k", String(f.get("k") || ""));
  const r = await cargar(new Request(url), env); if (r.error) return r.error;
  const { b } = r;
  const origin = url.origin;
  if (b.estado === "confirmada") return page(`<h1 style="font-size:22px;color:#1a7f37">✓ Ya estaba confirmada</h1>${detalle(b, config)}`);
  try {
    if (String(f.get("accion")) === "rechazar") {
      await rechazarSolicitud(env, config, b, String(f.get("mensaje") || "").slice(0, 600));
      return page(`<h1 style="font-size:22px">Hora liberada</h1><p>Le avisamos a ${esc(b.name)} con tu mensaje y un link para elegir otra hora.</p>`);
    }
    const meetManual = String(f.get("meet") || "").trim();
    const res = await confirmarSolicitud(env, config, origin, b, /^https:\/\/meet\.google\.com\//.test(meetManual) ? meetManual : null);
    return page(`<h1 style="font-size:22px;color:#1a7f37">✓ Confirmada</h1>${detalle(b, config)}
      <p style="font-size:14px">Le enviamos la confirmación a ${esc(b.email)}${b.tipo === "llamada" ? (res.meetUrl ? `.<br>Meet: <a href="${esc(res.meetUrl)}">${esc(res.meetUrl)}</a>` : `.<br><b>Ojo:</b> no se pudo crear el link de Meet automáticamente${res.meetError ? ` (${esc(res.meetError)})` : ""}. Envíale el link a mano.`) : "."}</p>`);
  } catch (e) {
    return page(`<h1 style="font-size:20px">No se pudo completar</h1><p>${esc(String(e).slice(0, 300))}</p>`);
  }
}
