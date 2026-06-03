# Setup del sistema de reservas — Pod Factory

Esta guía es **tu parte** (las credenciales). El código lo escribe Claude.
Tiempo estimado: ~25 min. No necesitas saber programar para esto.

Vas a obtener 3 cosas y al final pegarlas en Cloudflare como *secrets*:

| Secret en Cloudflare        | De dónde sale                          |
|-----------------------------|----------------------------------------|
| `GOOGLE_SA_KEY`             | Clave JSON del Service Account (Paso A) |
| `GOOGLE_CALENDAR_ID`        | ID de la agenda de reservas (Paso A.5)  |
| `MP_ACCESS_TOKEN`           | Access Token de MercadoPago (Paso B)    |
| `MP_PUBLIC_KEY`             | Public Key de MercadoPago (Paso B)      |
| `ADMIN_*` (no aplica)       | —                                       |

---

## Paso A — Google Calendar (la agenda y el "robot" que la lee)

La idea: una agenda dedicada solo a reservas del estudio. Un "robot"
(Service Account) la lee y escribe por ti. Tú la ves y bloqueas horarios
desde tu celular como cualquier calendario.

### A.1 — Crear un proyecto en Google Cloud
1. Entra a https://console.cloud.google.com/ con tu cuenta Google.
2. Arriba a la izquierda, junto al logo, hay un selector de proyecto →
   clic → **NUEVO PROYECTO**.
3. Nombre: `pod-factory-reservas` → **CREAR**.
4. Espera unos segundos y asegúrate de tener ese proyecto seleccionado
   (arriba debe decir `pod-factory-reservas`).

### A.2 — Habilitar la Calendar API
1. En el buscador de arriba escribe **"Google Calendar API"** → entra al
   resultado.
2. Botón azul **HABILITAR** (Enable). Espera a que termine.

### A.3 — Crear el Service Account (el "robot")
1. Menú ☰ → **IAM y administración** → **Cuentas de servicio**
   (Service Accounts). O busca "Service Accounts" arriba.
2. **+ CREAR CUENTA DE SERVICIO**.
3. Nombre: `reservas-bot` → **CREAR Y CONTINUAR**.
4. En "Otorgar acceso" NO agregues nada → **CONTINUAR** → **LISTO**.

### A.4 — Descargar la clave JSON
1. En la lista de cuentas de servicio, clic en la que acabas de crear
   (`reservas-bot@...iam.gserviceaccount.com`).
2. Pestaña **CLAVES** (Keys) → **AGREGAR CLAVE** → **Crear clave nueva**.
3. Tipo **JSON** → **CREAR**. Se descarga un archivo `.json`.
   ⚠️ Este archivo es una contraseña. No lo subas a git ni lo compartas.
4. **Copia el email del service account** (lo necesitas en A.6). Tiene la
   forma `reservas-bot@pod-factory-reservas.iam.gserviceaccount.com`.

### A.5 — Crear la agenda de reservas
1. Abre https://calendar.google.com/ con tu cuenta.
2. Izquierda, junto a "Otros calendarios" → **+** → **Crear calendario
   nuevo**.
3. Nombre: `Pod Factory — Reservas` → **Crear calendario**.
4. Vuelve, busca esa agenda en la lista izquierda → ⋮ → **Configuración y
   uso compartido**.
5. Baja hasta **Integrar calendario** → copia el **ID del calendario**
   (algo como `xxxxxxxx@group.calendar.google.com`). Ese es tu
   `GOOGLE_CALENDAR_ID`.

### A.6 — Darle acceso al robot a esa agenda
1. En esa misma pantalla de configuración, sección **Compartir con
   personas específicas** (o "Compartir con determinadas personas") →
   **+ Agregar personas**.
2. Pega el email del service account (el de A.4).
3. Permiso: **Hacer cambios en los eventos** → **Enviar**.
   (Si pregunta por invitación, ignora; los service accounts no confirman.)
4. (Opcional, recomendado) Comparte también esa agenda contigo mismo o con
   tu equipo para verla en el celular y bloquear horarios fácil.

✅ Con esto el sitio puede leer disponibilidad y crear reservas en tu agenda.

---

## Paso B — MercadoPago (cobro del adelanto de $30.000)

### B.1 — Cuenta y panel de desarrolladores
1. Entra a https://www.mercadopago.cl/developers/ → inicia sesión con tu
   cuenta de MercadoPago (la del estudio).
2. Ve a **Tus integraciones** → **Crear aplicación**.
   - Nombre: `Pod Factory Reservas`
   - Producto: **Pagos online / Checkout Pro**.

### B.2 — Copiar las credenciales
1. Dentro de la aplicación → **Credenciales de producción**.
   (Hay "de prueba" y "de producción". Para cobrar de verdad: producción.
   Para testear primero sin cobrar, podemos usar las de prueba.)
2. Copia:
   - **Access Token** → será `MP_ACCESS_TOKEN`
   - **Public Key** → será `MP_PUBLIC_KEY`

⚠️ El Access Token es secreto (permite mover plata). No lo pegues en
chats públicos ni en git.

---

