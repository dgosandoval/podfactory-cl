// Lógica PURA (sin red) de las grabaciones de Doppel en el calendario personal de Domingo (env.DOPPEL_CALENDAR_ID, p. ej. domingo@doppel.cl).
// Las grabaciones de Doppel NO usan el calendario del estudio de Pod Factory: se revisan contra lo que Domingo ya tiene (reuniones,
// invitaciones de clientes). Si ya existe EL evento de esa grabación (p. ej. la invitación del cliente) se ADOPTA —se vincula, sin crear otro—;
// si choca con otra cosa, 409 que la nombra; si está libre, se crea.
import { getOffset } from "./slots.js";

const MIN = 60000;
// Un evento "es esta grabación" si empieza a la misma hora (±15 min) del mismo día y termina parecido (±30 min). Lo segundo evita adoptar
// un evento largo que solo arranca a la misma hora (Andigital 09:00–14:00 no es una grabación de 60 min a las 09:00).
export const TOL_INICIO_MIN = 15;
export const TOL_FIN_MIN = 30;

// Eventos de Google → los que de verdad ocupan a Domingo, normalizados a milisegundos.
// Se ignoran (igual que freeBusy): cancelados, "mostrar como disponible" (transparent), los que Domingo rechazó, ubicación de trabajo y cumpleaños.
// `organizadorPropio`: el organizador es el dueño del calendario (Domingo); si no (invitación de un cliente), el evento es ajeno y no se toca.
export function normalizarEventos(items, timeZone, calendarId = "") {
  const out = [];
  for (const e of items || []) {
    if (!e || e.status === "cancelled") continue;
    if (e.transparency === "transparent") continue;
    if (e.eventType === "workingLocation" || e.eventType === "birthday") continue;
    if ((e.attendees || []).some((a) => a.self && a.responseStatus === "declined")) continue;
    const todoElDia = !e.start?.dateTime;
    let start, end;
    if (todoElDia) {
      if (!e.start?.date || !e.end?.date) continue;
      start = Date.parse(`${e.start.date}T00:00:00${getOffset(e.start.date, timeZone)}`);
      end = Date.parse(`${e.end.date}T00:00:00${getOffset(e.end.date, timeZone)}`);
    } else {
      start = Date.parse(e.start.dateTime);
      end = Date.parse(e.end?.dateTime);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const org = e.organizer || {};
    const organizadorPropio = org.self === true || (!!calendarId && String(org.email || "").toLowerCase() === String(calendarId).toLowerCase());
    out.push({ id: e.id || null, titulo: String(e.summary || "").trim() || "(sin título)", start, end, todoElDia, organizadorPropio, descripcion: e.description || "" });
  }
  return out;
}

// Eventos que se cruzan con [startMs, endMs). El borde exacto NO choca (uno que termina 15:30 permite empezar a las 15:30).
// `ignorarId`: el evento de la reserva que se está reemplazando (reagendar) para que no choque consigo misma.
export function choquesDe(startMs, endMs, eventos, ignorarId) {
  return eventos.filter((e) => e.id !== ignorarId && e.start < endMs && startMs < e.end);
}

const fHora = (tz) => new Intl.DateTimeFormat("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
const fDia = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
const fCorto = (tz) => new Intl.DateTimeFormat("es-CL", { timeZone: tz, day: "numeric", month: "short" });

export function esLaMismaGrabacion(startMs, endMs, e, timeZone) {
  return !e.todoElDia
    && Math.abs(e.start - startMs) <= TOL_INICIO_MIN * MIN && Math.abs(e.end - endMs) <= TOL_FIN_MIN * MIN
    && fDia(timeZone).format(new Date(e.start)) === fDia(timeZone).format(new Date(startMs));
}

export const horaDe = (ms, timeZone) => fHora(timeZone).format(new Date(ms));

// «“Andigital” 09:00–14:00»; si el evento no es del mismo día de la grabación se antepone la fecha; si es de todo el día, «(todo el día)».
export function descripcionEvento(e, startMs, timeZone) {
  const t = `“${e.titulo}”`;
  if (e.todoElDia) return `${t} (todo el día)`;
  const dia = fDia(timeZone), h = fHora(timeZone);
  const mismoDia = dia.format(new Date(e.start)) === dia.format(new Date(startMs)) && dia.format(new Date(e.end - 1)) === dia.format(new Date(startMs));
  const fecha = mismoDia ? "" : `${fCorto(timeZone).format(new Date(e.start))} `;
  return `${t} ${fecha}${h.format(new Date(e.start))}–${h.format(new Date(e.end))}`;
}

const candidato = (e, timeZone) => ({ eventId: e.id, titulo: e.titulo, inicio: new Date(e.start).toISOString(), fin: new Date(e.end).toISOString(), horario: `${horaDe(e.start, timeZone)}–${horaDe(e.end, timeZone)}`, organizadorPropio: e.organizadorPropio });

// Decisión sobre una grabación pedida [startMs, endMs):
//  { accion: "crear" }                       → libre: se crea el evento.
//  { accion: "adoptar", evento }             → hay UN evento que es esta grabación (o el elegido con `vincularId`): se vincula, sin crear nada.
//  { accion: "elegir", error, candidatos }   → hay VARIOS que podrían serlo: se le pide a Domingo que elija cuál vincular.
//  { accion: "choque", error, choques }      → choca con otra cosa: 409, sin forzar.
// Si además de la(s) grabación(es) coincidente(s) hay otro evento que se cruza, es un choque real (se nombra ese otro).
export function decidirGrabacionDoppel({ startMs, endMs, eventos, ignorarId = null, vincularId = null, timeZone }) {
  const cruzan = choquesDe(startMs, endMs, eventos, ignorarId);
  if (!cruzan.length) return { accion: "crear" };
  const iguales = cruzan.filter((e) => esLaMismaGrabacion(startMs, endMs, e, timeZone));
  const otros = cruzan.filter((e) => !iguales.includes(e));
  if (otros.length) {
    return { accion: "choque", error: `Choca con ${otros.map((e) => descripcionEvento(e, startMs, timeZone)).join(" y ")}`,
      choques: otros.map((e) => ({ titulo: e.titulo, inicio: new Date(e.start).toISOString(), fin: new Date(e.end).toISOString(), todoElDia: e.todoElDia })) };
  }
  if (vincularId) {
    const elegido = iguales.find((e) => e.id === vincularId);
    return elegido ? { accion: "adoptar", evento: elegido } : { accion: "choque", error: "El evento elegido ya no coincide con esta grabación. Vuelve a intentarlo.", choques: [] };
  }
  if (iguales.length === 1) return { accion: "adoptar", evento: iguales[0] };
  return { accion: "elegir", error: `Hay ${iguales.length} eventos en tu calendario que podrían ser esta grabación: elige cuál vincular`, candidatos: iguales.map((e) => candidato(e, timeZone)) };
}
