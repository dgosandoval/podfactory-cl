// Lógica PURA (sin red) de las grabaciones de Doppel en el calendario personal de Domingo (env.DOPPEL_CALENDAR_ID, p. ej. domingo@doppel.cl).
// Las grabaciones de Doppel NO usan el calendario del estudio de Pod Factory: se revisan contra lo que Domingo ya tiene (reuniones,
// invitaciones de clientes) y se crean ahí. Aquí vive la decisión de "choca / no choca / se puede agendar igual".
import { getOffset } from "./slots.js";

const MIN = 60000;
// «Agendar igual» solo se ofrece si el evento que choca ES la misma grabación (p. ej. la invitación que mandó el cliente):
// empieza a la misma hora (±15 min) y termina parecido (±30 min). Un evento largo (Andigital 09:00–14:00) que solo se cruza NO califica.
export const TOL_INICIO_MIN = 15;
export const TOL_FIN_MIN = 30;

// Eventos de Google → los que de verdad ocupan a Domingo, normalizados a milisegundos.
// Se ignoran (igual que freeBusy): cancelados, "mostrar como disponible" (transparent), los que Domingo rechazó, ubicación de trabajo y cumpleaños.
export function normalizarEventos(items, timeZone) {
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
    out.push({ id: e.id || null, titulo: String(e.summary || "").trim() || "(sin título)", start, end, todoElDia });
  }
  return out;
}

// Eventos que se cruzan con [startMs, endMs). El borde exacto NO choca (uno que termina 15:30 permite empezar a las 15:30).
// `ignorarId`: el evento de la reserva que se está reemplazando (reagendar) para que no choque consigo misma.
export function choquesDe(startMs, endMs, eventos, ignorarId) {
  return eventos.filter((e) => e.id !== ignorarId && e.start < endMs && startMs < e.end);
}

export function coincideConGrabacion(startMs, endMs, e) {
  return !e.todoElDia && Math.abs(e.start - startMs) <= TOL_INICIO_MIN * MIN && Math.abs(e.end - endMs) <= TOL_FIN_MIN * MIN;
}

const fHora = (tz) => new Intl.DateTimeFormat("es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
const fDia = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
const fCorto = (tz) => new Intl.DateTimeFormat("es-CL", { timeZone: tz, day: "numeric", month: "short" });

// «“Andigital” 09:00–14:00»; si el evento no es del mismo día de la grabación se antepone la fecha; si es de todo el día, «(todo el día)».
export function descripcionEvento(e, startMs, timeZone) {
  const t = `“${e.titulo}”`;
  if (e.todoElDia) return `${t} (todo el día)`;
  const dia = fDia(timeZone), h = fHora(timeZone);
  const mismoDia = dia.format(new Date(e.start)) === dia.format(new Date(startMs)) && dia.format(new Date(e.end - 1)) === dia.format(new Date(startMs));
  const fecha = mismoDia ? "" : `${fCorto(timeZone).format(new Date(e.start))} `;
  return `${t} ${fecha}${h.format(new Date(e.start))}–${h.format(new Date(e.end))}`;
}

// Decisión: { ok:true, igual? } o { ok:false, error, choques, puedeAgendarIgual }.
// `forzar` (botón «Agendar igual») solo vale si TODOS los eventos que chocan coinciden con la grabación; el servidor lo vuelve a comprobar.
export function evaluarGrabacionDoppel({ startMs, endMs, eventos, ignorarId = null, forzar = false, timeZone }) {
  const choques = choquesDe(startMs, endMs, eventos, ignorarId);
  if (!choques.length) return { ok: true, choques: [] };
  const lista = choques.map((e) => ({ titulo: e.titulo, inicio: new Date(e.start).toISOString(), fin: new Date(e.end).toISOString(), todoElDia: e.todoElDia, coincide: coincideConGrabacion(startMs, endMs, e) }));
  const puedeAgendarIgual = lista.every((c) => c.coincide);
  if (forzar && puedeAgendarIgual) return { ok: true, igual: true, choques: lista };
  const error = `Choca con ${choques.map((e) => descripcionEvento(e, startMs, timeZone)).join(" y ")}`;
  return { ok: false, error, choques: lista, puedeAgendarIgual };
}
