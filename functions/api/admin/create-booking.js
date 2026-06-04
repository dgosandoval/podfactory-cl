// POST /api/admin/create-booking  (header x-admin-key)
// Reserva creada a mano por el estudio (cliente que reservó directo): crea el
// evento en el calendario, la reserva, su página de entrega en el portal y,
// opcionalmente, envía el correo de confirmación.
import { parseConfig, buildSlots, weekday, overlapsBusy, getOffset } from "../../_lib/slots.js";
import { getBusy, createEvent } from "../../_lib/google.js";
import { newToken, saveBooking, manageUrl } from "../../_lib/booking.js";
import { sendEmail, formatSession, customerEmailHtml, icsAttachment, whatsappLink } from "../../_lib/email.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ error: "forbidden" }, 403);
  }
  const config = parseConfig(env);
  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const { date, label, name, email, phone } = body || {};
  if (!date || !name) return json({ error: "Faltan datos (fecha y nombre)" }, 400);
  if (!config.openDays.includes(weekday(date, config.timeZone))) return json({ error: "Día no disponible" }, 400);

  // El bloque puede ser uno estándar (label) o una hora personalizada (customStart HH:MM).
  let slot;
  if (body.customStart) {
    if (!/^\d{1,2}:\d{2}$/.test(body.customStart)) return json({ error: "Hora personalizada inválida (HH:MM)" }, 400);
    const hhmm = body.customStart.padStart(5, "0");
    const startMs = Date.parse(`${date}T${hhmm}:00${getOffset(date, config.timeZone)}`);
    if (isNaN(startMs)) return json({ error: "Hora inválida" }, 400);
    const mins = Math.min(480, Math.max(20, parseInt(body.customMinutes, 10) || config.slotMinutes));
    slot = { label: hhmm, start: new Date(startMs).toISOString(), end: new Date(startMs + mins * 60000).toISOString() };
  } else {
    if (!label) return json({ error: "Falta el bloque" }, 400);
    slot = buildSlots(date, config).find((s) => s.label === label);
    if (!slot) return json({ error: "Bloque no válido" }, 400);
  }
  if (Date.parse(slot.start) <= Date.now()) return json({ error: "Ese bloque ya pasó" }, 400);

  // Servicios (opcionales) saneados
  const ALLOWED_ADDONS = ["Edición Pro", "3 Reels adicionales"];
  const tipo = body.tipo === "Webinar / Streaming" ? "Webinar / Streaming" : "Podcast";
  const personas = Math.min(4, Math.max(1, parseInt(body.personas, 10) || 1));
  const addons = Array.isArray(body.addons) ? body.addons.filter((a) => ALLOWED_ADDONS.includes(a)) : [];
  const comentarios = String(body.comentarios || "").slice(0, 500);
  const deposit = Math.max(0, parseInt(body.deposit, 10) || 0);
  const sendConfirmation = !!body.sendEmail && !!email;

  // ¿Bloque libre? (hold vigente o evento en el calendario)
  if (env.HOLDS && (await env.HOLDS.get(`hold:${date}:${label}`))) {
    return json({ error: "Ese bloque está reservándose en este momento." }, 409);
  }
  try {
    const busy = await getBusy(env, slot.start, slot.end);
    if (overlapsBusy(slot, busy)) return json({ error: "Ese bloque ya está ocupado en el calendario." }, 409);
  } catch (e) {
    return json({ error: "No se pudo verificar el calendario", detail: String(e) }, 502);
  }

  const { fecha, hora } = formatSession(slot.start, config.timeZone);
  const token = newToken();
  const serviciosTxt = `Tipo: ${tipo} · Personas: ${personas}${addons.length ? ` · Adicionales: ${addons.join(", ")}` : ""}${comentarios ? `\nComentarios: ${comentarios}` : ""}`;

  // Crear el evento en el calendario
  let eventId;
  try {
    const ev = await createEvent(env, {
      summary: `🎙️ Reserva: ${name}`,
      description: `Reserva manual (cliente reservó directo).\nCliente: ${name}\nEmail: ${email || "—"}\nTel: ${phone || "—"}\n${serviciosTxt}\n${deposit ? `Adelanto: $${deposit.toLocaleString("es-CL")}\n` : ""}Gestión: ${date} ${label} · token ${token}`,
      startISO: slot.start, endISO: slot.end, timeZone: config.timeZone,
    });
    eventId = ev.id;
  } catch (e) {
    return json({ error: "No se pudo crear el evento", detail: String(e) }, 502);
  }

  await saveBooking(env, { token, eventId, date, label, start: slot.start, end: slot.end, name, email: email || "", phone: phone || "", tipo, personas, addons, comentarios, deposit, reminded: false });

  // Crear la página de entrega en el portal (best-effort)
  let portalUrl = null;
  if (env.PORTAL_INTAKE_URL && env.PORTAL_INTAKE_SECRET && email) {
    try {
      const r = await fetch(env.PORTAL_INTAKE_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-intake-secret": env.PORTAL_INTAKE_SECRET },
        body: JSON.stringify({ name, email, phone, date, label, fecha, hora, tipo, personas, addons, comentarios, deposit, paymentId: `manual-${token}`, projectId: body.portalProjectId || undefined }),
      });
      if (r.ok) { const j = await r.json(); portalUrl = j.loginUrl || j.projectUrl || null; }
    } catch (e) { console.log("portal intake (manual) error:", String(e)); }
  }

  // Correo de confirmación (opcional)
  if (sendConfirmation) {
    try {
      const origin = new URL(request.url).origin;
      const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
      const ics = icsAttachment({ uid: token, start: slot.start, end: slot.end, summary: "Sesión Pod Factory", location: address, description: `Tu sesión de grabación en Pod Factory (${tipo}, ${personas} personas).` });
      await sendEmail(env, {
        to: email,
        subject: "Tu reserva en Pod Factory está confirmada 🎙️",
        html: customerEmailHtml({ name, fecha, hora, deposit, address, manageUrl: manageUrl(origin, token), whatsappUrl: whatsappLink(env, `Hola Pod Factory, sobre mi reserva del ${fecha} a las ${hora} hrs:`), portalUrl }),
        attachments: [ics],
      });
    } catch (e) { console.log("email (manual) error:", String(e)); }
  }

  return json({ ok: true, token, fecha, hora, projectUrl: portalUrl });
}
