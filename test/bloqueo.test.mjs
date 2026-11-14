// Prueba de los bloqueos de horario creados desde el hub (POST/DELETE /api/portal/bloqueo) y de que un evento manual con título libre («Ivan en médico») BLOQUEA la disponibilidad.
//  · POST crea UN evento «Bloqueo · <motivo>» en el calendario del estudio (sin reserva, sin transparency:transparent → freeBusy lo cuenta como ocupado). Valida fecha, horas, duración, pasado y secreto.
//  · DELETE borra SOLO un evento cuyo título empieza por «Bloqueo» y que no esté vinculado a una reserva: nunca una grabación ni un evento ajeno.
//  · availability-range y /api/portal/schedule (la ruta que usan el portal de clientes, el bot de WhatsApp y «Nueva grabación») tratan como ocupado CUALQUIER intervalo de freeBusy, sea cual sea el título.
// Corre el código REAL de functions/ con Google simulado (sin red).
// Uso:  node test/bloqueo.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import { onRequestPost as crear, onRequestDelete as quitar } from "../functions/api/portal/bloqueo.js";
import { onRequestPost as schedule } from "../functions/api/portal/schedule.js";
import { onRequestGet as rango } from "../functions/api/availability-range.js";
import { armarBloqueo, tituloBloqueo, esBloqueo } from "../functions/_lib/bloqueo.js";
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

let eventos = [];
let sigId = 1;
const log = [];
// freeBusy simulado como el real: ocupado = todo evento NO transparente y no cancelado del calendario (el título no cuenta).
const busyDe = () => eventos.filter((e) => e.status !== "cancelled" && e.transparency !== "transparent" && e.start?.dateTime)
  .map((e) => ({ start: new Date(e.start.dateTime).toISOString(), end: new Date(e.end.dateTime).toISOString() }));
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  if (url.endsWith("/calendar/v3/freeBusy")) { const id = JSON.parse(init.body).items[0].id; return json({ calendars: { [id]: { busy: busyDe() } } }); }
  let m;
  if ((m = url.match(/\/calendars\/([^/]+)\/events(?:\/([^/?]+))?(?:\?.*)?$/))) {
    const evId = m[2] && decodeURIComponent(m[2]);
    if (method === "GET" && evId) { log.push({ op: "get", evId }); const e = eventos.find((x) => x.id === evId); return e ? json(e) : json({ error: { code: 404 } }, 404); }
    if (method === "GET") { log.push({ op: "list" }); return json({ items: eventos }); }
    if (method === "POST") { const body = JSON.parse(init.body); const nuevo = { id: "ev" + sigId++, status: "confirmed", ...body }; log.push({ op: "crear", body }); eventos.push(nuevo); return json(nuevo); }
    if (method === "DELETE") { log.push({ op: "borrar", evId }); eventos = eventos.filter((x) => x.id !== evId); return new Response(null, { status: 204 }); }
  }
  throw new Error("fetch no simulado: " + method + " " + url);
};
const tipos = (op) => log.filter((x) => x.op === op);
const reset = () => { eventos = []; log.length = 0; kv.clear(); };

function diaHabil(desde) { let d = addDaysStr(todayIn(env.TIMEZONE), desde); while (!config.openDays.includes(weekday(d, env.TIMEZONE))) d = addDaysStr(d, 1); return d; }
const DIA = diaHabil(12);
const iso = (dia, hhmm) => `${dia}T${hhmm}:00${getOffset(dia, env.TIMEZONE)}`;
const evManual = (id, titulo, dia, a, b, extra = {}) => ({ id, summary: titulo, status: "confirmed", start: { dateTime: iso(dia, a) }, end: { dateTime: iso(dia, b) }, creator: { email: "ivan.krug.s@gmail.com" }, ...extra });
const llamar = (fn, ruta, { metodo = "POST", body, headers = { "x-intake-secret": SECRETO } } = {}) =>
  fn({ request: new Request(`https://podfactory.cl${ruta}`, { method: metodo, headers: { "content-type": "application/json", ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) }), env })
    .then(async (r) => ({ status: r.status, j: await r.json().catch(() => ({})) }));
const mkBloq = (body, headers) => llamar(crear, "/api/portal/bloqueo", { body, headers });
const rmBloq = (id, headers) => llamar(quitar, `/api/portal/bloqueo?id=${encodeURIComponent(id)}`, { metodo: "DELETE", headers });
const sch = (body) => llamar(schedule, "/api/portal/schedule", { body: { brand: "podfactory", projectName: "Prueba", name: "PRUEBA HUB", email: "", sendEmail: false, compraId: "postpago", projectUrl: "https://clientes.podfactory.cl/project/1", ...body } });
const libres = async (dia, minutos = 60) => {
  const res = await rango({ request: new Request(`https://podfactory.cl/api/availability-range?from=${dia}&to=${dia}&flex=1&minutos=${minutos}`), env });
  const j = await res.json();
  return new Map((j.days?.[0]?.slots || []).map((s) => [s.label, s.available]));
};

