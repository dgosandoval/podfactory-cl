// Bloqueos de horario del estudio creados desde el hub (clientes.doppel.cl → «Bloquear horario» en el calendario del estudio).
// Un bloqueo es un evento del calendario del estudio titulado «Bloqueo · <motivo>»: freeBusy lo cuenta como ocupado, así que NADIE puede reservar ese tramo
// (web, portal de clientes, WhatsApp, «Nueva grabación»). Lógica PURA (sin red) para poder probarla.
import { getOffset } from "./slots.js";

export const MAX_MIN_BLOQUEO = 16 * 60;
const minDe = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim()); if (!m) return null; const h = +m[1], mi = +m[2]; return h < 24 && mi < 60 ? h * 60 + mi : null; };
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** ¿Es un bloqueo? Solo el título que empieza por «Bloqueo» (lo que crea esta función). */
export const esBloqueo = (summary) => /^\s*bloqueo/i.test(String(summary || ""));

/** Título del evento: siempre empieza por «Bloqueo». El motivo va sin emojis ni saltos de línea, hasta 80 caracteres. */
export function tituloBloqueo(motivo) {
  const m = String(motivo || "").replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return { motivo: m, titulo: m ? `Bloqueo · ${m}` : "Bloqueo" };
}

/** Valida el pedido y arma las horas: { ok:true, startISO, endISO, titulo, motivo } o { ok:false, error }. */
export function armarBloqueo(body, timeZone, nowMs = Date.now()) {
  const no = (error) => ({ ok: false, error });
  const date = String(body?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) return no("Fecha inválida (YYYY-MM-DD)");
  const a = minDe(body?.start), b = minDe(body?.end);
  if (a === null || b === null) return no("Hora inválida (HH:MM)");
  if (b <= a) return no("La hora de término tiene que ser después de la de inicio");
  if (b - a > MAX_MIN_BLOQUEO) return no("Un bloqueo puede durar hasta 16 horas");
  const off = getOffset(date, timeZone);
  const startMs = Date.parse(`${date}T${hhmm(a)}:00${off}`), endMs = Date.parse(`${date}T${hhmm(b)}:00${off}`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return no("Fecha/hora inválida");
  if (endMs <= nowMs) return no("Ese horario ya pasó");
  if (startMs > nowMs + 400 * 86400000) return no("Esa fecha queda demasiado lejos");
  const t = tituloBloqueo(body?.motivo);
  return { ok: true, startISO: new Date(startMs).toISOString(), endISO: new Date(endMs).toISOString(), titulo: t.titulo, motivo: t.motivo };
}
