// Prueba del HORARIO de grabación que podfactory.cl lee del hub (functions/_lib/horario.js, JSON público de clientes.doppel.cl/api/public/horario).
// Comprueba: (1) sin lectura del hub rige lo de siempre (10:00-20:00; o REC_HOURS si existe); (2) con el hub, recParams y las horas ofrecidas siguen su apertura y cierre;
// (3) un horario inválido del hub se ignora; (4) si el hub deja de responder se conserva el último bueno; (5) caché de 60 s; (6) el endpoint /api/tarifas dice de dónde salió.
// Corre el código REAL de functions/ con el hub SIMULADO (sin red). Uso: node test/horario.test.mjs → termina en "TODO OK" (exit 0) o "HAY FALLAS" (exit 1).
import { cargarHorario, reiniciarHorario, horarioVivo, origenHorario, horarioValido, TTL_HORARIO_MS, URL_HORARIO, HORARIO_RESPALDO } from "../functions/_lib/horario.js";
import { recParams, recSlots, parseConfig } from "../functions/_lib/slots.js";
import { onRequestGet as verTarifas } from "../functions/api/tarifas.js";

const resultados = [];
const check = (nombre, ok, detalle = "") => { resultados.push(!!ok); console.log(`${ok ? "OK   " : "FALLA"} ${nombre}${!ok && detalle ? "  → " + detalle : ""}`); };
const logs = []; const log0 = console.log; console.log = (...a) => { const t = a.map(String).join(" "); if (/^horario:/.test(t)) logs.push(t); else log0(...a); };

let llamadas = 0, respuesta = { status: 200, json: { esquema: 1, zona: "America/Santiago", dias_abiertos: [1, 2, 3, 4, 5], desde: "10:00", hasta: "20:00", origen: "original" } }, urls = [];
const fetchFn = async (url) => { llamadas++; urls.push(String(url)); if (respuesta.caida) throw new Error("sin red"); return { ok: respuesta.status === 200, status: respuesta.status, json: async () => respuesta.json }; };
const config = parseConfig({ TIMEZONE: "America/Santiago" });
const horas = (rs) => rs.slots.map((s) => s.label);
const lunes = "2026-12-07", ahora = Date.parse("2026-12-01T12:00:00Z");

// 1. Sin lectura del hub
reiniciarHorario();
check("1a. sin lectura del hub no hay horario vivo y el origen es «respaldo»", horarioVivo() === null && origenHorario() === "respaldo");
let rp = recParams({});
check("1b. recParams sin hub ni REC_HOURS = 10:00 a 20:00 (600 a 1200 min), paso 30 y margen 30, como siempre", rp.open === 600 && rp.close === 1200 && rp.step === 30 && rp.margen === 30 && HORARIO_RESPALDO === "10:00-20:00", JSON.stringify(rp));
rp = recParams({ REC_HOURS: "09:00-18:00" });
check("1c. sin hub, la variable REC_HOURS sigue mandando", rp.open === 540 && rp.close === 1080);
let rs = recSlots(lunes, config, [], ahora, 60, recParams({}));
check("1d. las horas ofrecidas de un lunes (60 min) van de las 10:00 a las 19:00, la última grabación termina a las 20:00", horas(rs)[0] === "10:00" && horas(rs).at(-1) === "19:00" && rs.slots.length === 19, horas(rs).join());

