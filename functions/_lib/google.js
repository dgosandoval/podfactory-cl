// Autenticación servidor-a-servidor con Google Calendar usando un Service Account.
// Firma un JWT con RS256 vía Web Crypto (sin librerías) y lo canjea por un access token.

const enc = new TextEncoder();

function base64url(input) {
  const bytes = typeof input === "string" ? enc.encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem) {
  const body = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned));
  const jwt = `${unsigned}.${base64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Google token error: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

// Intervalos ocupados (eventos + bloqueos manuales) entre dos instantes.
export async function getBusy(env, timeMinISO, timeMaxISO) {
  const sa = JSON.parse(env.GOOGLE_SA_KEY);
  const token = await getAccessToken(sa);
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ timeMin: timeMinISO, timeMax: timeMaxISO, items: [{ id: env.GOOGLE_CALENDAR_ID }] }),
  });
  if (!res.ok) throw new Error(`freeBusy error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const cal = json.calendars?.[env.GOOGLE_CALENDAR_ID];
  return (cal?.busy || []).map((b) => ({ start: b.start, end: b.end }));
}

// Crea el evento de reserva confirmada (Fase 2, tras el pago).
export async function createEvent(env, { summary, description, startISO, endISO, timeZone }) {
  const sa = JSON.parse(env.GOOGLE_SA_KEY);
  const token = await getAccessToken(sa);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: startISO, timeZone },
      end: { dateTime: endISO, timeZone },
    }),
  });
  if (!res.ok) throw new Error(`createEvent error: ${res.status} ${await res.text()}`);
  return res.json();
}
