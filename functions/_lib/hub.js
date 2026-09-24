// Lead al CRM del hub (clientes.doppel.cl/api/intake/lead). Lo usan el formulario de la
// landing (/api/lead) y las reservas (visita / mini-piloto).
// Envía el lead al hub (CRM). Best-effort: si el hub falla, el lead igual quedó en KV.
export async function toHub(env, payload) {
  if (!env.HUB_LEAD_URL || !env.PORTAL_INTAKE_SECRET) { console.log("hub lead: falta HUB_LEAD_URL o secreto"); return null; }
  try {
    const r = await fetch(env.HUB_LEAD_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-intake-secret": env.PORTAL_INTAKE_SECRET },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) console.log("hub lead non-ok:", r.status, JSON.stringify(j));
    return r.ok ? j : null;
  } catch (e) { console.log("hub lead error:", String(e)); return null; }
}

