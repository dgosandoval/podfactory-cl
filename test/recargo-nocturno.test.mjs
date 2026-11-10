// Prueba del RECARGO POR HORARIO NOCTURNO en podfactory.cl (Domingo, 10-nov-2026): una grabación del estudio que EMPIEZA a las 19:00 o después cuesta $100.000 + IVA más.
// El precio lo cobra el hub (clientes.doppel.cl); aquí se prueba que la disponibilidad de grabaciones MARCA los inicios desde las 19:00 (18:30 no, 19:00 sí) y que los
// correos de confirmación y recordatorio de una grabación que empieza a las 19:00 lo avisan (y los de las 18:30 no). La visita, la reunión por Meet y el mini-piloto de la
// web NO llevan recargo (no son capítulos): también se comprueba.
// Corre el código REAL de functions/ (availability-range, availability, schedule, reminders por email.js) con Google y Resend SIMULADOS: no sale ninguna llamada de red.
// Uso:  node test/recargo-nocturno.test.mjs      → imprime OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import { onRequestGet as rango } from "../functions/api/availability-range.js";
import { onRequestGet as disp } from "../functions/api/availability.js";
import { onRequestPost as schedule } from "../functions/api/portal/schedule.js";
import { parseConfig, recParams, recSlots, esNocturno, RECARGO_NOCTURNO, TXT_RECARGO, weekday, addDaysStr, todayIn } from "../functions/_lib/slots.js";
import { horarioBlock, customerEmailHtml, reminder72EmailHtml } from "../functions/_lib/email.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };
const plano = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");

// ── Entorno simulado ──
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
const env = { RESEND_API_KEY: "k", GOOGLE_SA_KEY: JSON.stringify(SA), GOOGLE_CALENDAR_ID: "estudio@group.calendar.google.com", PORTAL_INTAKE_SECRET: SECRETO, TIMEZONE: "America/Santiago", HOLDS,
  FROM_EMAIL: "Pod Factory <reservas@doppel.cl>", STUDIO_EMAIL: "hola@doppel.cl", STUDIO_NOTIFY: "hola@doppel.cl" };
const config = parseConfig(env);
const correos = [];
let ev = 1;
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  if (url === "https://api.resend.com/emails") { correos.push(JSON.parse(init.body)); return json({ id: "r" + correos.length }); }
  if (url.endsWith("/calendar/v3/freeBusy")) { const id = JSON.parse(init.body).items[0].id; return json({ calendars: { [id]: { busy: [] } } }); }
  if (/\/calendars\/[^/]+\/events/.test(url)) { if (method === "POST") return json({ id: "ev" + ev++ }); return json({ id: "ev" }); }
  throw new Error("fetch no simulado: " + method + " " + url);
};
function diaHabil(desde) { let d = addDaysStr(todayIn(env.TIMEZONE), desde); while (!config.openDays.includes(weekday(d, env.TIMEZONE))) d = addDaysStr(d, 1); return d; }
const DIA = diaHabil(14);

// ═════ A. Funciones puras ═════
check("A1. 18:30 no es nocturno; 19:00 y 19:30 sí", !esNocturno("18:30") && esNocturno("19:00") && esNocturno("19:30") && !esNocturno("") && !esNocturno("tarde"));
check("A2. el recargo es $100.000 neto desde las 19:00 y el texto lo dice", RECARGO_NOCTURNO.neto === 100000 && RECARGO_NOCTURNO.desde === "19:00" && TXT_RECARGO === "Las grabaciones que empiezan a las 19:00 o después tienen un recargo de $100.000 + IVA.", TXT_RECARGO);

