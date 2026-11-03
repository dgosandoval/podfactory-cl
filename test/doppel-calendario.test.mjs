// Prueba de las grabaciones de Doppel en el calendario personal de Domingo (DOPPEL_CALENDAR_ID).
// Corre el código REAL de functions/ (schedule.js, cancel.js, reschedule.js, _lib/*) con Google y Resend SIMULADOS: no sale ninguna llamada de red,
// no se crea ni se borra nada en ningún calendario. La clave del service account es una RSA generada al vuelo.
// Uso:  node test/doppel-calendario.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import { onRequestPost as schedule } from "../functions/api/portal/schedule.js";
import { onRequestPost as cancel } from "../functions/api/cancel.js";
import { onRequestPost as reschedule } from "../functions/api/reschedule.js";
import { getOffset, addDaysStr, todayIn } from "../functions/_lib/slots.js";
import { normalizarEventos, evaluarGrabacionDoppel } from "../functions/_lib/doppel-calendario.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };

// ── Entorno simulado ──
const ESTUDIO = "c_1c4ecb5d4647edc42748a5ffcc9fb906f3c13f0a6d892e9bfc29b2fcd720f162@group.calendar.google.com";
const DOMINGO = "domingo@doppel.cl";
const SECRETO = "secreto-de-prueba";
const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const SA = { client_email: "reservas-bot@pod-factory-reservas.iam.gserviceaccount.com", private_key: privateKey };

