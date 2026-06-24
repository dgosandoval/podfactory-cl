// POST /api/portal/schedule  (header x-intake-secret == PORTAL_INTAKE_SECRET)
// Agenda una grabación desde el portal de clientes (doppel-clientes), para
// CUALQUIER marca (Doppel o Pod Factory). Crea el evento en el MISMO calendario
// del estudio que usa la disponibilidad pública → una grabación de Doppel ocupa
// el calendario y por lo tanto BLOQUEA las reservas de Pod Factory (y viceversa).
// Es aditivo: no toca /api/reserve ni /api/availability.
import { parseConfig, getOffset, overlapsBusy } from "../../_lib/slots.js";
import { getBusy, createEvent } from "../../_lib/google.js";
import { newToken, saveBooking, manageUrl } from "../../_lib/booking.js";
import { sendEmail, formatSession, icsAttachment, whatsappLink, customerEmailHtml } from "../../_lib/email.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.PORTAL_INTAKE_SECRET || request.headers.get("x-intake-secret") !== env.PORTAL_INTAKE_SECRET) {
    return json({ error: "forbidden" }, 403);
  }
  const config = parseConfig(env);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const brand = body.brand === "podfactory" ? "podfactory" : "doppel";
  const projectName = String(body.projectName || "").slice(0, 120) || "Grabación";
  const date = String(body.date || "");
  const start = String(body.start || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Fecha inválida (YYYY-MM-DD)" }, 400);
  if (!/^\d{1,2}:\d{2}$/.test(start)) return json({ error: "Hora inválida (HH:MM)" }, 400);

  const hhmm = start.padStart(5, "0");
  const offset = getOffset(date, config.timeZone);
  const startMs = Date.parse(`${date}T${hhmm}:00${offset}`);
  if (isNaN(startMs)) return json({ error: "Fecha/hora inválida" }, 400);
  const mins = Math.min(480, Math.max(20, parseInt(body.minutes, 10) || config.slotMinutes));
  const slot = { label: hhmm, start: new Date(startMs).toISOString(), end: new Date(startMs + mins * 60000).toISOString() };
  if (startMs <= Date.now()) return json({ error: "Ese horario ya pasó" }, 400);

  // ¿El calendario del estudio está libre en ese rango? (reservas PF + otras grabaciones)
  try {
    const busy = await getBusy(env, slot.start, slot.end);
    if (overlapsBusy(slot, busy)) return json({ error: "Ese horario ya está ocupado en el estudio." }, 409);
  } catch (e) {
    return json({ error: "No se pudo verificar el calendario", detail: String(e) }, 502);
  }

  const name = String(body.name || "").slice(0, 120) || projectName;
  const email = String(body.email || "").slice(0, 160);
  const phone = String(body.phone || "").slice(0, 40);
  const tipo = body.tipo === "Webinar / Streaming" ? "Webinar / Streaming" : "Podcast";
  const personas = Math.min(8, Math.max(1, parseInt(body.personas, 10) || 1));
  const sendConfirmation = !!body.sendEmail && !!email;
  const marca = brand === "podfactory" ? "Pod Factory" : "Doppel";
  const emoji = brand === "podfactory" ? "🎙️" : "🎬";

  const token = newToken();
  let eventId;
  try {
    const ev = await createEvent(env, {
      summary: `${emoji} ${marca}: ${projectName}`,
      description: `Grabación agendada desde el portal (${marca}).\nProyecto: ${projectName}\nContacto: ${name}\nEmail: ${email || "—"}\nTel: ${phone || "—"}\nTipo: ${tipo} · Personas: ${personas}\nGestión: token ${token}`,
      startISO: slot.start, endISO: slot.end, timeZone: config.timeZone,
    });
    eventId = ev.id;
  } catch (e) {
    return json({ error: "No se pudo crear el evento en el calendario", detail: String(e) }, 502);
  }

  const { fecha, hora } = formatSession(slot.start, config.timeZone);
  await saveBooking(env, {
    token, eventId, date, label: hhmm, start: slot.start, end: slot.end,
    name, email, phone, tipo, personas, addons: [], comentarios: "", deposit: 0,
    brand, projectName, source: "portal", reminded: false,
  });

  // Correo de confirmación al cliente (opcional)
  if (sendConfirmation) {
    try {
      const origin = new URL(request.url).origin;
      const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
      const ics = icsAttachment({ uid: token, start: slot.start, end: slot.end, summary: `Grabación ${marca}`, location: address, description: `Grabación de ${projectName} (${tipo}, ${personas} personas).` });
      await sendEmail(env, {
        to: email,
        subject: `Tu grabación de ${projectName} está agendada 🎬`,
        html: customerEmailHtml({ name, fecha, hora, deposit: 0, address, manageUrl: manageUrl(origin, token), whatsappUrl: whatsappLink(env, `Hola, sobre la grabación de ${projectName} del ${fecha} a las ${hora} hrs:`), portalUrl: body.projectUrl || null }),
        attachments: [ics],
      });
    } catch (e) { console.log("schedule email error:", String(e)); }
  }

  return json({ ok: true, token, eventId, brand, start: slot.start, end: slot.end, fecha, hora });
}