// 2. Con el hub
reiniciarHorario();
await cargarHorario({}, { fetchFn, ahora, forzar: true });
check("2a. lee la URL pública del hub", urls[0] === URL_HORARIO && URL_HORARIO === "https://clientes.doppel.cl/api/public/horario", urls[0]);
check("2b. con el horario de siempre del hub, todo da lo mismo que sin hub (10:00-20:00, origen «hub»)", horarioVivo() === "10:00-20:00" && origenHorario() === "hub" && JSON.stringify(recParams({})) === JSON.stringify({ open: 600, close: 1200, step: 30, margen: 30 }));
respuesta = { status: 200, json: { esquema: 1, desde: "09:00", hasta: "21:00", origen: "ajuste" } };
await cargarHorario({}, { fetchFn, ahora, forzar: true });
rp = recParams({ REC_HOURS: "10:00-20:00" });
check("2c. si el equipo cambia el horario en el hub (9 a 21), recParams lo sigue aunque REC_HOURS diga otra cosa", rp.open === 540 && rp.close === 1260, JSON.stringify(rp));
rs = recSlots(lunes, config, [], ahora, 60, rp);
check("2d. las horas ofrecidas pasan a 09:00–20:00 (última grabación termina a las 21:00)", horas(rs)[0] === "09:00" && horas(rs).at(-1) === "20:00" && rs.slots.length === 23, horas(rs).join());

// 3. JSON inválido
respuesta = { status: 200, json: { desde: "22:00", hasta: "08:00" } };
check("3a. horarioValido rechaza cierre anterior a la apertura, horas mal escritas y vacío", !horarioValido({ desde: "22:00", hasta: "08:00" }) && !horarioValido({ desde: "9", hasta: "20:00" }) && !horarioValido(null) && !horarioValido({}) && horarioValido({ desde: "10:00", hasta: "20:00" }));
await cargarHorario({}, { fetchFn, ahora, forzar: true });
check("3b. un horario inválido del hub se ignora: queda el último bueno (09:00-21:00) y se avisa en el log", horarioVivo() === "09:00-21:00" && logs.some((l) => /no trae un horario válido/.test(l)), logs.join(" | "));

// 4. El hub cae
respuesta = { caida: true };
await cargarHorario({}, { fetchFn, ahora, forzar: true });
check("4a. si el hub no responde se conserva el último horario bueno y queda en el log", horarioVivo() === "09:00-21:00" && logs.some((l) => /sin red/.test(l) && /09:00-21:00/.test(l)), logs.join(" | "));
respuesta = { status: 500 };
await cargarHorario({}, { fetchFn, ahora: ahora + 20_000 });
check("4b. un HTTP 500 tampoco lo cambia", horarioVivo() === "09:00-21:00");
reiniciarHorario(); respuesta = { caida: true };
await cargarHorario({ REC_HOURS: "10:00-19:00" }, { fetchFn, ahora, forzar: true });
check("4c. si el hub nunca respondió, rige REC_HOURS (y el log lo dice)", horarioVivo() === null && recParams({ REC_HOURS: "10:00-19:00" }).close === 1140 && logs.some((l) => /10:00-19:00/.test(l)));

// 5. Caché
reiniciarHorario(); llamadas = 0; respuesta = { status: 200, json: { desde: "10:00", hasta: "20:00" } };
await cargarHorario({}, { fetchFn, ahora }); await cargarHorario({}, { fetchFn, ahora: ahora + TTL_HORARIO_MS - 5000 });
const antes = llamadas;
await cargarHorario({}, { fetchFn, ahora: ahora + TTL_HORARIO_MS + 5000 });
check("5. caché de 60 s: la segunda lectura dentro del plazo no consulta; pasado el plazo sí", antes === 1 && llamadas === 2, `antes=${antes} despues=${llamadas}`);

// 6. Endpoint /api/tarifas
const j = await (await verTarifas({ env: {} })).json();
check("6. /api/tarifas informa el horario de grabación que rige y su origen", j.horario_grabacion?.desde === "10:00" && j.horario_grabacion?.hasta === "20:00" && j.horario_grabacion?.origen === "hub", JSON.stringify(j.horario_grabacion));

console.log = log0;
const fallas = resultados.filter((x) => !x).length;
console.log(fallas ? `\nHAY FALLAS (${fallas})` : `\nTODO OK (${resultados.length} comprobaciones)`);
process.exit(fallas ? 1 : 0);
