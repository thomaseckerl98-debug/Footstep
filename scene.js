// Gemaltes Panorama als SVG. Keine Bilddateien nötig.
// renderPanorama(element, { village: true, huts: 3, seed: 7 })

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ridge(r, y0, amp, step, w = 1200) {
  let d = `M0 ${y0}`;
  for (let x = 0; x <= w; x += step) {
    d += ` L${x} ${(y0 - r() * amp).toFixed(1)}`;
  }
  return d;
}

// Baumkronen entlang einer Kurve y(x)
function canopy(r, x0, x1, yAt, count, rMin, rMax, colors) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0);
    const rad = rMin + r() * (rMax - rMin);
    const y = yAt(x) + r() * 18;
    const c = colors[Math.floor(r() * colors.length)];
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${c}"/>`;
  }
  return s;
}

const HUT_SPOTS = [
  [858, 312, 1], [905, 318, 0.9], [818, 322, 0.85], [950, 312, 0.95],
  [880, 296, 0.8], [990, 318, 0.85], [785, 330, 0.8], [930, 294, 0.75],
];

function hut(x, y, s, glow) {
  const w = 34 * s, h = 18 * s, rh = 20 * s;
  return `<g class="hut">
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="#6e4f32"/>
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h * 0.25}" fill="#5a3f27" opacity=".6"/>
    <polygon points="${x - w / 2 - 6 * s},${y - h} ${x},${y - h - rh} ${x + w / 2 + 6 * s},${y - h}" fill="#b0924f"/>
    <polygon points="${x},${y - h - rh} ${x + w / 2 + 6 * s},${y - h} ${x + w * 0.1},${y - h}" fill="#94793f"/>
    <rect x="${x - 4 * s}" y="${y - 10 * s}" width="${8 * s}" height="${10 * s}" fill="#3a2716"/>
    <rect x="${x + 7 * s}" y="${y - 13 * s}" width="${5 * s}" height="${4 * s}" fill="${glow ? '#ffd27a' : '#3a2716'}"/>
  </g>`;
}

function palisade(x0, x1, yAt) {
  let s = '';
  for (let x = x0; x <= x1; x += 7) {
    const y = yAt(x);
    s += `<polygon points="${x - 3},${y} ${x - 3},${y - 16} ${x},${y - 21} ${x + 3},${y - 16} ${x + 3},${y}" fill="#5a3e26"/>`;
  }
  return s;
}

let sceneCount = 0;