const kv = new Map();
const HOLDS = {
  async get(k, tipo) { const v = kv.get(k); return v === undefined ? null : (tipo === "json" ? JSON.parse(v) : v); },
  async put(k, v) { kv.set(k, String(v)); },
  async delete(k) { kv.delete(k); },
  async list({ prefix }) { return { keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
};
const envBase = { GOOGLE_SA_KEY: JSON.stringify(SA), GOOGLE_CALENDAR_ID: ESTUDIO, PORTAL_INTAKE_SECRET: SECRETO, TIMEZONE: "America/Santiago", HOLDS };
const envDoppel = { ...envBase, DOPPEL_CALENDAR_ID: DOMINGO };

// Google simulado. `cal[id]` = { eventos: [eventos de Google], busy: [freeBusy], noCompartido: bool }.
let cal, log, sigId;
function reiniciar() {
  kv.clear(); log = []; sigId = 1;
  cal = { [ESTUDIO]: { eventos: [], busy: [] }, [DOMINGO]: { eventos: [], busy: [] } };
}
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  let m;
  if (url.endsWith("/calendar/v3/freeBusy")) {
    const id = JSON.parse(init.body).items[0].id; log.push({ op: "freeBusy", cal: id });
    return json({ calendars: { [id]: { busy: cal[id]?.busy || [] } } });
  }
  if ((m = url.match(/\/calendars\/([^/]+)\/events(?:\/([^/?]+))?(?:\?.*)?$/))) {
    const id = decodeURIComponent(m[1]), evId = m[2] && decodeURIComponent(m[2]);
    if (method === "GET") {
      log.push({ op: "list", cal: id });
      if (!cal[id] || cal[id].noCompartido) return json({ error: { code: 404, message: "Not Found" } }, 404);
      return json({ items: cal[id].eventos });
    }
    if (method === "POST") {
      const body = JSON.parse(init.body); const nuevo = { id: "ev" + sigId++, ...body };
      log.push({ op: "crear", cal: id, body }); cal[id].eventos.push({ ...nuevo, start: body.start, end: body.end }); return json(nuevo);
    }
    if (method === "DELETE") { log.push({ op: "borrar", cal: id, evId }); return new Response(null, { status: 204 }); }
    if (method === "PATCH") { log.push({ op: "patch", cal: id, evId }); return json({ id: evId }); }
  }
  throw new Error("fetch no simulado: " + method + " " + url);
};
const tipos = (op) => log.filter((x) => x.op === op);

// ── Fechas: un día futuro (jueves de referencia: 10 días adelante) ──
const hoy = todayIn("America/Santiago");
const DIA = addDaysStr(hoy, 10);
const OFF = getOffset(DIA, "America/Santiago");
const iso = (hhmm) => `${DIA}T${hhmm}:00${OFF}`;
const ev = (id, titulo, a, b, extra = {}) => ({ id, summary: titulo, status: "confirmed", start: { dateTime: iso(a) }, end: { dateTime: iso(b) }, ...extra });
const busyEstudio = (a, b) => ({ start: new Date(iso(a)).toISOString(), end: new Date(iso(b)).toISOString() });

const reqDe = (body, headers = {}) => new Request("https://podfactory.cl/api/portal/schedule", { method: "POST", headers: { "content-type": "application/json", "x-intake-secret": SECRETO, ...headers }, body: JSON.stringify(body) });
const agendar = async (env, body) => { const r = await schedule({ request: reqDe({ projectName: "Job Stories", date: DIA, start: "15:30", minutes: 80, name: "Beiersdorf", email: "", sendEmail: false, projectUrl: "https://clientes.doppel.cl/project/1023", ...body }), env }); return { status: r.status, j: await r.json() }; };
const anular = async (env, token) => { const r = await cancel({ request: new Request("https://podfactory.cl/api/cancel", { method: "POST", headers: { "content-type": "application/json", "x-intake-secret": SECRETO }, body: JSON.stringify({ id: token, notify: false }) }), env }); return { status: r.status, j: await r.json() }; };

// ── Escenario real: jueves, Andigital 09:00–14:00 y la invitación de Beiersdorf 15:30–17:00 en el calendario de Domingo; «Ivan en médico» 13:45–17:00 en el del estudio ──
function escenarioJobStories() {
  reiniciar();
  cal[DOMINGO].eventos = [ev("andigital", "Andigital", "09:00", "14:00"), ev("beiersdorf", "Grabación Job Stories con Damian Yousef", "15:30", "17:00")];
  cal[ESTUDIO].busy = [busyEstudio("13:45", "17:00")];
}

// 1. Doppel choca con el calendario de Domingo y NO mira el del estudio; el mensaje nombra el evento
escenarioJobStories();
let r = await agendar(envDoppel, { brand: "doppel" });
check("1a. Doppel 15:30 con la invitación de Beiersdorf: 409", r.status === 409, JSON.stringify(r));
check("1b. el mensaje nombra el evento y su horario", r.j.error === "Choca con “Grabación Job Stories con Damian Yousef” 15:30–17:00", r.j.error);
check("1c. como coincide con la misma grabación, ofrece «Agendar igual»", r.j.puedeAgendarIgual === true && r.j.choques?.[0]?.coincide === true);
check("1d. no se miró el calendario del estudio ni se creó nada", tipos("freeBusy").length === 0 && !log.some((x) => x.cal === ESTUDIO) && tipos("crear").length === 0, JSON.stringify(log));
check("1e. se consultó el calendario de Domingo", log.some((x) => x.op === "list" && x.cal === DOMINGO));

// 2. «Agendar igual»: se crea en el calendario de Domingo, con título y enlace al proyecto, y la reserva recuerda el calendario
r = await agendar(envDoppel, { brand: "doppel", agendarIgual: true });
const creados = tipos("crear");
check("2a. «Agendar igual» → 200 ok", r.status === 200 && r.j.ok === true && r.j.calendario === "doppel" && r.j.agendadoIgual === true, JSON.stringify(r));
check("2b. el evento se creó en domingo@doppel.cl (y en ningún otro)", creados.length === 1 && creados[0].cal === DOMINGO);
check("2c. título «🎬 Grabación · Job Stories»", creados[0]?.body.summary === "🎬 Grabación · Job Stories", creados[0]?.body.summary);
check("2d. la descripción trae el enlace al proyecto", /https:\/\/clientes\.doppel\.cl\/project\/1023/.test(creados[0]?.body.description || ""));
check("2e. horario 15:30–16:50 en la zona de Chile", creados[0]?.body.start.dateTime === new Date(iso("15:30")).toISOString() && creados[0]?.body.end.dateTime === new Date(iso("16:50")).toISOString(), JSON.stringify(creados[0]?.body.start));
const tokenIgual = r.j.token;
const reserva = JSON.parse(kv.get("booking:" + tokenIgual));
check("2f. la reserva guarda calendarId = domingo@doppel.cl", reserva.calendarId === DOMINGO && reserva.brand === "doppel");

// 3. Un evento largo que solo se cruza (Andigital 09:00–14:00) NO se puede forzar: el servidor vuelve a comprobar
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "13:00", minutes: 60 });
check("3a. 13:00 cruza Andigital: 409 que lo nombra", r.status === 409 && r.j.error === "Choca con “Andigital” 09:00–14:00", JSON.stringify(r));
check("3b. no coincide: no ofrece «Agendar igual»", r.j.puedeAgendarIgual === false);
r = await agendar(envDoppel, { brand: "doppel", start: "13:00", minutes: 60, agendarIgual: true });
check("3c. aunque llegue agendarIgual:true, el servidor lo rechaza (409) y no crea nada", r.status === 409 && tipos("crear").length === 0, JSON.stringify(r));
// 3d. mezcla: una que coincide y otra que no → no se puede forzar
r = await agendar(envDoppel, { brand: "doppel", start: "13:40", minutes: 100, agendarIgual: true });
check("3d. si choca con dos y solo una coincide, tampoco se fuerza", r.status === 409 && r.j.puedeAgendarIgual === false && /Andigital/.test(r.j.error), JSON.stringify(r));

