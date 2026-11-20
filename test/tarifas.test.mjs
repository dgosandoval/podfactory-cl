// Prueba de las TARIFAS que podfactory.cl lee del hub (functions/_lib/tarifas.js, JSON público de clientes.doppel.cl/api/public/tarifas).
// Comprueba: (1) con los valores de respaldo todo da EXACTAMENTE lo de siempre (mini-piloto $35.700, recargo $100.000 desde las 19:00, 36 horas, textos de los correos);
// (2) cuando el hub publica otra tarifa, el cobro de MercadoPago, la disponibilidad, la ventana de cambio, el recargo y los correos la siguen; (3) si el hub no responde se usa la última
// versión buena guardada en KV y, si no hay, el respaldo, siempre dejándolo en el log; (4) un JSON mal formado del hub se ignora.
// Corre el código REAL de functions/ con Google, MercadoPago, Resend y el hub SIMULADOS: no sale ninguna llamada de red.
// Uso:  node test/tarifas.test.mjs      → OK/FALLA por comprobación y termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import crypto from "node:crypto";
import { onRequestGet as rango } from "../functions/api/availability-range.js";
import { onRequestPost as reservar } from "../functions/api/reserve.js";
import { onRequest as middleware } from "../functions/api/_middleware.js";
import { onRequestPost as cancelar } from "../functions/api/cancel.js";
import { parseConfig, recParams, recSlots, esNocturno, RECARGO_NOCTURNO, TXT_RECARGO, SERVICES, buildSlots, weekday, addDaysStr, todayIn } from "../functions/_lib/slots.js";
import { isModifiable, saveBooking } from "../functions/_lib/booking.js";
import { horarioBlock, customerEmailHtml, reminder72EmailHtml, deadlineDe } from "../functions/_lib/email.js";
import { cargarTarifas, reiniciarTarifas, tarifaActual, TARIFAS_DEFECTO, tarifasValidas, URL_TARIFAS, TTL_TARIFAS_MS } from "../functions/_lib/tarifas.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };
const plano = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");
const logs = [];
const log0 = console.log; console.log = (...a) => { const t = a.map(String).join(" "); if (/^tarifas:/.test(t)) logs.push(t); else log0(...a); };

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
const env = { RESEND_API_KEY: "k", GOOGLE_SA_KEY: JSON.stringify(SA), GOOGLE_CALENDAR_ID: "estudio@group.calendar.google.com", PORTAL_INTAKE_SECRET: "s", TIMEZONE: "America/Santiago", HOLDS, MP_ACCESS_TOKEN: "mp-test",
  FROM_EMAIL: "Pod Factory <reservas@doppel.cl>", STUDIO_EMAIL: "hola@doppel.cl", STUDIO_NOTIFY: "hola@doppel.cl", SITE_URL: "https://podfactory.cl/" };
const config = parseConfig(env);

