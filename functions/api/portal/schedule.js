// POST /api/portal/schedule  (header x-intake-secret == PORTAL_INTAKE_SECRET)
// Agenda una grabación desde el portal de clientes (doppel-clientes), para
// CUALQUIER marca (Doppel o Pod Factory). Crea el evento en el MISMO calendario
// del estudio que usa la disponibilidad pública → una grabación de Doppel ocupa
// el calendario y por lo tanto BLOQUEA las reservas de Pod Factory (y viceversa).
// Es aditivo: no toca /api/reserve ni /api/availability.
//
// EXCEPCIÓN (Doppel): si env.DOPPEL_CALENDAR_ID está definido (p. ej. domingo@doppel.cl), las grabaciones de brand "doppel" NO usan el
// calendario del estudio: se revisan contra el calendario personal de Domingo.
//   · libre            → se crea el evento ahí («🎬 Grabación · <proyecto>»).
//   · ya está el evento → se ADOPTA (se vincula, sin crear otro ni tocarlo; si el organizador es Domingo se agrega el enlace al proyecto al final
//                         de la descripción). La reserva guarda eventId, calendarId, adoptado:true y la hora REAL del evento.
//   · varios posibles  → 409 con `candidatos`; el hub reenvía con vincularEventoId para elegir uno.
//   · otro choque      → 409 que lo nombra («Choca con “Andigital” 09:00–14:00»).
// La reserva guarda `calendarId`: cancelar actúa sobre ese calendario (una adoptada solo se desvincula: NUNCA se borra el evento).
// Sin la variable, Doppel sigue como siempre (calendario del estudio). Pod Factory no cambia.
import { parseConfig, getOffset, errorDeMargen, recParams } from "../../_lib/slots.js";
import { getBusy, createEvent, listarEventosDe, agregarADescripcion, CalendarioNoCompartido } from "../../_lib/google.js";
import { normalizarEventos, decidirGrabacionDoppel, horaDe } from "../../_lib/doppel-calendario.js";
import { newToken, saveBooking, getBooking, bookingPorEvento, manageUrl } from "../../_lib/booking.js";
import { sendEmail, formatSession, icsAttachment, whatsappLink, customerEmailHtml } from "../../_lib/email.js";
import { salidaDe, deadlineDe, correosDe, minutosDe } from "../../_lib/email.js";

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
  let slot = { label: hhmm, start: new Date(startMs).toISOString(), end: new Date(startMs + mins * 60000).toISOString() };
  if (startMs <= Date.now()) return json({ error: "Ese horario ya pasó" }, 400);

  // Doppel con calendario propio (el de Domingo) o, como siempre, el calendario del estudio.
  const calendarioDoppel = brand === "doppel" && env.DOPPEL_CALENDAR_ID ? String(env.DOPPEL_CALENDAR_ID) : null;
  let adoptado = null; // { evento, enlaceAgregado }: el evento de Domingo que ya era esta grabación

  if (calendarioDoppel) {
    // Se mira lo que Domingo ya tiene (no el estudio ni los holds de Pod Factory). Sin margen: el borde exacto está permitido.
    // `reemplazaToken` (reagendar): el evento creado por el hub para la reserva que se mueve no cuenta como choque (uno ADOPTADO sí: sigue en el
    // calendario, es de otra persona).
    try {
      const reemplaza = body.reemplazaToken ? await getBooking(env, String(body.reemplazaToken)) : null;
      const ignorarId = reemplaza && reemplaza.calendarId === calendarioDoppel && !reemplaza.adoptado ? reemplaza.eventId : null;
      const items = await listarEventosDe(env, calendarioDoppel, new Date(startMs).toISOString(), new Date(startMs + mins * 60000).toISOString());
      const eventos = normalizarEventos(items, config.timeZone, calendarioDoppel);
      const d = decidirGrabacionDoppel({ startMs, endMs: startMs + mins * 60000, eventos, ignorarId, vincularId: body.vincularEventoId ? String(body.vincularEventoId) : null, timeZone: config.timeZone });
      if (d.accion === "choque") return json({ error: d.error, choques: d.choques }, 409);
      if (d.accion === "elegir") return json({ error: d.error, candidatos: d.candidatos }, 409);
      if (d.accion === "adoptar") {
        const ev = d.evento;
        // Un evento no se vincula a dos grabaciones (salvo la que se está reemplazando).
        const otra = await bookingPorEvento(env, ev.id);
        if (otra && otra.token !== body.reemplazaToken) return json({ error: `El evento “${ev.titulo}” ya está vinculado a otra grabación del hub.` }, 409);
        // Evento propio de Domingo: se agrega el enlace al proyecto AL FINAL de la descripción (sin borrar nada). Si es ajeno (invitación de un cliente) no se toca.
        let enlaceAgregado = false;
        if (ev.organizadorPropio && body.projectUrl) {
          try { enlaceAgregado = await agregarADescripcion(env, calendarioDoppel, ev.id, ev.descripcion, `Proyecto en el hub: ${String(body.projectUrl).slice(0, 300)}`); }
          catch (e) { console.log("schedule: no se pudo agregar el enlace al evento adoptado:", String(e)); }
        }
        adoptado = { evento: ev, enlaceAgregado };
        // La reserva toma la hora REAL del evento, no la del formulario.
        slot = { label: horaDe(ev.start, config.timeZone), start: new Date(ev.start).toISOString(), end: new Date(ev.end).toISOString() };
      }
    } catch (e) {
      if (e instanceof CalendarioNoCompartido) return json({ error: "No se pudo revisar el calendario de Domingo: " + e.message, detail: String(e) }, 502);
      return json({ error: "No se pudo verificar el calendario", detail: String(e) }, 502);
    }
  } else {
    // ¿El calendario del estudio está libre en ese rango, con REC_MARGEN min libres antes y después? (reservas PF +
    // otras grabaciones + holds de pago). El borde exacto está permitido: 10:00–11:00 y 11:30 de 60 min conviven.
    try {
      const rp = recParams(env), margenMs = rp.margen * 60000;
      const busy = await getBusy(env, new Date(startMs - margenMs).toISOString(), new Date(startMs + mins * 60000 + margenMs).toISOString());
      if (env.HOLDS) {
        const list = await env.HOLDS.list({ prefix: `hold:${date}:` });
        const holds = await Promise.all(list.keys.map((k) => env.HOLDS.get(k.name, "json")));
        for (const h of holds) if (h?.start && h?.end) busy.push({ start: h.start, end: h.end });
      }
      const choque = errorDeMargen(startMs, startMs + mins * 60000, busy, rp.margen);
      if (choque) return json({ error: choque }, 409);
    } catch (e) {
      return json({ error: "No se pudo verificar el calendario", detail: String(e) }, 502);
    }
  }

  const name = String(body.name || "").slice(0, 120) || projectName;
  // `email` puede traer varios correos separados por coma (todos los contactos del cliente): por eso el tope es mayor.
  const email = String(body.email || "").slice(0, 600);
  const phone = String(body.phone || "").slice(0, 40);
  const tipo = body.tipo === "Webinar / Streaming" ? "Webinar / Streaming" : "Podcast";
  const personas = Math.min(8, Math.max(1, parseInt(body.personas, 10) || 1));
  const sendConfirmation = !!body.sendEmail && !!email;
  const marca = brand === "podfactory" ? "Pod Factory" : "Doppel";
  const emoji = brand === "podfactory" ? "🎙️" : "🎬";

  const token = newToken();
  let eventId;
  if (adoptado) {
    eventId = adoptado.evento.id; // ya existe: no se crea nada
  } else {
    try {
      const ev = await createEvent(env, calendarioDoppel
        ? {
          summary: `🎬 Grabación · ${projectName}`,
          description: `Grabación de Doppel agendada desde el hub.\nProyecto: ${projectName}${body.projectUrl ? `\nProyecto en el hub: ${String(body.projectUrl).slice(0, 300)}` : ""}\nCliente: ${name}\nEmail: ${email || "—"}\nTel: ${phone || "—"}\nGestión: token ${token}`,
          startISO: slot.start, endISO: slot.end, timeZone: config.timeZone, calendarId: calendarioDoppel,
        }
        : {
          summary: `${emoji} ${marca}: ${projectName}`,
          description: `Grabación agendada desde el portal (${marca}).\nProyecto: ${projectName}\nContacto: ${name}\nEmail: ${email || "—"}\nTel: ${phone || "—"}\nTipo: ${tipo} · Personas: ${personas}\nGestión: token ${token}`,
          startISO: slot.start, endISO: slot.end, timeZone: config.timeZone,
        });
      eventId = ev.id;
    } catch (e) {
      return json({ error: "No se pudo crear el evento en el calendario", detail: String(e) }, 502);
    }
  }

  const { fecha, hora } = formatSession(slot.start, config.timeZone);
  await saveBooking(env, {
    token, eventId, date, label: slot.label, start: slot.start, end: slot.end,
    name, email, phone, tipo, personas, addons: [], comentarios: "", deposit: 0,
    brand, projectName, source: "portal", reminded: false,
    // Calendario donde vive el evento, SOLO si no es el del estudio (Doppel → calendario de Domingo): cancelar y reagendar lo usan.
    ...(calendarioDoppel ? { calendarId: calendarioDoppel } : {}),
    // Adoptada: el evento ya existía en el calendario de Domingo (no lo creó el hub). Cancelar solo la desvincula: NUNCA se borra ese evento.
    ...(adoptado ? { adoptado: true, eventoTitulo: adoptado.evento.titulo } : {}),
    // Grabaciones compradas en el portal: se cambian/cancelan SOLO en el portal (lleva la cuenta de capítulos).
    compraId: body.compraId || null, portalUrl: body.compraId && body.projectUrl ? String(body.projectUrl) : null,
  });

  // Correo de confirmación al cliente (opcional)
  if (sendConfirmation) {
    try {
      const origin = new URL(request.url).origin;
      const address = env.STUDIO_ADDRESS || "Eduardo Marquina 3937, Vitacura · Santiago";
      const ics = icsAttachment({ uid: token, start: slot.start, end: slot.end, summary: `Grabación ${marca}`, location: address, description: `Grabación de ${projectName} (${tipo}, ${personas} personas).` });
      await sendEmail(env, {
        to: correosDe(email),
        subject: `Tu grabación de ${projectName} está agendada 🎬`,
        html: customerEmailHtml({ name, fecha, hora, deposit: 0, address, salida: salidaDe(slot.start, config.timeZone, slot.end), minutos: minutosDe(slot.start, slot.end), deadline: deadlineDe(slot.start, config.timeZone), manageUrl: body.compraId && body.projectUrl ? body.projectUrl + '#agendar' : manageUrl(origin, token), whatsappUrl: whatsappLink(env, `Hola, sobre la grabación de ${projectName} del ${fecha} a las ${hora} hrs:`), portalUrl: body.compraId ? null : (body.projectUrl || null) }),
        attachments: [ics],
      });
    } catch (e) { console.log("schedule email error:", String(e)); }
  }

  return json({ ok: true, token, eventId, brand, start: slot.start, end: slot.end, fecha, hora, calendario: calendarioDoppel ? "doppel" : "estudio",
    ...(adoptado ? { adoptado: true, evento: { titulo: adoptado.evento.titulo, inicio: horaDe(adoptado.evento.start, config.timeZone), fin: horaDe(adoptado.evento.end, config.timeZone), organizadorPropio: adoptado.evento.organizadorPropio, enlaceAgregado: adoptado.enlaceAgregado } } : {}) });
}
