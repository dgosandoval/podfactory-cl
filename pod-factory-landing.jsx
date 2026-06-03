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

function WhatsAppIcon({ size = 16, color = '#fff' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ display: 'block', flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// Botón de WhatsApp solo-ícono (círculo verde).
function WhatsAppButton({ dim = 44, waContext = 'quiero reservar Pod Factory.', style = {} }) {
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

// Par de acciones siempre juntas: Reservar (→ calendario) + WhatsApp (ícono).
function CTAButtons({ size = 'md', waContext = 'quiero reservar Pod Factory.', style = {} }) {
  const pad = size === 'lg' ? '16px 26px' : size === 'sm' ? '11px 18px' : '14px 22px';
  const fs = size === 'sm' ? 12 : 13;
  const dim = size === 'lg' ? 50 : size === 'sm' ? 38 : 44;
  return (
    <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', ...style }}>
      <a href="#reservar" style={{
        padding: pad, fontSize: fs, fontWeight: 700, letterSpacing: '0.08em',
        fontFamily: PF.display, textDecoration: 'none', borderRadius: 999,
        background: PF.red, color: PF.bg, display: 'inline-flex', alignItems: 'center', lineHeight: 1,
      }}>RESERVAR</a>
      <WhatsAppButton dim={dim} waContext={waContext} />
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

function PodFactoryLanding() {
  return (
    <div style={{ background: PF.bg, color: PF.ink, fontFamily: PF.display, minHeight: '100%' }}>
      <SiteChrome url="doppel.cl/pod-factory" bg="#ecdfc3" fg={PF.ink} />

      {/* Parent brand bar — signals Pod Factory is part of Doppel ecosystem */}
      <div className="pf-brandbar" style={{
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
            <img
              className="pf-logo-img"
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
            ['El espacio',   '#espacio',     false],
            ['Servicios',    '#servicios',   false],
            ['Producciones', '#producciones', false],
            ['Tarifas',      '#tarifas',     false],
            ['Ubicación',    '#ubicacion',   false],
            ['FAQ',          '#faq',         false],
            ['Contacto',     waLink('quiero conversar con Pod Factory.'), true],
          ].map(([l, h, ext]) => (
            <a
              key={l}
              href={h}
              {...(ext ? { target: '_blank', rel: 'noopener' } : {})}
              style={{ color: PF.ink, textDecoration: 'none' }}
            >{l}</a>
          ))}
        </nav>
        <CTAButtons size="sm" waContext="quiero reservar Pod Factory para mi podcast." />
      </header>

      {/* Hero */}
      <section id="espacio" className="pf-hero" style={{ padding: '60px 80px 40px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ fontSize: 11, fontFamily: PF.mono, letterSpacing: '0.18em', marginBottom: 18 }}>
            ▸ ESTUDIO DE PODCAST &amp; VODCAST · DESDE 2024
          </div>
          <h1 style={{
            fontFamily: PF.display, fontWeight: 900, fontSize: 76, lineHeight: 0.95,
            letterSpacing: '-0.04em', margin: 0,
          }}>
            Tu <span style={{ color: PF.red }}>podcast</span> con<br />
            calidad <span style={{ color: PF.blue }}>profesional</span><br />
            a la altura de <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400 }}>tu contenido.</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, maxWidth: 540, marginTop: 22 }}>
            Estudio premium en Vitacura con setup multicámara listo para vodcast,
            masterización incluida, y un equipo que produce, edita y distribuye.
            Llegas, te sientas, grabas. Nosotros hacemos el resto.
          </p>
          <div className="pf-hero-cta" style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <CTAButtons size="lg" />
            <a href="#tarifas" style={{
              background: 'transparent', color: PF.ink, border: `1.5px solid ${PF.ink}`,
              padding: '16px 26px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
              fontFamily: PF.display, textDecoration: 'none', display: 'inline-block',
              borderRadius: 999,
            }}>VER TARIFAS</a>
            <div style={{ fontSize: 11, fontFamily: PF.mono, color: PF.ink + 'aa', marginLeft: 8 }}>
              Desde<br /><b style={{ color: PF.ink, fontSize: 14 }}>$199.990 + IVA / hora</b>
            </div>
          </div>
        </Reveal>

        {/* Studio preview tile — looping reel */}
        <Reveal delay={250} className="pf-reel" style={{ position: 'relative', width: 320 }}>
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
              fontWeight: 700, textAlign: 'center',
            }}>
              ESTUDIO PREMIUM MULTICÁMARA EN VITACURA
            </div>
          </div>
          {/* Ray decoration */}
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
          ['4', 'cámaras 6K/4K', PF.blue],
          ['+300', 'episodios producidos', PF.red],
          ['24h', 'entrega masterizada', PF.orange],
          ['2', 'estudios + móvil', PF.yellow],
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

        <div className="pf-services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['Grabación multicámara', 'Cuatro Blackmagic Pocket (2×6K + 2×4K) con switcher ATEM Extreme ISO en vivo. Entregamos bruto + master editado.', PF.blue],
            ['Audio broadcast', 'Micrófonos RØDE PodMic con procesamiento en tiempo real. Master de sonido en Fairlight (DaVinci Resolve).', PF.red],
            ['Dirección & producción', 'Un productor dedicado, guía de entrevista, y edición de primer corte.', PF.orange],
            ['Streaming opcional', 'Transmisión en vivo a YouTube, Spotify Video o tu plataforma.', PF.yellow],
            ['Estudio móvil', 'Llevamos el estudio donde estés. Ideal para entrevistas fuera de Santiago.', PF.blue],
            ['Distribución (con Edición Pro)', 'Subimos por ti a Spotify, Apple Podcasts, YouTube, Amazon. Incluido al elegir Edición Pro.', PF.red],
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

      {/* Pricing table */}
      <section id="tarifas" style={{ padding: '60px 32px' }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 48, letterSpacing: '-0.035em', margin: 0 }}>
            Tarifas <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400, color: PF.red }}>y servicios</span>
          </h2>
          <div style={{ fontFamily: PF.mono, fontSize: 11, color: PF.ink + 'aa', letterSpacing: '0.1em' }}>
            PRECIOS POR HORA · NO INCLUYEN IVA
          </div>
        </Reveal>
        <Reveal delay={100} style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 620, color: PF.ink + 'cc' }}>
            Cada sesión incluye 60 minutos efectivos de grabación + 20 minutos de setup. Reserva con $30.000 de adelanto.
          </p>
        </Reveal>

        {/* Base price — single tier, up to 4 people */}
        <Reveal delay={200} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', color: PF.ink + '99', marginBottom: 12, fontWeight: 700 }}>
            ① TARIFA BASE · GRABACIÓN + EDICIÓN BÁSICA
          </div>
          <div style={{ border: `1.5px solid ${PF.ink}`, background: PF.bg, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ width: 48, height: 6, background: PF.blue, marginBottom: 14 }} />
              <div style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>
                Sesión por hora · hasta 4 personas
              </div>
              <div style={{ fontSize: 13, color: PF.ink + 'aa', marginTop: 5 }}>
                Grabación + Edición Básica · tarifa única independiente de la cantidad de invitados
              </div>
            </div>
            <div style={{ fontFamily: PF.mono, fontWeight: 700, fontSize: 28, whiteSpace: 'nowrap' }}>
              $199.990
            </div>
          </div>
        </Reveal>

        {/* Add-ons */}
        <Reveal delay={350}>
          <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', color: PF.ink + '99', marginBottom: 12, fontWeight: 700 }}>
            ② ADICIONALES OPCIONALES · SUMA A LA TARIFA BASE
          </div>
          <div style={{ border: `1.5px solid ${PF.ink}`, background: PF.bg }}>
            {[
              {
                name: 'Edición Pro',
                desc: 'Teaser de mejores momentos al inicio + reel vertical para RRSS. Incluye distribución a Spotify, Apple Podcasts, YouTube y Amazon.',
                delta: 99990,
                color: PF.orange,
              },
              {
                name: '3 Reels adicionales',
                desc: 'Tres reels verticales de 60s editados, listos para redes',
                delta: 99990,
                color: PF.yellow,
              },
            ].map((a, i) => (
              <div key={i} style={{
                padding: '20px 24px',
                borderTop: i > 0 ? `1px solid ${PF.ink}20` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 6, height: 44, background: a.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: PF.display, fontWeight: 700, fontSize: 19, letterSpacing: '-0.015em' }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: 13, color: PF.ink + 'aa', marginTop: 3, lineHeight: 1.4 }}>
                      {a.desc}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: PF.mono, fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap', color: PF.ink }}>
                  +${a.delta.toLocaleString('es-CL')}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Webinar special tier */}
        <Reveal delay={500} style={{
          marginTop: 14, padding: '20px 24px', background: PF.yellow,
          border: `1.5px solid ${PF.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', marginBottom: 6, fontWeight: 700 }}>
              📡 WEBINAR · STREAMING
            </div>
            <div style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
              Streaming en vivo a la plataforma de tu elección
            </div>
            <div style={{ fontSize: 13, color: PF.ink + 'aa', marginTop: 4 }}>
              Setup broadcast multicámara con transmisión directa a YouTube, LinkedIn, Zoom o tu plataforma.
            </div>
          </div>
          <div style={{ fontFamily: PF.mono, fontWeight: 700, fontSize: 22, whiteSpace: 'nowrap' }}>
            $149.990
          </div>
        </Reveal>

        {/* What's included in base */}
        <Reveal delay={650} style={{
          marginTop: 28, padding: '20px 24px', background: PF.ink, color: PF.bg,
        }}>
          <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', color: PF.yellow, marginBottom: 10, fontWeight: 700 }}>
            ✂️ EDICIÓN BÁSICA INCLUYE
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: PF.bg + 'cc', maxWidth: 760 }}>
            Logo al inicio y final, música de intro/outro, sobreimpresos con nombre y cargo,
            corrección de color y sonido. Entrega de archivo de video + audio listo para publicar.
          </div>
        </Reveal>

        {/* Booking calendar — reserva online con adelanto por MercadoPago */}
        <Reveal delay={750} style={{ marginTop: 40 }} id="reservar">
          <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', color: PF.ink + '99', marginBottom: 12, fontWeight: 700 }}>
            ③ RESERVA ONLINE · ELIGE DÍA Y HORA
          </div>
          <BookingCalendar />
        </Reveal>

        <Reveal delay={800} style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: PF.mono, fontSize: 11, color: PF.ink + '99', width: '100%', marginBottom: 4 }}>
            ¿Dudas o prefieres coordinar por WhatsApp?
          </div>
          <WhatsAppButton dim={48} waContext="tengo una duda sobre reservar en Pod Factory." />
        </Reveal>
      </section>

      {/* Location — embedded Google Maps */}
      <section id="ubicacion" style={{ padding: '60px 32px', borderTop: `1.5px solid ${PF.ink}` }}>
        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 48, letterSpacing: '-0.035em', margin: 0 }}>
            Dónde <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400, color: PF.blue }}>estamos</span>
          </h2>
          <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.1em', color: PF.ink + 'aa' }}>
            VITACURA · SANTIAGO
          </div>
        </Reveal>

        <div className="pf-location-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'stretch' }}>
          <Reveal delay={150} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 18, padding: '24px 26px', border: `1.5px solid ${PF.ink}`, background: PF.bg }}>
            <div>
              <div style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: '0.18em', marginBottom: 10, color: PF.ink + 'aa', fontWeight: 700 }}>
                📍 DIRECCIÓN
              </div>
              <div style={{ fontFamily: PF.display, fontWeight: 800, fontSize: 26, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                Eduardo Marquina 3937
              </div>
              <div style={{ fontFamily: PF.display, fontWeight: 400, fontSize: 18, marginTop: 4, color: PF.ink + 'cc' }}>
                Vitacura · Santiago, Chile
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: PF.ink + 'cc' }}>
              A pasos de Av. Vitacura. Estacionamiento disponible en la calle. Llegada fácil en auto, Uber o transporte público.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Pod+Factory+Premium+Podcast+Studio&destination_place_id=ChIJX7coTmnPYpYRahuOLfgXst0"
                target="_blank" rel="noopener"
                style={{
                  background: PF.ink, color: PF.bg, padding: '12px 18px',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', fontFamily: PF.display,
                  textDecoration: 'none', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1,
                }}
              >CÓMO LLEGAR ↗</a>
              <a
                href="https://maps.google.com/?cid=15974244234725613418"
                target="_blank" rel="noopener"
                style={{
                  background: 'transparent', color: PF.ink, border: `1.5px solid ${PF.ink}`,
                  padding: '12px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                  fontFamily: PF.display, textDecoration: 'none', display: 'inline-block', borderRadius: 999,
                }}
              >ABRIR EN MAPS</a>
            </div>
          </Reveal>

          <Reveal delay={250} style={{ position: 'relative', minHeight: 320, border: `1.5px solid ${PF.ink}`, overflow: 'hidden' }}>
            <iframe
              title="Pod Factory · Eduardo Marquina 3937, Vitacura"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3330.899404141137!2d-70.59428838915612!3d-33.399788573298764!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662cf694e28b75f%3A0xddb217f82d8e1b6a!2sPod%20Factory%2C%20Premium%20Podcast%20Studio!5e0!3m2!1ses!2scl!4v1780004708510!5m2!1ses!2scl"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block', filter: 'grayscale(0.2) contrast(1.05)' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </Reveal>
        </div>
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
          <div style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: '0.2em', marginBottom: 14 }}>
            ▸ PREGUNTAS FRECUENTES
          </div>
          <h2 style={{
            fontFamily: PF.display, fontWeight: 900, fontSize: 64,
            letterSpacing: '-0.04em', margin: 0, lineHeight: 0.92, maxWidth: 820,
          }}>
            Lo que <span style={{ fontFamily: PF.serif, fontStyle: 'italic', fontWeight: 400, color: PF.red }}>siempre</span> nos preguntan.
          </h2>
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
              q: '¿Cuánto dura una sesión?',
              a: <>Cada sesión incluye <b>60 minutos de grabación</b> + <b>20 minutos de setup</b>. Recomendamos llegar 10 minutos antes para coordinar la pauta y revisar el material que vayas a usar.</>,
            },
            {
              q: '¿Hasta cuántas personas pueden grabar al mismo tiempo?',
              a: <>El estudio acomoda <b>hasta 4 personas</b> en cabina con calidad broadcast. La tarifa es plana: <b>$199.990 + IVA por hora</b>, independiente de si grabas solo o con 3 invitados.</>,
            },
            {
              q: '¿Qué incluye la Edición Básica?',
              a: <>Logo al inicio y final, música de intro/outro, sobreimpresos con nombre y cargo, corrección de color y master de sonido. Entregamos el archivo de video + audio listo para publicar.</>,
            },
            {
              q: '¿Qué suma la Edición Pro?',
              a: <>Edición Pro (<b>+$99.990</b>) agrega un teaser de mejores momentos al inicio del episodio, un reel vertical para redes sociales y la <b>distribución</b> a Spotify, Apple Podcasts, YouTube y Amazon Music desde nuestras cuentas hacia tu canal.</>,
            },
            {
              q: '¿Hacen streaming en vivo?',
              a: <>Sí. El paquete de Streaming (<b>$149.990</b>) transmite multicámara en vivo a YouTube, LinkedIn, Zoom o la plataforma que prefieras. Necesitamos los accesos y datos RTMP el día de la sesión.</>,
            },
            {
              q: '¿Cómo reservo y qué medios de pago aceptan?',
              a: <>Reservas directo desde el calendario en la sección Tarifas. Confirmamos con <b>$30.000 de adelanto</b> y el saldo se paga el día de la sesión. Aceptamos MercadoPago (crédito, débito y transferencia).</>,
            },
            {
              q: '¿Puedo cancelar o reagendar?',
              a: <>Sí, con al menos <b>24 horas de antelación</b> reagendamos sin costo. Después de esa ventana, o por no presentarse, la sesión se considera realizada y el adelanto no es reembolsable.</>,
            },
            {
              q: '¿Cuándo recibo el material?',
              a: <>Entregamos el master en <b>24 horas</b> a través de un link de descarga (formato .mp4 Full HD + audio WAV). Para Edición Pro, los entregables completos llegan en hasta 5 días hábiles.</>,
            },
            {
              q: '¿Necesito experiencia previa?',
              a: <>No. Te acompaña un productor dedicado que opera el switcher, dirige la conversación si hace falta y resuelve la parte técnica para que tú te concentres en hablar.</>,
            },
            {
              q: '¿Quién es dueño del contenido?',
              a: <>El contenido es <b>100% tuyo</b>. Eres responsable de los derechos de música, imágenes y marcas que aparezcan. Podemos usar fragmentos en nuestro portfolio solo si nos das autorización por escrito.</>,
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

      {/* Floating CTAs — Reservar + WhatsApp, persistentes */}
      <div style={{
        position: 'fixed', bottom: 22, right: 22, zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
      }}>
        <a href="#reservar" style={{
          background: PF.red, color: PF.bg, borderRadius: 999, padding: '14px 22px',
          fontFamily: PF.display, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1,
          boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
        }}>RESERVAR</a>
        <WhatsAppButton dim={56} style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }} />
      </div>
    </div>
  );
}

window.PodFactoryLanding = PodFactoryLanding;