## Paso D — Resend (correos de confirmación)

Para enviar el correo de "Reserva confirmada" al cliente y el aviso a ti.

### D.1 — Cuenta y verificación del dominio
> ✅ ATAJO: `doppel.cl` YA está verificado en tu Resend (lo usa doppel-clientes),
> y `FROM_EMAIL` envía desde `@doppel.cl`. Por lo tanto este paso ya está hecho:
> salta directo a D.2 (solo necesitas la API key). Lo de abajo queda solo como
> referencia si algún día quieres verificar `podfactory.cl`.

1. Crea cuenta en https://resend.com/ (plan gratis alcanza de sobra).
2. Ve a **Domains** → **Add Domain** → escribe `podfactory.cl`.
3. Resend te muestra unos registros DNS (MX/TXT/DKIM). Como tu DNS está en
   **Cloudflare**, agrégalos en: dash.cloudflare.com → tu dominio
   `podfactory.cl` → **DNS** → **Add record** (copia cada uno tal cual).
   - ⚠️ Si esos registros DKIM/SPF tienen el proxy naranja activado, déjalos
     en **DNS only** (nube gris).
4. Vuelve a Resend → **Verify**. Cuando quede verde, listo.
   (Si prefieres usar `doppel.cl` en vez de `podfactory.cl`, verifica ese y
   cambia `FROM_EMAIL` en wrangler.toml.)

### D.2 — API key
1. Resend → **API Keys** → **Create API Key** (permiso *Sending access*).
2. Copia la key (empieza con `re_...`). Es secreta → será `RESEND_API_KEY`.

---

## Paso E — Recordatorio 24 h (cron externo)

Cloudflare Pages no tiene tareas programadas, así que un cron gratuito llama
cada hora a un endpoint protegido y ese envía los recordatorios pendientes.

1. Inventa una contraseña larga al azar para `CRON_KEY` (ej. un texto de 30+
   caracteres). Cárgala como secret en Cloudflare (ver Paso C).
2. Crea cuenta gratis en https://cron-job.org/ → **Create cronjob**.
3. Configura:
   - **Title:** `Pod Factory recordatorios`
   - **URL:** `https://podfactory.cl/api/cron/reminders?key=TU_CRON_KEY`
     (reemplaza `TU_CRON_KEY` por el valor que inventaste)
   - **Schedule:** cada hora (every hour / `0 * * * *`).
4. Guardar. Listo: cada hora revisa las reservas y envía el recordatorio a las
   que sean dentro de las próximas 24 h (una sola vez por reserva).

> Para probar: abre esa URL en el navegador. Si la key es correcta verás algo
> como `{"checked":N,"sent":0}`. Si la key está mal, dice `forbidden`.

---

## Paso F — Panel de administración (/admin)

En `podfactory.cl/admin` ves todas las reservas (quién, contacto, servicios,
adelanto) y puedes reagendar o cancelar cualquiera, sin el límite de 24 h.

1. Inventa una contraseña larga para `ADMIN_KEY` y cárgala como secret (Paso C).
2. Entra a `podfactory.cl/admin`, escribe esa clave y listo. Queda guardada en
   tu navegador (no la pide cada vez).

> La página tiene `noindex` para que no aparezca en Google. La clave es lo único
> que la protege, así que usa una larga y no la compartas.

---

## Paso C — Guardar los secrets en Cloudflare

Cuando tengas los 4 valores, NO me los pegues en el chat. En su lugar:

**Opción 1 — desde tu terminal** (te paso los comandos exactos cuando
lleguemos):
```
npx wrangler pages secret put GOOGLE_SA_KEY
npx wrangler pages secret put MP_ACCESS_TOKEN
npx wrangler pages secret put MP_PUBLIC_KEY
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put CRON_KEY
npx wrangler pages secret put ADMIN_KEY
```
(GOOGLE_CALENDAR_ID ya quedó configurado en wrangler.toml — no es secreto.)
`CRON_KEY` es una contraseña que inventas tú (cualquier texto largo al azar);
protege el endpoint del recordatorio. La usas también en el Paso E.
(Cada comando te pide pegar el valor de forma segura.)

**Opción 2 — desde el panel web de Cloudflare:**
Dashboard → Workers & Pages → tu proyecto `podfactory-cl` → Settings →
**Variables and Secrets** → Add → tipo **Secret** → nombre y valor.

---

## Checklist final

- [ ] A.4 — Archivo JSON del service account descargado y guardado seguro
- [ ] A.4 — Email del service account copiado
- [ ] A.5 — `GOOGLE_CALENDAR_ID` copiado
- [ ] A.6 — Agenda compartida con el email del service account
- [ ] B.2 — `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY` copiados
- [ ] D.2 — `RESEND_API_KEY` copiada (doppel.cl ya verificado, ver D.1)
- [ ] E   — Cronjob en cron-job.org apuntando al endpoint con `CRON_KEY`
- [ ] C   — Secrets en Cloudflare (SA key, MP token/key, Resend key, CRON_KEY)

Avísame cuando tengas esto (o dudas en cualquier paso) y enchufamos todo.
```
