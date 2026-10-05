// Lógica de generación de bloques horarios (independiente de Google/MercadoPago).
// Maneja zona horaria de Chile (DST) sin librerías externas.

export function parseConfig(env) {
  return {
    timeZone: env.TIMEZONE || "America/Santiago",
    openDays: (env.OPEN_DAYS || "1,2,3,4,5").split(",").map((n) => parseInt(n, 10)),
    slotStarts: (env.SLOT_STARTS || "10:00,11:30,13:00,14:30,16:00,17:30,19:00").split(","),
    slotMinutes: parseInt(env.SLOT_MINUTES || "80", 10),
    holdMinutes: parseInt(env.HOLD_MINUTES || "15", 10),
    depositCLP: parseInt(env.DEPOSIT_CLP || "30000", 10), // (legado) monto del antiguo piloto
    siteUrl: env.SITE_URL || "https://podfactory.cl/",
    // Bloques cortos para la visita y el mini-piloto: empiezan en los mismos horarios que
    // los bloques normales (así no desordenan la grilla de las temporadas).
    shortStarts: (env.SHORT_STARTS || env.SLOT_STARTS || "10:00,11:30,13:00,14:30,16:00,17:30,19:00").split(","),
  };
}

// Productos que se reservan desde la web. price = total con IVA que se cobra (0 = gratis).
export const SERVICES = {
  visita: { key: "visita", label: "Visita al estudio", minutes: 30, price: 0, net: 0 },
  llamada: { key: "llamada", label: "Reunión por videollamada (Meet)", minutes: 30, price: 0, net: 0 },
  minipiloto: { key: "minipiloto", label: "Mini-piloto (10 minutos)", minutes: 30, price: 35700, net: 30000 },
};

// Config con la duración y los horarios del servicio pedido (o la grilla normal si no hay servicio).
export function configFor(config, tipo) {
  const svc = SERVICES[tipo];
  return svc ? { ...config, slotMinutes: svc.minutes, slotStarts: config.shortStarts } : config;
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


// ── Reuniones por Meet y visitas: la persona SOLICITA una hora libre y el equipo la confirma ──
// No hay grilla fija: se ofrece cualquier hora (cada FLEX_STEP minutos) dentro de los tramos libres del día.
export const FLEX_TIPOS = ["visita", "llamada"];
export const esFlex = (tipo) => FLEX_TIPOS.includes(tipo);

export function flexParams(env) {
  const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
  const [a, b] = String(env.FLEX_HOURS || "10:00-19:30").split("-");
  return { open: toMin(a), close: toMin(b), step: parseInt(env.FLEX_STEP || "15", 10), leadDays: parseInt(env.FLEX_LEAD_DAYS || "1", 10) };
}
const hhmmDe = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Hoy en la zona horaria (YYYY-MM-DD) y suma de días a una fecha.
export function todayIn(timeZone, nowMs = Date.now()) { return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(nowMs)); }
export function addDaysStr(dateStr, n) { const d = new Date(`${dateStr}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// Tramos libres de un día donde cabe una reunión de `minutes`. busy = [{start,end}] (ISO).
// Respeta días abiertos y la anticipación mínima (leadDays = 1 → desde mañana).
export function freeWindows(dateStr, config, busy, nowMs, minutes, p) {
  if (!config.openDays.includes(weekday(dateStr, config.timeZone))) return { open: false, windows: [] };
  if (dateStr < addDaysStr(todayIn(config.timeZone, nowMs), p.leadDays)) return { open: true, tooSoon: true, windows: [] };
  const off = getOffset(dateStr, config.timeZone);
  const base = Date.parse(`${dateStr}T00:00:00${off}`);
  const iso = (min) => new Date(base + min * 60000).toISOString();
  const ocupados = busy.map((b) => [(Date.parse(b.start) - base) / 60000, (Date.parse(b.end) - base) / 60000]).sort((x, y) => x[0] - y[0]);
  const tramos = []; let cur = p.open;
  for (const [s, e] of ocupados) {
    if (e <= cur) continue;
    if (s > cur) tramos.push([cur, Math.min(s, p.close)]);
    cur = Math.max(cur, e);
    if (cur >= p.close) break;
  }
  if (cur < p.close) tramos.push([cur, p.close]);
  const windows = [];
  for (let [a, b] of tramos) {
    a = Math.ceil(a / p.step) * p.step;
    if (b - a < minutes) continue;
    windows.push({ from: hhmmDe(a), to: hhmmDe(b), lastStart: hhmmDe(b - minutes), start: iso(a), end: iso(b) });
  }
  return { open: true, windows, offset: off };
}

// ¿Esta hora de inicio cabe en un tramo libre y cae en la grilla de `step` minutos?
export function inicioFlexValido(dateStr, startISO, config, busy, nowMs, minutes, p) {
  const r = freeWindows(dateStr, config, busy, nowMs, minutes, p);
  const s = Date.parse(startISO);
  return r.windows.some((w) => s >= Date.parse(w.start) && s + minutes * 60000 <= Date.parse(w.end) && ((s - Date.parse(w.start)) / 60000) % p.step === 0);
}