// 4. El calendario del estudio no bloquea a Doppel: 14:00–15:20 está libre en el de Domingo aunque Iván esté «en médico» 13:45–17:00
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "14:00", minutes: 80 });
check("4a. Doppel 14:00–15:20 (estudio ocupado por Iván, Domingo libre) → 200", r.status === 200 && r.j.calendario === "doppel", JSON.stringify(r));
check("4b. el borde exacto no choca (termina 14:00 Andigital, empieza 14:00; termina 15:20 y la invitación empieza 15:30)", tipos("crear").length === 1);
check("4c. el estudio no se tocó", !log.some((x) => x.cal === ESTUDIO));
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "14:00", minutes: 90 });
check("4d. 14:00–15:30 termina justo cuando empieza la invitación: libre", r.status === 200, JSON.stringify(r));
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "14:00", minutes: 100 });
check("4e. 14:00–15:40 ya pisa 10 min la invitación: 409", r.status === 409 && /Job Stories/.test(r.j.error), JSON.stringify(r));

// 5. Pod Factory sigue igual (aunque DOPPEL_CALENDAR_ID esté definido)
escenarioJobStories();
r = await agendar(envDoppel, { brand: "podfactory", projectName: "Cap 1" });
check("5a. PF 15:30 con el estudio ocupado: mismo 409 de siempre", r.status === 409 && r.j.error === "Ese horario ya está ocupado en el estudio.", JSON.stringify(r));
check("5b. PF revisó el calendario del estudio (freeBusy) y NO el de Domingo", tipos("freeBusy").every((x) => x.cal === ESTUDIO) && tipos("freeBusy").length === 1 && !log.some((x) => x.cal === DOMINGO));
reiniciar();
r = await agendar(envDoppel, { brand: "podfactory", projectName: "Cap 1", start: "18:00", minutes: 60 });
const crP = tipos("crear");
check("5c. PF libre: se crea en el calendario del estudio con el título de siempre", r.status === 200 && crP.length === 1 && crP[0].cal === ESTUDIO && crP[0].body.summary === "🎙️ Pod Factory: Cap 1", JSON.stringify(crP[0]));
check("5d. la reserva de PF no lleva calendarId", JSON.parse(kv.get("booking:" + r.j.token)).calendarId === undefined && r.j.calendario === "estudio");
// 5e. un hold de pago de PF no afecta a Doppel pero sí a PF
reiniciar();
kv.set(`hold:${DIA}:16:00`, JSON.stringify({ start: new Date(iso("16:00")).toISOString(), end: new Date(iso("17:00")).toISOString() }));
const rD = await agendar(envDoppel, { brand: "doppel", start: "16:00", minutes: 60 });
const rP = await agendar(envDoppel, { brand: "podfactory", start: "16:00", minutes: 60 });
check("5e. un hold de pago de PF bloquea a PF (409) pero no a Doppel (200)", rP.status === 409 && rD.status === 200, JSON.stringify({ rD, rP }));

