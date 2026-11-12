// Prueba de las grabaciones de Doppel en el calendario personal de Domingo (DOPPEL_CALENDAR_ID): revisar, ADOPTAR el evento que ya existe, o crear.
// Corre el código REAL de functions/ (schedule.js, cancel.js, reschedule.js, _lib/*) con Google y Resend SIMULADOS: no sale ninguna llamada de red,
// no se crea ni se borra nada en ningún calendario. La clave del service account es una RSA generada al vuelo.
// Uso:  node test/doppel-calendario.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import { onRequestPost as schedule } from "../functions/api/portal/schedule.js";
import { onRequestPost as cancel } from "../functions/api/cancel.js";
import { onRequestPost as reschedule } from "../functions/api/reschedule.js";
import { getOffset, addDaysStr, todayIn, weekday } from "../functions/_lib/slots.js";
import { normalizarEventos, decidirGrabacionDoppel } from "../functions/_lib/doppel-calendario.js";

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
const envBase = { RESEND_API_KEY: "k",  GOOGLE_SA_KEY: JSON.stringify(SA), GOOGLE_CALENDAR_ID: ESTUDIO, PORTAL_INTAKE_SECRET: SECRETO, TIMEZONE: "America/Santiago", HOLDS };
const envDoppel = { ...envBase, DOPPEL_CALENDAR_ID: DOMINGO };

// Google simulado. `cal[id]` = { eventos: [eventos de Google], busy: [freeBusy], noCompartido: bool }.
let cal, log, sigId; const correos = [];
function reiniciar() {
  kv.clear(); log = []; sigId = 1;
  cal = { [ESTUDIO]: { eventos: [], busy: [] }, [DOMINGO]: { eventos: [], busy: [] } };
}
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  if (url === "https://api.resend.com/emails") { correos.push(JSON.parse(init.body)); return json({ id: "r1" }); }
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
    if (method === "PATCH") {
      const body = JSON.parse(init.body); log.push({ op: "patch", cal: id, evId, body });
      const e = cal[id].eventos.find((x) => x.id === evId); if (e) Object.assign(e, body); return json({ id: evId });
    }
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

const ORG_AJENO = { email: "damian.yousef@beiersdorf.com" };
const ORG_DOMINGO = { email: DOMINGO, self: true };

// 1. ADOPCIÓN: la invitación de Beiersdorf (ajena) ya es esta grabación → se vincula, no se crea nada y no se toca
escenarioJobStories();
cal[DOMINGO].eventos[1].organizer = ORG_AJENO; cal[DOMINGO].eventos[1].description = "Invitación del cliente";
cal[DOMINGO].eventos[0].organizer = ORG_DOMINGO;
let r = await agendar(envDoppel, { brand: "doppel", email: "damian@beiersdorf.com", sendEmail: true });
check("1a. Job Stories 15:30 (80 min) con la invitación 15:30–17:00: 200 y adoptada", r.status === 200 && r.j.ok === true && r.j.adoptado === true && r.j.calendario === "doppel", JSON.stringify(r));
check("1b. NO se creó ningún evento", tipos("crear").length === 0, JSON.stringify(log));
check("1c. el evento ajeno no se tocó (ni PATCH ni DELETE)", tipos("patch").length === 0 && tipos("borrar").length === 0);
check("1d. la respuesta trae título y hora real 15:30–17:00", r.j.evento?.titulo === "Grabación Job Stories con Damian Yousef" && r.j.evento.inicio === "15:30" && r.j.evento.fin === "17:00" && r.j.evento.organizadorPropio === false, JSON.stringify(r.j.evento));
check("1e. start/end de la respuesta son los del evento (no los 80 min del formulario)", r.j.start === new Date(iso("15:30")).toISOString() && r.j.end === new Date(iso("17:00")).toISOString() && r.j.hora === "15:30", JSON.stringify(r.j));
const adop = JSON.parse(kv.get("booking:" + r.j.token));
check("1f. la reserva guarda eventId, calendarId, adoptado:true y la hora real", adop.eventId === "beiersdorf" && adop.calendarId === DOMINGO && adop.adoptado === true && adop.start === new Date(iso("15:30")).toISOString() && adop.end === new Date(iso("17:00")).toISOString() && adop.label === "15:30", JSON.stringify(adop));
check("1g. no se miró el estudio", !log.some((x) => x.cal === ESTUDIO));
check("1h. el correo al cliente lleva la hora del evento adoptado (salida 17:00)", correos.length === 1 && /17:00/.test(correos[0].html) && /15:30/.test(correos[0].html), correos[0]?.html?.slice(0, 200));
const tokenAdoptada = r.j.token;

