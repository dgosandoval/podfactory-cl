// Pod Factory — sección de podcasts dentro de doppel.cl.
// Posicionamiento: productora de podcasts que graba donde sea (estudio propio en
// Vitacura o locación). Temporadas con precios publicados, piloto reservable con
// calendario (API en podfactory.cl) y condiciones claras. El resto va a WhatsApp.

const PF = {
  bg: '#F5EBD6',
  ink: '#0A0A0A',
  blue: '#1F3FA3',
  red: '#D92E2E',
  orange: '#EF6A1F',
  yellow: '#F4B81C',
  display: "'Archivo', sans-serif",
  serif: "'Instrument Serif', serif",
  mono: "'Space Mono', monospace",
};

const WA_PHONE = '56927970014';
function waLink(context) {
  const msg = encodeURIComponent(`Hola Pod Factory, ${context}`);
  return `https://wa.me/${WA_PHONE}?text=${msg}`;
}

function WhatsAppIcon({ size = 16, color = '#fff' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ display: 'block', flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// Botón de WhatsApp solo-ícono (círculo verde).
function WhatsAppButton({ dim = 44, waContext = 'quiero hacer mi podcast con Pod Factory.', style = {} }) {
  return (
    <a href={waLink(waContext)} target="_blank" rel="noopener" title="Escríbenos por WhatsApp" aria-label="WhatsApp"
      style={{
        background: '#25D366', borderRadius: '50%', width: dim, height: dim, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', ...style,
      }}>
      <WhatsAppIcon size={Math.round(dim * 0.5)} color="#fff" />
    </a>
  );
}

// CTA principal: botón de WhatsApp con texto (el funnel completo va a WhatsApp).
function CTAButtons({ size = 'md', waContext = 'quiero hacer mi podcast con Pod Factory.', label = 'HABLEMOS', style = {} }) {
  const pad = size === 'lg' ? '16px 26px' : size === 'sm' ? '11px 18px' : '14px 22px';
  const fs = size === 'sm' ? 12 : 13;
  const ic = size === 'lg' ? 17 : size === 'sm' ? 13 : 15;
  return (
    <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', ...style }}>
      <a href={waLink(waContext)} target="_blank" rel="noopener" style={{
        padding: pad, fontSize: fs, fontWeight: 700, letterSpacing: '0.08em',
        fontFamily: PF.display, textDecoration: 'none', borderRadius: 999,
        background: PF.red, color: PF.bg, display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1,
      }}>{label} <WhatsAppIcon size={ic} color={PF.bg} /></a>
    </div>
  );
}

// CTA principal del funnel: reservar el capítulo piloto (baja al calendario).
function PilotoButton({ size = 'md', label = 'RESERVAR CAPÍTULO PILOTO', style = {} }) {
  const pad = size === 'lg' ? '16px 26px' : size === 'sm' ? '11px 18px' : '14px 22px';
  return (
    <a href="#reservar" style={{
      padding: pad, fontSize: size === 'sm' ? 12 : 13, fontWeight: 800, letterSpacing: '0.08em',
      fontFamily: PF.display, textDecoration: 'none', borderRadius: 999, background: PF.red, color: PF.bg,
      display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1, ...style,
    }}>{label} →</a>
  );
}

// Botón secundario: WhatsApp para dudas.
function DudasButton({ size = 'md', label = '¿DUDAS? WHATSAPP', waContext = 'tengo una duda sobre Pod Factory.', dark = false }) {
  const pad = size === 'lg' ? '15px 24px' : size === 'sm' ? '10px 16px' : '13px 20px';
  const c = dark ? PF.bg : PF.ink;
  return (
    <a href={waLink(waContext)} target="_blank" rel="noopener" style={{
      padding: pad, fontSize: size === 'sm' ? 12 : 13, fontWeight: 700, letterSpacing: '0.08em', fontFamily: PF.display,
      textDecoration: 'none', borderRadius: 999, border: `1.5px solid ${c}`, color: c,
      display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1,
    }}>{label} <WhatsAppIcon size={15} color={dark ? PF.bg : '#25D366'} /></a>
  );
}

// CTA flotante (WhatsApp) — aparece al desplazar, no al inicio
// (donde ya están los del hero), para no duplicar en pantalla.
function FloatingCTA() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 22, right: 22, zIndex: 100,
      display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
      opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity .3s ease, transform .3s ease', pointerEvents: show ? 'auto' : 'none',
    }}>
      <WhatsAppButton dim={56} waContext="quiero hacer mi podcast con Pod Factory." style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }} />
    </div>
  );
}

// Generic fade-up wrapper triggered by IntersectionObserver
function Reveal({ children, delay = 0, distance = 22, duration = 750, threshold = 0.2, style = {}, className, id, as: Tag = 'div' }) {
  const [visible, setVisible] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: '-60px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

function PFRays({ height = 10, gap = 3, width = '100%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, width }}>
      {[PF.blue, PF.red, PF.orange, PF.yellow].map(c => (
        <div key={c} style={{ height, background: c, width: '100%' }} />
      ))}
    </div>
  );
}

// Tipografía y piezas reutilizadas por las secciones nuevas.
const H2 = ({ children, style = {} }) => (
  <h2 style={{ fontFamily: PF.display, fontWeight: 900, fontSize: 56, letterSpacing: '-0.04em', margin: 0, lineHeight: 0.95, ...style }}>{children}</h2>
);
const Serif = ({ children, color }) => (
  <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400, color }}>{children}</span>
);
const Kicker = ({ children, color }) => (
  <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.2em', marginBottom: 14, color }}>{children}</div>
);
const fmtCLP = (n) => '$' + Number(n).toLocaleString('es-CL');

const TEMPORADAS = [
  { caps: 6, dto: '—', base: 200000, full: 300000, min: true },
  { caps: 8, dto: '−5%', base: 190000, full: 285000, star: true },
  { caps: 10, dto: '−10%', base: 180000, full: 270000 },
  { caps: 12, dto: '−15%', base: 170000, full: 255000 },
];

