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
      <a href="https://podfactory.cl" style="display:inline-block;margin-top:8px;color:#1F3FA3;font-weight:700;text-decoration:none">podfactory.cl</a><br>
      <span style="display:inline-block;margin-top:4px">Pod Factory · Estudio de podcast · Eduardo Marquina 3937, Vitacura · Santiago</span>
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

// Reglas del día de grabación (se repiten en confirmación y recordatorios).
const guideBlock = (conditionsUrl) => `
    <div style="margin:18px 0;padding:16px;border:1.5px solid #0A0A0A;border-radius:4px">
      <p style="font-size:13px;font-weight:800;margin:0 0 8px">Para que todo salga bien</p>
      <ul style="font-size:13px;line-height:1.55;color:#0A0A0Acc;margin:0;padding-left:18px">
        <li>Llega <b>10 minutos antes</b>. La hora corre desde la hora reservada, aunque lleguen tarde.</li>
        <li>Pueden grabar <b>hasta 4 personas</b>. La sesión es de 1 hora: el capítulo dura unos 30 a 40 minutos.</li>
        <li>¿Necesitan más tiempo? Se contrata en bloques de <b>30 minutos ($100.000 + IVA)</b>, solo si no hay otra reserva después.</li>
        <li>La edición simple incluye color, sonido, logo, música, nombres en pantalla y <b>hasta 3 cortes</b>. Entregamos en <b>5 días hábiles</b>.</li>
        <li>Guardamos el material <b>1 semana</b> después de la entrega.</li>
      </ul>
      ${conditionsUrl ? `<p style="font-size:12px;margin:10px 0 0"><a href="${conditionsUrl}" style="color:#1F3FA3;font-weight:700">Ver las condiciones completas (PDF)</a></p>` : ""}
    </div>`;

const changePolicy = `
    <p style="font-size:12px;color:#0A0A0A99;line-height:1.5">
      Puedes cambiar la fecha sin costo hasta <b>48 horas antes</b>. Con menos de 48 horas,
      o si no llegas, el capítulo se da por grabado.
    </p>`;

// Correo al cliente (confirmación). deposit > 0 = pagó por la web; 0 = agendada por el estudio (temporada).
export function customerEmailHtml({ name, fecha, hora, deposit, address, manageUrl, whatsappUrl, portalUrl, conditionsUrl }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">¡Grabación confirmada! 🎙️</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, ${deposit ? "recibimos tu pago y tu grabación quedó agendada" : "tu grabación quedó agendada"}. Te esperamos:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Dirección", address)}
      ${deposit ? row("Pagado", CLP(deposit) + " (IVA incluido)") : ""}
    </table>
    ${mapsBlock(address)}
    ${deposit ? `
    <p style="font-size:13px;line-height:1.5;color:#0A0A0Acc">
      Si después del piloto contratas una temporada (desde 6 capítulos) dentro de 30 días,
      el piloto pasa a ser tu capítulo 1 y su valor se descuenta del total.
    </p>` : ""}
    ${guideBlock(conditionsUrl)}
    ${portalUrl ? `
    <div style="margin:18px 0;padding:16px;background:#0A0A0A;border-radius:4px">
      <p style="font-size:13px;color:#F5EBD6;line-height:1.5;margin:0 0 10px">
        Sigue tu grabación y recibe tu <b>entrega</b> en tu portal de cliente:
      </p>
      <a href="${portalUrl}" style="display:inline-block;background:#F4B81C;color:#0A0A0A;text-decoration:none;padding:11px 20px;font-weight:800;font-size:14px;border-radius:4px">Ver mi grabación en el portal</a>
    </div>` : ""}
    ${manageUrl ? `
    <div style="margin:18px 0">${button(manageUrl, "Cambiar la fecha")}</div>
    ${changePolicy}` : ""}
    ${waLine(whatsappUrl)}
    <p style="font-size:13px;margin-top:18px">Nos vemos pronto,<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo al cliente (reserva reagendada)
export function rescheduleEmailHtml({ name, fecha, hora, address, manageUrl }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">Cambiamos tu fecha ✅</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, listo: movimos tu grabación. Tu pago sigue aplicado. Nueva fecha:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Dirección", address)}
    </table>
    ${mapsBlock(address)}
    ${manageUrl ? `<div style="margin:18px 0">${button(manageUrl, "Ver mi reserva")}</div>` : ""}
    ${changePolicy}
    <p style="font-size:13px;margin-top:8px">Nos vemos,<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo al cliente (reserva cancelada)
export function cancelEmailHtml({ name, fecha, hora, whatsappUrl }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">Reserva cancelada</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, cancelamos tu grabación del <b>${fecha}</b> a las <b>${hora} hrs</b>.
      El horario quedó liberado.
    </p>
    <p style="font-size:13px;line-height:1.5;color:#0A0A0Acc">
      Cuando quieras volver a grabar, revisa las temporadas en
      <a href="https://doppel.cl/podfactory/" style="color:#1F3FA3;font-weight:700;text-decoration:none">doppel.cl/podfactory</a>.
    </p>
    ${waLine(whatsappUrl)}
    <p style="font-size:13px;margin-top:14px"><b>Equipo Pod Factory</b></p>
  `);
}

// Recordatorio 72 h antes: último aviso para cambiar la fecha (el plazo vence a las 48 h).
export function reminder72EmailHtml({ name, fecha, hora, deadline, address, manageUrl, whatsappUrl }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">Tu grabación es en 3 días 🎙️</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, te recordamos tu grabación en Pod Factory:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Dirección", address)}
    </table>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0A">
      Si necesitas cambiar la fecha, puedes hacerlo sin costo hasta el <b>${deadline}</b>.
      Después de eso, el capítulo se da por grabado aunque no vengas.
    </p>
    ${manageUrl ? `<div style="margin:18px 0">${button(manageUrl, "Cambiar la fecha")}</div>` : ""}
    ${waLine(whatsappUrl)}
    <p style="font-size:13px;margin-top:8px">¡Nos vemos!<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo recordatorio (24 h antes)
export function reminderEmailHtml({ name, fecha, hora, address, manageUrl, whatsappUrl, conditionsUrl }) {
  return shell(`
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">Tu grabación es mañana 🎙️</div>
    <p style="font-size:14px;line-height:1.5;color:#0A0A0Acc">
      Hola ${name}, te recordamos tu grabación en Pod Factory:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row("Fecha", fecha)}
      ${row("Hora", hora + " hrs")}
      ${row("Dirección", address)}
    </table>
    ${mapsBlock(address)}
    ${guideBlock(conditionsUrl)}
    ${waLine(whatsappUrl)}
    <p style="font-size:13px;margin-top:8px">¡Nos vemos!<br><b>Equipo Pod Factory</b></p>
  `);
}

// Correo de aviso al estudio
export function studioEmailHtml({ name, email, phone, fecha, hora, deposit, tipo, personas, addons, comentarios, rut, razonSocial, giro }) {
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
      ${row("Pagado", CLP(deposit) + " (IVA incluido)")}
      ${rut ? row("Facturar a", `${razonSocial} · RUT ${rut}${giro ? ` · ${giro}` : ""}`) : ""}
    </table>
    <p style="font-size:12px;color:#0A0A0A99">Ya está en el Google Calendar del estudio. Falta emitir la factura.</p>
  `);
}
