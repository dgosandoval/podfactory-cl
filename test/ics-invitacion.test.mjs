// Prueba de la INVITACIÓN de calendario (.ics) que reciben los clientes: tarjeta «Agregar al calendario» al reservar, y que reagendar/cancelar
// ACTUALICEN el evento que ya tienen (mismo UID, SEQUENCE creciente) en vez de duplicarlo.
// Corre el código REAL de functions/ (schedule, create-booking, confirm, solicitud, reschedule, cancel) con Google y Resend SIMULADOS: no sale
// ninguna llamada de red ni se envía ningún correo. La clave del service account es una RSA generada al vuelo.
// Uso:  node test/ics-invitacion.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import fs from "node:fs";
import { onRequestPost as schedule } from "../functions/api/portal/schedule.js";
import { onRequestPost as createBooking } from "../functions/api/admin/create-booking.js";
import { onRequestPost as reschedule } from "../functions/api/reschedule.js";
import { onRequestPost as cancel } from "../functions/api/cancel.js";
import { confirmBooking } from "../functions/_lib/confirm.js";
import { requestBooking, confirmarSolicitud } from "../functions/_lib/solicitud.js";
import { parseConfig, configFor, buildSlots, weekday, addDaysStr, todayIn } from "../functions/_lib/slots.js";
import { icsAttachment, icsPlegar, icsSequence, fromEmail } from "../functions/_lib/email.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };

