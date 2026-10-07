// POST /api/portal/checkout  (header x-intake-secret == PORTAL_INTAKE_SECRET)
// Crea el pago de MercadoPago de una compra de capítulos hecha en el portal del hub, o de una factura
// (link "Pagar con MercadoPago" del correo de la factura). El token de MercadoPago vive solo aquí;
// el hub manda el monto y a dónde volver.
// external_reference = "hubcompra:<compraId>:<cuota>" o "hubfactura:<facturaId>" → mp-webhook se lo avisa al hub.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.PORTAL_INTAKE_SECRET || request.headers.get("x-intake-secret") !== env.PORTAL_INTAKE_SECRET) return json({ error: "forbidden" }, 403);
  if (!env.MP_ACCESS_TOKEN) return json({ error: "MercadoPago no está configurado" }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const compraId = parseInt(b.compraId, 10), cuota = parseInt(b.cuota, 10), facturaId = parseInt(b.facturaId, 10), monto = parseInt(b.monto, 10);
  const volver = String(b.volver || "");
  if (!((compraId && cuota) || facturaId) || !(monto > 0) || !/^https:\/\/clientes\.(doppel|podfactory)\.cl\//.test(volver)) return json({ error: "datos inválidos" }, 400);
  const sep = volver.includes("?") ? "&" : "?";
  const origin = new URL(request.url).origin;
  const pref = {
    items: [{ title: String(b.titulo || "Capítulos Pod Factory").slice(0, 120), description: "IVA incluido.", quantity: 1, currency_id: "CLP", unit_price: monto }],
    payer: { email: String(b.email || "") || undefined },
    external_reference: facturaId ? `hubfactura:${facturaId}` : `hubcompra:${compraId}:${cuota}`,
    back_urls: { success: `${volver}${sep}mp=ok`, failure: `${volver}${sep}mp=error`, pending: `${volver}${sep}mp=pendiente` },
    auto_return: "approved",
    notification_url: `${origin}/api/mp-webhook`,
    statement_descriptor: "POD FACTORY",
  };
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(pref),
  });
  if (!res.ok) return json({ error: "No se pudo iniciar el pago", detail: (await res.text()).slice(0, 300) }, 502);
  const out = await res.json();
  return json({ init_point: out.init_point, preference_id: out.id });
}