// 1i. el mismo evento no se vincula a dos grabaciones
r = await agendar(envDoppel, { brand: "doppel" });
check("1i. vincular el mismo evento otra vez: 409 «ya está vinculado»", r.status === 409 && /ya está vinculado a otra grabación/.test(r.j.error), JSON.stringify(r));

// 2. Cancelar una adoptada: solo la desvincula
log.length = 0;
let c = await anular(envDoppel, tokenAdoptada);
check("2a. cancelar una adoptada: 200, adoptado:true y NUNCA se borra el evento", c.status === 200 && c.j.adoptado === true && tipos("borrar").length === 0 && log.length === 0, JSON.stringify({ c, log }));
check("2b. la reserva ya no existe en el hub y el evento sigue en el calendario", !kv.has("booking:" + tokenAdoptada) && cal[DOMINGO].eventos.some((e) => e.id === "beiersdorf"));

// 3. Organizador PROPIO: se adopta y se agrega el enlace al final de la descripción, sin borrar nada
escenarioJobStories();
cal[DOMINGO].eventos[1].organizer = ORG_DOMINGO; cal[DOMINGO].eventos[1].description = "Mis notas de la grabación";
r = await agendar(envDoppel, { brand: "doppel" });
check("3a. adoptada y sin crear", r.status === 200 && r.j.adoptado === true && r.j.evento.organizadorPropio === true && tipos("crear").length === 0, JSON.stringify(r));
const pat = tipos("patch");
check("3b. un solo PATCH, solo de la descripción, con lo anterior intacto y el enlace al final", pat.length === 1 && pat[0].evId === "beiersdorf" && Object.keys(pat[0].body).join() === "description" && pat[0].body.description === "Mis notas de la grabación\n\nProyecto en el hub: https://clientes.doppel.cl/project/1023", JSON.stringify(pat));
check("3c. el título y el horario no cambiaron", cal[DOMINGO].eventos[1].summary === "Grabación Job Stories con Damian Yousef" && r.j.evento.enlaceAgregado === true);
await anular(envDoppel, r.j.token);
r = await agendar(envDoppel, { brand: "doppel" });
check("3d. al volver a vincular no se duplica el enlace (idempotente)", r.status === 200 && tipos("patch").length === 1 && r.j.evento.enlaceAgregado === false, JSON.stringify(tipos("patch")));

// 4. Varios candidatos: se pide elegir; con vincularEventoId se vincula el elegido
escenarioJobStories();
cal[DOMINGO].eventos.push(ev("segundo", "Grabación Job Stories (backup)", "15:40", "17:00"));
log.length = 0;
r = await agendar(envDoppel, { brand: "doppel" });
check("4a. dos eventos podrían ser la grabación: 409 con los dos candidatos", r.status === 409 && r.j.candidatos?.length === 2 && r.j.candidatos.map((x) => x.eventId).sort().join() === "beiersdorf,segundo" && /elige cuál vincular/.test(r.j.error), JSON.stringify(r));
check("4b. cada candidato trae título y horario", r.j.candidatos.every((x) => x.titulo && /^\d\d:\d\d–\d\d:\d\d$/.test(x.horario)), JSON.stringify(r.j.candidatos));
check("4c. no se creó nada", tipos("crear").length === 0 && tipos("patch").length === 0);
r = await agendar(envDoppel, { brand: "doppel", vincularEventoId: "segundo" });
check("4d. con vincularEventoId se adopta el elegido", r.status === 200 && r.j.adoptado === true && JSON.parse(kv.get("booking:" + r.j.token)).eventId === "segundo" && tipos("crear").length === 0, JSON.stringify(r));
r = await agendar(envDoppel, { brand: "doppel", vincularEventoId: "andigital" });
check("4e. un vincularEventoId que no es candidato (Andigital) se rechaza", r.status === 409 && !r.j.candidatos && /ya no coincide/.test(r.j.error), JSON.stringify(r));

// 5. Choque con otra cosa: 409 que lo nombra, sin forzar
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "13:00", minutes: 60 });
check("5a. 13:00 cruza Andigital: 409 que lo nombra", r.status === 409 && r.j.error === "Choca con “Andigital” 09:00–14:00" && !r.j.candidatos, JSON.stringify(r));
check("5b. no queda ninguna forma de forzar (la respuesta no ofrece nada más)", r.j.puedeAgendarIgual === undefined && tipos("crear").length === 0);
r = await agendar(envDoppel, { brand: "doppel", start: "13:00", minutes: 60, agendarIgual: true, vincularEventoId: "andigital" });
check("5c. ni agendarIgual ni vincularEventoId fuerzan un choque", r.status === 409 && tipos("crear").length === 0, JSON.stringify(r));
r = await agendar(envDoppel, { brand: "doppel", start: "09:00", minutes: 60 });
check("5d. un evento largo que solo empieza a la misma hora (Andigital 09:00–14:00 vs 09:00–10:00) NO se adopta", r.status === 409 && /Andigital/.test(r.j.error), JSON.stringify(r));
// la invitación coincide pero hay además otra cosa que se cruza
cal[DOMINGO].eventos.push(ev("otra", "Llamada con proveedor", "16:00", "16:30"));
r = await agendar(envDoppel, { brand: "doppel" });
check("5e. si además de la invitación se cruza otra cosa, es choque real y nombra la otra", r.status === 409 && r.j.error === "Choca con “Llamada con proveedor” 16:00–16:30", JSON.stringify(r));

