// Confirmación de una reserva web (visita al estudio o mini-piloto): crea el evento en
// el calendario del estudio, guarda la reserva, la registra en el hub y manda los correos.
// La usan /api/reserve (visita: gratis, se confirma al tiro) y /api/mp-webhook (mini-piloto:
// se confirma cuando MercadoPago aprueba el pago), así ambos caminos son idénticos.
import { createEvent } from "./google.js";
import { newToken, saveBooking, manageUrl } from "./booking.js";
import { SERVICES } from "./slots.js";
import { toHub } from "./hub.js";
import { sendEmail, formatSession, customerEmailHtml, studioEmailHtml, icsAttachment, whatsappLink } from "./email.js";

// d = { tipo, start, end, date, label, name, email, phone, personas, comentarios, empresa,
//       rut, razonSocial, giro, paid (CLP con IVA), paymentId, eventId? }
export async function confirmBooking(env, config, origin, d) {
  const svc = SERVICES[d.tipo] || { label: "Grabación", key: d.tipo || "grabacion" };
  const token = newToken();
  const fact = d.rut ? `\nFacturar a: ${d.razonSocial} · RUT ${d.rut}${d.giro ? ` · Giro ${d.giro}` : ""}` : "";
  const pago = d.paid ? `\nPagado: $${Number(d.paid).toLocaleString("es-CL")} IVA incluido (MercadoPago ${d.paymentId})` : "\nSin pago (visita gratuita)";

  // 1) Evento en el calendario del estudio. Si viene eventId (idempotencia por pago), un 2º
  //    intento con el mismo id falla con DUPLICATE_EVENT y el llamador lo ignora.
  const ev = await createEvent(env, {
    id: d.eventId,
    summary: `${d.tipo === "visita" ? "👀" : "🎙️"} ${svc.label}: ${d.name}${d.empresa ? ` (${d.empresa})` : ""}`,
    description: `${svc.label} reservada vía web.\nCliente: ${d.name}${d.empresa ? `\nEmpresa: ${d.empresa}` : ""}\nEmail: ${d.email}\nTel: ${d.phone}\nPersonas: ${d.personas || 1}${d.comentarios ? `\nComentarios: ${d.comentarios}` : ""}${pago}${fact}\nGestión: ${d.date} ${d.label} · token ${token}`,
    startISO: d.start,
    endISO: d.end,
    timeZone: config.timeZone,
  });

  // 2) Registro para gestión (cambiar fecha) y recordatorios.
  await saveBooking(env, {
    token, eventId: ev.id, date: d.date, label: d.label, start: d.start, end: d.end,
    name: d.name, email: d.email, phone: d.phone, tipo: d.tipo, personas: d.personas || 1,
    addons: [], comentarios: d.comentarios || "", empresa: d.empresa || "",
    rut: d.rut || "", razonSocial: d.razonSocial || "", giro: d.giro || "",
    deposit: d.paid || 0, reminded: false,
  });

  const { fecha, hora } = formatSession(d.start, config.timeZone);

  // 3) Hub (best-effort): crea/ubica al cliente y su proyecto.
  let portalUrl = null;
  if (env.PORTAL_INTAKE_URL && env.PORTAL_INTAKE_SECRET) {
    try {
      const r = await fetch(env.PORTAL_INTAKE_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-intake-secret": env.PORTAL_INTAKE_SECRET },
        body: JSON.stringify({
          name: d.name, email: d.email, phone: d.phone, date: d.date, label: d.label, fecha, hora,
          tipo: svc.label, personas: d.personas || 1, addons: [],
          comentarios: [d.empresa ? `Empresa: ${d.empresa}` : "", d.comentarios || "", fact.trim()].filter(Boolean).join("\n"),
          deposit: d.paid || 0, paymentId: d.paymentId || `visita-${token}`,
        }),
      });
      if (r.ok) { const j = await r.json(); portalUrl = j.loginUrl || j.projectUrl || null; }
      else console.log("portal intake non-ok:", r.status, await r.text());
    } catch (e) { console.log("portal intake error:", String(e)); }
  }

  // 3b) CRM de leads (estado visita/minipiloto: detiene la secuencia de nutrición).
  await toHub(env, { email: d.email, name: d.name, empresa: d.empresa || undefined, phone: d.phone,
    segment: d.empresa ? "empresa" : undefined, source: d.tipo, consent: d.consent === true });

  // 4) Correos (best-effort: un fallo aquí no revierte la reserva).
  try {
    const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
    if (d.email) {
      await sendEmail(env, {
        to: d.email,
        subject: d.tipo === "visita" ? "Tu visita a Pod Factory está confirmada 🎙️" : "Tu mini-piloto en Pod Factory está confirmado 🎙️",
        html: customerEmailHtml({
          name: d.name, fecha, hora, deposit: d.paid || 0, address, tipo: d.tipo,
          manageUrl: manageUrl(origin, token), conditionsUrl: `${config.siteUrl}condiciones.pdf`,
          whatsappUrl: whatsappLink(env, `Hola Pod Factory, sobre mi reserva del ${fecha} a las ${hora} hrs:`),
          portalUrl,
        }),
        attachments: [icsAttachment({
          uid: token, start: d.start, end: d.end, summary: `${svc.label} · Pod Factory`, location: address,
          description: d.tipo === "visita" ? "Visita al estudio Pod Factory (20 minutos)." : "Mini-piloto en Pod Factory: 10 minutos de grabación. Llega 10 minutos antes.",
        })],
      });
    }
    if (env.STUDIO_EMAIL) {
      await sendEmail(env, {
        to: env.STUDIO_EMAIL,
        subject: `${d.tipo === "visita" ? "Nueva visita" : "Nuevo mini-piloto"}: ${d.name}${d.empresa ? ` (${d.empresa})` : ""} · ${fecha} ${hora} hrs`,
        html: studioEmailHtml({
          name: d.name, email: d.email, phone: d.phone, fecha, hora, deposit: d.paid || 0, tipo: svc.label,
          personas: d.personas || 1, addons: [], comentarios: [d.empresa ? `Empresa: ${d.empresa}` : "", d.comentarios || ""].filter(Boolean).join(" · "),
          rut: d.rut, razonSocial: d.razonSocial, giro: d.giro,
        }),
        replyTo: d.email,
      });
    }
  } catch (e) {
    console.log("email error (reserva igual confirmada):", String(e));
  }
  return { token, fecha, hora };
}
