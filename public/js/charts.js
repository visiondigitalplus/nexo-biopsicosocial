/** Gráficos SVG generados a mano: sin librerías, sin red. */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Coordenadas de Eysenck: cuadrante 2x2 con el punto del usuario. */
export function eysenckChart(coords) {
  const size = 260;
  const pad = 30;
  const inner = size - pad * 2;
  const x = pad + (coords.extraversion / 100) * inner;
  const y = pad + ((100 - coords.stability) / 100) * inner;
  const mid = pad + inner / 2;
  return `
  <svg viewBox="0 0 ${size} ${size}" class="chart" role="img" aria-label="Coordenadas de Eysenck">
    <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="14" fill="#f7faf8" stroke="#dfe7e3"/>
    <line x1="${mid}" y1="${pad}" x2="${mid}" y2="${pad + inner}" stroke="#dfe7e3" stroke-dasharray="3 4"/>
    <line x1="${pad}" y1="${mid}" x2="${pad + inner}" y2="${mid}" stroke="#dfe7e3" stroke-dasharray="3 4"/>
    <text x="${pad + 10}" y="${pad + 20}" font-size="10" fill="#6d847d">INTROVERTIDO · INESTABLE</text>
    <text x="${pad + inner - 10}" y="${pad + 20}" font-size="10" fill="#6d847d" text-anchor="end">EXTRAVERTIDO · INESTABLE</text>
    <text x="${pad + 10}" y="${pad + inner - 10}" font-size="10" fill="#6d847d">INTROVERTIDO · ESTABLE</text>
    <text x="${pad + inner - 10}" y="${pad + inner - 10}" font-size="10" fill="#6d847d" text-anchor="end">EXTRAVERTIDO · ESTABLE</text>
    <text x="${mid}" y="${pad + inner + 20}" font-size="9.5" fill="#6d847d" text-anchor="middle">EXTRAVERSIÓN →</text>
    <text x="${pad - 12}" y="${mid}" font-size="9.5" fill="#6d847d" text-anchor="middle" transform="rotate(-90 ${pad - 12} ${mid})">ESTABILIDAD →</text>
    <circle cx="${x}" cy="${y}" r="22" fill="#0e7c66" opacity=".12"/>
    <circle cx="${x}" cy="${y}" r="7" fill="#0e7c66" stroke="#fff" stroke-width="2.5"/>
    <text x="${x}" y="${y - 16}" font-size="10.5" fill="#075243" text-anchor="middle" font-weight="600">${esc(coords.biotypeName || '')}</text>
  </svg>`;
}

/** Hexágono RIASEC de Holland. */
export function riasecHexagon(scores) {
  const keys = ['R', 'I', 'A', 'S', 'E', 'C'];
  const names = { R: 'Realista', I: 'Investigador', A: 'Artístico', S: 'Social', E: 'Emprendedor', C: 'Convencional' };
  const size = 280;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const radius = 82;
  const angle = (i) => (Math.PI * 2 * i) / 6 - Math.PI / 2;
  const point = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

  const rings = [0.33, 0.66, 1]
    .map((f) => {
      const pts = keys.map((_, i) => point(i, radius * f).join(',')).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="#e5eee9" />`;
    })
    .join('');

  const axes = keys
    .map((_, i) => {
      const [px, py] = point(i, radius);
      return `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="#e5eee9" />`;
    })
    .join('');

  const shape = keys
    .map((k, i) => {
      const v = Math.max(6, Number(scores[k]) || 0) / 100;
      return point(i, radius * v).join(',');
    })
    .join(' ');

  const dots = keys
    .map((k, i) => {
      const v = Math.max(6, Number(scores[k]) || 0) / 100;
      const [px, py] = point(i, radius * v);
      return `<circle cx="${px}" cy="${py}" r="3.4" fill="#0e7c66" />`;
    })
    .join('');

  const labels = keys
    .map((k, i) => {
      const [px, py] = point(i, radius + 22);
      const anchor = Math.abs(px - cx) < 12 ? 'middle' : px > cx ? 'start' : 'end';
      return `<text x="${px}" y="${py + 3}" font-size="9.5" text-anchor="${anchor}" fill="#38514a">${names[k]}</text>
              <text x="${px}" y="${py + 15}" font-size="8.5" text-anchor="${anchor}" fill="#8aa39b">${scores[k]}%</text>`;
    })
    .join('');

  return `
  <svg viewBox="0 0 ${size} ${size}" class="chart" role="img" aria-label="Hexágono RIASEC">
    ${rings}${axes}
    <polygon points="${shape}" fill="rgba(14,124,102,.16)" stroke="#0e7c66" stroke-width="1.8" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}

/** Barras horizontales (HTML, no SVG). */
export function barList(entries, { warm = [], max = 100 } = {}) {
  return entries
    .map(({ label, value }) => {
      const pct = Math.max(2, Math.min(100, (Number(value) / max) * 100));
      const isWarm = warm.includes(label);
      return `
      <div class="bar">
        <div class="bar-head"><span>${esc(label)}</span><span>${Math.round(value)}%</span></div>
        <div class="bar-track"><div class="bar-fill ${isWarm ? 'warm' : ''}" style="width:${pct}%"></div></div>
      </div>`;
    })
    .join('');
}

/** Barras de neuroquímica con etiquetas cortas. */
export function neuroBars(axes) {
  return axes
    .map(
      (a) => `
      <div class="bar">
        <div class="bar-head"><span>${esc(a.label)}</span><span>${a.value}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, a.value)}%"></div></div>
      </div>`,
    )
    .join('');
}
