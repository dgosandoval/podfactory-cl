// Pod Factory — Calendario de reserva del capítulo piloto (en doppel.cl/podfactory).
// La API vive en podfactory.cl (Google Calendar + MercadoPago), por eso las
// llamadas van a PF_API con CORS. El piloto se paga completo al reservar.
const PF_API = 'https://podfactory.cl';

const PFB = {
  bg: '#F5EBD6', ink: '#0A0A0A', blue: '#1F3FA3', red: '#D92E2E',
  yellow: '#F4B81C', green: '#1f7a3f',
  display: "'Archivo', sans-serif", serif: "'Instrument Serif', serif", mono: "'Space Mono', monospace",
};

const CLP = (n) => '$' + Number(n).toLocaleString('es-CL');

// Próximos N días abiertos (sin domingos). Devuelve [{iso, dowLabel, dnum, monLabel, ts}].
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
        ts: d.getTime(),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Lunes (00:00) de la semana que contiene el timestamp dado.
function mondayOf(ts) {
  const x = new Date(ts);
  const day = x.getDay(); // 0=Dom
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

// Agrupa los días en semanas (Lun–Vie) con etiqueta y rango legible.
function groupByWeek(days) {
  const thisMon = mondayOf(Date.now());
  const map = new Map();
  for (const d of days) {
    const wk = mondayOf(d.ts);
    if (!map.has(wk)) map.set(wk, []);
    map.get(wk).push(d);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([wk, ds]) => {
    const offset = Math.round((wk - thisMon) / (7 * 86400000));
    const first = ds[0], last = ds[ds.length - 1];
    const range = first.monLabel === last.monLabel
      ? `${first.dnum}–${last.dnum} ${last.monLabel}`
      : `${first.dnum} ${first.monLabel} – ${last.dnum} ${last.monLabel}`;
    const label = offset <= 0 ? 'Esta semana'
      : offset === 1 ? 'Próxima semana'
      : `Semana del ${first.dnum} ${first.monLabel}`;
    return { wk, label, range, days: ds };
  });
}

function BookingCalendar() {
  const OPEN_DOWS = [1, 2, 3, 4, 5]; // Lun–Vie
  const days = React.useMemo(() => upcomingDays(18, OPEN_DOWS), []);
  const weeks = React.useMemo(() => groupByWeek(days), [days]);
  const monthLabel = React.useMemo(() => {
    if (!days.length) return '';
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const f = new Date(days[0].ts), l = new Date(days[days.length - 1].ts);
    const mf = cap(f.toLocaleDateString('es-CL', { month: 'long' }));
    const ml = cap(l.toLocaleDateString('es-CL', { month: 'long' }));
    return mf === ml ? `${mf} ${l.getFullYear()}` : `${mf} – ${ml} ${l.getFullYear()}`;
  }, [days]);
  const [activeDate, setActiveDate] = React.useState(days[0]?.iso);
  const [data, setData] = React.useState(null);       // respuesta de availability
  const [loading, setLoading] = React.useState(false);
  const [slot, setSlot] = React.useState(null);        // bloque elegido
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', personas: 2, rut: '', razonSocial: '', giro: '', comentarios: '', acepta: false });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!activeDate) return;
    setLoading(true); setSlot(null); setError(null);
    fetch(`${PF_API}/api/availability?date=${activeDate}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('No pudimos cargar la disponibilidad. Reintenta.'))
      .finally(() => setLoading(false));
  }, [activeDate]);

  const deposit = data?.depositCLP || 357000; // piloto $300.000 + IVA

  async function reservar() {
    setSubmitting(true); setError(null);
    window.pfTrack && window.pfTrack('begin_checkout', { value: deposit, currency: 'CLP', items: [{ item_name: 'Capítulo piloto', price: deposit }] });
    try {
      const res = await fetch(`${PF_API}/api/reserve`, {
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

  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length >= 8
    && /^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/.test(form.rut.trim()) && form.razonSocial.trim() && form.acepta;

  return (
    <div style={{ border: `1.5px solid ${PFB.ink}`, background: '#fff', padding: 0, maxWidth: 560, overflow: 'hidden' }}>
      <style>{`@media (max-width: 480px){ .pf-form-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {/* Encabezado */}
      <div style={{ padding: '14px 18px', borderBottom: `1.5px solid ${PFB.ink}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontFamily: PFB.display, fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
          Reserva tu capítulo piloto
        </div>
        <div style={{ fontFamily: PFB.mono, fontSize: 10, color: PFB.ink + '99', letterSpacing: '0.06em' }}>
          $300.000 + IVA · TOTAL {CLP(deposit)}
        </div>
      </div>

      {/* Selector de días — semanas apiladas */}
      <div style={{ padding: '12px 18px 2px' }}>
        <div style={{ fontFamily: PFB.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PFB.ink + '99', fontWeight: 700, marginBottom: 8 }}>
          {monthLabel}
        </div>
        {weeks.map((w) => (
          <div key={w.wk} style={{ marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 5 }}>
              {w.days.map((d) => {
                const on = d.iso === activeDate;
                return (
                  <button key={d.iso} onClick={() => setActiveDate(d.iso)} style={{
                    padding: '5px 2px', cursor: 'pointer',
                    border: `1.5px solid ${PFB.ink}`, background: on ? PFB.ink : '#fff', color: on ? '#fff' : PFB.ink,
                    fontFamily: PFB.mono, textAlign: 'center', transition: 'all .15s',
                  }}>
                    <div style={{ fontSize: 8, letterSpacing: '0.04em', opacity: 0.7, textTransform: 'uppercase' }}>{d.dowLabel}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: PFB.display, lineHeight: 1.1 }}>{d.dnum}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bloques del día */}
      <div style={{ padding: '12px 18px 18px' }}>
        {loading && <div style={{ fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', padding: '8px 0' }}>Cargando bloques…</div>}

        {!loading && data && !data.open && (
          <div style={{ fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', padding: '8px 0' }}>Día cerrado.</div>
        )}

        {!loading && data?.open && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))', gap: 6 }}>
            {data.slots.map((s) => {
              const chosen = slot?.start === s.start;
              return (
                <button key={s.start} disabled={!s.available} onClick={() => setSlot(s)} style={{
                  padding: '9px 6px', cursor: s.available ? 'pointer' : 'not-allowed',
                  border: `1.5px solid ${s.available ? PFB.ink : PFB.ink + '33'}`,
                  background: chosen ? PFB.blue : s.available ? '#fff' : PFB.ink + '0a',
                  color: chosen ? '#fff' : s.available ? PFB.ink : PFB.ink + '55',
                  fontFamily: PFB.mono, fontSize: 13, fontWeight: 700, transition: 'all .15s',
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
              {days.find((d) => d.iso === activeDate)?.dowLabel} {days.find((d) => d.iso === activeDate)?.dnum} {days.find((d) => d.iso === activeDate)?.monLabel} · {slot.label} hrs
            </div>
            <div className="pf-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
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

            {/* N° de personas */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: PFB.mono, fontSize: 10, letterSpacing: '0.12em', color: PFB.ink + '99', marginBottom: 6 }}>N° DE PERSONAS EN EL SET (HASTA 4)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4].map((n) => {
                  const on = form.personas === n;
                  return (
                    <button key={n} onClick={() => setForm({ ...form, personas: n })} style={{
                      width: 44, height: 40, cursor: 'pointer', border: `1.5px solid ${PFB.ink}`,
                      background: on ? PFB.blue : '#fff', color: on ? '#fff' : PFB.ink, fontFamily: PFB.mono, fontSize: 14, fontWeight: 700,
                    }}>{n}</button>
                  );
                })}
              </div>
            </div>

            {/* Facturación */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: PFB.mono, fontSize: 10, letterSpacing: '0.12em', color: PFB.ink + '99', marginBottom: 6 }}>DATOS PARA LA FACTURA</div>
              <div className="pf-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['rut', 'RUT (12.345.678-9)'], ['razonSocial', 'Razón social o nombre'], ['giro', 'Giro (opcional)']].map(([k, ph]) => (
                  <input key={k} type="text" placeholder={ph} value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    style={{
                      gridColumn: k === 'giro' ? '1 / -1' : 'auto',
                      padding: '11px 12px', border: `1.5px solid ${PFB.ink}`, background: '#fff',
                      fontFamily: PFB.mono, fontSize: 13, outline: 'none', borderRadius: 0,
                    }} />
                ))}
              </div>
            </div>

            {/* Comentarios */}
            <textarea placeholder="Cuéntanos de tu podcast (tema, invitados, si ya tienes nombre)" value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })} rows={2}
              style={{ width: '100%', padding: '11px 12px', border: `1.5px solid ${PFB.ink}`, background: '#fff', fontFamily: PFB.mono, fontSize: 13, outline: 'none', borderRadius: 0, marginBottom: 12, resize: 'vertical' }} />

            {/* Aceptación de condiciones */}
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 14, fontFamily: PFB.mono, fontSize: 11.5, lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.acepta} onChange={(e) => setForm({ ...form, acepta: e.target.checked })} style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
              <span>Acepto las <a href="condiciones.pdf" target="_blank" rel="noopener" style={{ color: PFB.blue, fontWeight: 700 }}>condiciones del estudio</a>: cambio de fecha sin costo hasta 48 h antes; con menos de 48 h, o si no llego, el capítulo se da por grabado.</span>
            </label>

            <button onClick={reservar} disabled={!valid || submitting} style={{
              width: '100%', padding: '15px', cursor: valid && !submitting ? 'pointer' : 'not-allowed',
              border: 'none', background: valid && !submitting ? PFB.red : PFB.ink + '33', color: '#fff',
              fontFamily: PFB.display, fontWeight: 800, fontSize: 14, letterSpacing: '0.04em',
            }}>
              {submitting ? 'REDIRIGIENDO A MERCADOPAGO…' : `PAGAR ${CLP(deposit)} Y RESERVAR`}
            </button>
            <div style={{ marginTop: 10, fontFamily: PFB.mono, fontSize: 10.5, color: PFB.ink + '88', lineHeight: 1.5 }}>
              Pago seguro con MercadoPago. Si contratas una temporada dentro de 30 días, el piloto pasa a ser tu capítulo 1 y se descuenta del total.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BookingCalendar });