// El hub simulado: lo que devuelva `hub.respuesta`. `hub.llamadas` cuenta las consultas.
const NUEVA = {
  esquema: 1, moneda: "CLP", iva: 0.19, version: 7, vigente_desde: "2026-12-01T03:00:00Z", origen: "d1",
  mini_piloto: { neto: 32000, bruto: 38080 },
  recargo_nocturno: { desde: "18:30", neto: 120000, bruto: 142800 },
  tiempo_extra: { minutos: 30, neto: 110000, bruto: 130900 },
  ronda_cambios_extra: { neto: 55000, bruto: 65450 },
  cambio_sin_costo_horas: 48,
  locacion: { desde_neto: 990000, desde_bruto: 1178100, regiones_extra_neto: 260000 },
};
const hub = { respuesta: () => new Response(JSON.stringify(NUEVA), { status: 200, headers: { "content-type": "application/json" } }), llamadas: 0 };
const mp = { preferencias: [] };
const correos = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = (init.method || "GET").toUpperCase();
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url === URL_TARIFAS) { hub.llamadas++; return hub.respuesta(); }
  if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "tok" });
  if (url === "https://api.resend.com/emails") { correos.push(JSON.parse(init.body)); return json({ id: "r" + correos.length }); }
  if (url === "https://api.mercadopago.com/checkout/preferences") { mp.preferencias.push(JSON.parse(init.body)); return json({ init_point: "https://mp.example/pagar", id: "pref1" }); }
  if (url.endsWith("/calendar/v3/freeBusy")) { const id = JSON.parse(init.body).items[0].id; return json({ calendars: { [id]: { busy: [] } } }); }
  if (/\/calendars\/[^/]+\/events/.test(url)) return json({ id: "ev1" });
  throw new Error("fetch no simulado: " + method + " " + url);
};
function diaHabil(desde) { let d = addDaysStr(todayIn(env.TIMEZONE), desde); while (!config.openDays.includes(weekday(d, env.TIMEZONE))) d = addDaysStr(d, 1); return d; }
const DIA = diaHabil(14);
const pagar = async () => {
  const cfg = { ...config, slotMinutes: 30, slotStarts: config.shortStarts };
  const slot = buildSlots(DIA, cfg)[0];
  const r = await reservar({ request: new Request("https://podfactory.cl/api/reserve", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ tipo: "minipiloto", date: DIA, start: slot.start, label: slot.label, name: "Ana Prueba", email: "ana@example.com", phone: "+56911112222", acepta: true }) }), env });
  return { status: r.status, j: await r.json() };
};

// ═════ 1. Con los valores de respaldo todo es EXACTAMENTE lo de siempre ═════
reiniciarTarifas();
check("1a. respaldo: mini-piloto $30.000 neto → $35.700 con IVA (lo que se cobra), recargo $100.000 desde las 19:00, 36 horas", SERVICES.minipiloto.price === 35700 && SERVICES.minipiloto.net === 30000 && RECARGO_NOCTURNO.neto === 100000 && RECARGO_NOCTURNO.desde === "19:00" && tarifaActual().cambio_sin_costo_horas === 36);
check("1b. respaldo: el texto del recargo es el de siempre", TXT_RECARGO === "Las grabaciones que empiezan a las 19:00 o después tienen un recargo de $100.000 + IVA.", TXT_RECARGO);
check("1c. respaldo: 18:30 no es nocturno; 19:00 y 19:30 sí", !esNocturno("18:30") && esNocturno("19:00") && esNocturno("19:30") && !esNocturno("") && !esNocturno("tarde"));
const ahora = Date.now(), H = 3600 * 1000;
check("1d. respaldo: se puede cambiar con 36 h justas, no con 35 h 59 min", isModifiable(new Date(ahora + 36 * H).toISOString(), ahora) && !isModifiable(new Date(ahora + 36 * H - 60000).toISOString(), ahora));
const mailBase = (hora, salida) => plano(customerEmailHtml({ name: "Ana", fecha: "lunes 1 de diciembre", hora, deposit: 0, address: "Eduardo Marquina 3937", salida, minutos: 60, deadline: "sábado 28 de noviembre a las 07:00 hrs", conditionsUrl: "https://podfactory.cl/condiciones.pdf", manageUrl: "https://clientes.podfactory.cl/reservar", tipo: "podcast", esGrabacion: true }));
const mBase = mailBase("19:00", "20:00");
check("1e. respaldo, correo de confirmación de una grabación: «cada 30 minutos extra cuesta $100.000 + IVA», «36 horas antes», y el recargo", /cada 30 minutos extra cuesta \$100\.000 \+ IVA/.test(mBase) && /\(36 horas antes\)/.test(mBase) && mBase.includes(TXT_RECARGO), mBase.slice(0, 900));
const mMini = plano(customerEmailHtml({ name: "Ana", fecha: "lunes 1 de diciembre", hora: "10:00", deposit: 35700, address: "x", tipo: "minipiloto" }));
check("1f. respaldo, correo del mini-piloto: «Pagado $35.700» y «los $30.000 del mini-piloto se descuentan»", /Pagado \$35\.700/.test(mMini) && /los \$30\.000 del mini-piloto se descuentan/.test(mMini), mMini.slice(0, 500));
const mRec = plano(reminder72EmailHtml({ name: "Ana", fecha: "lunes 1 de diciembre", hora: "10:00", deadline: "x", address: "x", minutos: 60 }));
check("1g. respaldo, recordatorio de 48 h: «Tienes 12 horas»", /Tienes 12 horas/.test(mRec), mRec.slice(0, 300));
check("1h. respaldo: el plazo para cambiar se calcula 36 h antes del inicio", deadlineDe("2026-12-10T15:00:00.000Z", "America/Santiago") === deadlineDe(new Date(Date.parse("2026-12-10T15:00:00.000Z")).toISOString(), "America/Santiago") && /9 de diciembre a las 0[0-9]:00 hrs/.test(deadlineDe("2026-12-10T15:00:00.000Z", "America/Santiago")), deadlineDe("2026-12-10T15:00:00.000Z", "America/Santiago"));
const r0 = await pagar();
check("1i. respaldo: la preferencia de MercadoPago cobra $35.700 (lo mismo que antes)", r0.status === 200 && mp.preferencias.at(-1)?.items[0].unit_price === 35700, JSON.stringify(r0));

