// Shared tokens & utilities for all three variations
// Common brand DNA distilled from the Doppel manual + Pod Factory logo

const BRAND = {
  doppel: {
    primary: '#3B3D49',    // charcoal blue-gray
    mint: '#99CCCC',
    orange: '#FF6633',
    yellow: '#FFCC33',
    name: 'doppel',
    tag: 'MEDIA',
  },
  pod: {
    blue: '#1F3FA3',
    red: '#D92E2E',
    orange: '#EF6A1F',
    yellow: '#F4B81C',
    cream: '#F5EBD6',
    black: '#0A0A0A',
  },
};

// Real client logos from the current site (as short wordmarks for placeholders)
const CLIENTS = ['WALMART', 'CHEVROLET', 'FORD', 'PETROBRAS', 'ENTEL', 'ENEL', 'DERCO', 'LATAM'];

// Project titles used across variations — invented but plausible for a Chilean
// audiovisual production house. Keep them short and punchy.
const PROJECTS = [
  { title: 'Entel · Redes del Futuro',     type: 'Spot TV',        year: '2025', client: 'Entel' },
  { title: 'Ford Ranger · Territorio',     type: 'Brand Film',     year: '2025', client: 'Ford' },
  { title: 'LATAM · Rutas de América',     type: 'Documental',     year: '2024', client: 'LATAM' },
  { title: 'Walmart · Nuestra Gente',      type: 'Campaña',        year: '2024', client: 'Walmart' },
  { title: 'Derco · Arena y Polvo',        type: 'Comercial',      year: '2024', client: 'Derco' },
  { title: 'Enel · Energía Viva',          type: 'Brand Film',     year: '2023', client: 'Enel' },
];

const PODCASTS = [
  {
    title: 'Las Variables Ocultas',
    host: 'Carlos Granés, Leandro Santoro, Leonardo Padura y más',
    ep: 'TEMPORADA EN CURSO',
    image: 'assets/variables-ocultas.jpg',
    url: 'https://www.youtube.com/playlist?list=PLQ9nCoLmM3liuDRuJ_pPuBrfmGgoFDhMc',
  },
  {
    title: 'Soy + que mamá',
    host: 'Conversaciones sobre maternidad, trabajo y autonomía',
    ep: '8 EPISODIOS',
    image: 'assets/soy-mas-que-mama.jpg',
    url: 'https://www.youtube.com/playlist?list=PLL0Ps-gP3Wr9QrgUw5Y-HQ7n2pNVG05Ph',
  },
  {
    title: 'Café con médicos',
    host: 'Especialistas médicos en conversación abierta',
    ep: '13 EPISODIOS',
    image: 'assets/cafe-con-medicos.jpg',
    url: 'https://www.youtube.com/playlist?list=PLxgS8GoZg4r4FxZ3nsF5LC4hDSfno6b3F',
  },
  {
    title: 'No Te Prospongas',
    host: 'Hablemos de próstata: simple, claro y sin estrés',
    ep: 'CAMPAÑA · 3 EPISODIOS',
    image: 'assets/no-te-prospongas.jpg',
    url: 'https://www.youtube.com/playlist?list=PLnKLEvv5-P_4-Pn7G5we4vVaS907bIYcx',
  },
  {
    title: 'Inteligencia Animal',
    host: 'VetChannel · Conversaciones sobre el mundo animal',
    ep: '16 EPISODIOS',
    image: 'assets/inteligencia-animal.jpg',
    url: 'https://www.youtube.com/playlist?list=PLbOzErDRwxZUxmzRlY96Yf749Sd6pYBgQ',
  },
  {
    title: 'Dr. Horse',
    host: 'VetChannel · Salud y cuidado equino',
    ep: '11 EPISODIOS',
    image: 'assets/dr-horse.jpg',
    url: 'https://www.youtube.com/playlist?list=PLbOzErDRwxZWPbjJxBhQp-_heJ32V6ejb',
  },
  {
    title: 'Pod Cats & Dogs',
    host: 'VetChannel · El podcast para tutores de mascotas',
    ep: '8 EPISODIOS',
    image: 'assets/pod-cats-dogs.jpg',
    url: 'https://www.youtube.com/playlist?list=PLbOzErDRwxZV001PBZYBPns_3_rOC28zT',
  },
  {
    title: 'Talleres Luciérnaga',
    host: 'Contenido educativo y experiencias creativas',
    ep: 'CANAL',
    image: 'assets/talleres-luciernaga.jpg',
    url: 'https://www.youtube.com/@TalleresLuciernaga',
  },
];