// ── Entorno simulado ──
const ADMIN = "admin-de-prueba", SECRETO = "secreto-de-prueba";
const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const SA = { client_email: "reservas-bot@pod-factory-reservas.iam.gserviceaccount.com", private_key: privateKey };
const kv = new Map();
const HOLDS = {
  async get(k, tipo) { const v = kv.get(k); return v === undefined ? null : (tipo === "json" ? JSON.parse(v) : v); },
  async put(k, v) { kv.set(k, String(v)); },
  async delete(k) { kv.delete(k); },
  async list({ prefix }) { return { keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
};
const env = {
  RESEND_API_KEY: "k", GOOGLE_SA_KEY: JSON.stringify(SA), GOOGLE_CALENDAR_ID: "estudio@group.calendar.google.com",
  PORTAL_INTAKE_SECRET: SECRETO, ADMIN_KEY: ADMIN, TIMEZONE: "America/Santiago", HOLDS,
  FROM_EMAIL: "Pod Factory <reservas@doppel.cl>", STUDIO_EMAIL: "hola@doppel.cl", STUDIO_NOTIFY: "hola@doppel.cl,ivan@example.com",
};
const config = parseConfig(env);
const ORIGIN = "https://podfactory.cl";

const correos = []; // cuerpos JSON de lo que se "enviaría" a Resend
let sigEvento = 1;
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  if (url === "https://api.resend.com/emails") { correos.push(JSON.parse(init.body)); return json({ id: "r" + correos.length }); }
  if (url.endsWith("/calendar/v3/freeBusy")) { const id = JSON.parse(init.body).items[0].id; return json({ calendars: { [id]: { busy: [] } } }); }
  if (/\/calendars\/[^/]+\/events/.test(url)) {
    if (method === "POST") return json({ id: "ev" + sigEvento++ });
    if (method === "PATCH") return json({ id: "ev" });
    if (method === "DELETE") return new Response(null, { status: 204 });
  }
  throw new Error("fetch no simulado: " + method + " " + url);
};
// Reloj: cada paso avanza 10 s para que el SEQUENCE (segundos) sea estrictamente creciente aunque la prueba corra en milisegundos.
const ahoraReal = Date.now.bind(Date); let saltoMs = 0;
Date.now = () => ahoraReal() + saltoMs;
const avanzar = () => { saltoMs += 10_000; };

// ── Utilidades de lectura del .ics ──
const decodificar = (adj) => Buffer.from(adj.content, "base64").toString("utf8");
const desplegar = (txt) => txt.replace(/\r\n[ \t]/g, ""); // RFC 5545: quitar CRLF + espacio
const prop = (txt, nombre) => (desplegar(txt).split("\r\n").find((l) => l.startsWith(nombre + ":") || l.startsWith(nombre + ";")) || "").split(/:(.*)/s)[1];
const attendees = (txt) => desplegar(txt).split("\r\n").filter((l) => l.startsWith("ATTENDEE")).map((l) => l.slice(l.indexOf("mailto:") + 7));
// Correos enviados desde `desde` que van a `dest` (lista exacta) → el último.
const correoA = (dest, desde = 0) => correos.slice(desde).reverse().find((c) => JSON.stringify(c.to) === JSON.stringify(dest));
const bytes = (s) => Buffer.byteLength(s, "utf8");

// Comprobaciones comunes de un adjunto de invitación.
function revisar(etiqueta, mail, { metodo, uid, dest, estado }) {
  const adj = mail?.attachments?.[0];
  check(`${etiqueta}: el correo lleva UN adjunto «invitacion.ics»`, mail?.attachments?.length === 1 && adj.filename === "invitacion.ics", JSON.stringify(mail?.attachments?.map((a) => a.filename)));
  if (!adj) return null;
  check(`${etiqueta}: content_type = text/calendar; method=${metodo}`, adj.content_type === `text/calendar; method=${metodo}`, adj.content_type);
  const txt = decodificar(adj);
  check(`${etiqueta}: METHOD:${metodo}`, prop(txt, "METHOD") === metodo, prop(txt, "METHOD"));
  check(`${etiqueta}: UID = ${uid.slice(0, 6)}…@podfactory.cl`, prop(txt, "UID") === `${uid}@podfactory.cl`, prop(txt, "UID"));
  check(`${etiqueta}: STATUS:${estado}`, prop(txt, "STATUS") === estado, prop(txt, "STATUS"));
  check(`${etiqueta}: ORGANIZER = dirección del From (reservas@doppel.cl)`, desplegar(txt).includes("ORGANIZER;CN=Pod Factory:mailto:reservas@doppel.cl\r\n"));
  check(`${etiqueta}: un ATTENDEE por destinatario (${dest.join(", ")})`, JSON.stringify(attendees(txt)) === JSON.stringify(dest), JSON.stringify(attendees(txt)));
  check(`${etiqueta}: ATTENDEE con ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE`, desplegar(txt).split("\r\n").filter((l) => l.startsWith("ATTENDEE")).every((l) => l.includes(";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:")));
  const fisicas = txt.split("\r\n");
  check(`${etiqueta}: todas las líneas ≤ 75 octetos`, fisicas.every((l) => bytes(l) <= 75), fisicas.filter((l) => bytes(l) > 75).join(" | "));
  check(`${etiqueta}: saltos CRLF (sin LF ni CR sueltos) y termina en CRLF`, !/[\r\n]/.test(txt.replace(/\r\n/g, "")) && txt.endsWith("END:VCALENDAR\r\n"));
  check(`${etiqueta}: DTSTAMP es «ahora», no la hora de la sesión`, prop(txt, "DTSTAMP") !== prop(txt, "DTSTART") && /^\d{8}T\d{6}Z$/.test(prop(txt, "DTSTAMP")) && !!prop(txt, "LAST-MODIFIED"));
  return txt;
}

// Fechas: un día hábil futuro (≥ 14 días) y otro distinto para el reagendo.
function diaHabil(desde) { let d = addDaysStr(todayIn(env.TIMEZONE), desde); while (!config.openDays.includes(weekday(d, env.TIMEZONE))) d = addDaysStr(d, 1); return d; }
const DIA1 = diaHabil(14), DIA2 = diaHabil(21);
const reagendarA = async (token, tipo, dia, indice) => { // pide el reagendo a un bloque real de la grilla del servicio
  const slot = buildSlots(dia, configFor(config, tipo))[indice];
  const r = await reschedule({ request: new Request(ORIGIN + "/api/reschedule", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": ADMIN }, body: JSON.stringify({ id: token, date: dia, start: slot.start, label: slot.label }) }), env });
  return { status: r.status, slot };
};
const anular = async (token) => (await cancel({ request: new Request(ORIGIN + "/api/cancel", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": ADMIN }, body: JSON.stringify({ id: token }) }), env })).status;
const reserva = (token) => JSON.parse(kv.get("booking:" + token));

// Ciclo completo: la invitación inicial ya está en `mailCrear`; reagenda y cancela, y compara todo.
async function ciclo(nombre, token, tipo, dest, mailCrear, { metodoInicial = "REQUEST" } = {}) {
  const txtCrear = revisar(`${nombre} · crear`, mailCrear, { metodo: metodoInicial, uid: token, dest, estado: "CONFIRMED" });
  const startCrear = reserva(token).start;
  check(`${nombre} · crear: DTSTART = inicio de la reserva`, txtCrear && prop(txtCrear, "DTSTART") === startCrear.replace(/[-:]/g, "").replace(/\.\d{3}/, ""), prop(txtCrear || "", "DTSTART"));

  avanzar();
  const desdeRe = correos.length;
  const rr = await reagendarA(token, tipo, DIA2, 1);
  check(`${nombre} · reagendar: 200`, rr.status === 200, String(rr.status));
  const mailRe = correoA(dest, desdeRe);
  const txtRe = revisar(`${nombre} · reagendar`, mailRe, { metodo: "REQUEST", uid: token, dest, estado: "CONFIRMED" });
  check(`${nombre} · reagendar: DTSTART/DTEND son los NUEVOS`, txtRe && prop(txtRe, "DTSTART") === rr.slot.start.replace(/[-:]/g, "").replace(/\.\d{3}/, "") && prop(txtRe, "DTEND") === rr.slot.end.replace(/[-:]/g, "").replace(/\.\d{3}/, ""), prop(txtRe || "", "DTSTART"));
  check(`${nombre} · reagendar: mismo UID y mismo título que la invitación inicial`, txtCrear && txtRe && prop(txtRe, "UID") === prop(txtCrear, "UID") && prop(txtRe, "SUMMARY") === prop(txtCrear, "SUMMARY") && prop(txtRe, "DESCRIPTION") === prop(txtCrear, "DESCRIPTION"), `${prop(txtCrear || "", "SUMMARY")} / ${prop(txtRe || "", "SUMMARY")}`);
  check(`${nombre} · reagendar: SEQUENCE mayor que el de la invitación inicial`, txtCrear && txtRe && +prop(txtRe, "SEQUENCE") > +prop(txtCrear, "SEQUENCE"), `${prop(txtCrear || "", "SEQUENCE")} → ${prop(txtRe || "", "SEQUENCE")}`);

  avanzar();
  const desdeCa = correos.length;
  const st = await anular(token);
  check(`${nombre} · cancelar: 200`, st === 200, String(st));
  const mailCa = correoA(dest, desdeCa);
  const txtCa = revisar(`${nombre} · cancelar`, mailCa, { metodo: "CANCEL", uid: token, dest, estado: "CANCELLED" });
  check(`${nombre} · cancelar: mismo UID, SEQUENCE mayor que el reagendo y DTSTART del reagendo`, txtCa && txtRe && prop(txtCa, "UID") === prop(txtRe, "UID") && +prop(txtCa, "SEQUENCE") > +prop(txtRe, "SEQUENCE") && prop(txtCa, "DTSTART") === prop(txtRe, "DTSTART") && prop(txtCa, "SUMMARY") === prop(txtRe, "SUMMARY"), `${prop(txtRe || "", "SEQUENCE")} → ${prop(txtCa || "", "SEQUENCE")}`);
  // Los avisos internos del estudio quedan como estaban: sin adjunto.
  const internos = correos.slice(desdeRe).filter((c) => c.to.includes("hola@doppel.cl"));
  check(`${nombre} · los correos internos del estudio NO llevan .ics`, internos.length >= 2 && internos.every((c) => !c.attachments), `${internos.length} internos`);
}

// ═══ 1. Portal (schedule.js): dos correos del cliente ═══
{
  const dest = ["ana@cliente.cl", "beto@cliente.cl"];
  const desde = correos.length;
  const r = await schedule({ request: new Request(ORIGIN + "/api/portal/schedule", { method: "POST", headers: { "content-type": "application/json", "x-intake-secret": SECRETO }, body: JSON.stringify({ brand: "podfactory", projectName: "Mi Podcast", date: DIA1, start: "10:00", minutes: 60, name: "Ana Pérez", email: "ana@cliente.cl, beto@cliente.cl", sendEmail: true }) }), env });
  const j = await r.json();
  check("1. portal: agendar responde 200", r.status === 200 && j.ok === true, JSON.stringify(j));
  await ciclo("1. portal", j.token, "Podcast", dest, correoA(dest, desde));
}

// ═══ 2. Reserva manual (create-booking.js): un correo ═══
{
  const dest = ["carla@cliente.cl"];
  const desde = correos.length;
  const label = buildSlots(DIA1, config)[2].label;
  const r = await createBooking({ request: new Request(ORIGIN + "/api/admin/create-booking", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": ADMIN }, body: JSON.stringify({ date: DIA1, label, name: "Carla Soto", email: "carla@cliente.cl", phone: "+56911111111", tipo: "Podcast", personas: 2, deposit: 0, sendEmail: true }) }), env });
  const j = await r.json();
  check("2. manual: crear responde 200", r.status === 200 && j.ok === true, JSON.stringify(j));
  await ciclo("2. manual", j.token, "Podcast", dest, correoA(dest, desde));
}

// ═══ 3. Reserva web (confirm.js): visita y mini-piloto ═══
for (const tipo of ["visita", "minipiloto"]) {
  const dest = [`${tipo}@cliente.cl`];
  const slot = buildSlots(DIA1, configFor(config, tipo))[0];
  const desde = correos.length;
  const { token } = await confirmBooking(env, config, ORIGIN, { tipo, start: slot.start, end: slot.end, date: DIA1, label: slot.label, name: "Dani Rojas", email: dest[0], phone: "+56922222222", personas: 1, paid: tipo === "minipiloto" ? 35700 : 0, paymentId: "mp1" });
  await ciclo(`3. web ${tipo}`, token, tipo, dest, correoA(dest, desde));
}

// ═══ 4. Solicitud (solicitud.js): la invitación sale AL CONFIRMAR, no al pedirla ═══
for (const tipo of ["visita", "llamada"]) {
  const dest = [`${tipo}-sol@cliente.cl`];
  const slot = buildSlots(DIA1, configFor(config, tipo))[1];
  const desdeReq = correos.length;
  const { token } = await requestBooking(env, config, ORIGIN, { tipo, start: slot.start, end: slot.end, date: DIA1, label: slot.label, name: "Eli Muñoz", email: dest[0], phone: "+56933333333", personas: 1 });
  const recibida = correoA(dest, desdeReq);
  check(`4. solicitud ${tipo}: el correo «recibimos tu solicitud» NO lleva .ics (aún no está confirmada)`, !!recibida && !recibida.attachments);
  // Una solicitud pendiente que se cancela: el cliente nunca recibió invitación → tampoco se le manda CANCEL.
  if (tipo === "visita") {
    const copia = JSON.stringify(reserva(token));
    const d0 = correos.length;
    check("4. solicitud pendiente cancelada: 200", (await anular(token)) === 200);
    const aviso = correoA(dest, d0);
    check("4. solicitud pendiente cancelada: el aviso al cliente NO lleva .ics", !!aviso && !aviso.attachments);
    kv.set("booking:" + token, copia); // se restaura para seguir con la confirmación
  }
  avanzar();
  const desde = correos.length;
  await confirmarSolicitud(env, config, ORIGIN, reserva(token), tipo === "llamada" ? "https://meet.google.com/abc-defg-hij" : null);
  const mail = correoA(dest, desde);
  if (tipo === "llamada") check("4. solicitud llamada: location = link de Meet", !!mail && prop(decodificar(mail.attachments[0]), "LOCATION") === "https://meet.google.com/abc-defg-hij");
  await ciclo(`4. solicitud ${tipo}`, token, tipo, dest, mail);
}

// ═══ 5. Los recordatorios NO reenvían invitación ═══
// Justificación: la invitación ya está en el calendario del cliente (UID fijo); reenviarla en cada recordatorio sería ruido, y con un SEQUENCE
// nuevo volvería a pedirle respuesta/«agregar» a quien ya la tiene. Los reagendos y cancelaciones sí actualizan el evento (secciones 1-4).
{
  const src = fs.readFileSync(new URL("../functions/api/cron/reminders.js", import.meta.url), "utf8");
  check("5. reminders.js no genera ni adjunta .ics", !/icsAttachment|icsReserva|attachments/.test(src));
}

// ═══ 6. Piezas: plegado, escape, organizador, SEQUENCE ═══
{
  const larga = "Grabación de «Café con Ñandú — Edición especial» con acentos, comas; punto y coma, emojis 🎙️🎬 y una descripción bastante más larga que setenta y cinco octetos para obligar al plegado";
  const adj = icsAttachment({ uid: "tok", start: "2026-12-01T13:00:00.000Z", end: "2026-12-01T14:00:00.000Z", summary: larga, location: "Eduardo Marquina 3937, Oficina 906, Vitacura · Santiago", description: "Línea 1\nLínea 2; con \\ barra", env, to: "a@x.cl", name: "Ñandú, Pérez" });
  const txt = decodificar(adj);
  const fis = txt.split("\r\n");
  check("6a. plegado: ninguna línea supera 75 octetos aunque haya tildes y emojis", fis.every((l) => bytes(l) <= 75), fis.filter((l) => bytes(l) > 75).join("|"));
  check("6b. plegado: no parte caracteres multibyte (sin U+FFFD) y al desplegar queda el texto original escapado", !txt.includes("�") && prop(txt, "SUMMARY") === larga.replace(/([,;])/g, "\\$1"), prop(txt, "SUMMARY"));
  check("6c. escape de salto de línea, ; y \\ en DESCRIPTION", prop(txt, "DESCRIPTION") === "Línea 1\\nLínea 2\\; con \\\\ barra", prop(txt, "DESCRIPTION"));
  check("6d. CN con coma va entre comillas", desplegar(txt).includes('ATTENDEE;CN="Ñandú, Pérez";ROLE=REQ-PARTICIPANT'));
  check("6e. icsPlegar de una línea corta no la toca", icsPlegar("SUMMARY:hola") === "SUMMARY:hola");
  check("6f. fromEmail: «Nombre <a@b.cl>», dirección sola y valor ausente", fromEmail({ FROM_EMAIL: "Pod Factory <reservas@doppel.cl>" }) === "reservas@doppel.cl" && fromEmail({ FROM_EMAIL: "x@y.cl" }) === "x@y.cl" && fromEmail({}) === "reservas@podfactory.cl");
  const s1 = icsSequence(Date.UTC(2026, 10, 7)), s2 = icsSequence(Date.UTC(2026, 10, 7, 0, 0, 1)), s3 = icsSequence(Date.UTC(2037, 0, 1));
  check("6g. SEQUENCE: entero positivo, crece con el tiempo y cabe en 32 bits", s1 > 0 && s2 === s1 + 1 && s3 > s2 && s3 < 2 ** 31, `${s1} ${s2} ${s3}`);
  check("6h. sin `to`/`env` (uso antiguo) no revienta y no trae ATTENDEE", !decodificar(icsAttachment({ uid: "u", start: "2026-12-01T13:00:00Z", end: "2026-12-01T14:00:00Z", summary: "s", location: "l", description: "d" })).includes("ATTENDEE"));
}

const fallas = resultados.filter((x) => !x).length;
console.log(`\n${resultados.length - fallas}/${resultados.length} comprobaciones OK`);
console.log(fallas ? "HAY FALLAS" : "TODO OK");
process.exit(fallas ? 1 : 0);
