// Stil 2: gemalter Stil, so wie ich ihn selbst im Code (SVG) zeichnen kann.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function drawPaintedScene(el) {
  const r = rng(9);
  const canopy = (cx, cy, size) => {
    let s = `<ellipse cx="${cx}" cy="${cy + size * 1.55}" rx="${size * 1.1}" ry="${size * 0.22}" fill="#4d7a36" opacity=".55"/>`;
    s += `<path d="M${cx - 6} ${cy + size * 1.5} L${cx - 4} ${cy} L${cx + 6} ${cy} L${cx + 8} ${cy + size * 1.5}Z" fill="#5a3e28"/>`;
    const blobs = [[-0.45, 0.1, 0.62], [0.45, 0.15, 0.58], [0, -0.35, 0.7], [-0.15, 0.25, 0.55], [0.3, -0.1, 0.5]];
    for (const [dx, dy, rr] of blobs) {
      const x = cx + dx * size, y = cy + dy * size, rad = rr * size;
      s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="url(#leaf)"/>`;
    }
    for (let i = 0; i < 10; i++) {
      s += `<circle cx="${cx + (r() - 0.3) * size}" cy="${cy - size * 0.6 + r() * size * 0.6}" r="${size * (0.08 + r() * 0.1)}" fill="#7aae5c" opacity=".6"/>`;
    }
    return s;
  };

  const blades = Array.from({ length: 220 }, () => {
    const x = r() * 1280, y = 420 + r() * 300, h = 8 + r() * 18;
    const c = r() < 0.5 ? '#5a8a3e' : '#8ab85e';
    return `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(r() * 6 - 3).toFixed(1)} ${(-h / 2).toFixed(1)} ${(r() * 8 - 4).toFixed(1)} ${(-h).toFixed(1)}" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }).join('');
  const flowers = Array.from({ length: 30 }, () => `<circle cx="${(r() * 1280).toFixed(0)}" cy="${(440 + r() * 270).toFixed(0)}" r="3" fill="${r() < 0.7 ? '#f6f2e4' : '#f0d36a'}"/>`).join('');

  const thatch = Array.from({ length: 90 }, () => {
    const y = 330 + r() * 70;
    const half = 98 - (y - 330) * 1.2 * -1;
    const x = 472 + (r() * 2 - 1) * Math.max(10, 96 - (400 - y) * 1.25);
    return `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + 2).toFixed(0)}" y2="${(y + 10).toFixed(0)}" stroke="#9c7f42" stroke-width="1.5" opacity=".7"/>`;
  }).join('');

  const fieldRows = [0, 1, 2, 3].map((i) => {
    const y = 528 + i * 24;
    let s = `<rect x="160" y="${y}" width="208" height="15" rx="7" fill="#6b4a2f"/><rect x="160" y="${y + 10}" width="208" height="5" rx="2" fill="#54391f"/>`;
    for (let x = 172; x < 360; x += 20) s += `<path d="M${x} ${y + 3} q-5 -8 -8 -10 M${x} ${y + 3} q4 -9 9 -10" stroke="#7fbf4f" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    return s;
  }).join('');

  const chicken = (x, y, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)">
    <ellipse cx="0" cy="0" rx="13" ry="10" fill="#f4f0e6"/><circle cx="11" cy="-9" r="6" fill="#f4f0e6"/>
    <path d="M10 -16 q3 -4 6 0" fill="#c8452f"/><path d="M16 -9 l6 2 l-6 2z" fill="#e0b040"/><circle cx="12" cy="-10" r="1.2" fill="#2a1a10"/>
    <path d="M-12 -4 q-8 -6 -6 4" fill="#e6e0d2"/><path d="M-3 9 v7 M3 9 v7" stroke="#e0b040" stroke-width="2"/></g>`;

  el.innerHTML = `
<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Prototyp im gemalten Stil">
  <defs>
    <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78aecb"/><stop offset=".6" stop-color="#c9dcd3"/><stop offset="1" stop-color="#f2e3b8"/></linearGradient>
    <linearGradient id="g-meadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa84e"/><stop offset="1" stop-color="#4d7a36"/></linearGradient>
    <radialGradient id="leaf" cx=".65" cy=".3" r=".8"><stop offset="0" stop-color="#6a9e52"/><stop offset=".55" stop-color="#3f6e40"/><stop offset="1" stop-color="#24452c"/></radialGradient>
    <linearGradient id="g-roof" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8894a"/><stop offset=".6" stop-color="#c9aa62"/><stop offset="1" stop-color="#ddc27c"/></linearGradient>
    <linearGradient id="g-wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e4e31"/><stop offset="1" stop-color="#9a7149"/></linearGradient>
    <radialGradient id="g-sun" cx=".82" cy=".05" r=".7"><stop offset="0" stop-color="#fff2c8" stop-opacity=".8"/><stop offset="1" stop-color="#fff2c8" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-glow"><stop offset="0" stop-color="#ffc870" stop-opacity=".7"/><stop offset="1" stop-color="#ffc870" stop-opacity="0"/></radialGradient>
    <linearGradient id="g-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d8" stop-opacity=".5"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></linearGradient>
    <radialGradient id="g-vig" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#141008" stop-opacity="0"/><stop offset="1" stop-color="#141008" stop-opacity=".45"/></radialGradient>
    <filter id="g-soft"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="g-blur2"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>

  <rect width="1280" height="720" fill="url(#g-sky)"/>
  <g filter="url(#g-soft)" fill="#fffaf0" opacity=".85">
    <ellipse cx="240" cy="90" rx="110" ry="20"/><ellipse cx="320" cy="80" rx="60" ry="18"/><ellipse cx="920" cy="60" rx="140" ry="20"/>
  </g>
  <path d="M0 250 Q120 190 240 230 T480 210 T760 200 T1020 230 T1280 205 V360 H0Z" fill="#8ea6ad"/>
  <path d="M0 290 Q160 240 320 280 T640 262 T960 282 T1280 255 V380 H0Z" fill="#6c8f86"/>
  <path d="M0 320 ${Array.from({ length: 65 }, (_, i) => `L${i * 20} ${(310 + Math.sin(i * 1.7) * 6 + r() * 8).toFixed(0)}`).join(' ')} V400 H0Z" fill="#3f6a4c"/>

  <rect y="360" width="1280" height="360" fill="url(#g-meadow)"/>
  <path d="M600 480 C640 560 620 620 700 720 L780 720 C700 620 720 560 660 480Z" fill="#a88a5c"/>
  <path d="M606 480 C646 560 626 620 706 720" stroke="#8c6f45" stroke-width="4" fill="none"/>
  ${blades}${flowers}

  ${canopy(1000, 360, 52)}

  <g opacity=".95">${fieldRows}</g>

  <g stroke="#d8c9a0" stroke-width="2.5" stroke-dasharray="6 6" fill="none"><path d="M800 404 L984 404 L1008 484 L776 484Z"/></g>
  <g fill="#7a5a38">${[[800, 404], [984, 404], [1008, 484], [776, 484]].map(([x, y]) => `<rect x="${x - 4}" y="${y - 10}" width="8" height="26" rx="2"/>`).join('')}</g>

  <!-- Hütte -->
  <ellipse cx="472" cy="482" rx="100" ry="10" fill="#4d7a36" opacity=".6"/>
  <rect x="400" y="416" width="144" height="64" fill="url(#g-wall)"/>
  ${Array.from({ length: 9 }, (_, i) => `<line x1="${408 + i * 16}" y1="418" x2="${408 + i * 16}" y2="480" stroke="#5a3e28" stroke-width="2" opacity=".5"/>`).join('')}
  <rect x="456" y="436" width="32" height="44" rx="3" fill="#3e2a1a"/>
  <rect x="508" y="432" width="22" height="18" rx="2" fill="#ffd27a"/><line x1="519" y1="432" x2="519" y2="450" stroke="#7a5a38" stroke-width="2"/>
  <path d="M376 420 L472 330 L568 420 Q472 410 376 420Z" fill="url(#g-roof)"/>
  ${thatch}
  <path d="M376 420 Q472 410 568 420" stroke="#8c7038" stroke-width="3" fill="none"/>
  <circle cx="519" cy="441" r="50" fill="url(#g-glow)" opacity=".5"/>

  ${canopy(112, 420, 74)}
  ${canopy(1168, 450, 82)}

  <!-- Baumstamm -->
  <ellipse cx="830" cy="598" rx="66" ry="8" fill="#4d7a36" opacity=".6"/>
  <rect x="784" y="568" width="92" height="26" rx="12" fill="#6e4e31"/>
  <rect x="784" y="568" width="92" height="7" rx="4" fill="#8a6440"/>
  <ellipse cx="874" cy="581" rx="9" ry="13" fill="#c2a574"/><ellipse cx="874" cy="581" rx="4" ry="6" fill="#8c6f45"/>

  <!-- Charakter -->
  <g>
    <path d="M806 548 L862 548 L866 562 L808 566Z" fill="#6d5a45"/>
    <path d="M848 552 L866 552 L864 590 L850 590Z" fill="#5d4c3b"/>
    <path d="M846 588 L872 588 Q876 598 866 600 L846 600Z" fill="#3a2a1e"/>
    <path d="M800 482 Q816 470 834 482 L840 552 L802 552Z" fill="#4f6b3a"/>
    <path d="M800 482 Q806 520 802 552 L812 552 Q812 516 812 484Z" fill="#3a5029"/>
    <rect x="802" y="536" width="38" height="7" fill="#6b4a2f"/>
    <path d="M830 488 Q852 512 858 540" stroke="#4f6b3a" stroke-width="12" fill="none" stroke-linecap="round"/>
    <circle cx="858" cy="542" r="6" fill="#e8b98f"/>
    <rect x="814" y="462" width="12" height="16" fill="#c8926a"/>
    <circle cx="826" cy="452" r="18" fill="#e8b98f"/>
    <path d="M808 452 Q806 428 828 430 Q846 430 846 446 Q836 438 826 444 Q818 446 816 462 Q808 462 808 452Z" fill="#3b2a1e"/>
    <circle cx="836" cy="451" r="2" fill="#2a1a10"/>
    <path d="M840 460 L864 464" stroke="#7a4e2a" stroke-width="4" stroke-linecap="round"/>
    <rect x="860" y="452" width="9" height="12" rx="2" fill="#7a4e2a"/>
    <circle cx="864" cy="452" r="3" fill="#ff9a40" opacity=".9"/>
  </g>
  <g class="p-smoke" fill="#efeadf" filter="url(#g-blur2)" opacity=".7">
    <circle cx="866" cy="438" r="5"/><circle cx="872" cy="420" r="8"/><circle cx="868" cy="398" r="11"/>
  </g>

  ${chicken(400, 604, false)}${chicken(320, 628, true)}

  <rect width="1280" height="720" fill="url(#g-sun)"/>
  <g style="mix-blend-mode:screen"><polygon points="860,0 980,0 520,720 300,720" fill="url(#g-ray)" opacity=".35"/></g>
  <circle cx="864" cy="452" r="26" fill="url(#g-glow)" class="p-ember"/>
  <rect width="1280" height="720" fill="url(#g-vig)"/>
</svg>`;
}