// 6. Sin choque: se crea como siempre (el estudio ocupado no cuenta)
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "14:00", minutes: 80 });
check("6a. libre en el calendario de Domingo (estudio ocupado por Iván): se crea en domingo@doppel.cl", r.status === 200 && !r.j.adoptado && r.j.calendario === "doppel" && tipos("crear").length === 1 && tipos("crear")[0].cal === DOMINGO, JSON.stringify(r));
check("6b. título «🎬 Grabación · Job Stories» y enlace al proyecto", tipos("crear")[0].body.summary === "🎬 Grabación · Job Stories" && /clientes\.doppel\.cl\/project\/1023/.test(tipos("crear")[0].body.description));
check("6c. la reserva creada guarda calendarId y NO adoptado", (() => { const b = JSON.parse(kv.get("booking:" + r.j.token)); return b.calendarId === DOMINGO && b.adoptado === undefined; })());
check("6d. el estudio no se tocó", !log.some((x) => x.cal === ESTUDIO));
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "14:00", minutes: 90 });
check("6e. 14:00–15:30 termina justo cuando empieza la invitación: libre (no choca ni adopta)", r.status === 200 && !r.j.adoptado && tipos("crear").length === 1, JSON.stringify(r));
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "14:00", minutes: 100 });
check("6f. 14:00–15:40 pisa 10 min la invitación y no es la misma grabación: 409", r.status === 409 && /Job Stories/.test(r.j.error), JSON.stringify(r));

// P. Pod Factory sigue igual (aunque DOPPEL_CALENDAR_ID esté definido)
escenarioJobStories();
r = await agendar(envDoppel, { brand: "podfactory", projectName: "Cap 1" });
check("Pa. PF 15:30 con el estudio ocupado: mismo 409 de siempre", r.status === 409 && r.j.error === "Ese horario ya está ocupado en el estudio.", JSON.stringify(r));
check("Pb. PF revisó el calendario del estudio (freeBusy) y NO el de Domingo", tipos("freeBusy").every((x) => x.cal === ESTUDIO) && tipos("freeBusy").length === 1 && !log.some((x) => x.cal === DOMINGO));
reiniciar();
r = await agendar(envDoppel, { brand: "podfactory", projectName: "Cap 1", start: "18:00", minutes: 60 });
const crP = tipos("crear");
check("Pc. PF libre: se crea en el calendario del estudio con el título de siempre", r.status === 200 && crP.length === 1 && crP[0].cal === ESTUDIO && crP[0].body.summary === "🎙️ Pod Factory: Cap 1", JSON.stringify(crP[0]));
check("Pd. la reserva de PF no lleva calendarId", JSON.parse(kv.get("booking:" + r.j.token)).calendarId === undefined && r.j.calendario === "estudio");
// 5e. un hold de pago de PF no afecta a Doppel pero sí a PF
reiniciar();
kv.set(`hold:${DIA}:16:00`, JSON.stringify({ start: new Date(iso("16:00")).toISOString(), end: new Date(iso("17:00")).toISOString() }));
const rD = await agendar(envDoppel, { brand: "doppel", start: "16:00", minutes: 60 });
const rP = await agendar(envDoppel, { brand: "podfactory", start: "16:00", minutes: 60 });
check("Pe. un hold de pago de PF bloquea a PF (409) pero no a Doppel (200)", rP.status === 409 && rD.status === 200, JSON.stringify({ rD, rP }));

// S. Sin DOPPEL_CALENDAR_ID, Doppel se comporta como antes (calendario del estudio)
escenarioJobStories();
r = await agendar(envBase, { brand: "doppel" });
check("Sa. sin la variable, Doppel sigue chocando con el estudio (como hoy)", r.status === 409 && r.j.error === "Ese horario ya está ocupado en el estudio." && !log.some((x) => x.cal === DOMINGO), JSON.stringify(r));
reiniciar();
r = await agendar(envBase, { brand: "doppel", start: "12:00", minutes: 60 });
check("Sb. sin la variable y libre, el evento va al estudio con «🎬 Doppel: …»", r.status === 200 && tipos("crear")[0].cal === ESTUDIO && tipos("crear")[0].body.summary === "🎬 Doppel: Job Stories" && r.j.calendario === "estudio");

