// Lógica de generación de bloques horarios (independiente de Google/MercadoPago).
// Maneja zona horaria de Chile (DST) sin librerías externas.

export function parseConfig(env) {
  return {
    timeZone: env.TIMEZONE || "America/Santiago",
    openDays: (env.OPEN_DAYS || "1,2,3,4,5").split(",").map((n) => parseInt(n, 10)),
    slotStarts: (env.SLOT_STARTS || "10:00,11:30,13:00,14:30,16:00,17:30,19:00").split(","),
    slotMinutes: parseInt(env.SLOT_MINUTES || "80", 10),
    holdMinutes: parseInt(env.HOLD_MINUTES || "15", 10),
    depositCLP: parseInt(env.DEPOSIT_CLP || "30000", 10),
  };
}

// Offset de la zona horaria para una fecha dada, ej: "-04:00" (invierno) o "-03:00" (verano).
export function getOffset(dateStr, timeZone) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(d);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
  const m = tzName.match(/GMT([+-]\d{2}:\d{2})/);
  return m ? m[1] : "+00:00";
}

// Día de la semana (0=Dom ... 6=Sáb) de una fecha en la zona horaria dada.
export function weekday(dateStr, timeZone) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
}

// Construye los bloques de un día con sus instantes UTC de inicio/fin.
export function buildSlots(dateStr, config) {
  const offset = getOffset(dateStr, config.timeZone);
  return config.slotStarts.map((hhmm) => {
    const startMs = Date.parse(`${dateStr}T${hhmm}:00${offset}`);
    const endMs = startMs + config.slotMinutes * 60000;
    return {
      label: hhmm, // "10:00" — hora local Chile para mostrar
      start: new Date(startMs).toISOString(), // UTC, para comparar/guardar
      end: new Date(endMs).toISOString(),
    };
  });
}

// ¿El bloque [start,end) choca con algún intervalo ocupado?
export function overlapsBusy(slot, busy) {
  const s = Date.parse(slot.start);
  const e = Date.parse(slot.end);
  return busy.some((b) => {
    const bs = Date.parse(b.start);
    const be = Date.parse(b.end);
    return s < be && bs < e; // hay solapamiento
  });
}

// Disponibilidad final de un día: cruza bloques con ocupados + reglas (día abierto, futuro).
export function availabilityForDate(dateStr, config, busy, nowISO) {
  const now = Date.parse(nowISO);
  const isOpen = config.openDays.includes(weekday(dateStr, config.timeZone));
  if (!isOpen) return { date: dateStr, open: false, slots: [] };

  const slots = buildSlots(dateStr, config).map((slot) => ({
    label: slot.label,
    start: slot.start,
    end: slot.end,
    available: Date.parse(slot.start) > now && !overlapsBusy(slot, busy),
  }));
  return { date: dateStr, open: true, slots };
}