export function renderPanorama(el, opts = {}) {
  const { village = true, huts = 3, seed = 7 } = opts;
  const p = 'pn' + (++sceneCount) + '-'; // eindeutige IDs je Szene
  const r = rng(seed);
  const hillY = (x) => 420 - 120 * Math.sin(Math.min(1, Math.max(0, (x - 560) / 640)) * Math.PI * 0.62);
  const leftHillY = (x) => 300 + Math.pow(Math.max(0, x) / 600, 1.6) * 160;

  let hutsSvg = '';
  let smoke = '';
  if (village) {
    const n = Math.max(0, Math.min(huts, HUT_SPOTS.length));
    for (let i = 0; i < n; i++) {
      const [x, y, s] = HUT_SPOTS[i];
      hutsSvg += hut(x, y, s, i % 2 === 0);
      if (i < 3) {
        smoke += `<g class="smoke" style="animation-delay:${i * -2.3}s">
          <circle cx="${x + 4}" cy="${y - 40}" r="6"/><circle cx="${x + 8}" cy="${y - 56}" r="9"/><circle cx="${x + 4}" cy="${y - 76}" r="12"/>
        </g>`;
      }
    }
  }

  el.innerHTML = `
<svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Gemaltes Panorama mit Wald, See und Dorf">
  <defs>
    <linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6fa6bf"/><stop offset=".5" stop-color="#bcd6d2"/><stop offset="1" stop-color="#f0e4c0"/>
    </linearGradient>
    <radialGradient id="${p}sun" cx=".75" cy=".18" r=".45">
      <stop offset="0" stop-color="#fff6d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}lake" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5aa3ad"/><stop offset="1" stop-color="#245563"/>
    </linearGradient>
    <linearGradient id="${p}ray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff8dc" stop-opacity=".55"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${p}hill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#86ad55"/><stop offset="1" stop-color="#4f7a3a"/>
    </linearGradient>
    <filter id="${p}soft"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${p}mist"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>

  <rect width="1200" height="520" fill="url(#${p}sky)"/>
  <rect width="1200" height="520" fill="url(#${p}sun)"/>

  <g class="clouds" filter="url(#${p}soft)" fill="#fffaf0" opacity=".75">
    <ellipse cx="220" cy="90" rx="120" ry="22"/><ellipse cx="300" cy="80" rx="70" ry="20"/>
    <ellipse cx="760" cy="60" rx="150" ry="18"/><ellipse cx="1080" cy="110" rx="110" ry="16"/>
  </g>

  <path d="${ridge(r, 270, 70, 60)} L1200 360 L0 360Z" fill="#8fadb6" opacity=".85"/>
  <path d="${ridge(r, 300, 60, 45)} L1200 370 L0 370Z" fill="#6b9387"/>
  <path d="${ridge(r, 325, 40, 35)} L1200 380 L0 380Z" fill="#4f7a64"/>

  <rect y="335" width="1200" height="120" fill="url(#${p}lake)"/>
  <g class="shimmer" stroke="#e8f4f0" stroke-width="2" opacity=".35">
    <line x1="420" y1="360" x2="520" y2="360"/><line x1="610" y1="378" x2="690" y2="378"/>
    <line x1="300" y1="395" x2="360" y2="395"/><line x1="720" y1="352" x2="800" y2="352"/>
  </g>

  <path d="M0 290 ${Array.from({ length: 13 }, (_, i) => `L${i * 50} ${leftHillY(i * 50).toFixed(1)}`).join(' ')} L600 520 L0 520Z" fill="#2c4f33"/>
  <g>${canopy(r, -20, 560, leftHillY, 90, 14, 30, ['#24432b', '#2f5a38', '#3a6b40', '#1e3a25'])}</g>

  <path d="M540 520 ${Array.from({ length: 34 }, (_, i) => { const x = 540 + i * 20; return `L${x} ${hillY(x).toFixed(1)}`; }).join(' ')} L1200 520Z" fill="url(#${p}hill)"/>
  <g>${canopy(r, 1040, 1220, (x) => hillY(x) - 6, 26, 12, 24, ['#3a6b40', '#2f5a38', '#4b7c45'])}</g>

  ${village ? `<g class="village">${palisade(770, 1010, (x) => hillY(x) + 14)}${hutsSvg}</g>` : ''}
  <g class="smokes" fill="#f4efe4" filter="url(#${p}soft)" opacity=".55">${smoke}</g>

  <g class="rays" style="mix-blend-mode:screen">
    <polygon points="760,0 860,0 640,520 470,520" fill="url(#${p}ray)" opacity=".35"/>
    <polygon points="900,0 960,0 860,520 760,520" fill="url(#${p}ray)" opacity=".25"/>
  </g>

  <g class="mist" filter="url(#${p}mist)" fill="#ffffff">
    <ellipse cx="300" cy="345" rx="260" ry="22" opacity=".45"/>
    <ellipse cx="800" cy="350" rx="300" ry="18" opacity=".35"/>
  </g>

  <path d="M0 470 Q150 440 320 462 T680 455 T1200 448 L1200 520 L0 520Z" fill="#1f3a24"/>
  <g stroke="#2f5532" stroke-width="2" stroke-linecap="round">
    ${Array.from({ length: 70 }, () => { const x = r() * 1200; const y = 470 + r() * 30; return `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + r() * 8 - 4).toFixed(0)}" y2="${(y - 10 - r() * 14).toFixed(0)}"/>`; }).join('')}
  </g>
  <g fill="#f3efe0">${Array.from({ length: 14 }, () => `<circle cx="${(r() * 1200).toFixed(0)}" cy="${(478 + r() * 30).toFixed(0)}" r="2"/>`).join('')}</g>
</svg>`;
}
