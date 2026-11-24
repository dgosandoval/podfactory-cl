// Prueba de GRABACIÓN PASADA (24-nov-2026, pedido de Domingo): el hub puede cargar una grabación que ya ocurrió y no quedó anotada, con `pasada: true` en /api/portal/schedule.
//  · La decisión (functions/_lib/horario-pasado.js) es una función pura: se prueba sola, sin red.
//  · /api/portal/schedule con `pasada: true`: se acepta una hora que ya empezó; el evento se crea igual en el calendario del estudio, SIN revisar disponibilidad (ni freeBusy ni margen),
//    SIN correo ni invitación al cliente aunque venga sendEmail, y la reserva nace sin recordatorios (reminded/reminded72 marcados). El cron de recordatorios no la toca.
//  · Sin `pasada` (o con «true» como texto, o con otra marca), una hora pasada sigue siendo 400 «Ese horario ya pasó». Más de 365 días atrás: 400. Sin el secreto del hub: 403.
//  · Una hora futura no cambia nada: mismas reglas de siempre (choque 409, correo de confirmación sale), con o sin `pasada`.
// Corre el código REAL de functions/ con Google y Resend SIMULADOS (sin red).
// Uso:  node test/grabacion-pasada.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import { onRequestPost as schedule } from "../functions/api/portal/schedule.js";
import { onRequestGet as recordatorios } from "../functions/api/cron/reminders.js";
import { decidirHorario, MAX_DIAS_ATRAS, MSG_YA_PASO } from "../functions/_lib/horario-pasado.js";
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
const env = { RESEND_API_KEY: "k", GOOGLE_SA_KEY: JSON.stringify(SA), GOOGLE_CALENDAR_ID: CAL, PORTAL_INTAKE_SECRET: SECRETO, CRON_KEY: "clave-cron", TIMEZONE: "America/Santiago", HOLDS,
  FROM_EMAIL: "Pod Factory <reservas@doppel.cl>", STUDIO_EMAIL: "hola@doppel.cl", STUDIO_NOTIFY: "hola@doppel.cl" };
const config = parseConfig(env);

// ── Calendario simulado con estado ──
let eventos = [];
let busy = [];
let sigId = 1;
const log = [];
const correos = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  if (url === "https://api.resend.com/emails") { correos.push(JSON.parse(init.body)); return json({ id: "r" + correos.length }); }
  if (url.endsWith("/calendar/v3/freeBusy")) { log.push({ op: "freebusy" }); const id = JSON.parse(init.body).items[0].id; return json({ calendars: { [id]: { busy } } }); }
  let m;
  if ((m = url.match(/\/calendars\/([^/]+)\/events(?:\/([^/?]+))?(?:\?.*)?$/))) {
    const evId = m[2] && decodeURIComponent(m[2]);
    if (method === "GET" && evId) { log.push({ op: "get", evId }); const e = eventos.find((x) => x.id === evId); return e ? json(e) : json({ error: { code: 404 } }, 404); }
    if (method === "GET") { log.push({ op: "list" }); return json({ items: eventos }); }
    if (method === "POST") { const body = JSON.parse(init.body); const nuevo = { id: "ev" + sigId++, status: "confirmed", ...body }; log.push({ op: "crear", body }); eventos.push(nuevo); return json(nuevo); }
  }
  throw new Error("fetch no simulado: " + method + " " + url);
};
const tipos = (op) => log.filter((x) => x.op === op);
const reset = () => { eventos = []; busy = []; log.length = 0; correos.length = 0; kv.clear(); };

