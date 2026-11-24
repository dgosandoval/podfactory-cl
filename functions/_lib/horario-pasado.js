// Decisión de /api/portal/schedule sobre un horario que ya pasó (24-nov-2026, pedido de Domingo: cargar desde el hub una grabación que ya ocurrió y no quedó anotada).
// Función PURA (sin red ni Date.now() propio: `ahora` entra como parámetro) para poder probarla sola (test/grabacion-pasada.test.mjs).
//
// Reglas:
//  · Un horario futuro no cambia nada: ok, no es «pasada» (con o sin la opción).
//  · Un horario que ya empezó (startMs <= ahora) se rechaza con el 400 de siempre («Ese horario ya pasó»), SALVO que:
//      - vaya con `vinculado` (el evento ya existe en el calendario del estudio: la hora es la real del evento, como siempre), o
//      - el hub pida `pasada: true` (booleano estricto: «true» como texto no vale), la marca sea Pod Factory y no pase de MAX_DIAS_ATRAS días atrás.
//    Que el endpoint solo se pueda llamar con el secreto del hub (x-intake-secret) ya lo valida schedule.js antes de llegar aquí: sin secreto ni se mira el cuerpo (403).
//  · Doppel (calendario propio de Domingo, vincular/adoptar) NO usa esto: `pasada` se ignora y sigue el 400.
//  · Con `pasada` el evento se crea igual en el calendario del estudio (queda de registro), pero NO se revisa disponibilidad (los choques con el pasado no importan: trátalo como
//    `forzar`), NO se manda correo ni invitación al cliente y la reserva nace sin recordatorios pendientes.
export const MAX_DIAS_ATRAS = 365;
export const MSG_YA_PASO = "Ese horario ya pasó";
export const MSG_MUY_ANTIGUA = `Esa fecha es demasiado antigua: una grabación pasada se puede cargar hasta ${MAX_DIAS_ATRAS} días atrás.`;

/** @returns {{ ok: true, pasada: boolean } | { ok: false, status: number, error: string }} */
export function decidirHorario({ startMs, ahora, pasadaPedida = false, vinculado = false, brand = "podfactory" }) {
  if (vinculado || startMs > ahora) return { ok: true, pasada: false };
  if (pasadaPedida !== true || brand !== "podfactory") return { ok: false, status: 400, error: MSG_YA_PASO };
  if (startMs < ahora - MAX_DIAS_ATRAS * 24 * 3600 * 1000) return { ok: false, status: 400, error: MSG_MUY_ANTIGUA };
  return { ok: true, pasada: true };
}
