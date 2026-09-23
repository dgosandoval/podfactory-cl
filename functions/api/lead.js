// POST /api/lead — formulario "Para empresas" de la landing.
// Avisa al estudio por correo (responder = responderle al lead) y, si está
// configurado HUB_LEAD_URL, lo registra también en el hub como propuesta.
// Anti-spam: honeypot `website` + máximo 5 envíos por IP por hora.
import { sendEmail } from "../_lib/email.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Datos inválidos" }, 400); }
  if (b.website) return json({ ok: true }); // bot: fingimos éxito y no hacemos nada

  const lead = {
    nombre: String(b.nombre || "").trim().slice(0, 100),
    empresa: String(b.empresa || "").trim().slice(0, 120),
    email: String(b.email || "").trim().slice(0, 120),
    telefono: String(b.telefono || "").trim().slice(0, 40),
    capitulos: String(b.capitulos || "").trim().slice(0, 20),
    donde: String(b.donde || "").trim().slice(0, 20),
    mensaje: String(b.mensaje || "").trim().slice(0, 1500),
  };
  if (!lead.nombre || !lead.empresa) return json({ error: "Falta tu nombre o la empresa" }, 400);
  if (!/\S+@\S+\.\S+/.test(lead.email)) return json({ error: "Email inválido" }, 400);
  if (lead.telefono.replace(/\D/g, "").length < 8) return json({ error: "Teléfono inválido" }, 400);

  // Límite por IP (KV con expiración de 1 h).
  const ip = request.headers.get("cf-connecting-ip") || "0";
  if (env.HOLDS) {
    const k = `lead-rate:${ip}`;
    const n = parseInt((await env.HOLDS.get(k)) || "0", 10);
    if (n >= 5) return json({ error: "Demasiados envíos. Escríbenos por WhatsApp" }, 429);
    await env.HOLDS.put(k, String(n + 1), { expirationTtl: 3600 });
  }

  const tel = lead.telefono.replace(/\D/g, "");
  const wa = `https://wa.me/${tel.startsWith("56") ? tel : "56" + tel.replace(/^0/, "")}`;
  const rows = [
    ["Nombre", lead.nombre], ["Empresa", lead.empresa], ["Email", lead.email], ["Teléfono", lead.telefono],
    ["Capítulos", lead.capitulos], ["Dónde", lead.donde], ["Mensaje", lead.mensaje || "—"],
  ].map(([k, v]) => `<tr><td style="padding:6px 10px;color:#666;vertical-align:top">${k}</td><td style="padding:6px 10px;font-weight:600">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="margin:0 0 6px">Nuevo lead de empresa 🎙️</h2>
    <p style="margin:0 0 14px;color:#444">Pidió una propuesta desde podfactory.cl. Compromiso: responder en menos de 24 horas hábiles.</p>
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    <p style="margin-top:16px"><a href="${wa}" style="background:#25D366;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px;font-weight:700">Escribirle por WhatsApp</a></p>
  </div>`;

  // 1) Respaldo: todo lead queda guardado 180 días aunque falle el correo.
  const id = `${new Date().toISOString()}_${crypto.randomUUID().slice(0, 8)}`;
  let stored = false;
  if (env.HOLDS) {
    try { await env.HOLDS.put(`lead:${id}`, JSON.stringify({ ...lead, ip, at: new Date().toISOString() }), { expirationTtl: 180 * 86400 }); stored = true; }
    catch (e) { console.log("lead store error:", String(e)); }
  }
  // 2) Aviso por correo. sendEmail devuelve {skipped} si falta RESEND_API_KEY: eso NO cuenta como enviado.
  let emailed = false;
  try {
    const r = await sendEmail(env, {
      to: env.LEAD_EMAIL || env.STUDIO_EMAIL || "hola@doppel.cl",
      subject: `Lead empresa: ${lead.empresa} · ${lead.capitulos} caps · ${lead.donde}`,
      html, replyTo: lead.email,
    });
    emailed = !(r && r.skipped);
    if (!emailed) console.log("lead email skipped:", r && r.skipped);
  } catch (e) { console.log("lead email error:", String(e)); }
  if (!stored && !emailed) return json({ error: "No pudimos enviar tu solicitud" }, 502);

  // Registro en el hub (best-effort; no bloquea al lead si falla).
  if (env.HUB_LEAD_URL && env.PORTAL_INTAKE_SECRET) {
    try {
      await fetch(env.HUB_LEAD_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-intake-secret": env.PORTAL_INTAKE_SECRET },
        body: JSON.stringify({ ...lead, source: "podfactory.cl/empresas" }),
      });
    } catch (e) { console.log("hub lead error:", String(e)); }
  }
  return json({ ok: true, emailed });
}