// ═════ 2. El hub publica otra tarifa ═════
check("2a. un JSON del hub con la forma esperada es válido; uno sin mini-piloto, con horas fuera de rango o sin hora de recargo no", tarifasValidas(NUEVA) && !tarifasValidas({ ...NUEVA, mini_piloto: undefined }) && !tarifasValidas({ ...NUEVA, cambio_sin_costo_horas: 0 }) && !tarifasValidas({ ...NUEVA, recargo_nocturno: { neto: 1, desde: "7pm" } }) && !tarifasValidas(null) && !tarifasValidas({ ...NUEVA, mini_piloto: { neto: -5, bruto: 10 } }));
logs.length = 0;
await cargarTarifas(env, { forzar: true });
check("2b. cargarTarifas lee el hub (origen «hub») y deja aplicados los valores nuevos", tarifaActual().origen === "hub" && SERVICES.minipiloto.price === 38080 && SERVICES.minipiloto.net === 32000 && RECARGO_NOCTURNO.neto === 120000 && RECARGO_NOCTURNO.desde === "18:30" && tarifaActual().cambio_sin_costo_horas === 48 && hub.llamadas === 1 && logs.length === 0, JSON.stringify(logs));
check("2c. el recargo nocturno empieza a la hora nueva: 18:30 sí, 18:00 no; el texto dice $120.000 y las 18:30", esNocturno("18:30") && !esNocturno("18:00") && esNocturno("19:00") && TXT_RECARGO === "Las grabaciones que empiezan a las 18:30 o después tienen un recargo de $120.000 + IVA.", TXT_RECARGO);
check("2d. la ventana de cambio es de 48 h: con 40 h ya no se puede cambiar; con 48 h sí", !isModifiable(new Date(ahora + 40 * H).toISOString(), ahora) && isModifiable(new Date(ahora + 48 * H).toISOString(), ahora));
for (const k of [...kv.keys()]) if (k.startsWith("hold:")) kv.delete(k);   // el hold de la prueba 1i sigue vivo: se limpia para poder reservar el mismo bloque
const rNueva = await pagar();
check("2e. MercadoPago cobra el valor nuevo: $38.080 con IVA (mini-piloto $32.000 + IVA), y el hold guarda el mismo monto", rNueva.status === 200 && mp.preferencias.at(-1)?.items[0].unit_price === 38080 && [...kv.entries()].filter(([k]) => k.startsWith("hold:")).every(([, v]) => JSON.parse(v).amount === 38080), JSON.stringify(rNueva));
const mNueva = mailBase("18:30", "19:30");
check("2f. correo de confirmación con la tarifa nueva: «cada 30 minutos extra cuesta $110.000 + IVA», «(48 horas antes)», recargo $120.000 desde las 18:30; ningún valor viejo", /cada 30 minutos extra cuesta \$110\.000 \+ IVA/.test(mNueva) && /\(48 horas antes\)/.test(mNueva) && /recargo de \$120\.000 \+ IVA/.test(mNueva) && /18:30 o después/.test(mNueva) && !/36 horas/.test(mNueva) && !/\$100\.000/.test(mNueva), mNueva.slice(0, 900));
const mMini2 = plano(customerEmailHtml({ name: "Ana", fecha: "lunes 1 de diciembre", hora: "10:00", deposit: 38080, address: "x", tipo: "minipiloto" }));
check("2g. correo del mini-piloto: «los $32.000 del mini-piloto se descuentan»", /los \$32\.000 del mini-piloto se descuentan/.test(mMini2) && !/\$30\.000/.test(mMini2), mMini2.slice(0, 400));
const mRec2 = plano(reminder72EmailHtml({ name: "Ana", fecha: "lunes 1 de diciembre", hora: "10:00", deadline: "x", address: "x", minutos: 60 }));
check("2h. recordatorio de 48 h con ventana de 48 h: ya no quedan horas de plazo y el texto lo dice (no «Tienes 0 horas» ni un número negativo)", /El plazo para cambiar la fecha o cancelar sin costo ya venció/.test(mRec2) && !/Tienes/.test(mRec2), mRec2.slice(0, 300));
const bloque = plano(horarioBlock("18:30", "19:30", 60));
check("2i. el recuadro de horario de las 18:30 ahora SÍ trae el recargo (la hora nueva) y dice «empieza a las 18:30»", bloque.includes(TXT_RECARGO) && bloque.includes("Esta grabación empieza a las 18:30"), bloque);
const cfg = parseConfig(env);
const rr = await rango({ request: new Request(`https://podfactory.cl/api/availability-range?from=${DIA}&to=${DIA}&flex=1&minutos=60`), env });
const jr = await rr.json();
check("2j. /api/availability-range?flex=1 informa el recargo nuevo ({ desde: 18:30, neto: 120000 }) y marca los inicios desde las 18:30", rr.status === 200 && jr.recargoNocturno?.desde === "18:30" && jr.recargoNocturno?.neto === 120000 && jr.days[0].slots.filter((s) => s.recargo).every((s) => s.recargo === 120000) && jr.days[0].slots.find((s) => s.label === "18:30")?.recargo === 120000 && jr.days[0].slots.find((s) => s.label === "18:00")?.recargo === undefined, JSON.stringify(jr).slice(0, 400));

