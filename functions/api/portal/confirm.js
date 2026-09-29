// POST /api/portal/confirm  (header x-intake-secret == PORTAL_INTAKE_SECRET)  { ref, via }
// Confirma la asistencia a una grabación desde el hub (ej. el cliente respondió por WhatsApp
// "Confirmo mi grabación … (reserva abc123)"). ref = token completo o sus primeros 6 caracteres.
import { listBookings, saveBooking } from "../../_lib/booking.js";

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.PORTAL_INTAKE_SECRET || request.headers.get("x-intake-secret") !== env.PORTAL_INTAKE_SECRET) return json({ error: "forbidden" }, 403);
  let b;
  try { b = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const ref = String(b.ref || "").toLowerCase().replace(/[^a-f0-9]/g, "");
  if (ref.length < 6) return json({ error: "ref inválida" }, 400);
  const hits = (await listBookings(env)).filter((x) => String(x.token).startsWith(ref) && Date.parse(x.start) > Date.now());
  if (hits.length !== 1) return json({ error: hits.length ? "ref ambigua" : "no encontrada" }, 404);
  const r = hits[0];
  if (!r.confirmedAt) await saveBooking(env, { ...r, confirmedAt: new Date().toISOString(), confirmedVia: String(b.via || "whatsapp").slice(0, 20) });
  return json({ ok: true, start: r.start, name: r.name });
}
