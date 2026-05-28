// Pod Factory landing page — Doppel's podcast & vodcast studio.
// Self-contained section dedicated to the recording studio offering.

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

// Generic fade-up wrapper triggered by IntersectionObserver
function Reveal({ children, delay = 0, distance = 22, duration = 750, threshold = 0.2, style = {}, as: Tag = 'div' }) {
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

function PodFactoryLanding() {
  return (
    <div style={{ background: PF.bg, color: PF.ink, fontFamily: PF.display, minHeight: '100%' }}>
      <SiteChrome url="doppel.cl/pod-factory" bg="#ecdfc3" fg={PF.ink} />

      {/* Parent brand bar — signals Pod Factory is part of Doppel ecosystem */}
      <div style={{
        background: PF.ink, color: PF.bg, padding: '10px 32px',
        fontSize: 12, fontFamily: PF.mono, letterSpacing: '0.1em',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: PF.bg + '80' }}>ESTÁS EN</span>
          <span style={{ fontWeight: 700 }}>POD FACTORY</span>
          <span style={{ color: PF.bg + '50' }}>→ POR</span>
          <a href="https://doppel.cl/" style={{
            color: PF.yellow, fontWeight: 700, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>DOPPEL ↗</a>
          <span style={{ color: PF.bg + '50', marginLeft: 6 }}>(agencia creativa)</span>
        </div>
        <span style={{ color: PF.bg + '80' }}>VITACURA · SANTIAGO</span>
      </div>

      {/* Header with Doppel logo + Pod Factory marker */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 32px', borderBottom: `1.5px solid ${PF.ink}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="https://doppel.cl/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="assets/doppel-logo.png" alt="Doppel" style={{ height: 22, display: 'block', opacity: 0.6 }} />
          </a>
          <div style={{
            paddingLeft: 14, borderLeft: `1.5px solid ${PF.ink}30`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <img
              src="assets/podfactory-logo.png"
              alt="Pod Factory"
              style={{ height: 48, display: 'block' }}
            />
            <div style={{ fontFamily: PF.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: PF.ink + '99', lineHeight: 1.4 }}>
              PODCAST · VODCAST<br />EST. 2024
            </div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 26, fontSize: 13, fontWeight: 500 }}>
          {[
            ['El espacio',   '#espacio'],
            ['Servicios',    '#servicios'],
            ['Producciones', '#producciones'],
            ['Tarifas',      '#tarifas'],
            ['Contacto',     '#contacto'],
          ].map(([l, h]) => (
            <a key={l} href={h} style={{ color: PF.ink, textDecoration: 'none' }}>{l}</a>
          ))}
        </nav>
        <a
          href={waLink('quiero reservar Pod Factory para mi podcast.')}
          target="_blank" rel="noopener"
          style={{
            background: PF.red, color: PF.bg, padding: '12px 22px',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
            fontFamily: PF.display, textDecoration: 'none', display: 'inline-block',
          }}
        >
          RESERVAR →
        </a>
      </header>

      {/* Hero */}
      <section id="espacio" style={{ padding: '60px 80px 40px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ fontSize: 11, fontFamily: PF.mono, letterSpacing: '0.18em', marginBottom: 18 }}>
            ▸ ESTUDIO DE PODCAST &amp; VODCAST · DESDE 2024
          </div>
          <h1 style={{
            fontFamily: PF.display, fontWeight: 900, fontSize: 88, lineHeight: 0.9,
            letterSpacing: '-0.04em', margin: 0,
          }}>
            Tu <span style={{ color: PF.red }}>podcast</span><br />
            en <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400 }}>cuatro</span> cámaras,<br />
            <span style={{ color: PF.blue }}>sin excusas.</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, maxWidth: 540, marginTop: 22 }}>
            Cabina premium en Vitacura con setup multicámara listo para vodcast,
            masterización incluida, y un equipo que produce, edita y distribuye.
            Llegas, te sientas, grabas. Nosotros hacemos el resto.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href={waLink('quiero reservar Pod Factory.')}
              target="_blank" rel="noopener"
              style={{
                background: PF.ink, color: PF.bg, padding: '16px 26px',
                fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', fontFamily: PF.display,
                textDecoration: 'none', display: 'inline-block',
              }}
            >RESERVAR ESTUDIO →</a>
            <a href="#tarifas" style={{
              background: 'transparent', color: PF.ink, border: `1.5px solid ${PF.ink}`,
              padding: '16px 26px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
              fontFamily: PF.display, textDecoration: 'none', display: 'inline-block',
            }}>VER TARIFAS</a>
            <div style={{ fontSize: 11, fontFamily: PF.mono, color: PF.ink + 'aa', marginLeft: 8 }}>
              Desde<br /><b style={{ color: PF.ink, fontSize: 14 }}>$149.990 + IVA / hora</b>
            </div>
          </div>
        </Reveal>

        {/* Studio preview tile — looping reel */}
        <Reveal delay={250} style={{ position: 'relative', width: 320 }}>
          <div style={{
            aspectRatio: '9/16', background: PF.ink, position: 'relative', overflow: 'hidden',
          }}>
            <video
              src="assets/reel-portada.mp4"
              autoPlay muted loop playsInline
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
              }}
            />
            <div style={{
              position: 'absolute', bottom: 14, left: 14, right: 14,
              background: PF.yellow, padding: '10px 14px',
              fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.1em',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700 }}>MULTICÁMARA</span>
              <span>4 × BLACKMAGIC · 2×6K + 2×4K</span>
            </div>
          </div>
          {/* Ray decoration */}
          <div style={{ position: 'absolute', top: -10, right: -10 }}>
            <PFRays height={8} gap={3} width={80} />
          </div>
        </Reveal>
      </section>

      {/* Quick facts strip */}
      <section style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: `2px solid ${PF.ink}`, borderBottom: `2px solid ${PF.ink}`,
      }}>
        {[
          ['4', 'cámaras 6K/4K', PF.blue],
          ['+300', 'episodios producidos', PF.red],
          ['24h', 'entrega masterizada', PF.orange],
          ['2', 'cabinas + móvil', PF.yellow],
        ].map(([n, l, c], i) => (
          <Reveal key={i} delay={i * 120} style={{
            padding: '30px 20px', borderRight: i < 3 ? `1.5px solid ${PF.ink}` : 'none',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: c }} />
            <div style={{ fontFamily: PF.display, fontSize: 54, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: PF.mono, fontSize: 12, letterSpacing: '0.08em', marginTop: 6, color: PF.ink + 'aa' }}>
              {l.toUpperCase()}
            </div>
          </Reveal>
        ))}
      </section>

      {/* What you get */}
      <section id="servicios" style={{ padding: '60px 32px' }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <h2 style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 48, letterSpacing: '-0.035em', margin: 0 }}>
            Qué incluye tu <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400, color: PF.red }}>sesión</span>
          </h2>
          <div style={{ fontFamily: PF.mono, fontSize: 11 }}>TODO INCLUIDO</div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['Grabación multicámara', 'Cuatro Blackmagic Pocket (2×6K + 2×4K) con switcher ATEM Extreme ISO en vivo. Entregamos bruto + master editado.', PF.blue],
            ['Audio broadcast', 'Micrófonos RØDE PodMic con procesamiento en tiempo real. Master de sonido en Fairlight (DaVinci Resolve).', PF.red],
            ['Dirección & producción', 'Un productor dedicado, guía de entrevista, y edición de primer corte.', PF.orange],
            ['Streaming opcional', 'Transmisión en vivo a YouTube, Spotify Video o tu plataforma.', PF.yellow],
            ['Cabina móvil', 'Llevamos el estudio donde estés. Ideal para entrevistas fuera de Santiago.', PF.blue],
            ['Distribución', 'Subimos por ti a Spotify, Apple Podcasts, YouTube, Amazon. Desde el EP 1.', PF.red],
          ].map(([t, d, c], i) => (
            <Reveal key={i} delay={150 + i * 100} style={{ border: `1.5px solid ${PF.ink}`, background: PF.bg }}>
              <div style={{ height: 6, background: c }} />
              <div style={{ padding: 18 }}>
                <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.1em', marginBottom: 10 }}>
                  0{i + 1}
                </div>
                <div style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>{t}</div>
                <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 6, color: PF.ink + 'aa' }}>{d}</div>
              </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
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

      {/* Booking calendar snapshot */}
      <section id="tarifas" style={{ padding: '60px 32px' }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <h2 style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 48, letterSpacing: '-0.035em', margin: 0 }}>
            Reserva tu hora
          </h2>
          <div style={{ fontFamily: PF.mono, fontSize: 12 }}>SEMANA DEL 23 AL 29 DE MAR</div>
        </Reveal>

        <Reveal delay={150} style={{ border: `1.5px solid ${PF.ink}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: PF.ink, color: PF.bg }}>
            {['LUN 23', 'MAR 24', 'MIÉ 25', 'JUE 26', 'VIE 27', 'SÁB 28', 'DOM 29'].map((d, i) => (
              <div key={d} style={{
                padding: '10px 12px', fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.08em',
                borderRight: i < 6 ? `1px solid ${PF.bg}20` : 'none',
              }}>{d}</div>
            ))}
          </div>
          {['10:00', '12:00', '14:00', '16:00', '18:00'].map((h, row) => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderTop: row > 0 ? `1px solid ${PF.ink}25` : 'none' }}>
              <div style={{ padding: '14px 12px', fontFamily: PF.mono, fontSize: 11, borderRight: `1px solid ${PF.ink}25`, background: PF.bg }}>
                {h}
              </div>
              {[0,1,2,3,4,5,6].map(col => {
                const states = [
                  ['','','','','bk','',''],
                  ['','bk','','','','',''],
                  ['','','hold','','bk','',''],
                  ['bk','','','bk','','',''],
                  ['','','','','','hold',''],
                ];
                const s = states[row][col];
                const bg = s === 'bk' ? PF.red : s === 'hold' ? PF.blue : 'transparent';
                const color = s ? PF.bg : PF.ink;
                return (
                  <div key={col} style={{
                    padding: '14px 10px', fontSize: 11, fontFamily: PF.mono,
                    background: bg, color, borderRight: col < 6 ? `1px solid ${PF.ink}25` : 'none',
                    cursor: s ? 'default' : 'pointer',
                  }}>
                    {s === 'bk' ? 'RESERVADO' : s === 'hold' ? 'TENTATIVO' : '—'}
                  </div>
                );
              })}
            </div>
          ))}
        </Reveal>

        <Reveal delay={300} style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 11, fontFamily: PF.mono }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: 'transparent', border: `1px solid ${PF.ink}` }} /> DISPONIBLE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: PF.red }} /> RESERVADO
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: PF.blue }} /> TENTATIVO
          </span>
        </Reveal>
      </section>

      {/* Technical specs — what's inside the studio */}
      <section style={{ padding: '60px 32px', background: PF.yellow }}>
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
            Todo el gear actualizado y mantenido. Sin sorpresas, sin atajos.
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
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

      {/* Footer */}
      <footer id="contacto" style={{ background: PF.ink, color: PF.bg, padding: '40px 32px 24px' }}>
        <Reveal><PFRays height={8} gap={2} /></Reveal>
        <Reveal delay={150} style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 24,
          marginTop: 30, paddingBottom: 24, borderBottom: `1px solid ${PF.bg}25`,
        }}>
          <div>
            <img
              src="assets/podfactory-logo.png"
              alt="Pod Factory"
              style={{ height: 80, display: 'block', marginBottom: 14 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontFamily: PF.mono, letterSpacing: '0.1em', color: PF.yellow }}>
              <img src="assets/doppel-logo.png" alt="Doppel" style={{ height: 16, display: 'block', filter: 'invert(94%) sepia(8%) saturate(120%) hue-rotate(347deg) brightness(98%) contrast(94%)' }} />
              <span>POR DOPPEL ↗</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 320, marginTop: 12, color: PF.bg + 'aa' }}>
              Estudio premium de podcast y vodcast en Vitacura, Santiago.
              Multicámara Blackmagic 6K/4K, audio broadcast, masterización en Fairlight.
            </p>
          </div>
          {[
            ['ESTUDIO',  ['Eduardo Marquina 3937', 'Vitacura · Santiago', 'Lun–Sáb · Reserva online']],
            ['RESERVAS', ['hola@doppel.cl', '+56 9 2797 0014', 'WhatsApp']],
            ['DOPPEL',   ['Agencia creativa 360°', 'Producción audiovisual', 'Ver doppel.cl ↗']],
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
    </div>
  );
}

window.PodFactoryLanding = PodFactoryLanding;
