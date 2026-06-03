// Envío de correos vía Resend (https://resend.com). Best-effort: si falla,
// el llamador debe ignorarlo para no romper la confirmación de la reserva.

export async function sendEmail(env, { to, subject, html, replyTo }) {
  if (!env.RESEND_API_KEY) return { skipped: "RESEND_API_KEY no configurada" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "Pod Factory <reservas@podfactory.cl>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo || env.STUDIO_EMAIL || undefined,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

// "miércoles 10 de junio · 13:00 hrs" a partir del instante UTC + zona horaria.
export function formatSession(startISO, timeZone) {
  const d = new Date(startISO);
  const fecha = new Intl.DateTimeFormat("es-CL", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(d);
  const hora = new Intl.DateTimeFormat("es-CL", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { fecha, hora };
}

const CLP = (n) => "$" + Number(n).toLocaleString("es-CL");

const shell = (inner) => `
<div style="background:#F5EBD6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0A0A0A">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:2px solid #0A0A0A">
    <div style="background:#0A0A0A;padding:18px 24px">
      <span style="color:#F5EBD6;font-size:18px;font-weight:800;letter-spacing:-0.02em">POD FACTORY</span>
      <span style="color:#F4B81C;font-size:11px;letter-spacing:0.15em;margin-left:8px">BY DOPPEL</span>
    </div>
    <div style="padding:28px 24px">${inner}</div>
    <div style="border-top:1px solid #0A0A0A22;padding:16px 24px;font-size:11px;color:#0A0A0A99">
      Pod Factory · Estudio de podcast · Eduardo Marquina 3937, Vitacura · Santiago
    </div>
  </div>
</div>`;

const row = (label, value) =>
  `<tr><td style="padding:6px 0;font-size:12px;color:#0A0A0A99;width:120px">${label}</td>
       <td style="padding:6px 0;font-size:14px;font-weight:700">${value}</td></tr>`;

// Correo al cliente
export function customerEmailHtml({ name, fecha, hora, deposit, address }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">¡Reserva confirmada! 🎙️</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, recibimos tu adelanto y tu sesión quedó agendada. Te esperamos:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Dirección", address)}
      ${row("Adelanto pagado", CLP(deposit))}
    </table>
    <p style="font-size:13px;line-height:1.5;color:#0A0A0Acc">
      El saldo se paga el día de la sesión. ¿Necesitas reagendar? Escríbenos con al menos
      24 horas de anticipación y lo movemos sin costo.
    </p>
    <p style="font-size:13px;margin-top:18px">Nos vemos pronto,<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo de aviso al estudio
export function studioEmailHtml({ name, email, phone, fecha, hora, deposit }) {
  return shell(`
    <div style="font-size:20px;font-weight:800;margin-bottom:6px">Nueva reserva ✅</div>
    <table style="width:100%;border-collapse:collapse;margin:14px 0">
      ${row("Cliente", name)}
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Email", email)}
      ${row("Teléfono", phone || "—")}
      ${row("Adelanto", CLP(deposit) + " (pagado)")}
    </table>
    <p style="font-size:12px;color:#0A0A0A99">Ya está en tu Google Calendar (agenda Pod Factory — Reservas).</p>
  `);
}