// ═════ B. Disponibilidad de grabaciones (recSlots y /api/availability-range?flex=1) ═════
const rp = recParams(env);
const s60 = recSlots(DIA, config, [], Date.now(), 60, rp).slots;
const l = (h) => s60.find((s) => s.label === h);
check("B1. grabación de 60 min: el inicio 18:30 NO trae recargo y el 19:00 SÍ ($100.000 neto)", !!l("18:30") && l("18:30").recargo === undefined && !!l("19:00") && l("19:00").recargo === 100000, JSON.stringify(s60.map((s) => [s.label, s.recargo])));
check("B2. los inicios de la mañana y la tarde no traen recargo; solo el 19:00 es nocturno (el 19:30 ya no cabe en 60 min: terminaría 20:30)", s60.filter((s) => s.recargo).map((s) => s.label).join() === "19:00" && !l("19:30"));
const s90 = recSlots(DIA, config, [], Date.now(), 90, rp).slots;
check("B3. con 90 min el último inicio es 18:30: ningún inicio lleva recargo", s90.length > 0 && s90.every((s) => s.recargo === undefined) && s90.at(-1).label === "18:30", s90.at(-1)?.label);
const req = (qs) => new Request(`https://podfactory.cl/api/availability-range?${qs}`);
let r = await rango({ request: req(`from=${DIA}&to=${DIA}&flex=1&minutos=60`), env });
let j = await r.json();
const d0 = j.days[0];
check("B4. /api/availability-range?flex=1 devuelve el recargo por inicio (19:00) y el bloque recargoNocturno { desde, neto }", r.status === 200 && j.recargoNocturno?.desde === "19:00" && j.recargoNocturno?.neto === 100000 && d0.slots.find((s) => s.label === "19:00")?.recargo === 100000 && d0.slots.find((s) => s.label === "18:30")?.recargo === undefined, JSON.stringify(j).slice(0, 200));
r = await rango({ request: req(`from=${DIA}&to=${DIA}`), env });
j = await r.json();
check("B5. sin flex (grilla fija de siempre) la respuesta NO cambia: sin recargo", r.status === 200 && j.recargoNocturno === undefined && j.days[0].slots.every((s) => s.recargo === undefined));
// La visita, la reunión por Meet y el mini-piloto de la web NO llevan recargo
for (const tipo of ["minipiloto", "visita", "llamada"]) {
  r = await disp({ request: new Request(`https://podfactory.cl/api/availability?date=${DIA}&tipo=${tipo}`), env });
  j = await r.json();
  const slots = j.slots || j.windows || [];
  check(`B6. ${tipo}: la disponibilidad de la web no trae recargo (no es un capítulo)`, r.status === 200 && JSON.stringify(j).includes("recargo") === false && slots.length > 0, JSON.stringify(j).slice(0, 150));
}

// ═════ C. Correos ═════
const bloque18 = plano(horarioBlock("18:30", "19:30", 60)), bloque19 = plano(horarioBlock("19:00", "20:00", 60));
check("C1. el recuadro de horario de una grabación a las 18:30 NO habla del recargo", !bloque18.includes("recargo"), bloque18);
check("C2. el de las 19:00 dice la regla completa y que esa grabación empieza a las 19:00", bloque19.includes(TXT_RECARGO) && bloque19.includes("Esta grabación empieza a las 19:00"), bloque19);
const mailConf = (hora, salida) => plano(customerEmailHtml({ name: "Ana", fecha: "lunes 1 de diciembre", hora, deposit: 0, address: "Eduardo Marquina 3937", salida, minutos: 60, deadline: "sábado 28 de noviembre 19:00", manageUrl: "https://x/g", whatsappUrl: "https://wa.me/1", tipo: "Podcast" }));
check("C3. confirmación a las 19:00: trae el recargo; la de las 18:30 no", mailConf("19:00", "20:00").includes(TXT_RECARGO) && !mailConf("18:30", "19:30").includes("recargo"));
const mailRec = (hora, salida) => plano(reminder72EmailHtml({ name: "Ana", fecha: "lunes 1 de diciembre", hora, deadline: "sábado 28 de noviembre 19:00", address: "Eduardo Marquina 3937", manageUrl: "https://x/g", whatsappUrl: "https://wa.me/1", salida, minutos: 60 }));
check("C4. recordatorio de 48 h a las 19:00: trae el recargo; el de las 18:30 no", mailRec("19:00", "20:00").includes(TXT_RECARGO) && !mailRec("18:30", "19:30").includes("recargo"));
// Por el flujo real: /api/portal/schedule agenda y manda la confirmación al cliente
const agendar = async (start) => {
  correos.length = 0;
  const res = await schedule({ request: new Request("https://podfactory.cl/api/portal/schedule", { method: "POST", headers: { "x-intake-secret": SECRETO, "content-type": "application/json" },
    body: JSON.stringify({ brand: "podfactory", projectName: "Prueba", date: DIA, start, minutes: 60, name: "Ana", email: "ana@example.com", sendEmail: true, compraId: "postpago", projectUrl: "https://clientes.podfactory.cl/reservar" }) }), env });
  return { status: res.status, html: plano(correos.find((c) => JSON.stringify(c.to) === JSON.stringify(["ana@example.com"]))?.html || "") };
};
const a18 = await agendar("17:30");
const a19 = await agendar("19:00");
check("C5. /api/portal/schedule a las 19:00: la confirmación al cliente trae el recargo", a19.status === 200 && a19.html.includes(TXT_RECARGO) && a19.html.includes("Esta grabación empieza a las 19:00"), a19.html.slice(0, 200));
check("C6. y a las 17:30 la confirmación NO lo trae", a18.status === 200 && a18.html.length > 0 && !a18.html.includes("recargo"), a18.html.slice(0, 200));

const fallas = resultados.filter((x) => !x).length;
console.log(fallas === 0 ? `\nTODO OK (${resultados.length} comprobaciones)` : `\nHAY FALLAS: ${fallas}`);
process.exit(fallas === 0 ? 0 : 1);
