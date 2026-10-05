// Solicitudes de reunión por Meet y de visita al estudio: la persona pide una hora libre, el equipo la confirma.
//  · requestBooking: crea el evento TENTATIVO (la hora queda tomada), guarda la solicitud y avisa a ambos lados.
//  · resolverUrl: link firmado para que el equipo confirme o responda (sin iniciar sesión).
//  · confirmarSolicitud / rechazarSolicitud: lo que pasa al decidir (confirma + Meet + correo, o libera y avisa).
import { createEvent, confirmEvent, deleteEvent } from "./google.js";
import { newToken, saveBooking, deleteBooking, manageUrl } from "./booking.js";
import { SERVICES } from "./slots.js";
import { toHub } from "./hub.js";
import { sendEmail, studioRecipients, formatSession, customerEmailHtml, icsAttachment, whatsappLink,
  solicitudRecibidaHtml, solicitudEstudioHtml, solicitudRechazadaHtml } from "./email.js";

async function firma(env, token) {
  const secret = env.PORTAL_INTAKE_SECRET || env.ADMIN_KEY;
  if (!secret) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`solicitud|${token}`));
  return Array.from(new Uint8Array(sig)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function firmaValida(env, token, k) { const f = await firma(env, token); return !!f && !!k && f === k; }
export async function resolverUrl(env, origin, token) { return `${origin}/api/solicitud?id=${token}&k=${await firma(env, token)}`; }

// d = { tipo, start, end, date, label, name, email, phone, personas, comentarios, empresa, origen, consent }
export async function requestBooking(env, config, origin, d) {
  const svc = SERVICES[d.tipo];
  const token = newToken();
  const ev = await createEvent(env, {
    summary: `⏳ SOLICITUD ${d.tipo === "llamada" ? "Meet" : "visita"}: ${d.name}${d.empresa ? ` (${d.empresa})` : ""}`,
    description: `${svc.label}: solicitud pendiente de confirmar.\nCliente: ${d.name}${d.empresa ? `\nEmpresa: ${d.empresa}` : ""}\nEmail: ${d.email}\nTel: ${d.phone}\nPersonas: ${d.personas || 1}${d.comentarios ? `\nIdea: ${d.comentarios}` : ""}`,
    startISO: d.start, endISO: d.end, timeZone: config.timeZone, status: "tentative", colorId: "5",
  });
  await saveBooking(env, {
    token, eventId: ev.id, date: d.date, label: d.label, start: d.start, end: d.end,
    name: d.name, email: d.email, phone: d.phone, tipo: d.tipo, personas: d.personas || 1,
    addons: [], comentarios: d.comentarios || "", empresa: d.empresa || "", rut: "", razonSocial: "", giro: "",
    deposit: 0, reminded: false, estado: "pendiente", solicitadoAt: new Date().toISOString(),
  });
  await toHub(env, { email: d.email, name: d.name, empresa: d.empresa || undefined, phone: d.phone,
    segment: d.empresa ? "empresa" : undefined, source: d.tipo, consent: d.consent === true, origen: d.origen });

  const { fecha, hora } = formatSession(d.start, config.timeZone);
  try {
    if (d.email) await sendEmail(env, {
      to: d.email, subject: `Recibimos tu solicitud de ${d.tipo === "llamada" ? "reunión" : "visita"} · Pod Factory`,
      html: solicitudRecibidaHtml({ name: d.name, fecha, hora, tipo: d.tipo, manageUrl: manageUrl(origin, token),
        whatsappUrl: whatsappLink(env, `Hola Pod Factory, sobre mi solicitud del ${fecha} a las ${hora} hrs:`) }),
    });
    await sendEmail(env, {
      to: studioRecipients(env), subject: `Solicitud de ${d.tipo === "llamada" ? "reunión Meet" : "visita"}: ${d.name} · ${fecha} ${hora} hrs`,
      html: solicitudEstudioHtml({ name: d.name, email: d.email, phone: d.phone, fecha, hora, tipo: d.tipo, personas: d.personas, comentarios: d.comentarios, empresa: d.empresa,
        resolverUrl: await resolverUrl(env, origin, token) }),
      replyTo: d.email,
    });
  } catch (e) { console.log("email solicitud error (solicitud igual creada):", String(e)); }
  return { token, fecha, hora };
}

// El equipo confirma. meetManual = link de Meet pegado por el equipo (opcional).
export async function confirmarSolicitud(env, config, origin, b, meetManual) {
  const svc = SERVICES[b.tipo];
  const resumen = `${b.tipo === "visita" ? "👀" : "📹"} ${svc.label}: ${b.name}${b.empresa ? ` (${b.empresa})` : ""}`;
  let meetUrl = null, meetError = null;
  if (b.tipo === "llamada" && meetManual) {
    await confirmEvent(env, b.eventId, { summary: resumen, meet: false });
    meetUrl = meetManual;
  } else {
    const r = await confirmEvent(env, b.eventId, { summary: resumen, meet: b.tipo === "llamada" });
    meetUrl = r.meetUrl; meetError = r.meetError;
  }
  if (b.tipo === "llamada" && !meetUrl) meetUrl = env.MEET_URL || null; // sala fija del estudio, si está configurada
  const upd = { ...b, estado: "confirmada", confirmadaAt: new Date().toISOString(), meetUrl };
  await saveBooking(env, upd);
  const { fecha, hora } = formatSession(b.start, config.timeZone);
  const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
  try {
    if (b.email) await sendEmail(env, {
      to: b.email,
      subject: b.tipo === "visita" ? "Tu visita a Pod Factory está confirmada 🎙️" : "Tu reunión con Pod Factory está confirmada 📹",
      html: customerEmailHtml({ name: b.name, fecha, hora, deposit: 0, address, tipo: b.tipo, meetUrl,
        manageUrl: manageUrl(origin, b.token), whatsappUrl: whatsappLink(env, `Hola Pod Factory, sobre mi reserva del ${fecha} a las ${hora} hrs:`) }),
      attachments: [icsAttachment({ uid: b.token, start: b.start, end: b.end, summary: `${svc.label} · Pod Factory`,
        location: b.tipo === "llamada" ? (meetUrl || "Videollamada") : address,
        description: b.tipo === "visita" ? "Visita al estudio Pod Factory (20 minutos)." : `Reunión por videollamada con el equipo de Pod Factory.${meetUrl ? ` Link: ${meetUrl}` : ""}` })],
    });
  } catch (e) { console.log("email confirmación solicitud error:", String(e)); }
  return { fecha, hora, meetUrl, meetError };
}

// El equipo no puede esa hora: libera el evento, avisa con un mensaje y manda el link para pedir otra.
export async function rechazarSolicitud(env, config, b, mensaje) {
  try { await deleteEvent(env, b.eventId); } catch (e) { console.log("deleteEvent solicitud:", String(e)); }
  await deleteBooking(env, b.token);
  if (b.email && env.HOLDS) await env.HOLDS.delete(`${b.tipo}-email:${b.email.toLowerCase()}`);
  const { fecha, hora } = formatSession(b.start, config.timeZone);
  try {
    if (b.email) await sendEmail(env, {
      to: b.email, subject: "Necesitamos otra hora · Pod Factory",
      html: solicitudRechazadaHtml({ name: b.name, fecha, hora, tipo: b.tipo, mensaje,
        otraUrl: `${config.siteUrl}?agendar=${b.tipo === "visita" ? "1" : "llamada"}&e=${encodeURIComponent(b.email)}&n=${encodeURIComponent(b.name)}#reservar`,
        whatsappUrl: whatsappLink(env, "Hola Pod Factory, quiero coordinar otra hora:") }),
    });
  } catch (e) { console.log("email rechazo solicitud error:", String(e)); }
  return { fecha, hora };
}