// E. Eventos que NO ocupan: cancelado, «disponible», rechazado, ubicación de trabajo
reiniciar();
cal[DOMINGO].eventos = [
  ev("a", "Cancelado", "15:30", "17:00", { status: "cancelled" }),
  ev("b", "Recordatorio (disponible)", "15:30", "17:00", { transparency: "transparent" }),
  ev("c", "Rechazado", "15:30", "17:00", { attendees: [{ self: true, responseStatus: "declined" }] }),
  ev("d", "Oficina", "15:30", "17:00", { eventType: "workingLocation" }),
];
r = await agendar(envDoppel, { brand: "doppel" });
check("E1. cancelado / disponible / rechazado / ubicación de trabajo no bloquean", r.status === 200, JSON.stringify(r));
reiniciar();
cal[DOMINGO].eventos = [ev("e", "Aceptado", "16:00", "17:00", { attendees: [{ self: true, responseStatus: "accepted" }] })];
r = await agendar(envDoppel, { brand: "doppel" });
check("Eb. uno aceptado sí bloquea", r.status === 409 && /Aceptado/.test(r.j.error));

// T. Evento de todo el día: bloquea, nunca se fuerza
reiniciar();
cal[DOMINGO].eventos = [{ id: "v", summary: "Viaje a Lima", status: "confirmed", start: { date: DIA }, end: { date: addDaysStr(DIA, 1) } }];
r = await agendar(envDoppel, { brand: "doppel" });
check("T1. todo el día: «Choca con “Viaje a Lima” (todo el día)» y no se adopta", r.status === 409 && r.j.error === "Choca con “Viaje a Lima” (todo el día)" && !r.j.candidatos, JSON.stringify(r));

// N. Calendario NO compartido con el service account: error explícito, jamás «libre»
reiniciar();
cal[DOMINGO].noCompartido = true;
r = await agendar(envDoppel, { brand: "doppel", start: "12:00", minutes: 60 });
check("Na. calendario no compartido → 502 y NO se crea nada", r.status === 502 && tipos("crear").length === 0, JSON.stringify(r));
check("Nb. el mensaje dice qué hacer y nombra la cuenta de servicio", /no está compartido con reservas-bot@pod-factory-reservas\.iam\.gserviceaccount\.com/.test(r.j.error) && /Hacer cambios en eventos/.test(r.j.error), r.j.error);

// C. Cancelar usa el mismo calendario con el que se creó
reiniciar();
const rDop = await agendar(envDoppel, { brand: "doppel", start: "12:00", minutes: 60 });
const rPf = await agendar(envDoppel, { brand: "podfactory", start: "18:00", minutes: 60 });
log.length = 0;
c = await anular(envDoppel, rDop.j.token);
check("Ca. cancelar una grabación de Doppel borra el evento del calendario de Domingo", c.status === 200 && tipos("borrar").length === 1 && tipos("borrar")[0].cal === DOMINGO && tipos("borrar")[0].evId === rDop.j.eventId, JSON.stringify(log));
log.length = 0;
c = await anular(envDoppel, rPf.j.token);
check("Cb. cancelar una de PF borra del estudio", c.status === 200 && tipos("borrar")[0].cal === ESTUDIO);
// reserva de Doppel vieja (antes del cambio, sin calendarId) → estudio
reiniciar();
kv.set("booking:viejo", JSON.stringify({ token: "viejo", eventId: "evViejo", brand: "doppel", start: new Date(Date.now() + 5 * 86400000).toISOString(), end: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(), tipo: "Podcast" }));
c = await anular(envDoppel, "viejo");
check("Cc. una reserva de Doppel anterior al cambio (sin calendarId) se borra del estudio", c.status === 200 && tipos("borrar")[0].cal === ESTUDIO);
// dentro de 36 h: la regla es de PF; Doppel desde el hub sí puede cancelar
reiniciar();
const pronto = { token: "pronto", eventId: "evP", calendarId: DOMINGO, brand: "doppel", start: new Date(Date.now() + 5 * 3600000).toISOString(), end: new Date(Date.now() + 6 * 3600000).toISOString(), tipo: "Podcast" };
kv.set("booking:pronto", JSON.stringify(pronto));
c = await anular(envDoppel, "pronto");
check("Cd. Doppel en menos de 36 h se puede cancelar desde el hub", c.status === 200 && tipos("borrar")[0].cal === DOMINGO, JSON.stringify(c));
kv.set("booking:prontoPF", JSON.stringify({ ...pronto, token: "prontoPF", calendarId: undefined, brand: "podfactory" }));
c = await anular(envDoppel, "prontoPF");
check("Ce. PF en menos de 36 h sigue bloqueado (409)", c.status === 409);
// el equipo (hub + porEquipo:true) SÍ puede cancelar una de PF en menos de 36 h; sin el flag o sin el secreto sigue bloqueado
const cancelPorEquipo = async (token, headers, extra = {}) => { const r = await cancel({ request: new Request("https://podfactory.cl/api/cancel", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ id: token, notify: false, ...extra }) }), env: envDoppel }); return { status: r.status }; };
kv.set("booking:prontoPF2", JSON.stringify({ ...pronto, token: "prontoPF2", calendarId: undefined, brand: "podfactory" }));
check("Cg. PF en menos de 36 h: hub SIN porEquipo sigue bloqueado (409)", (await cancelPorEquipo("prontoPF2", { "x-intake-secret": SECRETO })).status === 409);
check("Ch. PF en menos de 36 h: porEquipo:true SIN el secreto del hub sigue bloqueado (409)", (await cancelPorEquipo("prontoPF2", {}, { porEquipo: true })).status === 409);
check("Ci. PF en menos de 36 h: hub + porEquipo:true cancela (200)", (await cancelPorEquipo("prontoPF2", { "x-intake-secret": SECRETO }, { porEquipo: true })).status === 200);
// sin el secreto del hub, una reserva de Doppel en menos de 36 h sigue protegida
kv.set("booking:prontoX", JSON.stringify({ ...pronto, token: "prontoX" }));
const rSin = await cancel({ request: new Request("https://podfactory.cl/api/cancel", { method: "POST", body: JSON.stringify({ id: "prontoX" }) }), env: envDoppel });
check("Cf. sin el secreto del hub (público) la regla de 36 h sigue aplicando", rSin.status === 409);

