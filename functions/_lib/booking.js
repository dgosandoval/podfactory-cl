// Persistencia de reservas confirmadas en KV (binding HOLDS, reusado).
// Clave: booking:<token>. Guarda lo necesario para gestionar/recordar la reserva.

const KEY = (token) => `booking:${token}`;
const MODIFY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h

export function newToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function saveBooking(env, record) {
  if (!env.HOLDS) return;
  // TTL: hasta 7 días después de la sesión, para no acumular indefinidamente.
  const ttl = Math.max(60, Math.floor((Date.parse(record.start) - Date.now()) / 1000) + 7 * 24 * 3600);
  await env.HOLDS.put(KEY(record.token), JSON.stringify(record), { expirationTtl: ttl });
}

export async function getBooking(env, token) {
  if (!env.HOLDS || !token) return null;
  return env.HOLDS.get(KEY(token), "json");
}

export async function deleteBooking(env, token) {
  if (env.HOLDS) await env.HOLDS.delete(KEY(token));
}

export async function listBookings(env) {
  if (!env.HOLDS) return [];
  const out = [];
  let cursor;
  do {
    const page = await env.HOLDS.list({ prefix: "booking:", cursor });
    for (const k of page.keys) {
      const rec = await env.HOLDS.get(k.name, "json");
      if (rec) out.push(rec);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

// ¿Aún se puede modificar/cancelar? (al menos 24 h antes del inicio)
export function isModifiable(startISO, nowMs = Date.now()) {
  return Date.parse(startISO) - nowMs >= MODIFY_WINDOW_MS;
}

export function manageUrl(origin, token) {
  return `${origin}/reserva?id=${token}`;
}
