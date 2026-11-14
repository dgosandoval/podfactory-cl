// Prueba de VINCULAR un evento que ya existe en el calendario del estudio a una reserva del hub (etapa 3A del hub: «Crear jornada» desde un evento sin jornada) y del flag `forzar`.
//  · /api/portal/schedule con `vincularEventoId`: NO crea un evento nuevo; guarda la reserva apuntando al evento existente, con la hora REAL del evento (aunque ya pasó).
//  · Un evento no se vincula a dos reservas; uno inexistente → 404; uno de todo el día → 400.
//  · Cancelar esa reserva borra ESE evento (se vinculó para que el hub la gestione); reagendar (reemplazaToken) mueve el evento sin duplicarlo.
//  · `forzar: true` agenda aunque choque con otro evento; sin él, 409.
//  · /api/portal/agenda devuelve el token de la reserva en cada evento (el hub enlaza por token, no por la hora).
// Corre el código REAL de functions/ con Google y Resend SIMULADOS (sin red).
// Uso:  node test/vincular-evento.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import { onRequestPost as schedule } from "../functions/api/portal/schedule.js";
import { onRequestPost as cancel } from "../functions/api/cancel.js";
import { onRequestGet as agenda } from "../functions/api/portal/agenda.js";
import { parseConfig, getOffset, addDaysStr, todayIn, weekday } from "../functions/_lib/slots.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };

const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const SA = { client_email: "reservas-bot@pod-factory-reservas.iam.gserviceaccount.com", private_key: privateKey };
const kv = new Map();
const HOLDS = {
  async get(k, tipo) { const v = kv.get(k); return v === undefined ? null : (tipo === "json" ? JSON.parse(v) : v); },
  async put(k, v) { kv.set(k, String(v)); },
  async delete(k) { kv.delete(k); },
  async list({ prefix }) { return { keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
};
const SECRETO = "secreto-de-prueba";
const CAL = "estudio@group.calendar.google.com";
const env = { RESEND_API_KEY: "k", GOOGLE_SA_KEY: JSON.stringify(SA), GOOGLE_CALENDAR_ID: CAL, PORTAL_INTAKE_SECRET: SECRETO, TIMEZONE: "America/Santiago", HOLDS,
  FROM_EMAIL: "Pod Factory <reservas@doppel.cl>", STUDIO_EMAIL: "hola@doppel.cl", STUDIO_NOTIFY: "hola@doppel.cl" };
const config = parseConfig(env);

// ── Calendario simulado con estado ──
let eventos = [];      // eventos del calendario del estudio
let busy = [];         // ocupados que ve freeBusy
let sigId = 1;
const log = [];
const correos = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  if (url === "https://api.resend.com/emails") { correos.push(JSON.parse(init.body)); return json({ id: "r" + correos.length }); }
  if (url.endsWith("/calendar/v3/freeBusy")) { const id = JSON.parse(init.body).items[0].id; return json({ calendars: { [id]: { busy } } }); }
  let m;
  if ((m = url.match(/\/calendars\/([^/]+)\/events(?:\/([^/?]+))?(?:\?.*)?$/))) {
    const evId = m[2] && decodeURIComponent(m[2]);
    if (method === "GET" && evId) { log.push({ op: "get", evId }); const e = eventos.find((x) => x.id === evId); return e ? json(e) : json({ error: { code: 404 } }, 404); }
    if (method === "GET") { log.push({ op: "list" }); return json({ items: eventos }); }
    if (method === "POST") { const body = JSON.parse(init.body); const nuevo = { id: "ev" + sigId++, status: "confirmed", ...body }; log.push({ op: "crear", body }); eventos.push(nuevo); return json(nuevo); }
    if (method === "DELETE") { log.push({ op: "borrar", evId }); eventos = eventos.filter((x) => x.id !== evId); return new Response(null, { status: 204 }); }
    if (method === "PATCH") { const body = JSON.parse(init.body); log.push({ op: "patch", evId, body }); const e = eventos.find((x) => x.id === evId); if (e) Object.assign(e, body); return json({ id: evId }); }
  }
  throw new Error("fetch no simulado: " + method + " " + url);
};
const tipos = (op) => log.filter((x) => x.op === op);
const reset = () => { eventos = []; busy = []; log.length = 0; correos.length = 0; kv.clear(); };

function diaHabil(desde) { let d = addDaysStr(todayIn(env.TIMEZONE), desde); while (!config.openDays.includes(weekday(d, env.TIMEZONE))) d = addDaysStr(d, 1); return d; }
const DIA = diaHabil(12), AYER = addDaysStr(todayIn(env.TIMEZONE), -2);
const iso = (dia, hhmm) => `${dia}T${hhmm}:00${getOffset(dia, env.TIMEZONE)}`;
const evManual = (id, titulo, dia, a, b, extra = {}) => ({ id, summary: titulo, status: "confirmed", start: { dateTime: iso(dia, a) }, end: { dateTime: iso(dia, b) }, creator: { email: "ivan.krug.s@gmail.com" }, ...extra });
const ocupa = (e) => ({ start: new Date(e.start.dateTime).toISOString(), end: new Date(e.end.dateTime).toISOString() });

const llamar = (fn, ruta, body, headers = {}) => fn({ request: new Request(`https://podfactory.cl${ruta}`, { method: "POST", headers: { "content-type": "application/json", "x-intake-secret": SECRETO, ...headers }, body: JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, j: await r.json().catch(() => ({})) }));
const sch = (body) => llamar(schedule, "/api/portal/schedule", { brand: "podfactory", projectName: "Prueba", name: "PRUEBA HUB", email: "", sendEmail: false, compraId: "postpago", projectUrl: "https://clientes.podfactory.cl/project/1", ...body });

// ═════ 1. Vincular un evento futuro anotado a mano ═════
reset();
eventos = [evManual("manual-1", "Grabación Victoria", DIA, "16:00", "18:00")];
busy = [ocupa(eventos[0])];
let r = await sch({ vincularEventoId: "manual-1" });
check("1a. vincular un evento existente: 200, sin date/start en el pedido", r.status === 200 && r.j.ok === true && r.j.vinculado === true && !!r.j.token, JSON.stringify(r));
check("1b. NO se creó ningún evento nuevo (el calendario sigue con 1) y no hubo PATCH de horario", tipos("crear").length === 0 && eventos.length === 1 && !tipos("patch").some((p) => p.body.start), JSON.stringify(log));
check("1c. la reserva usa el id del evento existente y su hora REAL (16:00–18:00, 120 min)", r.j.eventId === "manual-1" && r.j.start === new Date(iso(DIA, "16:00")).toISOString() && r.j.end === new Date(iso(DIA, "18:00")).toISOString() && r.j.hora === "16:00", JSON.stringify(r.j));
const bk = JSON.parse(kv.get(`booking:${r.j.token}`));
check("1d. el registro de la reserva guarda eventId, date y label del evento (no adoptado: el hub lo gestiona)", bk.eventId === "manual-1" && bk.date === DIA && bk.label === "16:00" && !bk.adoptado && bk.compraId === "postpago", JSON.stringify(bk));
check("1e. se agregó el enlace de la jornada al final de la descripción del evento (PATCH solo de description)", tipos("patch").length === 1 && tipos("patch")[0].evId === "manual-1" && Object.keys(tipos("patch")[0].body).join() === "description" && /Jornada en el hub/.test(tipos("patch")[0].body.description));
const tokenManual = r.j.token;

// ═════ 2. Errores ═════
r = await sch({ vincularEventoId: "manual-1" });
check("2a. el mismo evento NO se vincula a dos reservas: 409", r.status === 409 && /vinculado a otra reserva/.test(r.j.error || ""), JSON.stringify(r));
r = await sch({ vincularEventoId: "no-existe" });
check("2b. un evento que no existe: 404", r.status === 404 && /ya no está en el calendario/.test(r.j.error || ""), JSON.stringify(r));
eventos.push({ id: "todo-dia", summary: "Feriado", status: "confirmed", start: { date: DIA }, end: { date: addDaysStr(DIA, 1) } });
r = await sch({ vincularEventoId: "todo-dia" });
check("2c. un evento de todo el día: 400", r.status === 400 && /todo el día/.test(r.j.error || ""), JSON.stringify(r));
r = await sch({ vincularEventoId: "../x" });
check("2d. un id con caracteres raros: 400", r.status === 400, JSON.stringify(r));
r = await llamar(schedule, "/api/portal/schedule", { brand: "podfactory", vincularEventoId: "manual-1" }, { "x-intake-secret": "otro" });
check("2e. sin el secreto del hub: 403", r.status === 403, JSON.stringify(r));

// ═════ 3. Un evento que ya pasó también se puede vincular (Iván anotó una grabación de hace días) ═════
reset();
eventos = [evManual("pasado-1", "Grabación Pía", AYER, "15:00", "16:00")];
r = await sch({ vincularEventoId: "pasado-1" });
check("3. un evento de hace 2 días se vincula (sin el «Ese horario ya pasó» de una reserva nueva)", r.status === 200 && r.j.vinculado === true && r.j.eventId === "pasado-1" && tipos("crear").length === 0, JSON.stringify(r));

// ═════ 4. Cancelar y reagendar la reserva vinculada: UN solo evento, el de siempre ═════
reset();
eventos = [evManual("manual-2", "Grabación Ojo de Buey", DIA, "10:00", "11:00")];
busy = [ocupa(eventos[0])];
r = await sch({ vincularEventoId: "manual-2" });
const tok2 = r.j.token;
// reagendar como lo hace el hub: agendar lo nuevo con reemplazaToken y después cancelar el viejo
const nuevoDia = diaHabil(14);
r = await sch({ date: nuevoDia, start: "12:00", minutes: 60, reemplazaToken: tok2 });
check("4a. reagendar la vinculada: el horario nuevo se agenda sin chocar con ella misma", r.status === 200 && !!r.j.token && r.j.token !== tok2, JSON.stringify(r));
const tok2b = r.j.token;
let c = await llamar(cancel, "/api/cancel", { id: tok2, notify: false, porEquipo: true });
check("4b. al cancelar la anterior se borra el evento original (el hub la gestionaba): queda UN solo evento", c.status === 200 && tipos("borrar").some((b) => b.evId === "manual-2") && eventos.filter((e) => e.id !== "manual-2").length === 1 && !eventos.some((e) => e.id === "manual-2"), JSON.stringify({ c, eventos: eventos.map((e) => e.id) }));
c = await llamar(cancel, "/api/cancel", { id: tok2b, notify: false, porEquipo: true });
check("4c. cancelar la nueva deja el calendario vacío", c.status === 200 && eventos.length === 0, JSON.stringify(eventos));

// ═════ 5. forzar ═════
reset();
eventos = [evManual("otra-cosa", "Reunión de Iván", DIA, "16:00", "17:00")];
busy = [ocupa(eventos[0])];
r = await sch({ date: DIA, start: "16:30", minutes: 60 });
check("5a. sin forzar, encima de otro evento: 409", r.status === 409 && /ocupado|pegado/.test(r.j.error || ""), JSON.stringify(r));
check("5a2. y no se creó nada", tipos("crear").length === 0);
r = await sch({ date: DIA, start: "16:30", minutes: 60, forzar: true });
check("5b. con forzar:true (decisión del equipo desde el hub) se agenda igual y se crea el evento", r.status === 200 && tipos("crear").length === 1, JSON.stringify(r));
r = await sch({ date: DIA, start: "16:30", minutes: 60, forzar: "true" });
check("5c. forzar solo vale como booleano true (el texto «true» no fuerza)", r.status === 409, JSON.stringify(r));

// ═════ 6. La agenda devuelve el token para que el hub enlace por token ═════
reset();
eventos = [evManual("manual-3", "Grabación Chile Registros", DIA, "14:00", "15:00"), evManual("sin-reserva", "Algo a mano", DIA, "17:00", "18:00")];
busy = eventos.map(ocupa);
r = await sch({ vincularEventoId: "manual-3", compraId: "postpago" });
const t3 = r.j.token;
const ag = await agenda({ request: new Request(`https://podfactory.cl/api/portal/agenda?desde=${DIA}&days=1`, { headers: { "x-intake-secret": SECRETO } }), env });
const ja = await ag.json();
const e3 = ja.events.find((e) => e.id === "manual-3"), e4 = ja.events.find((e) => e.id === "sin-reserva");
check("6a. el evento con reserva trae reserva.token (y compraId)", ag.status === 200 && e3?.reserva?.token === t3 && e3.reserva.compraId === "postpago", JSON.stringify(e3));
check("6b. el evento anotado a mano sin reserva trae reserva = null", e4 && e4.reserva === null, JSON.stringify(e4));

const fallas = resultados.filter((x) => !x).length;
console.log(fallas === 0 ? `\nTODO OK (${resultados.length} comprobaciones)` : `\nHAY FALLAS: ${fallas}`);
process.exit(fallas === 0 ? 0 : 1);