// ═════ 3. Caché, middleware y caídas del hub ═════
const antes = hub.llamadas;
await cargarTarifas(env); await cargarTarifas(env, { ahora: Date.now() + TTL_TARIFAS_MS - 5000 });
check("3a. caché de 60 s: dos lecturas seguidas no consultan al hub", hub.llamadas === antes);
await cargarTarifas(env, { ahora: Date.now() + TTL_TARIFAS_MS + 5000 });
check("3b. pasado el TTL vuelve a consultar", hub.llamadas === antes + 1);
reiniciarTarifas(); hub.llamadas = 0;
let siguio = false;
await middleware({ request: new Request("https://podfactory.cl/api/availability", { headers: { origin: "https://podfactory.cl" } }), next: async () => { siguio = true; return new Response("ok"); }, env });
check("3c. el middleware de /api/* carga las tarifas del hub antes de atender", siguio && hub.llamadas === 1 && SERVICES.minipiloto.price === 38080);
check("3d. la última versión buena quedó guardada en KV (tarifas:ultima, versión 7)", JSON.parse(kv.get("tarifas:ultima") || "{}").version === 7);
const opt = await middleware({ request: new Request("https://podfactory.cl/api/availability", { method: "OPTIONS", headers: { origin: "https://podfactory.cl" } }), next: async () => new Response("no"), env });
check("3e. el preflight CORS de siempre sigue respondiendo sin tocar el hub", opt.status === 204 && hub.llamadas === 1);
// hub caído: se usa la última versión buena de KV
reiniciarTarifas(); logs.length = 0;
hub.respuesta = () => new Response("caído", { status: 503 });
await cargarTarifas(env, { forzar: true });
check("3f. hub caído (503) y esta instancia recién arrancó: usa la última versión BUENA guardada en KV (mini-piloto $38.080, recargo 18:30) y lo deja en el log", tarifaActual().origen === "ultima-guardada" && SERVICES.minipiloto.price === 38080 && RECARGO_NOCTURNO.desde === "18:30" && logs.some((l) => /el hub no respondió/.test(l) && /KV/.test(l)), JSON.stringify(logs));
// sin KV: el respaldo
reiniciarTarifas(); logs.length = 0;
await cargarTarifas({ ...env, HOLDS: undefined }, { forzar: true });
check("3g. hub caído y sin KV: usa los valores de respaldo (mini-piloto $35.700, recargo $100.000, 36 h) y lo deja en el log", tarifaActual().origen === "respaldo" && SERVICES.minipiloto.price === 35700 && RECARGO_NOCTURNO.neto === 100000 && tarifaActual().cambio_sin_costo_horas === 36 && logs.some((l) => /valores de respaldo/.test(l)), JSON.stringify(logs));
// JSON mal formado
reiniciarTarifas(); logs.length = 0; kv.delete("tarifas:ultima");
hub.respuesta = () => new Response(JSON.stringify({ ...NUEVA, mini_piloto: { neto: "mucho", bruto: 1 } }), { status: 200 });
await cargarTarifas({ ...env, HOLDS: undefined }, { forzar: true });
check("3h. un JSON del hub mal formado se IGNORA (no se cobra un monto absurdo): sigue el respaldo y se avisa en el log", SERVICES.minipiloto.price === 35700 && logs.some((l) => /forma esperada/.test(l)), JSON.stringify(logs));
// hub caído DESPUÉS de haber leído: se conserva la última del hub de esta instancia
reiniciarTarifas(); hub.respuesta = () => new Response(JSON.stringify(NUEVA), { status: 200 });
await cargarTarifas(env, { forzar: true });
hub.respuesta = () => { throw new Error("red caída"); }; logs.length = 0;
await cargarTarifas(env, { forzar: true });
check("3i. si el hub se cae después de haberlo leído, esta instancia conserva SU última lectura (no vuelve a los valores viejos) y avisa en el log", tarifaActual().origen === "hub" && SERVICES.minipiloto.price === 38080 && logs.some((l) => /la última del hub/.test(l)), JSON.stringify(logs));
// cancelar con ventana nueva
hub.respuesta = () => new Response(JSON.stringify(NUEVA), { status: 200 });
reiniciarTarifas(); await cargarTarifas(env, { forzar: true });
const token = "t".repeat(32);
await saveBooking(env, { token, tipo: "podcast", brand: "podfactory", start: new Date(Date.now() + 40 * H).toISOString(), end: new Date(Date.now() + 41 * H).toISOString(), name: "Ana", email: "ana@example.com", eventId: "ev1" });
const rc = await cancelar({ request: new Request("https://podfactory.cl/api/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: token, notify: false }) }), env });
const jc = await rc.json();
check("3j. con la ventana de 48 h, cancelar una reserva a 40 h se rechaza y el mensaje dice «menos de 48 horas»", rc.status === 409 && /menos de 48 horas/.test(jc.error || ""), JSON.stringify(jc));

console.log = log0;
const fallas = resultados.filter((x) => !x).length;
console.log(fallas === 0 ? `\nTODO OK (${resultados.length} comprobaciones)` : `\nHAY FALLAS: ${fallas}`);
process.exit(fallas === 0 ? 0 : 1);