// ═════ 1. Lógica pura ═════
check("1a. tituloBloqueo: con motivo → «Bloqueo · motivo»; sin motivo → «Bloqueo»; limpia emojis y saltos de línea", tituloBloqueo("Iván en el médico").titulo === "Bloqueo · Iván en el médico" && tituloBloqueo("").titulo === "Bloqueo" && tituloBloqueo("  🎙️ Curso\n IA ").titulo === "Bloqueo · Curso IA");
check("1b. esBloqueo reconoce solo títulos que empiezan por «Bloqueo»", esBloqueo("Bloqueo · x") && esBloqueo(" bloqueo") && !esBloqueo("Ivan en médico") && !esBloqueo("🎙️ Pod Factory: Cliente") && !esBloqueo(""));
const val = (o) => armarBloqueo({ date: DIA, start: "10:00", end: "12:00", ...o }, "America/Santiago", Date.now());
check("1c. armarBloqueo: horas válidas → ISO con el offset de Chile", val({}).ok && val({}).startISO === new Date(iso(DIA, "10:00")).toISOString() && val({}).endISO === new Date(iso(DIA, "12:00")).toISOString());
check("1d. rechaza fecha inválida, hora inválida, término ≤ inicio, más de 16 h, pasado y demasiado lejos",
  !val({ date: "2026-13-45" }).ok && !val({ start: "25:00" }).ok && !val({ end: "10:00" }).ok && !val({ start: "06:00", end: "23:00" }).ok
  && !armarBloqueo({ date: "2020-01-06", start: "10:00", end: "11:00" }, "America/Santiago").ok && !armarBloqueo({ date: addDaysStr(todayIn(env.TIMEZONE), 500), start: "10:00", end: "11:00" }, "America/Santiago").ok);

// ═════ 2. Crear un bloqueo ═════
reset();
let r = await mkBloq({ date: DIA, start: "14:30", end: "18:00", motivo: "Iván en el médico", actor: "ivan@podfactory.cl" });
check("2a. POST crea el bloqueo: 200, eventId, título «Bloqueo · Iván en el médico»", r.status === 200 && r.j.ok === true && !!r.j.eventId && r.j.titulo === "Bloqueo · Iván en el médico", JSON.stringify(r));
const ev = eventos.find((e) => e.id === r.j.eventId);
check("2b. se creó UN solo evento en el calendario del estudio, con las horas pedidas y sin «transparent» (cuenta como ocupado)", eventos.length === 1 && tipos("crear").length === 1 && ev.summary === "Bloqueo · Iván en el médico"
  && new Date(ev.start.dateTime).toISOString() === new Date(iso(DIA, "14:30")).toISOString() && new Date(ev.end.dateTime).toISOString() === new Date(iso(DIA, "18:00")).toISOString() && ev.transparency !== "transparent", JSON.stringify(ev));
check("2c. NO crea ninguna reserva (ni booking:* en KV): no hay cliente ni cobro", [...kv.keys()].filter((k) => k.startsWith("booking:")).length === 0);
const sl = await libres(DIA);
check("2d. la disponibilidad de grabaciones (availability-range) ya no ofrece 14:30–18:00 (con margen de 30 min) pero sí la mañana", sl.get("14:30") === false && sl.get("16:00") === false && sl.get("17:30") === false && sl.get("10:00") === true, JSON.stringify([...sl]));
const rs = await sch({ date: DIA, start: "16:00", minutes: 60 });
check("2e. /api/portal/schedule (portal, WhatsApp, Nueva grabación) rechaza agendar dentro del bloqueo: 409 y no crea evento", rs.status === 409 && tipos("crear").length === 1, JSON.stringify(rs));
r = await mkBloq({ date: DIA, start: "09:00", end: "10:00" });
check("2f. sin motivo el título es «Bloqueo»", r.status === 200 && r.j.titulo === "Bloqueo");
r = await mkBloq({ date: DIA, start: "10:00", end: "10:00" });
check("2g. horas inválidas → 400 y no se crea nada más", r.status === 400 && eventos.length === 2, JSON.stringify(r));
r = await mkBloq({ date: DIA, start: "10:00", end: "11:00" }, { "x-intake-secret": "otro" });
check("2h. sin el secreto del hub → 403 y no se crea nada", r.status === 403 && eventos.length === 2);

