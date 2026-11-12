// Reagendar una reserva del estudio: el horario NUEVO no debe chocar con la propia reserva que se está moviendo.
// Sin esto, mover una grabación de 19:00 a 19:30 (o cualquier hora que se superponga con la actual) se rechazaba con
// «Ese horario ya está ocupado en el estudio»: el evento de la reserva original sigue en el calendario hasta que se cancela
// (primero se agenda la hora nueva, después se libera la anterior) y freeBusy lo cuenta como ocupado.
// freeBusy no dice de qué evento es cada tramo (y junta los contiguos), así que cuando hay una reserva que ignorar se piden
// los EVENTOS del calendario y se descarta solo el de esa reserva. Cualquier otro evento (otra reserva, lo que Iván anota a mano)
// sigue contando igual que en freeBusy. Si el calendario no responde se lanza el error (nunca se interpreta como «libre»).
import { getBusy, listarEventosDe } from "./google.js";
import { getBooking } from "./booking.js";
import { normalizarEventos } from "./doppel-calendario.js";

// Id del evento (en el calendario del estudio) de la reserva `token`, o null si no hay nada que ignorar: no existe, vive en OTRO calendario
// (Doppel → calendario de Domingo; ahí el chequeo es otro) o es una adoptada (el evento es ajeno y sigue ocupando).
export async function eventoPropioDelEstudio(env, token) {
  if (!token) return null;
  const b = await getBooking(env, String(token));
  if (!b || !b.eventId || b.calendarId || b.adoptado) return null;
  return b.eventId;
}

// Ocupados del calendario del estudio entre dos instantes, sin contar el evento `ignorarEventId` (si viene).
export async function busyDelEstudio(env, timeZone, desdeISO, hastaISO, ignorarEventId) {
  if (!ignorarEventId) return getBusy(env, desdeISO, hastaISO);
  const items = await listarEventosDe(env, env.GOOGLE_CALENDAR_ID, desdeISO, hastaISO);
  return normalizarEventos(items, timeZone, env.GOOGLE_CALENDAR_ID)
    .filter((e) => e.id !== ignorarEventId)
    .map((e) => ({ start: new Date(e.start).toISOString(), end: new Date(e.end).toISOString() }));
}