// 6. Sin DOPPEL_CALENDAR_ID, Doppel se comporta como antes (calendario del estudio)
escenarioJobStories();
r = await agendar(envBase, { brand: "doppel" });
check("6a. sin la variable, Doppel sigue chocando con el estudio (como hoy)", r.status === 409 && r.j.error === "Ese horario ya está ocupado en el estudio." && !log.some((x) => x.cal === DOMINGO), JSON.stringify(r));
reiniciar();
r = await agendar(envBase, { brand: "doppel", start: "12:00", minutes: 60 });
check("6b. sin la variable y libre, el evento va al estudio con «🎬 Doppel: …»", r.status === 200 && tipos("crear")[0].cal === ESTUDIO && tipos("crear")[0].body.summary === "🎬 Doppel: Job Stories" && r.j.calendario === "estudio");

// 7. Eventos que NO ocupan: cancelado, «disponible», rechazado, ubicación de trabajo
reiniciar();
cal[DOMINGO].eventos = [
  ev("a", "Cancelado", "15:30", "17:00", { status: "cancelled" }),
  ev("b", "Recordatorio (disponible)", "15:30", "17:00", { transparency: "transparent" }),
  ev("c", "Rechazado", "15:30", "17:00", { attendees: [{ self: true, responseStatus: "declined" }] }),
  ev("d", "Oficina", "15:30", "17:00", { eventType: "workingLocation" }),
];
r = await agendar(envDoppel, { brand: "doppel" });
check("7. cancelado / disponible / rechazado / ubicación de trabajo no bloquean", r.status === 200, JSON.stringify(r));
reiniciar();
cal[DOMINGO].eventos = [ev("e", "Aceptado", "15:30", "17:00", { attendees: [{ self: true, responseStatus: "accepted" }] })];
r = await agendar(envDoppel, { brand: "doppel" });
check("7b. uno aceptado sí bloquea", r.status === 409 && /Aceptado/.test(r.j.error));

// 8. Evento de todo el día: bloquea, nunca se fuerza
reiniciar();
cal[DOMINGO].eventos = [{ id: "v", summary: "Viaje a Lima", status: "confirmed", start: { date: DIA }, end: { date: addDaysStr(DIA, 1) } }];
r = await agendar(envDoppel, { brand: "doppel", agendarIgual: true });
check("8. todo el día: «Choca con “Viaje a Lima” (todo el día)» y no se fuerza", r.status === 409 && r.j.error === "Choca con “Viaje a Lima” (todo el día)" && r.j.puedeAgendarIgual === false, JSON.stringify(r));

// 9. Calendario NO compartido con el service account: error explícito, jamás «libre»
reiniciar();
cal[DOMINGO].noCompartido = true;
r = await agendar(envDoppel, { brand: "doppel", start: "12:00", minutes: 60 });
check("9a. calendario no compartido → 502 y NO se crea nada", r.status === 502 && tipos("crear").length === 0, JSON.stringify(r));
check("9b. el mensaje dice qué hacer y nombra la cuenta de servicio", /no está compartido con reservas-bot@pod-factory-reservas\.iam\.gserviceaccount\.com/.test(r.j.error) && /Hacer cambios en eventos/.test(r.j.error), r.j.error);