// ── Small primitives ──────────────────────────────────────────
// Video placeholder — diagonal hatching + play glyph. Looks intentional,
// reads as "video here" without faking a screengrab.
function VideoTile({ bg = '#1a1a1a', fg = '#fff', children, aspect = '16/9', style = {}, corner }) {
  return (
    <div style={{
      position: 'relative', aspectRatio: aspect, background: bg, color: fg,
      overflow: 'hidden', ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(135deg, transparent 0 14px, ${fg}0d 14px 15px)`,
      }} />
      <svg viewBox="0 0 40 40" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', width: 44, height: 44,
        opacity: 0.85,
      }}>
        <circle cx="20" cy="20" r="19" fill="none" stroke={fg} strokeWidth="1" />
        <path d="M16 13 L28 20 L16 27 Z" fill={fg} />
      </svg>
      {corner && (
        <div style={{
          position: 'absolute', top: 12, left: 12, fontSize: 10,
          letterSpacing: '0.12em', fontWeight: 600, color: fg, opacity: 0.85,
          fontFamily: 'Space Mono, monospace',
        }}>{corner}</div>
      )}
      {children}
    </div>
  );
}

// Pod Factory "sound bars" glyph — direct reference to the logo rays
function PodBars({ colors = ['#1F3FA3', '#D92E2E', '#EF6A1F', '#F4B81C'], height = 6, width = 60 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width }}>
      {colors.map((c, i) => (
        <div key={i} style={{ height, background: c, width: `${100 - i * 0}%` }} />
      ))}
    </div>
  );
}

// Pod Factory mic icon (simplified from logo)
function PodMic({ size = 28, color = '#F5EBD6' }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} style={{ display: 'block' }}>
      <circle cx="16" cy="16" r="14" fill="none" stroke={color} strokeWidth="1.8" />
      <circle cx="16" cy="16" r="9" fill="none" stroke={color} strokeWidth="1.8" />
      <circle cx="16" cy="16" r="4" fill={color} />
      <path d="M16 30 L13 38 L19 38 Z" fill={color} />
    </svg>
  );
}

// Doppel "pp" palindrome mark — typographic, reads as the wordmark
function DoppelMark({ size = 20, color = 'currentColor', font = "'Archivo', sans-serif" }) {
  return (
    <span style={{
      fontFamily: font, fontWeight: 700, fontSize: size, letterSpacing: '-0.04em',
      color, lineHeight: 1, display: 'inline-block',
    }}>doppel<span style={{ opacity: 0.45 }}>.</span></span>
  );
}

// A tiny "browser chrome" header so each artboard reads as a website
// without pulling the full browser-window starter (too chunky for our grid).
function SiteChrome({ url = 'doppel.cl', bg = '#e8e6e1', fg = '#3b3d49' }) {
  return (
    <div style={{
      height: 32, background: bg, display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: 10, borderBottom: `1px solid ${fg}15`,
      fontFamily: 'Space Mono, monospace', fontSize: 11, color: fg + 'aa',
    }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {['#f56', '#fb5', '#4c5'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c + '99' }} />
        ))}
      </div>
      <div style={{
        flex: 1, textAlign: 'center', padding: '4px 10px',
        background: bg === '#e8e6e1' ? '#fff8' : '#0003', borderRadius: 6,
      }}>
        {url}
      </div>
    </div>
  );
}

Object.assign(window, {
  BRAND, CLIENTS, PROJECTS, PODCASTS,
  VideoTile, PodBars, PodMic, DoppelMark, SiteChrome,
});