function diaHabil(desde) { let d = addDaysStr(todayIn(env.TIMEZONE), desde); while (!config.openDays.includes(weekday(d, env.TIMEZONE))) d = addDaysStr(d, 1); return d; }
const fHM = new Intl.DateTimeFormat("en-GB", { timeZone: env.TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fDia = new Intl.DateTimeFormat("en-CA", { timeZone: env.TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const iso = (dia, hhmm) => `${dia}T${hhmm}:00${getOffset(dia, env.TIMEZONE)}`;
// Fecha y hora de Chile de un instante (para pedir una grabación «que empezó hace N minutos»).
const chile = (ms) => ({ date: fDia.format(new Date(ms)), start: fHM.format(new Date(ms)) });

const llamar = (ruta, body, headers = { "x-intake-secret": SECRETO }) => schedule({ request: new Request(`https://podfactory.cl${ruta}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, j: await r.json().catch(() => ({})) }));
const sch = (body, headers) => llamar("/api/portal/schedule", { brand: "podfactory", projectName: "Prueba", name: "PRUEBA HUB", email: "", sendEmail: false, compraId: "postpago", projectUrl: "https://clientes.podfactory.cl/project/1", ...body }, headers);

const AHORA = Date.parse("2026-11-24T15:00:00Z");
const DIA_MS = 24 * 3600 * 1000;

// ═════ 1. Decisión pura (functions/_lib/horario-pasado.js) ═════
let d = decidirHorario({ startMs: AHORA + 3600e3, ahora: AHORA });
check("1a. futuro sin opción: ok y NO es pasada", d.ok === true && d.pasada === false, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA + 3600e3, ahora: AHORA, pasadaPedida: true });
check("1b. futuro CON pasada pedida: ok y NO es pasada (la opción solo cuenta si la hora ya empezó)", d.ok === true && d.pasada === false, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA - 3 * DIA_MS, ahora: AHORA });
check("1c. pasado sin la opción: 400 «Ese horario ya pasó»", d.ok === false && d.status === 400 && d.error === MSG_YA_PASO, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA - 3 * DIA_MS, ahora: AHORA, pasadaPedida: true });
check("1d. pasado con pasada:true: ok y ES pasada", d.ok === true && d.pasada === true, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA - 3 * DIA_MS, ahora: AHORA, pasadaPedida: "true" });
check("1e. «true» como texto no vale (solo el booleano): 400", d.ok === false && d.status === 400 && d.error === MSG_YA_PASO, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA - 3 * DIA_MS, ahora: AHORA, pasadaPedida: true, brand: "doppel" });
check("1f. con la marca Doppel la opción se ignora: 400", d.ok === false && d.error === MSG_YA_PASO, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA - 3 * DIA_MS, ahora: AHORA, vinculado: true });
check("1g. un evento vinculado sigue pudiendo ser pasado, sin ser «pasada» (comportamiento de siempre)", d.ok === true && d.pasada === false, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA, ahora: AHORA, pasadaPedida: true });
check("1h. empezó EXACTAMENTE ahora: cuenta como pasado (startMs <= ahora)", d.ok === true && d.pasada === true, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA - MAX_DIAS_ATRAS * DIA_MS, ahora: AHORA, pasadaPedida: true });
check(`1i. justo ${MAX_DIAS_ATRAS} días atrás: ok`, d.ok === true && d.pasada === true, JSON.stringify(d));
d = decidirHorario({ startMs: AHORA - MAX_DIAS_ATRAS * DIA_MS - 1, ahora: AHORA, pasadaPedida: true });
check(`1j. un milisegundo más atrás de ${MAX_DIAS_ATRAS} días: 400 «demasiado antigua»`, d.ok === false && d.status === 400 && /demasiado antigua/.test(d.error), JSON.stringify(d));

// ═════ 2. schedule con pasada:true, hace 3 días ═════
reset();
const HACE3 = addDaysStr(todayIn(env.TIMEZONE), -3);
busy = [{ start: new Date(iso(HACE3, "15:00")).toISOString(), end: new Date(iso(HACE3, "16:00")).toISOString() }];   // algo ocupa esa hora: con pasada no importa
let r = await sch({ date: HACE3, start: "15:00", minutes: 60, email: "cliente@ejemplo.cl", sendEmail: true, pasada: true });
check("2a. pasada:true con una hora de hace 3 días (y sendEmail:true): 200, ok y marcada pasada", r.status === 200 && r.j.ok === true && r.j.pasada === true && !!r.j.token, JSON.stringify(r));
check("2b. se creó UN evento en el calendario del estudio (queda de registro) a la hora pedida y marcado como grabación PASADA", tipos("crear").length === 1 && /PASADA/.test(tipos("crear")[0].body.description) && Date.parse(tipos("crear")[0].body.start.dateTime) === Date.parse(iso(HACE3, "15:00")), JSON.stringify(log));
check("2c. NO se revisó la disponibilidad (ninguna consulta freeBusy ni listado de eventos) aunque había algo ocupado", tipos("freebusy").length === 0 && tipos("list").length === 0, JSON.stringify(log));
check("2d. NO salió ningún correo (ni confirmación ni invitación) aunque vino sendEmail:true y un email", correos.length === 0, JSON.stringify(correos.map((c) => c.subject)));
let bk = JSON.parse(kv.get(`booking:${r.j.token}`) || "null");
check("2e. la reserva guarda la hora pedida, eventId, y nace SIN recordatorios pendientes (reminded y reminded72)", !!bk && bk.eventId === r.j.eventId && bk.date === HACE3 && bk.label === "15:00" && bk.reminded === true && bk.reminded72 === true && bk.pasada === true && bk.brand === "podfactory" && bk.compraId === "postpago", JSON.stringify(bk));

// ═════ 3. El cron de recordatorios no la toca (ni ninguna reserva pasada) ═════
correos.length = 0; log.length = 0;
const cron = await recordatorios({ request: new Request(`https://podfactory.cl/api/cron/reminders?key=${env.CRON_KEY}`), env });
const jc = await cron.json();
check("3. el cron de recordatorios no envía nada por la grabación pasada (sent72 = sent24 = 0, sin correos)", cron.status === 200 && jc.checked >= 1 && jc.sent72 === 0 && jc.sent24 === 0 && correos.length === 0, JSON.stringify({ jc, correos: correos.length }));

// ═════ 4. Una que empezó hace 10 minutos también es «pasada» ═════
reset();
const hace10 = chile(Date.now() - 10 * 60000);
r = await sch({ date: hace10.date, start: hace10.start, minutes: 60, pasada: true });
check("4. una grabación que empezó hace 10 minutos (ya empezó) se acepta como pasada", r.status === 200 && r.j.pasada === true, JSON.stringify({ hace10, r }));

// ═════ 5. Sin la opción (o mal escrita) una hora pasada sigue siendo 400 y no se crea nada ═════
reset();
r = await sch({ date: HACE3, start: "15:00", minutes: 60 });
check("5a. sin pasada: 400 «Ese horario ya pasó» (como siempre) y no se crea nada", r.status === 400 && r.j.error === "Ese horario ya pasó" && tipos("crear").length === 0, JSON.stringify(r));
r = await sch({ date: HACE3, start: "15:00", minutes: 60, pasada: "true" });
check("5b. pasada como texto «true»: 400", r.status === 400 && r.j.error === "Ese horario ya pasó" && tipos("crear").length === 0, JSON.stringify(r));
r = await sch({ date: HACE3, start: "15:00", minutes: 60, pasada: false });
check("5c. pasada:false: 400", r.status === 400 && tipos("crear").length === 0, JSON.stringify(r));
r = await sch({ brand: "doppel", date: HACE3, start: "15:00", minutes: 60, pasada: true });
check("5d. marca Doppel con pasada:true: 400 (solo Pod Factory; Doppel no cambia)", r.status === 400 && r.j.error === "Ese horario ya pasó" && tipos("crear").length === 0, JSON.stringify(r));
r = await sch({ date: HACE3, start: "15:00", minutes: 60, pasada: true }, { "x-intake-secret": "otro" });
check("5e. SIN el secreto del hub: 403 (la opción pasada no se puede usar desde fuera) y no se crea nada", r.status === 403 && tipos("crear").length === 0, JSON.stringify(r));
r = await sch({ date: HACE3, start: "15:00", minutes: 60, pasada: true }, {});
check("5f. sin ningún encabezado de secreto: 403", r.status === 403 && tipos("crear").length === 0, JSON.stringify(r));

// ═════ 6. Más de 365 días atrás: 400 ═════
reset();
const ANTIGUA = addDaysStr(todayIn(env.TIMEZONE), -(MAX_DIAS_ATRAS + 5));
r = await sch({ date: ANTIGUA, start: "15:00", minutes: 60, pasada: true });
check("6a. hace 370 días con pasada:true: 400 «demasiado antigua» y no se crea nada", r.status === 400 && /demasiado antigua/.test(r.j.error || "") && tipos("crear").length === 0, JSON.stringify(r));
const LIMITE = addDaysStr(todayIn(env.TIMEZONE), -(MAX_DIAS_ATRAS - 3));
r = await sch({ date: LIMITE, start: "15:00", minutes: 60, pasada: true });
check("6b. hace 362 días con pasada:true: 200", r.status === 200 && r.j.pasada === true, JSON.stringify(r));
r = await sch({ date: "2026-13-45", start: "15:00", minutes: 60, pasada: true });
check("6c. una fecha mal formada sigue rechazándose (400)", r.status === 400 && tipos("crear").length === 1, JSON.stringify(r));
r = await sch({ date: HACE3, start: "25:99", minutes: 60, pasada: true });
check("6d. una hora mal formada o imposible sigue rechazándose (400)", r.status === 400, JSON.stringify(r));

// ═════ 7. Una hora FUTURA no cambia nada, con o sin pasada ═════
reset();
const FUT = diaHabil(12);
r = await sch({ date: FUT, start: "16:00", minutes: 60, email: "cliente@ejemplo.cl", sendEmail: true });
check("7a. futura sin pasada: 200, NO es pasada, se revisó la disponibilidad y SALE el correo de confirmación", r.status === 200 && !r.j.pasada && tipos("freebusy").length >= 1 && correos.length >= 1, JSON.stringify({ r, freebusy: tipos("freebusy").length, correos: correos.length }));
bk = JSON.parse(kv.get(`booking:${r.j.token}`) || "null");
check("7b. la reserva futura queda con recordatorios pendientes (reminded:false) y sin marca pasada", !!bk && bk.reminded === false && !bk.reminded72 && !bk.pasada, JSON.stringify(bk));
busy = [{ start: new Date(iso(FUT, "16:00")).toISOString(), end: new Date(iso(FUT, "17:00")).toISOString() }];
r = await sch({ date: FUT, start: "16:30", minutes: 60, pasada: true });
check("7c. futura CON pasada:true encima de algo ocupado: la opción no se aplica → 409 de choque, como siempre", r.status === 409 && /ocupado|pegado/.test(r.j.error || ""), JSON.stringify(r));
const n0 = tipos("crear").length;
r = await sch({ date: FUT, start: "16:30", minutes: 60, forzar: true });
check("7d. `forzar` sigue funcionando igual en una hora futura", r.status === 200 && tipos("crear").length === n0 + 1, JSON.stringify(r));

// ═════ 8. Pasada encima de otro evento del calendario: se crea igual (no hay choque que valga) ═════
reset();
eventos = [{ id: "otra-cosa", summary: "Reunión de Iván", status: "confirmed", start: { dateTime: iso(HACE3, "15:00") }, end: { dateTime: iso(HACE3, "17:00") } }];
busy = [{ start: new Date(iso(HACE3, "15:00")).toISOString(), end: new Date(iso(HACE3, "17:00")).toISOString() }];
r = await sch({ date: HACE3, start: "15:30", minutes: 60, pasada: true });
check("8. pasada encima de otro evento ya anotado: 200 y se crea el evento (no se rechaza por choque)", r.status === 200 && r.j.pasada === true && tipos("crear").length === 1, JSON.stringify(r));

const fallas = resultados.filter((x) => !x).length;
console.log(fallas === 0 ? `\nTODO OK (${resultados.length} comprobaciones)` : `\nHAY FALLAS: ${fallas}`);
process.exit(fallas === 0 ? 0 : 1);
