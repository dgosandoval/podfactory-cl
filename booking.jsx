// Pod Factory — Calendario de reservas.
// Lee disponibilidad de /api/availability (que consulta tu Google Calendar)
// y, al elegir bloque + datos, inicia el pago del adelanto vía /api/reserve.

const PFB = {
  bg: '#F5EBD6', ink: '#0A0A0A', blue: '#1F3FA3', red: '#D92E2E',
  yellow: '#F4B81C', green: '#1f7a3f',
  display: "'Archivo', sans-serif", serif: "'Instrument Serif', serif", mono: "'Space Mono', monospace",
};

const CLP = (n) => '$' + Number(n).toLocaleString('es-CL');

// Próximos N días abiertos (sin domingos). Devuelve [{iso, dow, dnum, mon}].
function upcomingDays(count, openDows) {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < count) {
    const dow = d.getDay(); // 0=Dom
    if (openDows.includes(dow)) {
      out.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dowLabel: d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''),
        dnum: d.getDate(),
        monLabel: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function BookingCalendar() {
  const OPEN_DOWS = [1, 2, 3, 4, 5, 6]; // Lun–Sáb
  const days = React.useMemo(() => upcomingDays(18, OPEN_DOWS), []);
  const [activeDate, setActiveDate] = React.useState(days[0]?.iso);
  const [data, setData] = React.useState(null);       // respuesta de availability
  const [loading, setLoading] = React.useState(false);
  const [slot, setSlot] = React.useState(null);        // bloque elegido
  const [form, setForm] = React.useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!activeDate) return;
    setLoading(true); setSlot(null); setError(null);
    fetch(`/api/availability?date=${activeDate}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('No pudimos cargar la disponibilidad. Reintenta.'))
      .finally(() => setLoading(false));
  }, [activeDate]);

  const deposit = data?.depositCLP || 30000;

  async function reservar() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: activeDate, start: slot.start, end: slot.end, label: slot.label, ...form }),
      });
      const out = await res.json();
      if (!res.ok || !out.init_point) throw new Error(out.error || 'Error al iniciar el pago');
      window.location.href = out.init_point; // a MercadoPago
    } catch (e) {
      setError(String(e.message || e));
      setSubmitting(false);
    }
  }

  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length >= 8;

  return (
    <div style={{ border: `1.5px solid ${PFB.ink}`, background: '#fff', padding: 0 }}>
      {/* Encabezado */}
      <div style={{ padding: '20px 24px', borderBottom: `1.5px solid ${PFB.ink}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: PFB.display, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
          Reserva tu sesión
        </div>
        <div style={{ fontFamily: PFB.mono, fontSize: 11, color: PFB.ink + '99', letterSpacing: '0.08em' }}>
          ADELANTO {CLP(deposit)} · SALDO EL DÍA DE LA SESIÓN
        </div>
      </div>

      {/* Selector de días */}
      <div className="pf-calendar-wrap" style={{ padding: '16px 24px 4px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {days.map((d) => {
            const on = d.iso === activeDate;
            return (
              <button key={d.iso} onClick={() => setActiveDate(d.iso)} style={{
                flex: '0 0 auto', minWidth: 58, padding: '10px 8px', cursor: 'pointer',
                border: `1.5px solid ${PFB.ink}`, background: on ? PFB.ink : '#fff', color: on ? '#fff' : PFB.ink,
                fontFamily: PFB.mono, textAlign: 'center', transition: 'all .15s',
              }}>
                <div style={{ fontSize: 10, letterSpacing: '0.06em', opacity: 0.7, textTransform: 'uppercase' }}>{d.dowLabel}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: PFB.display, lineHeight: 1.1 }}>{d.dnum}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.06em', opacity: 0.7, textTransform: 'uppercase' }}>{d.monLabel}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bloques del día */}
      <div style={{ padding: '16px 24px 24px' }}>
        {loading && <div style={{ fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', padding: '12px 0' }}>Cargando bloques…</div>}

        {!loading && data && !data.open && (
          <div style={{ fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', padding: '12px 0' }}>Día cerrado.</div>
        )}

        {!loading && data?.open && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {data.slots.map((s) => {
              const chosen = slot?.start === s.start;
              return (
                <button key={s.start} disabled={!s.available} onClick={() => setSlot(s)} style={{
                  padding: '12px 8px', cursor: s.available ? 'pointer' : 'not-allowed',
                  border: `1.5px solid ${s.available ? PFB.ink : PFB.ink + '33'}`,
                  background: chosen ? PFB.blue : s.available ? '#fff' : PFB.ink + '0a',
                  color: chosen ? '#fff' : s.available ? PFB.ink : PFB.ink + '55',
                  fontFamily: PFB.mono, fontSize: 14, fontWeight: 700, transition: 'all .15s',
                  textDecoration: s.available ? 'none' : 'line-through',
                }}>
                  {s.label}
                </button>
              );
            })}
            {data.slots.every((s) => !s.available) && (
              <div style={{ gridColumn: '1 / -1', fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', paddingTop: 8 }}>
                Sin bloques disponibles este día. Prueba otra fecha.
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, fontFamily: PFB.mono, fontSize: 12, color: PFB.red }}>{error}</div>
        )}

        {/* Datos + pago */}
        {slot && (
          <div style={{ marginTop: 20, borderTop: `1.5px solid ${PFB.ink}22`, paddingTop: 18 }}>
            <div style={{ fontFamily: PFB.display, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              {days.find((d) => d.iso === activeDate)?.dowLabel} {days.find((d) => d.iso === activeDate)?.dnum} · {slot.label} hrs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[['name', 'Nombre y apellido', 'text'], ['email', 'Email', 'email'], ['phone', 'Teléfono / WhatsApp', 'tel']].map(([k, ph, type]) => (
                <input key={k} type={type} placeholder={ph} value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  style={{
                    gridColumn: k === 'name' ? '1 / -1' : 'auto',
                    padding: '11px 12px', border: `1.5px solid ${PFB.ink}`, background: '#fff',
                    fontFamily: PFB.mono, fontSize: 13, outline: 'none', borderRadius: 0,
                  }} />
              ))}
            </div>
            <button onClick={reservar} disabled={!valid || submitting} style={{
              width: '100%', padding: '15px', cursor: valid && !submitting ? 'pointer' : 'not-allowed',
              border: 'none', background: valid && !submitting ? PFB.red : PFB.ink + '33', color: '#fff',
              fontFamily: PFB.display, fontWeight: 800, fontSize: 14, letterSpacing: '0.04em',
            }}>
              {submitting ? 'REDIRIGIENDO A MERCADOPAGO…' : `PAGAR ADELANTO ${CLP(deposit)}`}
            </button>
            <div style={{ marginTop: 10, fontFamily: PFB.mono, fontSize: 10.5, color: PFB.ink + '88', lineHeight: 1.5 }}>
              Reagenda sin costo hasta 24 h antes. El adelanto se descuenta del total de la sesión.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BookingCalendar });