// 10. Cancelar usa el mismo calendario con el que se creó
reiniciar();
const rDop = await agendar(envDoppel, { brand: "doppel", start: "12:00", minutes: 60 });
const rPf = await agendar(envDoppel, { brand: "podfactory", start: "18:00", minutes: 60 });
log.length = 0;
let c = await anular(envDoppel, rDop.j.token);
check("10a. cancelar una grabación de Doppel borra el evento del calendario de Domingo", c.status === 200 && tipos("borrar").length === 1 && tipos("borrar")[0].cal === DOMINGO && tipos("borrar")[0].evId === rDop.j.eventId, JSON.stringify(log));
log.length = 0;
c = await anular(envDoppel, rPf.j.token);
check("10b. cancelar una de PF borra del estudio", c.status === 200 && tipos("borrar")[0].cal === ESTUDIO);
// reserva de Doppel vieja (antes del cambio, sin calendarId) → estudio
reiniciar();
kv.set("booking:viejo", JSON.stringify({ token: "viejo", eventId: "evViejo", brand: "doppel", start: new Date(Date.now() + 5 * 86400000).toISOString(), end: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(), tipo: "Podcast" }));
c = await anular(envDoppel, "viejo");
check("10c. una reserva de Doppel anterior al cambio (sin calendarId) se borra del estudio", c.status === 200 && tipos("borrar")[0].cal === ESTUDIO);
// dentro de 36 h: la regla es de PF; Doppel desde el hub sí puede cancelar
reiniciar();
const pronto = { token: "pronto", eventId: "evP", calendarId: DOMINGO, brand: "doppel", start: new Date(Date.now() + 5 * 3600000).toISOString(), end: new Date(Date.now() + 6 * 3600000).toISOString(), tipo: "Podcast" };
kv.set("booking:pronto", JSON.stringify(pronto));
c = await anular(envDoppel, "pronto");
check("10d. Doppel en menos de 36 h se puede cancelar desde el hub", c.status === 200 && tipos("borrar")[0].cal === DOMINGO, JSON.stringify(c));
kv.set("booking:prontoPF", JSON.stringify({ ...pronto, token: "prontoPF", calendarId: undefined, brand: "podfactory" }));
c = await anular(envDoppel, "prontoPF");
check("10e. PF en menos de 36 h sigue bloqueado (409)", c.status === 409);
// sin el secreto del hub, una reserva de Doppel en menos de 36 h sigue protegida
kv.set("booking:prontoX", JSON.stringify({ ...pronto, token: "prontoX" }));
const rSin = await cancel({ request: new Request("https://podfactory.cl/api/cancel", { method: "POST", body: JSON.stringify({ id: "prontoX" }) }), env: envDoppel });
check("10f. sin el secreto del hub (público) la regla de 36 h sigue aplicando", rSin.status === 409);