// R. /api/reschedule (ruta pública del estudio) no mueve eventos de Doppel en el calendario equivocado
reiniciar();
kv.set("booking:pronto", JSON.stringify({ ...pronto, start: new Date(Date.now() + 10 * 86400000).toISOString() }));
const rr = await reschedule({ request: new Request("https://podfactory.cl/api/reschedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "pronto", date: DIA, start: new Date(iso("10:00")).toISOString(), label: "10:00" }) }), env: envDoppel });
check("R1. reagendar por la ruta del estudio una reserva con calendarId: 409 y ninguna llamada a Google", rr.status === 409 && log.length === 0, JSON.stringify(log));

// 12. Reagendar
// 12.1 una creada por el hub: el evento propio no choca consigo misma con reemplazaToken
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel", start: "14:00", minutes: 80 });
const creada = r.j;
r = await agendar(envDoppel, { brand: "doppel", start: "14:20", minutes: 70 });
check("12a. mover 20 min SIN reemplazaToken choca con la creada por el hub", r.status === 409, JSON.stringify(r));
r = await agendar(envDoppel, { brand: "doppel", start: "14:20", minutes: 70, reemplazaToken: creada.token });
check("12b. con reemplazaToken se ignora el evento propio → 200 (se crea el nuevo)", r.status === 200 && !r.j.adoptado && tipos("crear").length === 2, JSON.stringify(r));
log.length = 0;
c = await anular(envDoppel, creada.token);
check("12c. luego la anterior (creada por el hub) se borra de su calendario", c.status === 200 && tipos("borrar")[0].cal === DOMINGO && tipos("borrar")[0].evId === creada.eventId);
// 12.2 una ADOPTADA: reagendar desvincula y agenda la nueva hora con la misma lógica
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel" });
const ad2 = r.j;
r = await agendar(envDoppel, { brand: "doppel", start: "16:00", minutes: 80, reemplazaToken: ad2.token });
check("12d. mover una adoptada a 16:00: el evento adoptado sigue en el calendario, así que choca (no se ignora)", r.status === 409 && /Choca con “Grabación Job Stories con Damian Yousef” 15:30–17:00/.test(r.j.error), JSON.stringify(r));
r = await agendar(envDoppel, { brand: "doppel", start: "15:30", minutes: 80, reemplazaToken: ad2.token });
check("12e. reagendar a la misma hora re-adopta el mismo evento (permitido con reemplazaToken)", r.status === 200 && r.j.adoptado === true && r.j.token !== ad2.token, JSON.stringify(r));
log.length = 0;
c = await anular(envDoppel, ad2.token);
check("12f. y luego la anterior solo se desvincula: el evento NO se borra", c.status === 200 && c.j.adoptado === true && tipos("borrar").length === 0 && cal[DOMINGO].eventos.some((e) => e.id === "beiersdorf"));
// 12.3 mover una adoptada a un hueco libre: se crea uno nuevo y el ajeno queda intacto
escenarioJobStories();
r = await agendar(envDoppel, { brand: "doppel" });
const ad3 = r.j;
r = await agendar(envDoppel, { brand: "doppel", start: "18:00", minutes: 60, reemplazaToken: ad3.token });
check("12g. mover una adoptada a un hueco libre crea el evento nuevo", r.status === 200 && !r.j.adoptado && tipos("crear").length === 1 && tipos("crear")[0].cal === DOMINGO, JSON.stringify(r));
c = await anular(envDoppel, ad3.token);
check("12h. y desvincula la adoptada sin borrar el evento ajeno", c.status === 200 && tipos("borrar").length === 0 && cal[DOMINGO].eventos.some((e) => e.id === "beiersdorf"));

// 13. Validaciones previas siguen: fecha pasada y secreto
r = await agendar(envDoppel, { brand: "doppel", date: "2020-01-01" });
check("13a. horario pasado → 400", r.status === 400);
const rs = await schedule({ request: reqDe({ brand: "doppel", date: DIA, start: "10:00" }, { "x-intake-secret": "malo" }), env: envDoppel });
check("13b. secreto incorrecto → 403", rs.status === 403);

// 14. Unitarias de la lógica pura
const ev1 = normalizarEventos([ev("x", "A", "10:00", "11:00")], "America/Santiago");
const t0 = Date.parse(iso("11:00")), t1 = Date.parse(iso("12:00"));
check("14a. un evento que termina justo cuando empieza la grabación no choca", decidirGrabacionDoppel({ startMs: t0, endMs: t1, eventos: ev1, timeZone: "America/Santiago" }).accion === "crear");
check("14b. evento de otro día que cruza la medianoche se nombra con fecha", /^Choca con “Vuelo” \d+ \w+\.? \d\d:\d\d–\d\d:\d\d$/.test(decidirGrabacionDoppel({ startMs: t0, endMs: t1, eventos: normalizarEventos([{ id: "n", summary: "Vuelo", start: { dateTime: iso("22:00").replace(DIA, addDaysStr(DIA, -1)) }, end: { dateTime: iso("12:30") } }], "America/Santiago"), timeZone: "America/Santiago" }).error), decidirGrabacionDoppel({ startMs: t0, endMs: t1, eventos: normalizarEventos([{ id: "n", summary: "Vuelo", start: { dateTime: iso("22:00").replace(DIA, addDaysStr(DIA, -1)) }, end: { dateTime: iso("12:30") } }], "America/Santiago"), timeZone: "America/Santiago" }).error);

// 15. Reagendar una reserva del ESTUDIO (Pod Factory) a una hora que se superpone con la ACTUAL de la misma reserva (bug 12-nov-2026: 19:00 → 19:30
//     se rechazaba con «Ese horario ya está ocupado en el estudio» porque el evento de la propia reserva seguía en el calendario).
//     Aquí freeBusy se arma a partir de los eventos del calendario (como Google, juntando los que se tocan) para que el escenario sea el real.
const juntar = (xs) => { const o = []; for (const x of [...xs].sort((a, b) => a.start.localeCompare(b.start))) { const u = o[o.length - 1]; if (u && Date.parse(x.start) <= Date.parse(u.end)) { if (x.end > u.end) u.end = x.end; } else o.push({ ...x }); } return o; };
const sincronizarBusy = () => { cal[ESTUDIO].busy = juntar(cal[ESTUDIO].eventos.map((e) => ({ start: new Date(e.start.dateTime).toISOString(), end: new Date(e.end.dateTime).toISOString() }))); };
const agendarPF = async (body) => { const x = await agendar(envBase, { brand: "podfactory", projectName: "Rentabilizate · Podcast", ...body }); sincronizarBusy(); return x; };
const manual = (id, titulo, a, b) => { cal[ESTUDIO].eventos.push(ev(id, titulo, a, b)); sincronizarBusy(); };   // anotado a mano por Iván: sin reserva en KV

// 15.1 el caso real: reserva de 60 min a las 19:00, mover a las 19:30
reiniciar();
r = await agendarPF({ start: "19:00", minutes: 60 });
const propia = r.j;
check("15a. la reserva de las 19:00 se creó en el calendario del estudio", r.status === 200 && tipos("crear").length === 1 && tipos("crear")[0].cal === ESTUDIO, JSON.stringify(r));
r = await agendarPF({ start: "19:30", minutes: 60 });
check("15b. sin reemplazaToken, 19:30 choca con la de las 19:00 (409, comportamiento de siempre)", r.status === 409 && /ocupado en el estudio/.test(r.j.error), JSON.stringify(r));
r = await agendarPF({ start: "19:30", minutes: 60, reemplazaToken: propia.token });
check("15c. con reemplazaToken, 19:00 → 19:30 (se superpone con la propia): 200 y evento nuevo", r.status === 200 && r.j.token !== propia.token && r.j.hora === "19:30" && tipos("crear").length === 2, JSON.stringify(r));
check("15d. la reserva nueva sigue siendo del estudio (sin calendarId) y la antigua NO se tocó aún (la libera /api/cancel)", JSON.parse(kv.get("booking:" + r.j.token)).calendarId === undefined && kv.has("booking:" + propia.token) && tipos("borrar").length === 0);
// otras superposiciones con la propia: 18:30–19:30, 19:00–20:00 (misma hora) y 19:15–20:15 también valen
for (const [ini, mins] of [["18:30", 60], ["19:00", 60], ["19:15", 90]]) {
  reiniciar(); r = await agendarPF({ start: "19:00", minutes: 60 }); const p2 = r.j;
  r = await agendarPF({ start: ini, minutes: mins, reemplazaToken: p2.token });
  check(`15e. ${ini} (${mins} min) superpuesto con la propia 19:00–20:00 y reemplazaToken: 200`, r.status === 200, JSON.stringify(r));
}

// 15.2 sigue detectando OTRAS cosas: otra reserva, un evento puesto a mano por Iván, y el margen de 30 min
reiniciar();
r = await agendarPF({ start: "17:00", minutes: 60 }); const mia = r.j;                      // la que se mueve: 17:00–18:00
r = await agendarPF({ start: "19:00", minutes: 60, projectName: "Otro cliente" }); const otra = r.j;   // otra reserva: 19:00–20:00
r = await agendarPF({ start: "19:30", minutes: 60, reemplazaToken: mia.token });
check("15f. superponerse con OTRA reserva sigue rechazado (409) aunque se ignore la propia", r.status === 409 && /ocupado en el estudio/.test(r.j.error), JSON.stringify(r));
r = await agendarPF({ start: "20:00", minutes: 60, reemplazaToken: mia.token });
check("15g. pegado (0 min de margen) a OTRA reserva sigue rechazado: «muy pegado»", r.status === 409 && /muy pegado/.test(r.j.error), JSON.stringify(r));
manual("ivan1", "Ivan: grabación de otro cliente", "15:00", "16:00");
r = await agendarPF({ start: "15:30", minutes: 60, reemplazaToken: mia.token });
check("15h. superponerse con un evento anotado a mano (sin reserva en KV) sigue rechazado (409)", r.status === 409 && /ocupado en el estudio/.test(r.j.error), JSON.stringify(r));
r = await agendarPF({ start: "16:00", minutes: 60, reemplazaToken: mia.token });
check("15i. pegado a un evento de Iván (sin margen de 30 min) sigue rechazado: «muy pegado»", r.status === 409 && /muy pegado/.test(r.j.error), JSON.stringify(r));
r = await agendarPF({ start: "16:30", minutes: 60, reemplazaToken: mia.token });
check("15j. con 30 min de margen respecto de Iván y de la propia: 200", r.status === 200, JSON.stringify(r));

// 15.3 la propia reserva pegada a un evento ajeno (juntos en freeBusy): solo se libera lo de la propia
reiniciar();
r = await agendarPF({ start: "18:00", minutes: 60 }); const p3 = r.j;       // 18:00–19:00
manual("ivan2", "Ivan: reunión", "19:00", "20:00");                          // contiguo: freeBusy los junta en 18:00–20:00
r = await agendarPF({ start: "18:30", minutes: 60, reemplazaToken: p3.token });
check("15k. mover 18:00 → 18:30 con Iván a las 19:00 (contiguo a la propia): 409 (el evento de Iván sigue contando)", r.status === 409, JSON.stringify(r));
r = await agendarPF({ start: "17:00", minutes: 60, reemplazaToken: p3.token });
check("15l. mover 18:00 → 17:00 (libera la propia; Iván queda a 2 h): 200", r.status === 200, JSON.stringify(r));

// 15.4 reemplazaToken que no sirve para ignorar nada: inexistente, de otro calendario, adoptada
reiniciar();
r = await agendarPF({ start: "19:00", minutes: 60 });
r = await agendarPF({ start: "19:30", minutes: 60, reemplazaToken: "no-existe" });
check("15m. reemplazaToken inexistente: no ignora nada (409)", r.status === 409, JSON.stringify(r));
kv.set("booking:ajena", JSON.stringify({ token: "ajena", eventId: "ev1", calendarId: DOMINGO, start: new Date(iso("19:00")).toISOString() }));
r = await agendarPF({ start: "19:30", minutes: 60, reemplazaToken: "ajena" });
check("15n. reemplazaToken de una reserva de OTRO calendario: no ignora el evento del estudio (409)", r.status === 409, JSON.stringify(r));
kv.set("booking:adop", JSON.stringify({ token: "adop", eventId: "ev1", adoptado: true, start: new Date(iso("19:00")).toISOString() }));
r = await agendarPF({ start: "19:30", minutes: 60, reemplazaToken: "adop" });
check("15o. reemplazaToken de una adoptada: su evento es ajeno y sigue contando (409)", r.status === 409, JSON.stringify(r));

// 15.5 si no se puede leer el calendario del estudio, NUNCA se interpreta como libre
reiniciar();
r = await agendarPF({ start: "19:00", minutes: 60 }); const p5 = r.j;
cal[ESTUDIO].noCompartido = true;
log.length = 0;
r = await agendarPF({ start: "19:30", minutes: 60, reemplazaToken: p5.token });
check("15p. el calendario del estudio no responde al reagendar: 502 y no se crea nada", r.status === 502 && tipos("crear").length === 0, JSON.stringify(r));

// 15.6 flujo completo del hub (agenda la nueva → cancela la anterior con porEquipo): la nueva queda y la anterior desaparece
reiniciar();
r = await agendarPF({ start: "19:00", minutes: 60 }); const orig = r.j;
r = await agendarPF({ start: "19:30", minutes: 60, reemplazaToken: orig.token }); const nueva = r.j;
const cEq = await cancel({ request: new Request("https://podfactory.cl/api/cancel", { method: "POST", headers: { "content-type": "application/json", "x-intake-secret": SECRETO }, body: JSON.stringify({ id: orig.token, notify: false, porEquipo: true }) }), env: envBase });
check("15q. luego /api/cancel (porEquipo) libera la anterior: borra SU evento y deja la nueva", cEq.status === 200 && tipos("borrar").length === 1 && tipos("borrar")[0].evId === orig.eventId && !kv.has("booking:" + orig.token) && kv.has("booking:" + nueva.token));

// 15.7 cliente: /api/reschedule (Gestionar mi reserva), bloque de la grilla que se superpone solo con la propia reserva
const habil = (() => { let d = addDaysStr(todayIn("America/Santiago"), 10); for (let i = 0; i < 7; i++) { if ([1, 2, 3, 4, 5].includes(weekday(d, "America/Santiago"))) return d; d = addDaysStr(d, 1); } })();
const offH = getOffset(habil, "America/Santiago"), isoH = (hhmm) => `${habil}T${hhmm}:00${offH}`;
const reschedulear = async (env, token, label) => { const rr2 = await reschedule({ request: new Request("https://podfactory.cl/api/reschedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: token, date: habil, start: new Date(isoH(label)).toISOString(), label }) }), env }); return { status: rr2.status, j: await rr2.json() }; };
reiniciar();
r = await agendar(envBase, { brand: "podfactory", date: habil, start: "17:00", minutes: 90 }); sincronizarBusy(); const mia2 = r.j;   // 17:00–18:30 (la grilla es 17:30–18:30)
r = await reschedulear(envBase, mia2.token, "17:30");
check("15r. cliente: mover al bloque 17:30 que solo se superpone con la propia reserva: 200 y se mueve el evento", r.status === 200 && r.j.ok === true && tipos("patch").length === 1 && tipos("patch")[0].evId === mia2.eventId, JSON.stringify({ r, log }));
reiniciar();
r = await agendar(envBase, { brand: "podfactory", date: habil, start: "17:00", minutes: 90 }); const mia3 = r.j;
cal[ESTUDIO].eventos.push({ id: "otro", summary: "🎙️ Pod Factory: Otro", status: "confirmed", start: { dateTime: isoH("17:30") }, end: { dateTime: isoH("18:30") } }); sincronizarBusy();   // otra reserva en el bloque 17:30
r = await reschedulear(envBase, mia3.token, "17:30");
check("15s. cliente: si el bloque 17:30 lo ocupa OTRA reserva: sigue 409 «ya no está disponible»", r.status === 409 && /ya no está disponible/.test(r.j.error) && tipos("patch").length === 0, JSON.stringify({ r, log }));

const fallas = resultados.filter((x) => !x).length;
console.log(`\n${resultados.length - fallas}/${resultados.length} comprobaciones OK`);
console.log(fallas ? "HAY FALLAS" : "TODO OK");
process.exit(fallas ? 1 : 0);
