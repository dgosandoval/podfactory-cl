// Envío de correos vía Resend (https://resend.com). Best-effort: si falla,
// el llamador debe ignorarlo para no romper la confirmación de la reserva.

export async function sendEmail(env, { to, subject, html, replyTo, attachments }) {
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
      attachments: attachments && attachments.length ? attachments : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

// Base64 (UTF-8) para adjuntos.
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Genera un .ics (iCalendar) para que el cliente agregue la sesión a su calendario.
const icsDate = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function icsAttachment({ uid, start, end, summary, location, description }) {
  const esc = (s) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pod Factory//Reservas//ES", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${uid}@podfactory.cl`, `DTSTAMP:${icsDate(start)}`,
    `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(summary)}`, `LOCATION:${esc(location)}`, `DESCRIPTION:${esc(description)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return { filename: "reserva-podfactory.ics", content: b64(ics) };
}

// Link wa.me con mensaje prellenado (o null si no hay número configurado).
export function whatsappLink(env, msg) {
  if (!env.WHATSAPP_PHONE) return null;
  return `https://wa.me/${env.WHATSAPP_PHONE}?text=${encodeURIComponent(msg || "")}`;
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
    <div style="background:#000000;padding:20px 24px;text-align:center">
      <img src="https://podfactory.cl/assets/podfactory-logo.png" alt="Pod Factory" height="48" style="display:inline-block;height:48px;width:auto">
    </div>
    <div style="padding:28px 24px">${inner}</div>
    <div style="border-top:1px solid #0A0A0A22;padding:20px 24px;font-size:11px;color:#0A0A0A99;text-align:center">
      <img src="https://podfactory.cl/assets/doppel-logo.png" alt="doppel" height="15" style="height:15px;width:auto;opacity:0.65"><br>
      <span style="display:inline-block;margin-top:8px">Pod Factory · Estudio de podcast · Eduardo Marquina 3937, Vitacura · Santiago</span>
    </div>
  </div>
</div>`;

const row = (label, value) =>
  `<tr><td style="padding:6px 0;font-size:12px;color:#0A0A0A99;width:120px">${label}</td>
       <td style="padding:6px 0;font-size:14px;font-weight:700">${value}</td></tr>`;

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#0A0A0A;color:#F5EBD6;text-decoration:none;
    padding:12px 22px;font-weight:700;font-size:14px;border-radius:2px">${label}</a>`;

// Botones "Cómo llegar" (Waze + Google Maps) a partir de la dirección.
// Quita la oficina para que el geocoding apunte bien al edificio.
const mapsBlock = (address) => {
  if (!address) return "";
  const q = encodeURIComponent(address.replace(/,?\s*Oficina[^,·]*/i, "").replace(/\s*·\s*/g, ", "));
  const waze = `https://waze.com/ul?q=${q}&navigate=yes`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${q}`;
  return `
    <div style="margin:-6px 0 6px">
      <span style="font-size:11px;color:#0A0A0A99;font-family:Arial,sans-serif">CÓMO LLEGAR:</span><br>
      <a href="${waze}" style="display:inline-block;background:#33ccff;color:#0A0A0A;text-decoration:none;padding:9px 16px;font-weight:700;font-size:13px;border-radius:4px;margin:6px 8px 0 0">Abrir en Waze</a>
      <a href="${gmaps}" style="display:inline-block;background:#ffffff;border:1.5px solid #0A0A0A;color:#0A0A0A;text-decoration:none;padding:8px 16px;font-weight:700;font-size:13px;border-radius:4px;margin-top:6px">Google Maps</a>
    </div>`;
};

const waLine = (whatsappUrl) => whatsappUrl ? `
    <div style="margin-top:16px">
      <p style="font-size:13px;color:#0A0A0Acc;line-height:1.5;margin:0 0 8px">¿Necesitas avisarnos algo?</p>
      <a href="${whatsappUrl}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:11px 20px;font-weight:700;font-size:14px;border-radius:4px">Escríbenos por WhatsApp</a>
    </div>` : "";

// Correo al cliente (confirmación)
export function customerEmailHtml({ name, fecha, hora, deposit, address, manageUrl, whatsappUrl }) {
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
    ${mapsBlock(address)}
    <p style="font-size:13px;line-height:1.5;color:#0A0A0Acc">
      El saldo se paga el día de la sesión. Te enviaremos un recordatorio 24 horas antes.
    </p>
    ${manageUrl ? `
    <div style="margin:18px 0">${button(manageUrl, "Reagendar o cancelar")}</div>
    <p style="font-size:12px;color:#0A0A0A99;line-height:1.5">
      Puedes reagendar o cancelar sin costo hasta <b>24 horas antes</b> de tu sesión.
      Pasado ese plazo, el adelanto no es reembolsable.
    </p>` : ""}
    ${waLine(whatsappUrl)}
    <p style="font-size:13px;margin-top:18px">Nos vemos pronto,<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo al cliente (reserva reagendada)
export function rescheduleEmailHtml({ name, fecha, hora, address, manageUrl }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">Reserva reagendada ✅</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, listo: movimos tu sesión. Tu adelanto sigue aplicado. Nueva cita:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Dirección", address)}
    </table>
    ${mapsBlock(address)}
    ${manageUrl ? `<div style="margin:18px 0">${button(manageUrl, "Ver mi reserva")}</div>` : ""}
    <p style="font-size:13px;margin-top:8px">Nos vemos,<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo al cliente (reserva cancelada)
export function cancelEmailHtml({ name, fecha, hora }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">Reserva cancelada</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, cancelamos tu sesión del <b>${fecha}</b> a las <b>${hora} hrs</b>.
      El horario quedó liberado.
    </p>
    <p style="font-size:13px;line-height:1.5;color:#0A0A0Acc">
      Cuando quieras, puedes reservar una nueva sesión desde nuestro sitio. ¡Te esperamos!
    </p>
    <p style="font-size:13px;margin-top:14px"><b>Equipo Pod Factory</b></p>
  `);
}

// Correo recordatorio (24 h antes)
export function reminderEmailHtml({ name, fecha, hora, address, manageUrl, whatsappUrl }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">Tu sesión es mañana 🎙️</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, te recordamos tu sesión en Pod Factory:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Dirección", address)}
    </table>
    ${mapsBlock(address)}
    <p style="font-size:13px;line-height:1.5;color:#0A0A0Acc">
      Llega unos minutos antes para el setup. Recuerda traer el saldo de la sesión.
    </p>
    ${manageUrl ? `<p style="font-size:12px;color:#0A0A0A99">¿Algo cambió? <a href="${manageUrl}">Gestiona tu reserva</a> (hasta 24 h antes).</p>` : ""}
    ${waLine(whatsappUrl)}
    <p style="font-size:13px;margin-top:8px">¡Nos vemos!<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo de aviso al estudio
export function studioEmailHtml({ name, email, phone, fecha, hora, deposit, tipo, personas, addons, comentarios }) {
  return shell(`
    <div style="font-size:20px;font-weight:800;margin-bottom:6px">Nueva reserva ✅</div>
    <table style="width:100%;border-collapse:collapse;margin:14px 0">
      ${row("Cliente", name)}
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Email", email)}
      ${row("Teléfono", phone || "—")}
      ${tipo ? row("Tipo", tipo) : ""}
      ${personas ? row("Personas", personas) : ""}
      ${addons && addons.length ? row("Adicionales", addons.join(", ")) : ""}
      ${comentarios ? row("Comentarios", comentarios) : ""}
      ${row("Adelanto", CLP(deposit) + " (pagado)")}
    </table>
    <p style="font-size:12px;color:#0A0A0A99">Ya está en tu Google Calendar (agenda Pod Factory — Reservas).</p>
  `);
}