// 11. /api/reschedule (ruta pública del estudio) no mueve eventos de Doppel en el calendario equivocado
reiniciar();
kv.set("booking:pronto", JSON.stringify({ ...pronto, start: new Date(Date.now() + 10 * 86400000).toISOString() }));
const rr = await reschedule({ request: new Request("https://podfactory.cl/api/reschedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "pronto", date: DIA, start: new Date(iso("10:00")).toISOString(), label: "10:00" }) }), env: envDoppel });
check("11. reagendar por la ruta del estudio una reserva con calendarId: 409 y ninguna llamada a Google", rr.status === 409 && log.length === 0, JSON.stringify(log));

// 12. Reagendar desde el hub (agenda la nueva con reemplazaToken, después cancela la anterior): no choca consigo misma
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", agendarIgual: true });
const original = r.j;
r = await agendar(envDoppel, { brand: "doppel", start: "15:50", minutes: 80 });
check("12a. mover 20 min SIN reemplazaToken choca con la grabación original", r.status === 409 && /Grabación Job Stories|Job Stories/.test(r.j.error), JSON.stringify(r));
// el hub guarda el evento propio como parte del calendario de Domingo
cal[DOMINGO].eventos = cal[DOMINGO].eventos.filter((e) => e.id !== "beiersdorf");
const propio = cal[DOMINGO].eventos.find((e) => e.id === original.eventId);
propio.start = { dateTime: new Date(iso("15:30")).toISOString() }; propio.end = { dateTime: new Date(iso("16:50")).toISOString() };
r = await agendar(envDoppel, { brand: "doppel", start: "15:50", minutes: 80 });
check("12a'. (control) sin reemplazaToken el evento propio sigue chocando", r.status === 409, JSON.stringify(r));
r = await agendar(envDoppel, { brand: "doppel", start: "15:50", minutes: 80, reemplazaToken: original.token });
check("12b. con reemplazaToken el evento propio se ignora → 200", r.status === 200 && tipos("crear").length === 2, JSON.stringify(r));
log.length = 0;
c = await anular(envDoppel, original.token);
check("12c. luego la anterior se cancela en el mismo calendario", c.status === 200 && tipos("borrar")[0].cal === DOMINGO && tipos("borrar")[0].evId === original.eventId);
// reemplazaToken ajeno (de otro calendario) no ignora nada
escenarioJobStories();
kv.set("booking:ajeno", JSON.stringify({ token: "ajeno", eventId: "beiersdorf", brand: "podfactory", start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 90000000).toISOString() }));
r = await agendar(envDoppel, { brand: "doppel", reemplazaToken: "ajeno" });
check("12d. un reemplazaToken de una reserva del estudio no permite ignorar eventos de Domingo", r.status === 409, JSON.stringify(r));

// 13. Validaciones previas siguen: fecha pasada y secreto
r = await agendar(envDoppel, { brand: "doppel", date: "2020-01-01" });
check("13a. horario pasado → 400", r.status === 400);
const rs = await schedule({ request: reqDe({ brand: "doppel", date: DIA, start: "10:00" }, { "x-intake-secret": "malo" }), env: envDoppel });
check("13b. secreto incorrecto → 403", rs.status === 403);

// 14. Unitarias de la lógica pura
const ev1 = normalizarEventos([ev("x", "A", "10:00", "11:00")], "America/Santiago");
const t0 = Date.parse(iso("11:00")), t1 = Date.parse(iso("12:00"));
check("14a. un evento que termina justo cuando empieza la grabación no choca", evaluarGrabacionDoppel({ startMs: t0, endMs: t1, eventos: ev1, timeZone: "America/Santiago" }).ok === true);
check("14b. evento de otro día que cruza la medianoche se nombra con fecha", /^Choca con “Vuelo” \d+ \w+\.? \d\d:\d\d–\d\d:\d\d$/.test(evaluarGrabacionDoppel({ startMs: t0, endMs: t1, eventos: normalizarEventos([{ id: "n", summary: "Vuelo", start: { dateTime: iso("22:00").replace(DIA, addDaysStr(DIA, -1)) }, end: { dateTime: iso("12:30") } }], "America/Santiago"), timeZone: "America/Santiago" }).error), evaluarGrabacionDoppel({ startMs: t0, endMs: t1, eventos: normalizarEventos([{ id: "n", summary: "Vuelo", start: { dateTime: iso("22:00").replace(DIA, addDaysStr(DIA, -1)) }, end: { dateTime: iso("12:30") } }], "America/Santiago"), timeZone: "America/Santiago" }).error);

const fallas = resultados.filter((x) => !x).length;
console.log(`\n${resultados.length - fallas}/${resultados.length} comprobaciones OK`);
console.log(fallas ? "HAY FALLAS" : "TODO OK");
process.exit(fallas ? 1 : 0);
