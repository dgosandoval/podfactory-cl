// Pod Factory — Calendario para reservar la visita al estudio (gratis) o el mini-piloto (pagado).
// La API vive en podfactory.cl (Google Calendar + MercadoPago).
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

// Productos reservables: la visita (gratis) y el mini-piloto (pagado por MercadoPago).
const PRODUCTOS = {
  visita: { label: 'Visita al estudio', sub: 'Gratis · 20 minutos', precio: 0, cta: 'AGENDAR VISITA' },
  minipiloto: { label: 'Mini-piloto', sub: '10 minutos grabando · $30.000 + IVA', precio: 35700, cta: 'PAGAR $35.700 Y RESERVAR' },
};

function BookingCalendar({ initialTipo = 'visita', prefill = null }) {
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
  const [tipo, setTipo] = React.useState(initialTipo);
  const [activeDate, setActiveDate] = React.useState(days[0]?.iso);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [slot, setSlot] = React.useState(null);
  const [form, setForm] = React.useState({ name: prefill?.name || '', empresa: '', email: prefill?.email || '', phone: '', personas: 1, rut: '', razonSocial: '', giro: '', comentarios: '', acepta: false });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [listo, setListo] = React.useState(null); // visita confirmada: { fecha, hora }
  const P = PRODUCTOS[tipo];

  // Los botones de la página pueden elegir el producto (evento 'pf-producto').
  React.useEffect(() => {
    const h = (e) => { if (PRODUCTOS[e.detail]) { setTipo(e.detail); setListo(null); } };
    window.addEventListener('pf-producto', h);
    return () => window.removeEventListener('pf-producto', h);
  }, []);

  React.useEffect(() => {
    if (!activeDate) return;
    setLoading(true); setSlot(null); setError(null);
    fetch(`${PF_API}/api/availability?date=${activeDate}&tipo=${tipo}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('No pudimos cargar la disponibilidad. Reintenta.'))
      .finally(() => setLoading(false));
  }, [activeDate, tipo]);

  async function reservar() {
    setSubmitting(true); setError(null);
    if (tipo === 'minipiloto' && window.pfTrack) window.pfTrack('begin_checkout', { value: P.precio, currency: 'CLP', items: [{ item_name: 'Mini-piloto', price: P.precio }] });
    try {
      const res = await fetch(`${PF_API}/api/reserve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipo, date: activeDate, start: slot.start, end: slot.end, label: slot.label, ...form }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'No se pudo reservar');
      if (tipo === 'visita') {
        setListo({ fecha: out.fecha, hora: out.hora });
        window.pfTrack && window.pfTrack('schedule_visit', { value: 0, currency: 'CLP' });
        setSubmitting(false);
      } else {
        if (!out.init_point) throw new Error('No se pudo iniciar el pago');
        window.location.href = out.init_point; // a MercadoPago
      }
    } catch (e) {
      setError(String(e.message || e));
      setSubmitting(false);
    }
  }

  const rutOk = !form.rut.trim() || /^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/.test(form.rut.trim());
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.replace(/\D/g, '').length >= 8 && rutOk && form.acepta;
  const inp = { padding: '11px 12px', border: `1.5px solid ${PFB.ink}`, background: '#fff', fontFamily: PFB.mono, fontSize: 13, outline: 'none', borderRadius: 0 };

  if (listo) return (
    <div style={{ border: `1.5px solid ${PFB.ink}`, background: '#fff', padding: 24, maxWidth: 560 }}>
      <div style={{ fontFamily: PFB.display, fontWeight: 900, fontSize: 24 }}>¡Visita agendada! ✅</div>
      <p style={{ fontFamily: PFB.display, fontSize: 15, lineHeight: 1.55, marginTop: 8 }}>
        Te esperamos el <b>{listo.fecha}</b> a las <b>{listo.hora} hrs</b>. Te enviamos un correo con la dirección exacta y un link por si necesitas cambiar la hora.
      </p>
    </div>
  );

  return (
    <div style={{ border: `1.5px solid ${PFB.ink}`, background: '#fff', padding: 0, maxWidth: 560, overflow: 'hidden' }}>
      <style>{`@media (max-width: 480px){ .pf-form-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {/* Selector de producto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.5px solid ${PFB.ink}` }}>
        {Object.entries(PRODUCTOS).map(([k, v], i) => {
          const on = k === tipo;
          return (
            <button key={k} onClick={() => { setTipo(k); setSlot(null); }} style={{
              padding: '14px 12px', cursor: 'pointer', border: 'none', borderLeft: i ? `1.5px solid ${PFB.ink}` : 'none',
              background: on ? PFB.ink : '#fff', color: on ? '#fff' : PFB.ink, textAlign: 'left',
            }}>
              <div style={{ fontFamily: PFB.display, fontWeight: 800, fontSize: 15 }}>{v.label}</div>
              <div style={{ fontFamily: PFB.mono, fontSize: 10.5, marginTop: 3, opacity: 0.8 }}>{v.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Selector de días */}
      <div style={{ padding: '12px 18px 2px' }}>
        <div style={{ fontFamily: PFB.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PFB.ink + '99', fontWeight: 700, marginBottom: 8 }}>{monthLabel}</div>
        {weeks.map((w) => (
          <div key={w.wk} style={{ marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 5 }}>
              {w.days.map((d) => {
                const on = d.iso === activeDate;
                return (
                  <button key={d.iso} onClick={() => setActiveDate(d.iso)} style={{
                    padding: '5px 2px', cursor: 'pointer', border: `1.5px solid ${PFB.ink}`,
                    background: on ? PFB.ink : '#fff', color: on ? '#fff' : PFB.ink, fontFamily: PFB.mono, textAlign: 'center',
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

      {/* Horarios del día */}
      <div style={{ padding: '12px 18px 18px' }}>
        {loading && <div style={{ fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', padding: '8px 0' }}>Cargando horarios…</div>}
        {!loading && data && !data.open && <div style={{ fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', padding: '8px 0' }}>Día cerrado.</div>}
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
                  fontFamily: PFB.mono, fontSize: 13, fontWeight: 700, textDecoration: s.available ? 'none' : 'line-through',
                }}>{s.label}</button>
              );
            })}
            {data.slots.every((s) => !s.available) && (
              <div style={{ gridColumn: '1 / -1', fontFamily: PFB.mono, fontSize: 12, color: PFB.ink + '99', paddingTop: 8 }}>Sin horarios este día. Prueba otra fecha.</div>
            )}
          </div>
        )}
        {error && <div style={{ marginTop: 14, fontFamily: PFB.mono, fontSize: 12, color: PFB.red }}>{error}</div>}

        {/* Datos */}
        {slot && (
          <div style={{ marginTop: 20, borderTop: `1.5px solid ${PFB.ink}22`, paddingTop: 18 }}>
            <div style={{ fontFamily: PFB.display, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              {P.label} · {days.find((d) => d.iso === activeDate)?.dowLabel} {days.find((d) => d.iso === activeDate)?.dnum} {days.find((d) => d.iso === activeDate)?.monLabel} · {slot.label} hrs
            </div>
            <div className="pf-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[['name', 'Nombre y apellido', 'text'], ['empresa', 'Empresa o proyecto (opcional)', 'text'], ['email', 'Email', 'email'], ['phone', 'Teléfono / WhatsApp', 'tel']].map(([k, ph, type]) => (
                <input key={k} type={type} placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={inp} />
              ))}
            </div>
            {tipo === 'minipiloto' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: PFB.mono, fontSize: 10, letterSpacing: '0.12em', color: PFB.ink + '99', marginBottom: 6 }}>¿QUIERES FACTURA? (OPCIONAL)</div>
                <div className="pf-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['rut', 'RUT (12.345.678-9)'], ['razonSocial', 'Razón social']].map(([k, ph]) => (
                    <input key={k} type="text" placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={inp} />
                  ))}
                </div>
              </div>
            )}
            <textarea placeholder={tipo === 'visita' ? '¿Qué te gustaría ver o conversar? (opcional)' : 'Cuéntanos qué quieres grabar (opcional)'} value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })} rows={2}
              style={{ ...inp, width: '100%', marginBottom: 12, resize: 'vertical' }} />
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 14, fontFamily: PFB.mono, fontSize: 11.5, lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.acepta} onChange={(e) => setForm({ ...form, acepta: e.target.checked })} style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
              <span>Acepto las <a href="condiciones.pdf" target="_blank" rel="noopener" style={{ color: PFB.blue, fontWeight: 700 }}>condiciones</a> y recibir información de Pod Factory por correo (puedo darme de baja cuando quiera).</span>
            </label>
            <button onClick={reservar} disabled={!valid || submitting} style={{
              width: '100%', padding: '15px', cursor: valid && !submitting ? 'pointer' : 'not-allowed', border: 'none',
              background: valid && !submitting ? PFB.red : PFB.ink + '33', color: '#fff',
              fontFamily: PFB.display, fontWeight: 800, fontSize: 14, letterSpacing: '0.04em',
            }}>
              {submitting ? (tipo === 'visita' ? 'AGENDANDO…' : 'REDIRIGIENDO A MERCADOPAGO…') : P.cta}
            </button>
            <div style={{ marginTop: 10, fontFamily: PFB.mono, fontSize: 10.5, color: PFB.ink + '88', lineHeight: 1.5 }}>
              {tipo === 'visita'
                ? 'Te enviamos la dirección exacta por correo al confirmar.'
                : 'Pago seguro con MercadoPago. Si después grabas tu podcast con nosotros, el mini-piloto se descuenta del total.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BookingCalendar });