// Aviso al volver de MercadoPago (?reserva=ok|error|pendiente).
function ReservaBanner() {
  const estado = React.useMemo(() => new URLSearchParams(window.location.search).get('reserva'), []);
  const [open, setOpen] = React.useState(!!estado);
  React.useEffect(() => {
    if (estado) setTimeout(() => document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' }), 400);
    if (estado === 'ok') {
      const q = new URLSearchParams(window.location.search);
      const pid = q.get('payment_id') || q.get('collection_id') || 'sin-id';
      let seen = false;
      try { seen = localStorage.getItem('pf_purchase_' + pid) === '1'; localStorage.setItem('pf_purchase_' + pid, '1'); } catch (e) {}
      if (!seen && window.pfTrack) window.pfTrack('purchase', { value: 357000, currency: 'CLP', transaction_id: pid, event_id: 'mp-' + pid, items: [{ item_name: 'Capítulo piloto', price: 357000 }] });
    }
  }, [estado]);
  if (!open || !estado) return null;
  const msg = {
    ok: ['¡Listo! Tu capítulo piloto quedó reservado.', 'Te enviamos un correo con la confirmación, la dirección y el link para cambiar la fecha si lo necesitas.', '#1f7a3f'],
    pendiente: ['Tu pago está en proceso.', 'Apenas MercadoPago lo apruebe te llega el correo de confirmación.', PF.orange],
    error: ['El pago no se completó.', 'No se hizo ningún cargo. Puedes intentarlo de nuevo o escribirnos por WhatsApp.', PF.red],
  }[estado] || null;
  if (!msg) return null;
  return (
    <div style={{ background: msg[2], color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
      <div><b style={{ fontSize: 16 }}>{msg[0]}</b> <span style={{ fontSize: 14, opacity: 0.92 }}>{msg[1]}</span></div>
      <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: '1.5px solid #fff', color: '#fff', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', fontFamily: PF.mono, fontSize: 11 }}>CERRAR</button>
    </div>
  );
}


// Camino para empresas: formulario corto → propuesta en 24 h (POST /api/lead).
function EmpresasForm() {
  const [f, setF] = React.useState({ nombre: '', empresa: '', email: '', telefono: '', capitulos: '8', donde: 'Estudio', mensaje: '', website: '' });
  const [estado, setEstado] = React.useState(null); // null | enviando | ok | error
  const [err, setErr] = React.useState('');
  const valid = f.nombre.trim() && f.empresa.trim() && /\S+@\S+\.\S+/.test(f.email) && f.telefono.trim().length >= 8;
  async function enviar(e) {
    e.preventDefault(); if (!valid) return;
    setEstado('enviando'); setErr('');
    try {
      const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const o = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(o.error || 'No se pudo enviar');
      setEstado('ok');
      window.pfTrack && window.pfTrack('generate_lead', { lead_type: 'empresa', capitulos: f.capitulos, donde: f.donde });
    } catch (e2) { setEstado('error'); setErr(String(e2.message || e2)); }
  }
  const inp = { padding: '12px 13px', border: `1.5px solid ${PF.ink}`, background: '#fff', fontFamily: PF.mono, fontSize: 13, outline: 'none', borderRadius: 0, width: '100%' };
  if (estado === 'ok') return (
    <div style={{ background: '#fff', border: `1.5px solid ${PF.ink}`, padding: 28 }}>
      <div style={{ fontWeight: 900, fontSize: 26 }}>¡Recibido! ✅</div>
      <p style={{ fontSize: 15, lineHeight: 1.55, marginTop: 8 }}>Te enviamos la propuesta en menos de 24 horas hábiles. Si es urgente, escríbenos por WhatsApp.</p>
      <DudasButton label="ESCRIBIR POR WHATSAPP" waContext="acabo de pedir una propuesta para mi empresa." />
    </div>
  );
  return (
    <form onSubmit={enviar} style={{ background: '#fff', border: `1.5px solid ${PF.ink}`, padding: 22, display: 'grid', gap: 10 }}>
      <div className="pf-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input style={inp} placeholder="Tu nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <input style={inp} placeholder="Empresa" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
        <input style={inp} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input style={inp} type="tel" placeholder="Teléfono / WhatsApp" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
        <select style={inp} value={f.capitulos} onChange={(e) => setF({ ...f, capitulos: e.target.value })}>
          {['6', '8', '10', '12', 'Más de 12', 'Aún no sé'].map((o) => <option key={o} value={o}>{/^\d+$/.test(o) ? `${o} capítulos` : o}</option>)}
        </select>
        <select style={inp} value={f.donde} onChange={(e) => setF({ ...f, donde: e.target.value })}>
          {['Estudio', 'Locación', 'Aún no sé'].map((o) => <option key={o} value={o}>{o === 'Aún no sé' ? 'Estudio o locación: aún no sé' : `En ${o.toLowerCase()}`}</option>)}
        </select>
      </div>
      <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Cuéntanos del podcast: tema, a quién va dirigido, fecha en que quieren partir" value={f.mensaje} onChange={(e) => setF({ ...f, mensaje: e.target.value })} />
      {/* honeypot anti-spam: los humanos no lo ven */}
      <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
      <button type="submit" disabled={!valid || estado === 'enviando'} style={{
        padding: 15, border: 'none', cursor: valid ? 'pointer' : 'not-allowed', background: valid ? PF.ink : PF.ink + '33', color: '#fff',
        fontFamily: PF.display, fontWeight: 800, fontSize: 14, letterSpacing: '0.06em',
      }}>{estado === 'enviando' ? 'ENVIANDO…' : 'PEDIR PROPUESTA'}</button>
      {estado === 'error' && <div style={{ fontFamily: PF.mono, fontSize: 12, color: PF.red }}>{err}. Puedes escribirnos por WhatsApp.</div>}
      <div style={{ fontFamily: PF.mono, fontSize: 10.5, color: PF.ink + '88' }}>Respondemos en menos de 24 horas hábiles. Sin spam.</div>
    </form>
  );
}

function PodFactoryLanding() {
  return (
    <div style={{ background: PF.bg, color: PF.ink, fontFamily: PF.display, minHeight: '100%' }}>
      <ReservaBanner />
      {/* Parent brand bar — signals Pod Factory is part of Doppel ecosystem */}
      <div className="pf-brandbar" style={{
        background: PF.ink, color: PF.bg, padding: '10px 32px',
        fontSize: 12, fontFamily: PF.mono, letterSpacing: '0.1em',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: PF.bg + '80' }}>ESTÁS EN</span>
          <span style={{ fontWeight: 700 }}>POD FACTORY</span>
          <span style={{ color: PF.bg + '50' }}>· UNA SECCIÓN DE</span>
          <a href="https://doppel.cl/" style={{
            color: PF.yellow, fontWeight: 700, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>DOPPEL ↗</a>
          <span className="pf-bb-hide-mobile" style={{ color: PF.bg + '50', marginLeft: 6 }}>(estudio creativo + lab)</span>
        </div>
        <span className="pf-bb-hide-mobile" style={{ color: PF.bg + '80' }}>PRODUCTORA DE PODCAST · VODCAST</span>
      </div>

      {/* Header with Doppel logo + Pod Factory marker */}
      <header className="pf-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 32px', borderBottom: `1.5px solid ${PF.ink}`,
      }}>
        <div className="pf-brand" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="https://doppel.cl/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="assets/doppel-logo.png" alt="Doppel" style={{ height: 22, display: 'block', opacity: 0.6 }} />
          </a>
          <div style={{
            paddingLeft: 14, borderLeft: `1.5px solid ${PF.ink}30`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <img className="pf-logo-img" src="assets/podfactory-logo.png" alt="Pod Factory" style={{ height: 48, display: 'block' }} />
            <div className="pf-header-sub" style={{ fontFamily: PF.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: PF.ink + '99', lineHeight: 1.4 }}>
              PRODUCTORA DE<br />PODCAST · EST. 2024
            </div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 24, fontSize: 13, fontWeight: 500 }}>
          {[
            ['Cómo trabajamos', '#como'],
            ['Estudio', '#ubicacion'],
            ['Locación', '#donde'],
            ['Temporadas', '#temporadas'],
            ['Piloto', '#reservar'],
            ['Empresas', '#empresas'],
            ['Condiciones', '#condiciones'],
            ['Preguntas', '#faq'],
          ].map(([l, h]) => (
            <a key={l} href={h} style={{ color: PF.ink, textDecoration: 'none' }}>{l}</a>
          ))}
        </nav>
        <div className="pf-header-cta"><PilotoButton size="sm" label="RESERVAR PILOTO" /></div>
      </header>

      {/* Hero */}
      <section id="espacio" className="pf-hero" style={{ padding: '60px 80px 40px 32px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'center' }}>
        <Reveal>
          <div style={{ fontSize: 11, fontFamily: PF.mono, letterSpacing: '0.18em', marginBottom: 18 }}>
            ▸ ESTUDIO Y PRODUCTORA DE PODCAST · VITACURA · BY DOPPEL
          </div>
          <h1 style={{
            fontFamily: PF.display, fontWeight: 900, fontSize: 76, lineHeight: 0.95,
            letterSpacing: '-0.04em', margin: 0,
          }}>
            Tu <span style={{ color: PF.red }}>podcast</span>, en nuestro<br />
            estudio. <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400 }}>O donde estés.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 560, marginTop: 22 }}>
            Un estudio de podcast en Vitacura, listo para grabar: set multicámara, audio broadcast
            y un director a cargo. Y como somos productora, también te ayudamos con el formato
            y llevamos el set a tu oficina, a un evento o a donde lo necesites.
          </p>
          <div className="pf-hero-cta" style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <PilotoButton size="lg" />
            <DudasButton size="lg" />
          </div>
          <div style={{ fontFamily: PF.mono, fontSize: 12, marginTop: 14, color: PF.ink + 'aa' }}>
            Piloto $300.000 + IVA · se descuenta si contratas la temporada · <a href="#temporadas" style={{ color: PF.blue }}>ver temporadas y precios</a>
          </div>
          <a href="#empresas" style={{ display: 'inline-block', marginTop: 10, fontWeight: 700, fontSize: 14, color: PF.ink }}>
            ¿Es para tu empresa? Te mandamos una propuesta en 24 horas →
          </a>
        </Reveal>

        {/* Reel de portada */}
        <Reveal delay={250} className="pf-reel" style={{ position: 'relative', width: 320 }}>
          <div style={{ aspectRatio: '9/16', background: PF.ink, position: 'relative', overflow: 'hidden' }}>
            <video src="assets/reel-portada.mp4" autoPlay muted loop playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', bottom: 14, left: 14, right: 14, background: PF.yellow, padding: '10px 14px',
              fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.1em', fontWeight: 700, textAlign: 'center',
            }}>
              SET MULTICÁMARA · DONDE ESTÉS
            </div>
          </div>
          <div style={{ position: 'absolute', top: -10, right: -10 }}>
            <PFRays height={8} gap={3} width={80} />
          </div>
        </Reveal>
      </section>

      {/* Quick facts strip */}
      <section className="pf-stats" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: `2px solid ${PF.ink}`, borderBottom: `2px solid ${PF.ink}`,
      }}>
        {[
          ['+300', 'episodios producidos', PF.blue],
          ['Vitacura', 'estudio propio · o locación', PF.red],
          ['5 días', 'hábiles de entrega', PF.orange],
          ['6+', 'capítulos por temporada', PF.yellow],
        ].map(([n, l, c], i) => (
          <Reveal key={i} delay={i * 120} style={{ padding: '30px 20px', borderRight: i < 3 ? `1.5px solid ${PF.ink}` : 'none', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: c }} />
            <div style={{ fontFamily: PF.display, fontSize: 54, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: PF.mono, fontSize: 12, letterSpacing: '0.08em', marginTop: 6, color: PF.ink + 'aa' }}>{l.toUpperCase()}</div>
          </Reveal>
        ))}
      </section>

      {/* Cómo trabajamos — productora de punta a punta */}
      <section id="como" style={{ padding: '70px 32px 60px' }}>
        <Reveal style={{ marginBottom: 30 }}>
          <Kicker>▸ CÓMO TRABAJAMOS</Kicker>
          <H2>No arrendamos un estudio.<br /><Serif color={PF.red}>Producimos tu podcast.</Serif></H2>
        </Reveal>
        <div className="pf-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            ['01', 'Formato', 'Definimos contigo la idea, la estructura de cada capítulo, los invitados y la pauta.', PF.blue],
            ['02', 'Grabación', 'Set multicámara, audio broadcast y un operador en cada grabación. En el estudio o donde estés.', PF.red],
            ['03', 'Edición', 'Color, sonido, logo, música y nombres en pantalla. Reels para redes si los necesitas.', PF.orange],
            ['04', 'Entrega', 'Cada capítulo listo para publicar en 5 días hábiles, con la misma calidad toda la temporada.', PF.yellow],
          ].map(([n, t, d, c], i) => (
            <Reveal key={n} delay={120 + i * 100} style={{ border: `1.5px solid ${PF.ink}`, background: PF.bg }}>
              <div style={{ height: 6, background: c }} />
              <div style={{ padding: 20 }}>
                <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.1em', marginBottom: 12 }}>{n}</div>
                <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>{t}</div>
                <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 8, color: PF.ink + 'aa' }}>{d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Detrás de cámara — grabación real en el estudio */}
      <section style={{ padding: '0 32px 60px' }}>
        <div className="pf-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 980, margin: '0 auto' }}>
          {[
            ['assets/estudio-grabacion-1.jpg', 'Grabación en el estudio: set Full, multicámara y monitoreo en vivo.'],
            ['assets/estudio-grabacion-2.jpg', 'Lo que ves en el monitor es lo que se entrega: cada cámara, encuadrada y operada.'],
          ].map(([src, cap], i) => (
            <Reveal key={src} delay={100 + i * 120} as="figure" style={{ margin: 0 }}>
              <img src={src} alt={cap} loading="lazy" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block', border: `1.5px solid ${PF.ink}` }} />
              <figcaption style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.06em', marginTop: 10, color: PF.ink + 'aa' }}>{cap}</figcaption>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Equipo */}
      <section id="equipo-pf" style={{ padding: '10px 32px 70px' }}>
        <Reveal style={{ marginBottom: 26 }}>
          <Kicker>▸ EL EQUIPO</Kicker>
          <H2>Quiénes producen <Serif color={PF.red}>tu podcast.</Serif></H2>
        </Reveal>
        <div className="pf-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 980 }}>
          {[
            ['assets/equipo-ivan.jpg', 'Iván Krug', 'DIRECTOR DEL ESTUDIO', 'Director de cine y publicidad en Ojo de Buey. Está a cargo de cada grabación en el estudio: el set, las cámaras, la luz y que cada capítulo salga bien.', 'https://ojodebuey.film/ivan-krug/', PF.blue],
            ['assets/equipo-domingo.jpg', 'Domingo Sandoval', 'PRODUCTOR EJECUTIVO', 'Fundador de Doppel y de Pod Factory. Diseña el formato de cada podcast y acompaña cada temporada de principio a fin.', null, PF.red],
          ].map(([src, name, role, bio, link, c], i) => (
            <Reveal key={name} delay={100 + i * 120} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 18, alignItems: 'start', borderTop: `5px solid ${c}`, paddingTop: 16 }}>
              <img src={src} alt={name} loading="lazy" style={{ width: 150, height: 150, objectFit: 'cover', display: 'block', border: `1.5px solid ${PF.ink}` }} />
              <div>
                <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.14em', fontWeight: 700, color: c }}>{role}</div>
                <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', marginTop: 4 }}>{name}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: PF.ink + 'bb', marginTop: 8 }}>{bio}</p>
                {link && <a href={link} target="_blank" rel="noopener" style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.1em', fontWeight: 700, color: PF.blue }}>VER SU TRABAJO →</a>}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Dónde grabamos — estudio o locación */}
      <section id="donde" style={{ padding: '60px 32px', background: PF.ink, color: PF.bg }}>
        <Reveal style={{ marginBottom: 30 }}>
          <PFRays height={8} gap={3} width={160} />
          <H2 style={{ marginTop: 22 }}>Grabamos <Serif color={PF.yellow}>donde tenga sentido.</Serif></H2>
        </Reveal>
        <div className="pf-two" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 18 }}>
          <Reveal delay={100} style={{ background: PF.bg, color: PF.ink }}>
            <div style={{ aspectRatio: '16/7', background: `url(assets/set-full.jpg) center 40% / cover no-repeat` }} />
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.14em', color: PF.red, fontWeight: 700 }}>EN NUESTRO ESTUDIO · VITACURA</div>
              <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: '-0.03em', marginTop: 8 }}>Temporadas desde {fmtCLP(1200000)} + IVA</div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: PF.ink + 'bb', marginTop: 8 }}>
                Set listo, iluminado y calibrado. Dos versiones: <b>Base</b>, o <b>Full</b> con paneles de madera y un televisor con tu logo.
                Desde 6 capítulos, con fechas agendadas desde el inicio.
              </p>
              <a href="#temporadas" style={{ display: 'inline-block', marginTop: 10, fontFamily: PF.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: PF.blue }}>VER TEMPORADAS →</a>
            </div>
          </Reveal>
          <Reveal delay={220} style={{ border: `1.5px solid ${PF.bg}40`, padding: 28, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.14em', color: PF.yellow, fontWeight: 700 }}>EN LOCACIÓN · DONDE ESTÉS</div>
            <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: '-0.03em', marginTop: 8 }}>Jornadas desde $950.000 + IVA</div>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: PF.bg + 'cc', marginTop: 8 }}>
              Cámaras, micrófonos, luces y operador en tu oficina, un evento, una casa, una viña o un set externo.
              En Santiago y regiones. Mientras más capítulos grabes en la jornada, menor el costo por capítulo.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 20px', fontSize: 14, lineHeight: 1.9, color: PF.bg + 'dd' }}>
              {['Jornadas desde 2 capítulos', 'Montaje, operación y traslado incluidos', 'Espacio mínimo de 4 × 4 m y 2 enchufes'].map((t) => <li key={t}>▸ {t}</li>)}
              <li style={{ marginTop: 8, color: PF.yellow }}>▸ Mismo valor por capítulo que en el estudio ($200.000), más la jornada ($450.000) y el traslado ($100.000). Regiones V y VI: +$250.000.</li>
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <CTAButtons label="COTIZAR UNA LOCACIÓN" waContext="quiero cotizar una grabación en locación." />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dónde está el estudio — mapa */}
      <section id="ubicacion" style={{ padding: '70px 32px 60px' }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <Kicker>▸ EL ESTUDIO</Kicker>
            <H2>Dónde <Serif color={PF.blue}>estamos.</Serif></H2>
          </div>
          <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.1em', color: PF.ink + 'aa' }}>VITACURA · SANTIAGO · LUNES A VIERNES</div>
        </Reveal>
        <div className="pf-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'stretch' }}>
          <Reveal delay={150} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 18, padding: '24px 26px', border: `1.5px solid ${PF.ink}`, background: PF.bg }}>
            <div>
              <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', marginBottom: 10, color: PF.ink + 'aa', fontWeight: 700 }}>📍 DIRECCIÓN</div>
              <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.025em', lineHeight: 1.1 }}>Eduardo Marquina 3937</div>
              <div style={{ fontSize: 18, marginTop: 4, color: PF.ink + 'cc' }}>Vitacura · Santiago, Chile</div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: PF.ink + 'cc' }}>
              Set listo, iluminado y calibrado, con dos versiones: Base, o Full con paneles de madera y un televisor con tu logo.
              A pasos de Av. Vitacura, con estacionamiento en la calle.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="https://www.google.com/maps/dir/?api=1&destination=Pod+Factory+Premium+Podcast+Studio&destination_place_id=ChIJX7coTmnPYpYRahuOLfgXst0" target="_blank" rel="noopener"
                style={{ background: PF.ink, color: PF.bg, padding: '12px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 999 }}>CÓMO LLEGAR ↗</a>
              <a href="#reservar" style={{ background: 'transparent', color: PF.ink, border: `1.5px solid ${PF.ink}`, padding: '12px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 999 }}>RESERVAR UN PILOTO</a>
            </div>
          </Reveal>
          <Reveal delay={250} style={{ position: 'relative', minHeight: 340, border: `1.5px solid ${PF.ink}`, overflow: 'hidden' }}>
            <iframe
              title="Pod Factory · Eduardo Marquina 3937, Vitacura"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3330.899404141137!2d-70.59428838915612!3d-33.399788573298764!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662cf694e28b75f%3A0xddb217f82d8e1b6a!2sPod%20Factory%2C%20Premium%20Podcast%20Studio!5e0!3m2!1ses!2scl!4v1780004708510!5m2!1ses!2scl"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block', filter: 'grayscale(0.2) contrast(1.05)' }}
              loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </Reveal>
        </div>
      </section>

      {/* Temporadas */}
      <section id="temporadas" style={{ padding: '70px 32px 60px' }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 26 }}>
          <div>
            <Kicker>▸ TEMPORADAS EN EL ESTUDIO</Kicker>
            <H2>Tu podcast, <Serif color={PF.red}>por temporadas.</Serif></H2>
          </div>
          <div style={{ fontFamily: PF.mono, fontSize: 12, color: PF.ink + 'aa', maxWidth: 360, lineHeight: 1.6 }}>
            Mientras más larga la temporada, menor el valor por capítulo. Valores en pesos, más IVA.
          </div>
        </Reveal>
        <Reveal delay={60} style={{ aspectRatio: '4/1', marginBottom: 18, border: `1.5px solid ${PF.ink}`, background: `url(assets/set-full.jpg) center 45% / cover no-repeat` }} />
        <Reveal delay={120} className="pf-table-wrap" style={{ border: `1.5px solid ${PF.ink}`, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 640 }}>
            <thead>
              <tr style={{ background: PF.ink, color: PF.bg }}>
                {['Temporada', 'Descuento', 'Base · por capítulo', 'Base · total', 'Full · por capítulo', 'Full · total'].map((h, i) => (
                  <th key={h} style={{ textAlign: i ? 'right' : 'left', padding: '14px 18px', fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.1em', fontWeight: 700 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEMPORADAS.map((t) => (
                <tr key={t.caps} style={{ background: t.star ? PF.yellow + '40' : 'transparent', borderTop: `1px solid ${PF.ink}20` }}>
                  <td style={{ padding: '16px 18px', fontWeight: 800, fontSize: 18 }}>
                    {t.caps} capítulos
                    {t.min && <span style={{ marginLeft: 10, fontFamily: PF.mono, fontSize: 10, background: PF.ink, color: PF.bg, padding: '3px 8px', letterSpacing: '0.1em' }}>MÍNIMO</span>}
                    {t.star && <span style={{ marginLeft: 10, fontFamily: PF.mono, fontSize: 10, background: PF.yellow, padding: '3px 8px', letterSpacing: '0.1em' }}>★ MÁS ELEGIDA</span>}
                  </td>
                  <td style={{ padding: '16px 18px', textAlign: 'right', fontFamily: PF.mono }}>{t.dto}</td>
                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>{fmtCLP(t.base)}</td>
                  <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 900 }}>{fmtCLP(t.base * t.caps)}</td>
                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>{fmtCLP(t.full)}</td>
                  <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 900 }}>{fmtCLP(t.full * t.caps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <div className="pf-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 22 }}>
          {[
            ['Cada capítulo incluye', 'Bloque de 1 hora de estudio (el capítulo dura 30–40 min), hasta 4 personas, set multicámara, operador y edición simple.', PF.blue],
            ['Set Base o Full', 'Full suma paneles de madera y un televisor con tu logo o tus gráficas: +$100.000 por capítulo.', PF.red],
            ['Pago y agenda', '50% al contratar y 50% a mitad de temporada. Las fechas se agendan al inicio; te recomendamos un día fijo a la semana.', PF.orange],
          ].map(([t, d, c], i) => (
            <Reveal key={t} delay={150 + i * 90} style={{ borderTop: `5px solid ${c}`, paddingTop: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{t}</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6, color: PF.ink + 'aa' }}>{d}</div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={250} style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <PilotoButton size="lg" label="PARTE CON UN PILOTO" />
            <DudasButton size="lg" label="CONTRATAR LA TEMPORADA POR WHATSAPP" waContext="quiero contratar una temporada de mi podcast." />
          </div>
        </Reveal>
      </section>

      {/* Empresas: propuesta en 24 h */}
      <section id="empresas" style={{ padding: '60px 32px', background: PF.blue, color: PF.bg }}>
        <div className="pf-two" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 620px)', gap: 40, alignItems: 'start' }}>
          <Reveal>
            <Kicker color={PF.yellow}>▸ PARA EMPRESAS Y MARCAS</Kicker>
            <H2>Una propuesta <Serif color={PF.yellow}>en 24 horas.</Serif></H2>
            <p style={{ fontSize: 16, lineHeight: 1.6, marginTop: 18, color: PF.bg + 'dd', maxWidth: 480 }}>
              Si el podcast es de tu empresa, te armamos una propuesta con formato, calendario, set y valores,
              con factura y orden de compra si la necesitas. Cuéntanos lo básico y te respondemos.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', fontSize: 15, lineHeight: 1.9, color: PF.bg + 'dd' }}>
              {['Temporadas desde 6 capítulos', 'En el estudio o en tus oficinas', 'Factura, orden de compra y HES'].map((t) => <li key={t}>▸ {t}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={150} style={{ color: PF.ink }}><EmpresasForm /></Reveal>
        </div>
      </section>

      {/* Piloto + calendario */}
      <section id="reservar" style={{ padding: '60px 32px', background: PF.yellow, borderTop: `2px solid ${PF.ink}`, borderBottom: `2px solid ${PF.ink}` }}>
        <div className="pf-two" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 560px)', gap: 40, alignItems: 'start' }}>
          <Reveal>
            <Kicker>▸ ¿QUIERES PROBAR PRIMERO?</Kicker>
            <H2>Graba un <Serif>capítulo piloto.</Serif></H2>
            <div style={{ fontWeight: 900, fontSize: 44, letterSpacing: '-0.03em', marginTop: 22 }}>
              $300.000 <span style={{ fontSize: 16, fontWeight: 600 }}>+ IVA</span>
            </div>
            <div style={{ fontFamily: PF.mono, fontSize: 12, marginTop: 4 }}>TOTAL $357.000 · SET BASE · SE PAGA AL RESERVAR</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '22px 0 0', fontSize: 16, lineHeight: 1.6 }}>
              {[
                'Elige día y hora en el calendario y paga con MercadoPago.',
                'Te llega la confirmación con la dirección y un link para cambiar la fecha.',
                'Si contratas una temporada dentro de 30 días, el piloto pasa a ser tu capítulo 1 y se descuenta del total.',
              ].map((t, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontFamily: PF.mono, fontWeight: 700 }}>0{i + 1}</span><span>{t}</span>
                </li>
              ))}
            </ul>
            <p style={{ fontFamily: PF.mono, fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>
              Lunes a viernes. Cambio de fecha sin costo hasta 48 h antes.
            </p>
          </Reveal>
          <Reveal delay={150} className="pf-calendar-wrap">
            <BookingCalendar />
          </Reveal>
        </div>
      </section>

      {/* Edición y adicionales */}
      <section id="edicion" style={{ padding: '70px 32px 60px' }}>
        <Reveal style={{ marginBottom: 26 }}>
          <Kicker>▸ EDICIÓN Y ADICIONALES</Kicker>
          <H2>Qué incluye <Serif color={PF.red}>cada capítulo.</Serif></H2>
        </Reveal>
        <div className="pf-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {[
            ['EDICIÓN', [
              ['Simple', 'Color, sonido, logo y música al inicio y al cierre, nombres en pantalla, hasta 3 cortes y 1 ronda de cambios.', 'Incluida'],
              ['Con cortes', 'Hasta 10 cortes que pides después de grabar, indicando el minuto de cada uno.', '+$50.000'],
              ['Pro', 'Cortes libres, reordenar partes, tráiler o teaser.', '+$150.000'],
              ['Ronda de cambios extra', 'Cada ronda adicional a la incluida.', '+$50.000'],
            ]],
            ['ADICIONALES', [
              ['3 reels', 'Verticales, con subtítulos, listos para Instagram, TikTok y Shorts.', '$120.000'],
              ['Archivos por cámara', 'Cada cámara por separado y sincronizada, más las pistas de audio. Para editar tus propios cortes.', '$50.000'],
              ['Tiempo extra', 'Bloques de 30 minutos, solo si no hay otra reserva después.', '$100.000'],
            ]],
          ].map(([title, rows], k) => (
            <Reveal key={title} delay={120 + k * 120} style={{ border: `1.5px solid ${PF.ink}`, background: '#fff' }}>
              <div style={{ background: k ? PF.blue : PF.ink, color: PF.bg, padding: '12px 18px', fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.14em', fontWeight: 700 }}>
                {title} · POR CAPÍTULO, + IVA
              </div>
              {rows.map(([n, d, v]) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '14px 18px', borderTop: `1px solid ${PF.ink}18` }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{n}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.45, color: PF.ink + 'aa', marginTop: 3 }}>{d}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 17, whiteSpace: 'nowrap' }}>{v}</div>
                </div>
              ))}
            </Reveal>
          ))}
        </div>
        <Reveal delay={300} style={{ marginTop: 18, background: PF.yellow, padding: '16px 20px', fontSize: 15, lineHeight: 1.5, border: `1.5px solid ${PF.ink}` }}>
          <b>La regla:</b> si pides cambiar el contenido o el orden del capítulo, ya no es edición simple.
          Te decimos qué nivel corresponde y su valor <b>antes</b> de editar, nunca después.
        </Reveal>
      </section>

      {/* Condiciones */}
      <section id="condiciones" style={{ padding: '60px 32px', background: PF.ink, color: PF.bg }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <Kicker color={PF.yellow}>▸ CONDICIONES</Kicker>
            <H2>Las reglas, <Serif color={PF.yellow}>claras desde el inicio.</Serif></H2>
          </div>
          <a href="condiciones.pdf" target="_blank" rel="noopener" style={{
            background: PF.bg, color: PF.ink, padding: '14px 22px', borderRadius: 999, textDecoration: 'none',
            fontWeight: 700, fontSize: 13, letterSpacing: '0.08em',
          }}>DESCARGAR TARIFAS Y CONDICIONES (PDF)</a>
        </Reveal>
        <div className="pf-cond" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {[
            ['Cambios de fecha', 'Sin costo con más de 48 horas de aviso. Con menos de 48 horas, o si no llegan, el capítulo se da por grabado.'],
            ['Puntualidad', 'La hora corre desde la hora reservada, aunque lleguen tarde. ¿Necesitan más? Bloques de 30 minutos.'],
            ['Plazo de la temporada', '6 capítulos en 3 meses, 8 en 4, 10 en 5 y 12 en 6. Los capítulos no grabados en el plazo se pierden.'],
            ['Entrega', '5 días hábiles después de grabar. Tienes 5 días hábiles para pedir tu ronda de cambios.'],
            ['Material', 'Lo guardamos 1 semana después de la entrega. Para conservarlo completo, pide los archivos por cámara.'],
            ['Facturación', 'Factura electrónica con cada pago. El contenido es 100% tuyo.'],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={100 + i * 70} style={{ borderTop: `1.5px solid ${PF.bg}55`, paddingTop: 14 }}>
              <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.14em', color: PF.yellow, fontWeight: 700 }}>{t.toUpperCase()}</div>
              <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 8, color: PF.bg + 'dd' }}>{d}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Productions showcase */}
      <section id="producciones" style={{ padding: '40px 32px 60px', background: PF.ink, color: PF.bg }}>
        <Reveal><PFRays height={10} gap={3} width={180} /></Reveal>
        <Reveal delay={100} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 20 }}>
          <h2 style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 46, letterSpacing: '-0.035em', margin: 0 }}>
            Se grabó aquí
          </h2>
          <a style={{ fontFamily: PF.mono, fontSize: 11, color: PF.yellow, letterSpacing: '0.1em' }}>
            VER TODAS →
          </a>
        </Reveal>
        <div className="pf-productions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {PODCASTS.map((p, i) => {
            const bg = [PF.red, PF.blue, PF.orange, PF.yellow][i];
            const fg = i === 3 ? PF.ink : PF.bg;
            const Tag = p.url ? 'a' : 'div';
            const linkProps = p.url ? { href: p.url, target: '_blank', rel: 'noopener' } : {};
            if (p.image) {
              return (
                <Reveal key={i} delay={200 + i * 110}>
                  <Tag {...linkProps} style={{
                    textDecoration: 'none', display: 'block', color: PF.bg,
                  }}>
                    <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: PF.ink }}>
                      <img
                        src={p.image}
                        alt={p.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.15em', opacity: 0.7 }}>{p.ep}</div>
                      <div style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.05, marginTop: 6 }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: PF.mono, marginTop: 6, opacity: 0.7, lineHeight: 1.4 }}>
                        CON {p.host.toUpperCase()}
                      </div>
                    </div>
                  </Tag>
                </Reveal>
              );
            }
            // Placeholder color card (no image)
            return (
              <Reveal key={i} delay={200 + i * 110}>
                <Tag {...linkProps} style={{
                  padding: 18, aspectRatio: '1/1', position: 'relative',
                  overflow: 'hidden', textDecoration: 'none', display: 'block',
                  background: bg, color: fg,
                }}>
                  <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.15em', opacity: 0.8 }}>{p.ep}</div>
                  <div style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.05, marginTop: 8 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: PF.mono, marginTop: 8, opacity: 0.85, lineHeight: 1.4 }}>
                    CON {p.host.toUpperCase()}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 14, right: 14, width: 28, height: 28, borderRadius: '50%',
                    border: `1.5px solid ${fg}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg viewBox="0 0 20 20" width="10" height="10"><path d="M7 5 L15 10 L7 15 Z" fill={fg} /></svg>
                  </div>
                </Tag>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Technical specs — el equipo que llevamos */}
      <section id="equipo" style={{ padding: '60px 32px', background: PF.yellow }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.2em', marginBottom: 14 }}>
              ▸ EQUIPO TÉCNICO
            </div>
            <h2 style={{
              fontFamily: PF.display, fontWeight: 900, fontSize: 64,
              letterSpacing: '-0.04em', margin: 0, lineHeight: 0.92,
            }}>
              Setup <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400 }}>profesional</span>,<br />
              listo para grabar.
            </h2>
          </div>
          <div style={{ fontFamily: PF.mono, fontSize: 11, color: PF.ink + 'aa', maxWidth: 280, lineHeight: 1.5 }}>
            El mismo equipo en el estudio y en locación: todo viaja con nosotros.
          </div>
        </Reveal>

        <div className="pf-techspecs" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {[
            ['CÁMARAS',  '4 × Blackmagic Pocket',           '2 × 6K + 2 × 4K. Switcher ATEM Extreme ISO con grabación independiente por cámara.',          PF.blue],
            ['AUDIO',    'RØDE PodMic',                     'Cuatro micrófonos broadcast con preamps Blackmagic. Master en Fairlight (DaVinci Resolve).', PF.red],
            ['LUCES',    'Godox',                           'Iluminación de set continua y regulable. Configuraciones preset para vodcast y entrevista.', PF.orange],
            ['POST',     'DaVinci Resolve',                 'Edición, corrección de color y masterizado de sonido en Fairlight. Flujo 100% Blackmagic.',  PF.ink],
          ].map(([cat, gear, desc, c], i) => (
            <Reveal key={i} delay={200 + i * 130} style={{ background: PF.bg, padding: 22, border: `1.5px solid ${PF.ink}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', fontWeight: 700 }}>{cat}</div>
                <div style={{ width: 40, height: 6, background: c }} />
              </div>
              <div style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                {gear}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 10, color: PF.ink + 'aa' }}>{desc}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '70px 32px', borderTop: `1.5px solid ${PF.ink}` }}>
        <Reveal style={{ marginBottom: 36 }}>
          <Kicker>▸ PREGUNTAS FRECUENTES</Kicker>
          <H2 style={{ fontSize: 64, maxWidth: 820 }}>Preguntas <Serif color={PF.red}>frecuentes</Serif>.</H2>
        </Reveal>

        <style>{`
          .pf-faq details { border-top: 1.5px solid ${PF.ink}; padding: 22px 0; position: relative; }
          .pf-faq details:last-child { border-bottom: 1.5px solid ${PF.ink}; }
          .pf-faq summary {
            list-style: none; cursor: pointer; display: flex; align-items: flex-start;
            justify-content: space-between; gap: 24px;
            font-family: ${PF.display}; font-weight: 700; font-size: 22px;
            letter-spacing: -0.018em; line-height: 1.2; color: ${PF.ink};
          }
          .pf-faq summary::-webkit-details-marker { display: none; }
          .pf-faq summary .pf-faq-icon {
            flex-shrink: 0; width: 28px; height: 28px; border: 1.5px solid ${PF.ink};
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-family: ${PF.mono}; font-size: 18px; line-height: 1; transition: transform 0.25s ease;
            margin-top: 2px;
          }
          .pf-faq details[open] .pf-faq-icon { transform: rotate(45deg); background: ${PF.yellow}; }
          .pf-faq details[open] summary { color: ${PF.blue}; }
          .pf-faq-body {
            margin-top: 14px; max-width: 820px;
            font-size: 15px; line-height: 1.6; color: ${PF.ink}cc;
          }
          .pf-faq-body b { color: ${PF.ink}; font-weight: 700; }
          @media (max-width: 720px) {
            .pf-faq summary { font-size: 17px; }
            .pf-faq-body { font-size: 14px; }
          }
        `}</style>

        <Reveal delay={150} className="pf-faq" style={{ maxWidth: 920 }}>
          {[
            {
              q: '¿Son un estudio o una productora?',
              a: <>Las dos cosas. Tenemos <b>estudio propio en Vitacura</b> (Eduardo Marquina 3937), donde se graban las temporadas, y como productora te ayudamos con el formato, editamos y entregamos cada capítulo listo para publicar. También grabamos <b>en locación</b> (tu oficina, un evento o cualquier lugar, en Santiago y regiones), con jornadas desde $950.000 + IVA (2 capítulos en Santiago).</>,
            },
            {
              q: '¿Puedo grabar un solo capítulo?',
              a: <>Trabajamos por temporadas desde 6 capítulos. Si quieres probar antes, reserva un <b>capítulo piloto</b> ($300.000 + IVA): si contratas una temporada dentro de 30 días, el piloto pasa a ser tu capítulo 1 y se descuenta del total.</>,
            },
            {
              q: '¿Qué pasa si nos pasamos de la hora?',
              a: <>Cada capítulo es un bloque de 1 hora. Si necesitan más tiempo, se contrata en <b>bloques de 30 minutos ($100.000 + IVA)</b>, solo si no hay otra reserva después. Te avisamos a los 50 minutos de grabación.</>,
            },
            {
              q: '¿Qué incluye la edición simple?',
              a: <>Color, sonido, logo y música al inicio y al cierre, nombres en pantalla, <b>hasta 3 cortes</b> y 1 ronda de cambios. Si necesitas más cortes o reordenar el capítulo, tienes la edición con cortes (+$50.000) o la Pro (+$150.000). Siempre te lo decimos antes de editar.</>,
            },
            {
              q: '¿Y si necesito cambiar la fecha?',
              a: <>Sin costo con más de <b>48 horas</b> de aviso, desde el link que te llega en el correo de confirmación. Con menos de 48 horas, o si no llegan, el capítulo se da por grabado.</>,
            },
            {
              q: '¿Hasta cuántas personas pueden grabar?',
              a: <>Hasta <b>4 personas</b> en el set, cada una con su micrófono.</>,
            },
            {
              q: '¿Cuándo recibo el material?',
              a: <>En <b>5 días hábiles</b> después de la grabación, en archivo MP4. Guardamos el material 1 semana después de la entrega; si lo quieres completo, pide los archivos por cámara.</>,
            },
            {
              q: '¿Hacen streaming en vivo?',
              a: <>Sí, se cotiza aparte. Transmitimos multicámara en vivo a YouTube, LinkedIn, Zoom o la plataforma que prefieras.</>,
            },
            {
              q: '¿Quién es dueño del contenido?',
              a: <>El contenido es <b>100% tuyo</b>. Eres responsable de los derechos de música, imágenes y marcas que aparezcan. Solo usamos extractos en nuestro portafolio si nos autorizas por escrito.</>,
            },
          ].map(({ q, a }, i) => (
            <Reveal as="details" key={i} delay={200 + i * 50}>
              <summary>
                <span>{q}</span>
                <span className="pf-faq-icon">+</span>
              </summary>
              <div className="pf-faq-body">{a}</div>
            </Reveal>
          ))}
        </Reveal>

        <Reveal delay={400} style={{ marginTop: 36, fontFamily: PF.mono, fontSize: 12, color: PF.ink + 'aa' }}>
          ¿Otra pregunta? Escríbenos por{' '}
          <a href={waLink('tengo una duda sobre Pod Factory.')} target="_blank" rel="noopener" style={{ color: PF.blue, fontWeight: 700, textDecoration: 'underline' }}>
            WhatsApp
          </a>
          {' '}y te respondemos rápido.
        </Reveal>
      </section>

      {/* Footer */}
      <footer id="contacto" style={{ background: PF.ink, color: PF.bg, padding: '40px 32px 24px' }}>
        <Reveal><PFRays height={8} gap={2} /></Reveal>
        <Reveal delay={150} className="pf-footer-grid" style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 24,
          marginTop: 30, paddingBottom: 24, borderBottom: `1px solid ${PF.bg}25`,
        }}>
          <div>
            <img
              src="assets/podfactory-logo.png"
              alt="Pod Factory"
              style={{ height: 80, display: 'block', marginBottom: 14 }}
            />
            <a href="https://doppel.cl/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontFamily: PF.mono, letterSpacing: '0.1em', color: PF.yellow, textDecoration: 'none' }}>
              <img src="assets/doppel-logo.png" alt="Doppel" style={{ height: 16, display: 'block', filter: 'invert(94%) sepia(8%) saturate(120%) hue-rotate(347deg) brightness(98%) contrast(94%)' }} />
              <span>UNA SECCIÓN DE DOPPEL ↗</span>
            </a>
            <p style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 320, marginTop: 12, color: PF.bg + 'aa' }}>
              La productora de podcasts y vodcasts de Doppel.
              Estudio propio en Vitacura (Eduardo Marquina 3937) o donde estés.
              Multicámara, audio broadcast y edición en DaVinci Resolve.
            </p>
          </div>
          {[
            ['PRODUCCIÓN', ['Productora de podcast & vodcast', 'Estudio en Vitacura + locación', 'Formato · grabación · edición']],
            ['CONTACTO',   ['hola@doppel.cl', '+56 9 2797 0014', 'WhatsApp']],
            ['DOPPEL',     ['Estudio creativo + Lab', 'Audiovisual · 3D · Apps', 'Volver a doppel.cl ↗']],
          ].map(([h, items]) => (
            <div key={h}>
              <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.15em', color: PF.yellow, marginBottom: 10 }}>{h}</div>
              {items.map(it => <div key={it} style={{ fontSize: 12, marginBottom: 5, color: PF.bg + 'dd' }}>{it}</div>)}
            </div>
          ))}
        </Reveal>
        <Reveal delay={300} style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: PF.mono, letterSpacing: '0.08em', color: PF.bg + '88' }}>
          <span>© DOPPEL · 2011—2026 · POD FACTORY</span>
          <span>IG · YOUTUBE · SPOTIFY · TIKTOK</span>
        </Reveal>
      </footer>

      <FloatingCTA />
    </div>
  );
}

window.PodFactoryLanding = PodFactoryLanding;