// ═════ 3. Un evento manual con título libre bloquea igual (lo que hace Iván en Google Calendar) ═════
reset();
const DIA2 = diaHabil(13);
eventos = [evManual("man-1", "Ivan en médico", DIA2, "10:00", "12:00"), evManual("man-2", "Iván Krug Curso IA", DIA2, "15:00", "17:00"), evManual("man-3", "Reservado", DIA2, "18:00", "19:00")];
const s2 = await libres(DIA2);
check("3a. availability-range: «Ivan en médico», «Iván Krug Curso IA» y «Reservado» dejan sin disponibilidad sus tramos", s2.get("10:30") === false && s2.get("11:00") === false && s2.get("15:00") === false && s2.get("16:30") === false && s2.get("18:00") === false, JSON.stringify([...s2]));
check("3b. y lo que está libre sigue libre (13:00 con margen)", s2.get("13:00") === true, JSON.stringify([...s2]));
let rr = await sch({ date: DIA2, start: "10:30", minutes: 60 });
check("3c. /api/portal/schedule: agendar encima de «Ivan en médico» → 409 «ocupado»", rr.status === 409 && /ocupado|pegado/.test(rr.j.error || ""), JSON.stringify(rr));
eventos.push(evManual("rep-1", "🎙️ Pod Factory: Cliente", DIA2, "13:00", "14:00"));
kv.set("booking:TOKREP", JSON.stringify({ token: "TOKREP", eventId: "rep-1", start: new Date(iso(DIA2, "13:00")).toISOString(), end: new Date(iso(DIA2, "14:00")).toISOString(), brand: "podfactory" }));
rr = await sch({ date: DIA2, start: "10:30", minutes: 60, reemplazaToken: "TOKREP" });
check("3d. también al REAGENDAR (la ruta que lista eventos en vez de freeBusy): el evento manual de Iván sigue bloqueando", rr.status === 409 && /ocupado|pegado/.test(rr.j.error || ""), JSON.stringify(rr));
eventos.push(evManual("man-4", "Ivan libre?", DIA2, "19:30", "20:00", { transparency: "transparent" }));
const s3 = await libres(DIA2, 30);
check("3e. salvedad conocida: un evento marcado «Disponible» (transparent) NO bloquea, como en Google freeBusy", s3.get("19:30") === true, JSON.stringify([...s3]));

// ═════ 4. Quitar un bloqueo ═════
reset();
r = await mkBloq({ date: DIA, start: "11:00", end: "12:00", motivo: "Arreglo Estudio" });
const idB = r.j.eventId;
let q = await rmBloq(idB);
check("4a. DELETE de un «Bloqueo…» sin reserva: 200, el evento se borra del calendario y el horario vuelve a estar libre", q.status === 200 && q.j.ok === true && !eventos.some((e) => e.id === idB) && tipos("borrar").length === 1 && (await libres(DIA)).get("11:00") === true, JSON.stringify(q));
q = await rmBloq(idB);
check("4b. quitar uno que ya no existe → 404", q.status === 404, JSON.stringify(q));
eventos = [evManual("man-5", "Ivan en médico", DIA, "10:00", "11:00")];
log.length = 0;
q = await rmBloq("man-5");
check("4c. un evento manual cuyo título NO empieza por «Bloqueo» NO se borra (409)", q.status === 409 && eventos.length === 1 && tipos("borrar").length === 0, JSON.stringify(q));
eventos.push(evManual("rep-2", "🎙️ Pod Factory: Estudio Uno", DIA, "13:00", "14:00"));
q = await rmBloq("rep-2");
check("4d. una grabación (título de reserva) NO se borra", q.status === 409 && eventos.some((e) => e.id === "rep-2"), JSON.stringify(q));
eventos.push(evManual("bloq-con-reserva", "Bloqueo Iván", DIA, "15:00", "16:00"));
kv.set("booking:TOKB", JSON.stringify({ token: "TOKB", eventId: "bloq-con-reserva", start: new Date(iso(DIA, "15:00")).toISOString(), end: new Date(iso(DIA, "16:00")).toISOString(), brand: "podfactory" }));
q = await rmBloq("bloq-con-reserva");
check("4e. aunque el título diga «Bloqueo», si el evento está vinculado a una reserva NO se borra (409)", q.status === 409 && eventos.some((e) => e.id === "bloq-con-reserva") && tipos("borrar").length === 0, JSON.stringify(q));
q = await rmBloq("../x");
check("4f. id inválido → 400", q.status === 400, JSON.stringify(q));
q = await rmBloq("man-5", { "x-intake-secret": "otro" });
check("4g. sin el secreto del hub → 403", q.status === 403 && tipos("borrar").length === 0);

const fallas = resultados.filter((x) => !x).length;
console.log(`\n${resultados.length - fallas}/${resultados.length} comprobaciones OK`);
console.log(fallas ? "HAY FALLAS" : "TODO OK");
process.exit(fallas ? 1 : 0);
