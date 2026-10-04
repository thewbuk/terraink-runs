/* Shared by every template: formatting, words, DOM builder, looks, weather, audio and transport. */
import * as Runs from './runs';
import * as Basemap from './basemap';
import { lang, loc, plural, tr } from './lang';

const NS = 'http://www.w3.org/2000/svg', HTML = new Set(['div', 'span', 'aside', 'section', 'i', 'b', 'p', 'h1', 'h2', 'h3', 'small', 'em', 'time', 'a', 'button', 'label', 'input']);
export const FRAME = 'relative flex-none overflow-hidden rounded-[6px] shadow-[0_24px_80px_#000c] w-(--w) h-(--h)';
export const LAYER = 'absolute inset-0', FB = '[transform-box:fill-box] origin-center', VIEWBOX = '[transform-box:view-box] origin-top-left', WORD = 'inline-block will-change-transform';
export const stageHTML = cls => `<div id="frame" class="${FRAME}"><div id="stage" class="absolute top-0 left-0 origin-top-left overflow-hidden ${cls}"></div></div>`;
// words as separate animatable spans (text only, never HTML); an element is wrapped as one word
export const wordEls = ws => ws.flatMap((w, i) => [i ? document.createTextNode(' ') : null, h('span', { 'data-word': '', class: WORD, text: typeof w === 'string' ? w : null }, typeof w === 'string' ? null : w)]).filter(Boolean);
// localStorage that may be blocked (private mode, cookies off)
export const stored = k => { try { return localStorage.getItem(k); } catch { return null; } };
export const remember = (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } };
export function download(blob, file) {
  const url = URL.createObjectURL(blob), a = document.body.appendChild(Object.assign(document.createElement('a'), { href: url, download: file }));
  a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function h(tag, attrs = {}, ...kids) {
  const e = HTML.has(tag) ? document.createElement(tag) : document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null) continue; if (k === 'text') e.textContent = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); }
  kids.flat().forEach(k => k && e.appendChild(k)); return e;
}
export const poly = pts => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
export const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const step = (span, max, steps) => steps.find(s => span / s <= max) || steps[steps.length - 1];

const UNITS_KEY = 'garminLook.units';
export const units = () => { try { return localStorage.getItem(UNITS_KEY) === 'mi' ? 'mi' : 'km'; } catch { return 'km'; } };
export const unitM = () => (units() === 'mi' ? 1609.344 : 1000);
export function setUnits(u) { try { localStorage.setItem(UNITS_KEY, u); } catch { /* private mode */ } dispatchEvent(new Event('garminlook:look')); }

export function fmt(RUN) {
  const M = RUN.meta, pad = n => String(n).padStart(2, '0');
  const hms = s => { s = Math.round(s); return `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
  const pace = s => { s = Math.round(s); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const LOC = loc(), NF0 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 }), NF1 = new Intl.NumberFormat(LOC, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const int = v => NF0.format(Math.round(v)), dec = (v, n = 1) => (n === 1 ? NF1.format(v) : v.toLocaleString(LOC, { minimumFractionDigits: n, maximumFractionDigits: n }));
  const START = new Date(M.startLocal), startSec = START.getHours() * 3600 + START.getMinutes() * 60 + START.getSeconds();
  const clock = s => { const c = startSec + s; return `${pad(Math.floor(c / 3600) % 24)}:${pad(Math.floor(c % 3600 / 60))}`; };
  const zone = b => M.zoneLow.reduce((z, lo, k) => (b >= lo ? k + 1 : z), 0);
  const dur = s => { const t = Math.round(s / 60), hh = Math.floor(t / 60), mm = t % 60; return hh ? `${hh} h ${mm} min` : `${mm} min`; };
  const U = unitM(), DU = units(), MI = DU === 'mi', pu = sPerKm => sPerKm * U / 1000;
  const ht = m => (MI ? m * 3.28084 : m), HU = MI ? 'ft' : 'm';
  const temp = c => (MI ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`), wind = k => (MI ? `${Math.round(k / 1.609)} mph` : `${Math.round(k)} km/h`);
  return { pad, hms, pace, int, dec, clock, zone, dur, START, startSec, U, DU, MI, pu, ht, HU, temp, wind,
    DATE: START.toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), DAY: START.toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' }) };
}

/* Weather is a pure function of timeline time, so scrubbing and export draw the same frame. */
export const sky = W => (!W ? null : W.snow ? 'snow' : W.rain ? 'rain' : /cloud|overcast|fog|mist|grey|gray/i.test(W.text || '') ? 'cloud' : 'clear');
const WX_KEYS = ['clear', 'sunny', 'partly cloudy', 'cloudy', 'low cloud', 'overcast', 'fog', 'mist', 'drizzle', 'light rain', 'rain', 'heavy rain', 'showers', 'snow', 'light snow', 'sleet', 'thunderstorm', 'windy'];
const WX = {
  pl: ['bezchmurnie', 'słonecznie', 'częściowe zachmurzenie', 'pochmurno', 'niskie chmury', 'zachmurzenie całkowite', 'mgła', 'mgła', 'mżawka', 'lekki deszcz', 'deszcz', 'ulewa', 'przelotne opady', 'śnieg', 'lekki śnieg', 'deszcz ze śniegiem', 'burza', 'wietrznie'],
  de: ['klar', 'sonnig', 'teils bewölkt', 'bewölkt', 'tiefe Wolken', 'bedeckt', 'Nebel', 'Dunst', 'Nieselregen', 'leichter Regen', 'Regen', 'starker Regen', 'Schauer', 'Schnee', 'leichter Schnee', 'Schneeregen', 'Gewitter', 'windig'],
  es: ['despejado', 'soleado', 'parcialmente nublado', 'nublado', 'nubes bajas', 'cubierto', 'niebla', 'neblina', 'llovizna', 'lluvia ligera', 'lluvia', 'lluvia fuerte', 'chubascos', 'nieve', 'nieve ligera', 'aguanieve', 'tormenta', 'ventoso'],
  fr: ['dégagé', 'ensoleillé', 'partiellement nuageux', 'nuageux', 'nuages bas', 'couvert', 'brouillard', 'brume', 'bruine', 'pluie légère', 'pluie', 'forte pluie', 'averses', 'neige', 'neige légère', 'neige fondue', 'orage', 'venteux'],
  it: ['sereno', 'soleggiato', 'parzialmente nuvoloso', 'nuvoloso', 'nubi basse', 'coperto', 'nebbia', 'foschia', 'pioviggine', 'pioggia leggera', 'pioggia', 'pioggia forte', 'rovesci', 'neve', 'neve leggera', 'nevischio', 'temporale', 'ventoso'],
};
const DIR_PL = { N: 'pn.', S: 'pd.', E: 'wsch.', W: 'zach.', NE: 'pn.-wsch.', NW: 'pn.-zach.', SE: 'pd.-wsch.', SW: 'pd.-zach.' };
const DIR_SWAP = { de: { E: 'O' }, es: { W: 'O' }, fr: { W: 'O' }, it: { W: 'O' } };
export const wxText = t => { const l = lang(), k = WX_KEYS.indexOf(String(t || '').toLowerCase()); return t && WX[l] && k >= 0 ? WX[l][k] : t; };
export const wxDir = d => { const l = lang(); if (!d || l === 'en') return d; if (l === 'pl') return DIR_PL[d] ?? DIR_PL[d.slice(-2)] ?? d; return d.replace(/[NSEW]/g, c => DIR_SWAP[l]?.[c] ?? c); };
export const weatherLine = (W, F) => (W ? [W.temp != null && F.temp(W.temp), wxText(W.text)].filter(Boolean).join(' · ') : '');
const wrap = (v, n) => ((v % n) + n) % n;
// a soft radial disc drawn once and then stamped with drawImage, instead of a gradient per particle per frame
function sprite(stops, size = 128) {
  const c = Object.assign(document.createElement('canvas'), { width: size, height: size }), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}
function scene(W, w, h, dark) {
  const kind = sky(W), r = seeded(7), wind = Math.min(1.4, (W?.wind ?? 8) / 20), temp = W?.temp ?? 12, m = Math.min(w, h), area = w * h;
  const tint = temp <= 3 ? `rgba(150,190,255,${dark ? 0.07 : 0.08})` : temp >= 25 ? `rgba(255,170,90,${dark ? 0.06 : 0.07})` : null;
  // [count per 10k px², length, length spread, width, opacity, speed px/s]: many faint far drops, a few long bright near ones
  const DEPTHS = [[2.2, 14, 6, 1, 0.1, 900], [0.9, 30, 10, 1.4, 0.16, 1400], [0.16, 90, 30, 2.2, 0.26, 2100]];
  const drops = kind === 'rain' ? DEPTHS.flatMap(([n, len, lv, wd, a, v], d) =>
    Array.from({ length: Math.round(area / 10000 * n) }, () => ({ x: r() * (w + 200), y: r() * h, len: len + r() * lv, wd, a: a * (0.6 + r() * 0.8), v: v * (0.9 + r() * 0.2), d }))) : [];
  // where drops land: a ripple each, on its own 0.4–1.2 s loop, in the bottom fifth
  const ripples = kind === 'rain' ? Array.from({ length: Math.round(w / 40) }, () => ({ x: r() * w, y: h * (0.82 + r() * 0.17), p: r(), T: 0.4 + r() * 0.8 })) : [];
  const nFlakes = Math.round(area / 6700), nNear = Math.max(3, Math.round(area / 350000)), bunches = Array.from({ length: 7 }, () => [r() * w, r() * h]);
  const flakes = kind === 'snow' ? Array.from({ length: nFlakes }, (_, k) => { const z = 0.3 + r() * 0.7, near = k < nNear, b = bunches[k % 7], loose = r() < 0.45;
    return { x: loose ? r() * w : b[0] + (r() - 0.5) * w * 0.35, y: loose ? r() * h : b[1] + (r() - 0.5) * h * 0.45, z, p: r() * 6.28,
      rad: near ? 9 + r() * 7 : 1 + 2 * r(), a: near ? 0.12 + r() * 0.06 : 0.2 + 0.35 * r(), near }; }) : [];
  const nClouds = kind === 'cloud' ? 6 : kind === 'rain' ? 5 : 0;
  const clouds = Array.from({ length: nClouds }, (_, k) => { const cw = w * (0.24 + r() * 0.16);
    return { x0: r() * (w + cw) - cw / 2, y0: h * (0.03 + r() * 0.11), cw, v: 6 + r() * 10, k,
      puffs: Array.from({ length: 11 + Math.floor(r() * 5) }, () => { const u = (r() - 0.5) * 0.75; return { dx: u * cw, dy: (r() - 0.5) * cw * 0.05 - (0.14 - u * u) * cw * 0.25, rad: cw * (0.04 + r() * 0.08) }; }) }; });
  const rainy = kind === 'rain', base = rainy ? (dark ? '96,110,118' : '120,116,108') : (dark ? '150,162,158' : '150,146,138'), lit = rainy ? (dark ? '160,174,180' : '184,180,172') : (dark ? '236,241,238' : '184,180,172');
  const ba = rainy ? (dark ? 0.14 : 0.1) : (dark ? 0.12 : 0.09), la = rainy ? (dark ? 0.1 : 0.05) : (dark ? 0.22 : 0.06), sc = dark ? '255,255,255' : '84,108,132';
  const S = { kind, tint, dark, w, h, m, wind, slant: 0.03 + wind * 0.07, drops, ripples, flakes, clouds, rc: dark ? '205,218,230' : '60,84,108' };
  if (clouds.length) Object.assign(S, {
    bank: sprite([[0, `rgba(${base},${ba * 1.1})`], [1, `rgba(${base},0)`]]),
    puff: sprite([[0, `rgba(${base},${ba})`], [0.6, `rgba(${base},${ba * 0.55})`], [1, `rgba(${base},0)`]]),
    lit: sprite([[0, `rgba(${lit},${la})`], [1, `rgba(${lit},0)`]]) });
  if (drops.length) {   // one soft streak, clear at the tail and brightest at the head, stretched per drop
    const rc = dark ? '214,226,238' : '52,74,98', c = Object.assign(document.createElement('canvas'), { width: 8, height: 128 }), g = c.getContext('2d');
    const v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, `rgba(${rc},0)`); v.addColorStop(0.75, `rgba(${rc},.55)`); v.addColorStop(1, `rgba(${rc},1)`);
    g.fillStyle = v; g.fillRect(3, 0, 2, 128); g.globalAlpha = 0.35; g.fillRect(2, 0, 4, 128);
    Object.assign(S, { streak: c, rc });
  }
  if (flakes.length) Object.assign(S, {
    flake: sprite([[0, `rgba(${sc},1)`], [0.25, `rgba(${sc},.55)`], [1, `rgba(${sc},0)`]], 32),
    bigFlake: sprite([[0, `rgba(${sc},1)`], [0.2, `rgba(${sc},.6)`], [1, `rgba(${sc},0)`]], 64) });
  if (kind === 'clear') {   // the rays, blurred once
    const R = Math.ceil(m * 0.3), c = Object.assign(document.createElement('canvas'), { width: R * 2, height: R * 2 }), g = c.getContext('2d');
    g.translate(R, R); g.filter = `blur(${Math.round(m * 0.008)}px)`;
    for (let k = 0; k < 14; k++) { g.rotate(Math.PI * 2 / 14); const L = m * (k % 3 ? 0.2 : 0.29), wd = m * (k % 2 ? 0.01 : 0.017), rg = g.createLinearGradient(0, 0, L, 0);
      rg.addColorStop(0, `rgba(255,228,176,${dark ? 0.09 : 0.11})`); rg.addColorStop(1, 'rgba(255,228,176,0)');
      g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -wd); g.lineTo(L, wd); g.fill(); }
    Object.assign(S, { rays: c, raysR: R });
  }
  return S;
}
function paint(g, S, t) {
  const { w, h, m, dark } = S;
  g.clearRect(0, 0, w, h);
  if (S.tint) { g.fillStyle = S.tint; g.fillRect(0, 0, w, h); }
  if (S.kind === 'rain') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, dark ? 'rgba(4,10,16,.28)' : 'rgba(56,72,90,.12)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.5);
    const mist = g.createLinearGradient(0, h * 0.75, 0, h); mist.addColorStop(0, 'rgba(210,222,232,0)'); mist.addColorStop(1, dark ? 'rgba(210,222,232,.07)' : 'rgba(255,255,255,.14)'); g.fillStyle = mist; g.fillRect(0, h * 0.75, w, h * 0.25); }
  if (S.kind === 'cloud') { const gr = g.createLinearGradient(0, 0, 0, h * 0.5); gr.addColorStop(0, dark ? 'rgba(170,182,178,.07)' : 'rgba(120,130,138,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.5); }
  for (const c of S.clouds) {
    const x = wrap(c.x0 + t * c.v * (0.6 + S.wind), w + c.cw * 1.4) - c.cw * 0.7, y = c.y0 + Math.sin(t * 0.08 + c.k) * 6, R = c.cw * 0.45;
    g.drawImage(S.bank, x - R, y + c.cw * 0.05 - R * 0.22, R * 2, R * 0.44);
    for (const p of c.puffs) { const px = x + p.dx, py = y + p.dy, lr = p.rad * 0.45;
      g.drawImage(S.puff, px - p.rad, py - p.rad * 0.62, p.rad * 2, p.rad * 1.24);
      g.drawImage(S.lit, px - lr, py - p.rad * 0.31 - lr * 0.62, lr * 2, lr * 1.24); } }
  if (S.kind === 'clear') {
    const x = w * 0.84, y = h * 0.13, pulse = 1 + 0.03 * Math.sin(t * 0.9);
    const bloom = g.createRadialGradient(x, y, 0, x, y, m * 0.85 * pulse); bloom.addColorStop(0, `rgba(255,214,160,${dark ? 0.16 : 0.24})`); bloom.addColorStop(1, 'rgba(255,214,160,0)');
    g.fillStyle = bloom; g.fillRect(0, 0, w, h);
    g.save(); g.translate(x, y); g.rotate(t * 0.03); g.drawImage(S.rays, -S.raysR, -S.raysR); g.restore();
    const glow = g.createRadialGradient(x, y, 0, x, y, m * 0.19 * pulse); glow.addColorStop(0, `rgba(255,233,196,${dark ? 0.26 : 0.6})`); glow.addColorStop(1, 'rgba(255,233,196,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(x, y, m * 0.19 * pulse, 0, 6.2832); g.fill();
    const cr = m * (dark ? 0.036 : 0.05), core = g.createRadialGradient(x, y, 0, x, y, cr); core.addColorStop(0, 'rgba(255,255,250,1)'); core.addColorStop(0.5, 'rgba(255,236,196,.6)'); core.addColorStop(1, 'rgba(255,226,176,0)');
    g.fillStyle = core; g.beginPath(); g.arc(x, y, cr, 0, 6.2832); g.fill();
    for (const [k, rad, col, a] of [[0.45, 0.022, '255,214,160', 0.11], [0.7, 0.014, '170,225,215', 0.1], [0.95, 0.034, '255,200,150', 0.08]]) {
      const gx = x + (w / 2 - x) * k, gy = y + (h / 2 - y) * k, gg = g.createRadialGradient(gx, gy, 0, gx, gy, m * rad);
      gg.addColorStop(0, `rgba(${col},${a})`); gg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gg; g.beginPath(); g.arc(gx, gy, m * rad, 0, 6.2832); g.fill(); } }
  if (S.drops.length) {
    const gust = 0.85 + 0.15 * Math.sin(t * 0.5) * Math.sin(t * 0.21 + 1), ang = Math.atan(S.slant);
    g.save(); g.translate(w / 2, h / 2); g.rotate(ang); g.translate(-w / 2, -h / 2);   // fall along the slant; drift is in the rotation
    for (const d of S.drops) {
      const y = wrap(d.y + t * d.v, h + d.len + 120) - d.len - 60, x = wrap(d.x, w + 200) - 100;
      g.globalAlpha = d.a * gust; g.drawImage(S.streak, x - d.wd * 2, y, d.wd * 4, d.len); }
    g.restore();
    g.strokeStyle = `rgb(${S.rc})`; g.lineWidth = 1;
    for (const p of S.ripples) {
      const c = t / p.T + p.p, k = wrap(c, 1), x = wrap(p.x + Math.floor(c) * w * 0.618, w), rad = 2 + k * 14 * (p.y / h);   // each ripple lands somewhere new
      g.globalAlpha = 0.22 * (1 - k) * (1 - k); g.beginPath(); g.ellipse(x, p.y, rad, rad * 0.28, 0, 0, 6.2832); g.stroke(); }
    g.globalAlpha = 1; }
  for (const f of S.flakes) {
    const y = wrap(f.y + t * (22 + 55 * f.z) * (f.near ? 1.6 : 1), h + 40) - 20, x = wrap(f.x - t * S.wind * 40 * f.z + Math.sin(t * (0.6 + f.z) + f.p) * 22 * f.z, w + 40) - 20, R = f.rad * (f.near ? 1.6 : 2.2);
    g.globalAlpha = f.a; g.drawImage(f.near ? S.bigFlake : S.flake, x - R, y - R * 1.3, R * 2, R * 2.6); }
  g.globalAlpha = 1;
}
export function weatherLayer(W, w, h, dark) {
  const S = scene(W, w, h, dark), el = document.createElement('canvas'); el.width = w; el.height = h; el.className = 'absolute inset-0 pointer-events-none';
  const g = el.getContext('2d'); let last = null;
  return { el, draw: t => { if (t === last || !S.kind) return; last = t; paint(g, S, t / 1000); }, kind: S.kind };
}
export function weatherSvg(W, w, ht, dark) {
  const S = scene(W, w, ht, dark);
  if (!S.kind) return h('g', {});
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: ht }); paint(cv.getContext('2d'), S, 12);
  return h('image', { href: cv.toDataURL('image/png'), width: w, height: ht, 'pointer-events': 'none' });
}
/* embed.sky: draw this sky instead of the run's (the home page turns through several) */
export const skyOf = (M, embed) => (embed?.sky ? { ...M.weather, ...embed.sky } : M.weather);
export const weatherControl = M => ({ now: M.weather || null, set: Runs.setWeather });

/* RUN.splits are per km; in miles they are re-measured from the track. `km` is in the unit, pace stays s/km. */
export function splits(RUN, F) {
  if (!F.MI) return { splits: RUN.splits, size: RUN.meta.splitKm };
  const T = RUN.track, n = T.d.length, D = RUN.meta.distance / F.U, size = D < 20 ? 1 : D < 80 ? 5 : 10, out = [];
  let i0 = 0, mark = size * F.U, up = 0, last = T.a[0], hs = 0, hn = 0;
  for (let i = 1; i < n; i++) {
    const dz = T.a[i] - last; if (Math.abs(dz) >= 2) { if (dz > 0) up += dz; last = T.a[i]; }
    if (T.h[i]) { hs += T.h[i]; hn++; }
    if (T.d[i] >= mark || i === n - 1) {
      const km = (T.d[i] - T.d[i0]) / 1000;
      if (km * 1000 >= size * F.U * 0.3) out.push({ km: Math.round(T.d[i] / F.U * 10) / 10, pace: Math.round((T.t[i] - T.t[i0]) / km), hr: hn ? Math.round(hs / hn) : 0, up: Math.round(up) });
      i0 = i; mark += size * F.U; up = 0; hs = hn = 0;
    }
  }
  return { splits: out.length ? out : RUN.splits, size };
}

const NAMES = {
  en: (kind, part) => `${['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'][part]} ${{ run: 'run', trail: 'trail run', ride: 'ride', walk: 'walk', hike: 'hike' }[kind]}`,
  pl: (kind, part) => `${{ run: 'Bieg', trail: 'Bieg terenowy', ride: 'Jazda na rowerze', walk: 'Spacer', hike: 'Wędrówka' }[kind]} ${(kind === 'ride' || kind === 'hike'
    ? ['poranna', 'południowa', 'popołudniowa', 'wieczorna', 'nocna'] : ['poranny', 'południowy', 'popołudniowy', 'wieczorny', 'nocny'])[part]}`,
  de: (kind, part) => `${['Morgen', 'Mittags', 'Nachmittags', 'Abend', 'Nacht'][part]}${{ run: 'lauf', trail: 'trail', ride: 'fahrt', walk: 'spaziergang', hike: 'wanderung' }[kind]}`,
  es: (kind, part) => `${{ run: 'Carrera', trail: 'Carrera de montaña', ride: 'Salida en bici', walk: 'Paseo', hike: 'Excursión' }[kind]} ${['matutina', 'de mediodía', 'de tarde', 'vespertina', 'nocturna'][part]}`
    .replace(/^(Paseo) matutina/, '$1 matutino').replace(/^(Paseo) vespertina/, '$1 vespertino').replace(/^(Paseo) nocturna/, '$1 nocturno'),
  fr: (kind, part) => `${{ run: 'Course', trail: 'Trail', ride: 'Sortie vélo', walk: 'Marche', hike: 'Randonnée' }[kind]} ${['du matin', 'de midi', 'de l’après-midi', 'du soir', 'de nuit'][part]}`,
  it: (kind, part) => `${{ run: 'Corsa', trail: 'Trail', ride: 'Giro in bici', walk: 'Camminata', hike: 'Escursione' }[kind]} ${['mattutina', 'di mezzogiorno', 'pomeridiana', 'serale', 'notturna'][part]}`
    .replace(/^(Trail|Giro in bici) (mattutin|pomeridian|notturn)a$/, '$1 $2o'),
};
const SPORTS = {
  en: { run: 'Run', trail: 'Trail run', ride: 'Ride', walk: 'Walk', hike: 'Hike' }, pl: { run: 'Bieg', trail: 'Bieg terenowy', ride: 'Jazda na rowerze', walk: 'Spacer', hike: 'Wędrówka' },
  de: { run: 'Lauf', trail: 'Traillauf', ride: 'Radfahrt', walk: 'Spaziergang', hike: 'Wanderung' }, es: { run: 'Carrera', trail: 'Trail', ride: 'Bici', walk: 'Paseo', hike: 'Excursión' },
  fr: { run: 'Course', trail: 'Trail', ride: 'Vélo', walk: 'Marche', hike: 'Randonnée' }, it: { run: 'Corsa', trail: 'Trail', ride: 'Bici', walk: 'Camminata', hike: 'Escursione' },
};
const RUN_WORDS = {
  en: { bpm: 'bpm', high: 'Highest point', maxHr: 'Max heart rate', half: 'Half marathon', mar: 'Marathon', mi50: '50 miles', mi100: '100 miles', start: 'Start', startFinish: 'Start and finish', finish: 'Finish' },
  pl: { bpm: 'ud./min', high: 'Najwyższy punkt', maxHr: 'Tętno maks.', half: 'Półmaraton', mar: 'Maraton', mi50: '50 mil', mi100: '100 mil', start: 'Start', startFinish: 'Start i meta', finish: 'Meta' },
  de: { bpm: 'S/min', high: 'Höchster Punkt', maxHr: 'Max. Herzfrequenz', half: 'Halbmarathon', mar: 'Marathon', mi50: '50 Meilen', mi100: '100 Meilen', start: 'Start', startFinish: 'Start und Ziel', finish: 'Ziel' },
  es: { bpm: 'ppm', high: 'Punto más alto', maxHr: 'FC máxima', half: 'Media maratón', mar: 'Maratón', mi50: '50 millas', mi100: '100 millas', start: 'Salida', startFinish: 'Salida y meta', finish: 'Meta' },
  fr: { bpm: 'bpm', high: 'Point culminant', maxHr: 'FC max', half: 'Semi-marathon', mar: 'Marathon', mi50: '50 miles', mi100: '100 miles', start: 'Départ', startFinish: 'Départ et arrivée', finish: 'Arrivée' },
  it: { bpm: 'bpm', high: 'Punto più alto', maxHr: 'FC massima', half: 'Mezza maratona', mar: 'Maratona', mi50: '50 miglia', mi100: '100 miglia', start: 'Partenza', startFinish: 'Partenza e arrivo', finish: 'Arrivo' },
};

export function words(RUN, F) {
  const M = RUN.meta, R = tr(RUN_WORDS), BPM = R.bpm, PL = lang() === 'pl';
  const kind = M.sport === 1 && M.subSport === 3 ? 'trail' : ({ 1: 'run', 2: 'ride', 11: 'walk', 17: 'hike' })[M.sport] || 'run', SPORT = tr(SPORTS)[kind];
  const hr = F.START.getHours(), part = hr < 5 ? 4 : hr < 11 ? 0 : hr < 14 ? 1 : hr < 17 ? 2 : hr < 22 ? 3 : 4;
  const NAME = M.name || tr(NAMES)(kind, part), EVENT = M.event || '';
  const HIGH = R.high, km = v => `${F.dec(v * 1000 / F.U)} ${F.DU}`;
  const K = (name, v) => (F.MI ? [name.replace(' km', 'K'), km(v)] : [name, '']), MI = (name, v) => [name, F.MI ? '' : km(v)];
  const MARK = { hr: R.maxHr, '5k': K('5 km', 5), '10k': K('10 km', 10), half: [R.half, km(21.1)], mar: [R.mar, km(42.2)], '50k': K('50 km', 50),
    '50mi': MI(R.mi50, 80.5), '100k': K('100 km', 100), '100mi': MI(R.mi100, 160.9) };
  return { BPM, SPORT, NAME, EVENT, TITLE: [NAME, EVENT].filter(Boolean).join(' · '), HIGH, PL,
    mark: m => (m.k === 'high' ? [`${M.highName || HIGH} · ${F.int(F.ht(M.maxAlt))} ${F.HU}`, M.highName ? HIGH : ''] : m.k === 'hr' ? [`${m.v} ${BPM}`, MARK.hr] : MARK[m.k]),
    start: R.start, startFinish: R.startFinish, finish: R.finish, ui: UI() };
}

export const UI = () => tr({
  en: { play: 'Play', pause: 'Pause', sound: 'Sound', mute: 'Mute', exportMp4: 'Export MP4', exportVideo: 'Export video', stop: 'Stop', withSound: 'export with sound',
    map: 'Map', mapOff: 'None', mapTerrain: 'Terrain', mapSatellite: 'Satellite', mapOld: 'Load your run again to lay a map under it.',
    yours: 'Use your own run', another: 'Load a different run', sample: 'Show the sample', isSample: 'This is a made-up sample run.',
    playback: 'Playback', position: 'Position', colours: 'Colours', units: 'Units', metric: 'Metric', imperial: 'Imperial', language: 'Language',
    weather: 'Weather', temperature: 'Temperature', skies: { clear: 'Clear', cloud: 'Cloudy', rain: 'Rain', snow: 'Snow' },
    export: 'Export', run: 'Run', picture: 'Picture', templates: 'All templates', drop: 'Or drop a .fit or Garmin .zip anywhere on the page.',
    noRecord: 'This browser cannot record the page. Use Chrome or Edge on desktop.', choose: 'Choose “This tab” in the prompt. Keep this tab visible while it records.', cancelled: 'Export cancelled.',
    noCrop: 'This browser cannot crop to the frame, so the whole tab is recorded.', recording: 'Recording… the file downloads when the film ends.',
    saved: (file, mb, webm) => `Saved ${file} · ${mb} MB` + (webm ? ' (this browser records WebM, not MP4)' : '') },
  pl: { play: 'Odtwórz', pause: 'Pauza', sound: 'Dźwięk', mute: 'Wycisz', exportMp4: 'Eksportuj MP4', exportVideo: 'Eksportuj wideo', stop: 'Zatrzymaj', withSound: 'eksportuj z dźwiękiem',
    map: 'Mapa', mapOff: 'Brak', mapTerrain: 'Teren', mapSatellite: 'Satelita', mapOld: 'Wczytaj bieg jeszcze raz, żeby podłożyć pod niego mapę.',
    yours: 'Użyj własnego biegu', another: 'Wczytaj inny bieg', sample: 'Pokaż przykład', isSample: 'To zmyślony, przykładowy bieg.',
    playback: 'Odtwarzanie', position: 'Pozycja', colours: 'Kolory', units: 'Jednostki', metric: 'Metryczne', imperial: 'Imperialne', language: 'Język',
    weather: 'Pogoda', temperature: 'Temperatura', skies: { clear: 'Bezchmurnie', cloud: 'Pochmurno', rain: 'Deszcz', snow: 'Śnieg' },
    export: 'Eksport', run: 'Bieg', picture: 'Obraz', templates: 'Wszystkie szablony', drop: 'Albo upuść plik .fit lub .zip z Garmina w dowolnym miejscu strony.',
    noRecord: 'Ta przeglądarka nie nagrywa strony. Użyj Chrome lub Edge na komputerze.', choose: 'Wybierz „Ta karta” w okienku. Nie zasłaniaj karty podczas nagrywania.', cancelled: 'Eksport anulowany.',
    noCrop: 'Ta przeglądarka nie przycina do kadru, więc nagrywa całą kartę.', recording: 'Nagrywanie… plik pobierze się, gdy film się skończy.',
    saved: (file, mb, webm) => `Zapisano ${file} · ${mb} MB` + (webm ? ' (ta przeglądarka nagrywa WebM, nie MP4)' : '') },
  de: { play: 'Abspielen', pause: 'Pause', sound: 'Ton', mute: 'Stumm', exportMp4: 'MP4 exportieren', exportVideo: 'Video exportieren', stop: 'Stopp', withSound: 'mit Ton exportieren',
    map: 'Karte', mapOff: 'Keine', mapTerrain: 'Gelände', mapSatellite: 'Satellit', mapOld: 'Lade deinen Lauf erneut, um eine Karte darunterzulegen.',
    yours: 'Eigenen Lauf verwenden', another: 'Anderen Lauf laden', sample: 'Beispiel zeigen', isSample: 'Das ist ein erfundener Beispiellauf.',
    playback: 'Wiedergabe', position: 'Position', colours: 'Farben', units: 'Einheiten', metric: 'Metrisch', imperial: 'Imperial', language: 'Sprache',
    weather: 'Wetter', temperature: 'Temperatur', skies: { clear: 'Klar', cloud: 'Bewölkt', rain: 'Regen', snow: 'Schnee' },
    export: 'Export', run: 'Lauf', picture: 'Bild', templates: 'Alle Vorlagen', drop: 'Oder zieh eine .fit- oder Garmin-.zip-Datei irgendwo auf die Seite.',
    noRecord: 'Dieser Browser kann die Seite nicht aufnehmen. Nutze Chrome oder Edge am Computer.', choose: 'Wähle im Dialog „Dieser Tab“. Lass den Tab während der Aufnahme sichtbar.', cancelled: 'Export abgebrochen.',
    noCrop: 'Dieser Browser kann nicht auf den Rahmen zuschneiden, daher wird der ganze Tab aufgenommen.', recording: 'Aufnahme läuft … die Datei wird geladen, wenn der Film endet.',
    saved: (file, mb, webm) => `${file} gespeichert · ${mb} MB` + (webm ? ' (dieser Browser nimmt WebM auf, kein MP4)' : '') },
  es: { play: 'Reproducir', pause: 'Pausa', sound: 'Sonido', mute: 'Silenciar', exportMp4: 'Exportar MP4', exportVideo: 'Exportar vídeo', stop: 'Detener', withSound: 'exportar con sonido',
    map: 'Mapa', mapOff: 'Ninguno', mapTerrain: 'Relieve', mapSatellite: 'Satélite', mapOld: 'Vuelve a cargar tu carrera para poner un mapa debajo.',
    yours: 'Usar tu carrera', another: 'Cargar otra carrera', sample: 'Ver el ejemplo', isSample: 'Esta es una carrera de ejemplo inventada.',
    playback: 'Reproducción', position: 'Posición', colours: 'Colores', units: 'Unidades', metric: 'Métrico', imperial: 'Imperial', language: 'Idioma',
    weather: 'Tiempo', temperature: 'Temperatura', skies: { clear: 'Despejado', cloud: 'Nublado', rain: 'Lluvia', snow: 'Nieve' },
    export: 'Exportar', run: 'Carrera', picture: 'Imagen', templates: 'Todas las plantillas', drop: 'O suelta un .fit o un .zip de Garmin en cualquier parte de la página.',
    noRecord: 'Este navegador no puede grabar la página. Usa Chrome o Edge en un ordenador.', choose: 'Elige «Esta pestaña» en el aviso. Mantén la pestaña visible mientras graba.', cancelled: 'Exportación cancelada.',
    noCrop: 'Este navegador no puede recortar al marco, así que se graba toda la pestaña.', recording: 'Grabando… el archivo se descarga cuando termina la película.',
    saved: (file, mb, webm) => `Guardado ${file} · ${mb} MB` + (webm ? ' (este navegador graba WebM, no MP4)' : '') },
  fr: { play: 'Lecture', pause: 'Pause', sound: 'Son', mute: 'Couper le son', exportMp4: 'Exporter en MP4', exportVideo: 'Exporter la vidéo', stop: 'Arrêter', withSound: 'exporter avec le son',
    map: 'Carte', mapOff: 'Aucune', mapTerrain: 'Relief', mapSatellite: 'Satellite', mapOld: 'Rechargez votre course pour placer une carte dessous.',
    yours: 'Utiliser votre course', another: 'Charger une autre course', sample: 'Voir l’exemple', isSample: 'Ceci est une course d’exemple inventée.',
    playback: 'Lecture', position: 'Position', colours: 'Couleurs', units: 'Unités', metric: 'Métrique', imperial: 'Impérial', language: 'Langue',
    weather: 'Météo', temperature: 'Température', skies: { clear: 'Dégagé', cloud: 'Nuageux', rain: 'Pluie', snow: 'Neige' },
    export: 'Export', run: 'Course', picture: 'Image', templates: 'Tous les modèles', drop: 'Ou déposez un .fit ou un .zip Garmin n’importe où sur la page.',
    noRecord: 'Ce navigateur ne peut pas enregistrer la page. Utilisez Chrome ou Edge sur ordinateur.', choose: 'Choisissez « Cet onglet » dans la fenêtre. Gardez l’onglet visible pendant l’enregistrement.', cancelled: 'Export annulé.',
    noCrop: 'Ce navigateur ne peut pas recadrer sur l’image, tout l’onglet est donc enregistré.', recording: 'Enregistrement… le fichier se télécharge à la fin du film.',
    saved: (file, mb, webm) => `${file} enregistré · ${mb} Mo` + (webm ? ' (ce navigateur enregistre en WebM, pas en MP4)' : '') },
  it: { play: 'Riproduci', pause: 'Pausa', sound: 'Audio', mute: 'Muto', exportMp4: 'Esporta MP4', exportVideo: 'Esporta video', stop: 'Ferma', withSound: 'esporta con audio',
    map: 'Mappa', mapOff: 'Nessuna', mapTerrain: 'Rilievo', mapSatellite: 'Satellite', mapOld: 'Ricarica la tua corsa per metterci sotto una mappa.',
    yours: 'Usa la tua corsa', another: 'Carica un’altra corsa', sample: 'Mostra l’esempio', isSample: 'Questa è una corsa di esempio inventata.',
    playback: 'Riproduzione', position: 'Posizione', colours: 'Colori', units: 'Unità', metric: 'Metrico', imperial: 'Imperiale', language: 'Lingua',
    weather: 'Meteo', temperature: 'Temperatura', skies: { clear: 'Sereno', cloud: 'Nuvoloso', rain: 'Pioggia', snow: 'Neve' },
    export: 'Esporta', run: 'Corsa', picture: 'Immagine', templates: 'Tutti i modelli', drop: 'Oppure trascina un .fit o uno .zip Garmin in qualsiasi punto della pagina.',
    noRecord: 'Questo browser non può registrare la pagina. Usa Chrome o Edge su computer.', choose: 'Scegli «Questa scheda» nella finestra. Tieni la scheda visibile durante la registrazione.', cancelled: 'Esportazione annullata.',
    noCrop: 'Questo browser non può ritagliare sul riquadro, quindi registra tutta la scheda.', recording: 'Registrazione… il file si scarica alla fine del film.',
    saved: (file, mb, webm) => `Salvato ${file} · ${mb} MB` + (webm ? ' (questo browser registra WebM, non MP4)' : '') },
});
export { lang, plural, tr };

const ZONES_DARK = ['#8A9BA8', '#8A9BA8', '#4FA3E0', '#6CC24A', '#F5A623', '#E5484D'], ZONES_LIGHT = ['#9AA7B0', '#9AA7B0', '#2F86C8', '#4FA832', '#E8920C', '#D6353A'];
/* The five looks are TerraInk themes (terraink-mobile/app/src/data/themes.json): same names, same colours as the map posters. */
export const LOOKS = {
  midnight_blue: { name: 'Midnight Blue', dark: true, bg: '#0A1628', bg2: '#0F2235', edge: '#061020', panel: '#0F2235', line: '#1E3450', fg: '#F3EBD8', soft: '#97A3B6', accent: '#D6B352', signal: '#FF5F1F', zones: ZONES_DARK },
  heatwave: { name: 'Heatwave', dark: true, bg: '#1C0E09', bg2: '#381A10', edge: '#0E0604', panel: '#2C140C', line: '#4A2618', fg: '#FFEBC9', soft: '#C29C7E', accent: '#FFD78A', signal: '#FF5F1F', zones: ZONES_DARK },
  neon: { name: 'Neon', dark: true, bg: '#0D0D1A', bg2: '#17172A', edge: '#080815', panel: '#141426', line: '#27274A', fg: '#E8FFFF', soft: '#8C8CB4', accent: '#00FFFF', signal: '#FF00F0', zones: ZONES_DARK },
  terracotta: { name: 'Terracotta', dark: false, bg: '#F5EDE4', bg2: '#FAF5EF', edge: '#E8E0D0', panel: '#EDE3D7', line: '#DDD0C0', fg: '#2E1A0E', soft: '#8A6E5C', accent: '#A0522D', signal: '#E8531A', zones: ZONES_LIGHT },
  coral: { name: 'Coral', dark: false, bg: '#F3E1DA', bg2: '#F8EBE6', edge: '#EACFC6', panel: '#EBD3CA', line: '#DFC0B5', fg: '#4A1F1A', soft: '#8E5E56', accent: '#B9473A', signal: '#E0662F', zones: ZONES_LIGHT },
};
const LOOK_KEY = 'garminLook.look';
const savedLook = () => { try { return localStorage.getItem(LOOK_KEY); } catch { return null; } };
/* `ground` names the template's background colour: 'ink' (dark-first) or 'paper' (paper-first). */
export function wear(root, fallback, ground = 'ink', force) {
  const key = LOOKS[force] ? force : LOOKS[savedLook()] ? savedLook() : fallback, L = { key, ...LOOKS[key] };
  const C = ground === 'ink' ? { ink: L.bg, peat: L.panel, line: L.line, paper: L.fg, soft: L.soft, moss: L.accent, signal: L.signal }
    : { paper: L.bg, ink: L.fg, peat: L.panel, line: L.line, soft: L.soft, moss: L.accent, signal: L.signal };
  Object.entries({ ...C, bg2: L.bg2, edge: L.edge }).forEach(([k, v]) => root.style.setProperty('--' + k, v));
  return { L, C, ZC: [...L.zones] };
}
export function setLook(key) { try { localStorage.setItem(LOOK_KEY, key); } catch { /* private mode */ } dispatchEvent(new Event('garminlook:look')); }

/* An SVG drawn onto a canvas cannot load page web fonts, so Inter is inlined as data URLs first. */
let fontCss = null;
async function inlineFonts() {
  if (fontCss) return fontCss;
  const faces = [];
  for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) if (r instanceof CSSFontFaceRule && /inter/i.test(r.style.getPropertyValue('font-family'))) faces.push([r, sheet.href || location.href]); }
  const css = await Promise.all(faces.map(async ([r, base]) => {
    const url = r.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/)?.[1]; if (!url) return '';   // relative to its stylesheet
    const res = await fetch(new URL(url, base)); if (!res.ok) return '';
    const buf = await res.arrayBuffer(); let bin = ''; new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    return `@font-face{font-family:Inter;font-style:${r.style.getPropertyValue('font-style') || 'normal'};font-weight:${r.style.getPropertyValue('font-weight') || '100 900'};` +
      `unicode-range:${r.style.getPropertyValue('unicode-range') || 'U+0-10FFFF'};src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2')}`;
  }));
  return (fontCss = css.join(''));
}
export async function rasterize(svgEl, w, h) {
  const copy = svgEl.cloneNode(true), style = document.createElementNS(NS, 'style');
  style.textContent = await inlineFonts(); copy.insertBefore(style, copy.firstChild);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
  try {
    const img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
    const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }); cv.getContext('2d').drawImage(img, 0, 0, w, h);
    return cv;
  } finally { URL.revokeObjectURL(url); }
}

export function audio(paused) {
  const au = { AC: null, A: null,
    ok: () => au.A && !paused(),
    env(g, now, v, dur, att = 0.008) { g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(v, now + att); g.gain.exponentialRampToValueAtTime(0.0001, now + dur); },
    tone(f, dur, v, type = 'sine', delay = 0) { if (!au.ok()) return; const AC = au.AC, now = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; au.env(g, now, v, dur); o.connect(g).connect(au.A.bus); o.start(now); o.stop(now + dur + 0.05); },
    noise(dur, v, f0, f1, q = 1, type = 'bandpass') { if (!au.ok()) return; const AC = au.AC, now = AC.currentTime, n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      n.buffer = au.A.noise; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, now); f.frequency.exponentialRampToValueAtTime(f1, now + dur * 0.8); au.env(g, now, v, dur, dur * 0.3); n.connect(f).connect(g).connect(au.A.bus); n.start(now); n.stop(now + dur + 0.05); },
    init() {
      const AC = au.AC = new (window.AudioContext || window.webkitAudioContext)();
      const master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
      const len = AC.sampleRate * 2.4, ir = AC.createBuffer(2, len, AC.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const verb = AC.createConvolver(); verb.buffer = ir; const wet = AC.createGain(); wet.gain.value = 0.3; verb.connect(wet).connect(master);
      const bus = AC.createGain(); bus.connect(master); bus.connect(verb);
      const noise = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      au.A = { master, bus, noise };
      master.gain.setTargetAtTime(0.9, AC.currentTime, 0.5);
    } };
  return au;
}

/* The real map under a template's map group, when one is chosen (never on the home page's live previews). */
export function underlay(map, M, look, embed, o) {
  if (embed || !M.geo || Basemap.basemap() === 'off') return null;
  const b = Basemap.layer(M, look, o); map.insertBefore(b.el, map.firstChild); return b;
}
export const creditDiv = (b, size = 12) => (b ? h('div', { class: 'absolute right-[1.2%] bottom-[1%] text-(--soft) opacity-75 pointer-events-none whitespace-nowrap', style: `font-size:${size}px`, text: b.credit }) : null);

export const WIDE = 1000, SIDE = 300;
export function store(state) {
  const fns = new Set();
  return { get: () => state, subscribe: fn => (fns.add(fn), () => fns.delete(fn)),
    set(patch) { if (Object.keys(patch).every(k => Object.is(patch[k], state[k]))) return; state = { ...state, ...patch }; fns.forEach(f => f()); } };
}
export function runControls(UI, look, signal, st) {
  const { pick } = Runs.attach({ signal, onError: note => st.set({ note }) });
  return { UI, look, looks: LOOKS, setLook, units: units(), setUnits, basemap: Basemap.basemap(), setBasemap: Basemap.setBasemap, canMap: !!Runs.current('film').meta.geo,
    isSample: Runs.isSample(), pickRun: pick, backToSample: () => { Runs.clear(); location.reload(); } };
}

/* Call finishExport from the timeline's last frame. Export records the tab itself (the film is DOM + SVG,
   not a canvas) via getDisplayMedia, cropped to #frame with Region Capture. */
export function transport({ root, tl, total, W, H, chapters = [], frame = () => {}, au, UI, file = 'run', signal, look, resume, embed }) {
  const frameEl = root.querySelector('#frame'), stage = root.querySelector('#stage');
  // the time changes every frame, so it has its own store: only what shows it re-renders
  const st = store({ playing: true, sound: false, exporting: false, note: '' }), clk = store({ t: 0 });
  const note = txt => st.set({ note: txt });

  let exporting = null;
  const MIME = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const EXT = MIME.startsWith('video/mp4') ? 'mp4' : 'webm', FILE = `${file.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run'}.${EXT}`, EXPORT = EXT === 'mp4' ? UI.exportMp4 : UI.exportVideo;
  function fit() { if (embed) { const w = frameEl.parentElement.clientWidth; frameEl.style.setProperty('--w', w + 'px'); frameEl.style.setProperty('--h', w * H / W + 'px'); stage.style.transform = `scale(${w / W})`; return; }
    const wide = innerWidth >= WIDE, roomW = wide ? innerWidth - SIDE - 72 : innerWidth * 0.95, roomH = wide ? innerHeight - 48 : innerHeight * 0.72;
    const fitW = Math.max(160, Math.min(roomW, roomH * W / H)), fullW = (W >= H ? 1920 : 1080) / devicePixelRatio;
    const w = exporting && fullW <= Math.min(roomW, innerHeight * 0.95 * W / H) ? fullW : fitW;   // export at 1080p when it fits
    frameEl.style.setProperty('--w', w + 'px'); frameEl.style.setProperty('--h', w * H / W + 'px'); stage.style.transform = `scale(${w / W})`; }
  if (embed) { const ro = new ResizeObserver(fit); ro.observe(frameEl.parentElement); signal?.addEventListener('abort', () => ro.disconnect()); }
  else addEventListener('resize', fit, { signal });
  fit();
  function seekTo(ms) { tl.seek(0); tl.seek(Math.max(0, Math.min(total - 1, ms))); clk.set({ t: tl.iterationCurrentTime }); }   // via 0: backwards seeks otherwise leave set() values behind
  function setPlaying(p) { if (p) tl.play(); else tl.pause(); st.set({ playing: p }); }
  const soundOn = () => { if (!au.A) au.init(); au.AC.resume(); au.A.master.gain.setTargetAtTime(0.9, au.AC.currentTime, 0.05); st.set({ sound: true }); };
  function toggleSound() { if (!au.A) { soundOn(); return; }
    const on = au.A.master.gain.value < 0.5; au.A.master.gain.setTargetAtTime(on ? 0.9 : 0, au.AC.currentTime, 0.2); st.set({ sound: on }); }

  async function startExport(withSound) {
    if (exporting) return stopExport(true);
    if (!navigator.mediaDevices?.getDisplayMedia || !MIME) { note(UI.noRecord); return; }
    let dest = null;
    if (withSound) { soundOn(); dest = au.AC.createMediaStreamDestination(); au.A.master.connect(dest); }          // before any await: audio needs the click gesture
    setPlaying(false); seekTo(0);
    note(UI.choose);
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60, max: 60 }, displaySurface: 'browser' }, audio: false,
        preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude', monitorTypeSurfaces: 'exclude' });
    } catch { if (dest) au.A.master.disconnect(dest); note(UI.cancelled); return; }
    const [track] = stream.getVideoTracks();
    exporting = { stream, dest, chunks: [], done: false, cancelled: false };
    fit();
    let cropped = false;
    if (window.CropTarget && track.cropTo) { try { await track.cropTo(await CropTarget.fromElement(frameEl)); cropped = true; } catch (e) { console.warn('cropTo failed', e); } }
    if (!cropped) note(UI.noCrop);
    track.addEventListener('ended', () => stopExport(true));          // "Stop sharing" in the browser bar
    const rec = new MediaRecorder(new MediaStream([track, ...(dest ? dest.stream.getAudioTracks() : [])]), { mimeType: MIME, videoBitsPerSecond: 8e6, audioBitsPerSecond: 192e3 });
    exporting.rec = rec;
    rec.ondataavailable = e => { if (e.data.size) exporting.chunks.push(e.data); };
    rec.onstop = () => {
      const ex = exporting; exporting = null; fit();
      ex.stream.getTracks().forEach(t => t.stop()); if (ex.dest) au.A.master.disconnect(ex.dest);
      st.set({ exporting: false });
      if (ex.cancelled) { note(UI.cancelled); return; }
      const blob = new Blob(ex.chunks, { type: MIME.split(';')[0] });
      download(blob, FILE);
      note(UI.saved(FILE, (blob.size / 1048576).toLocaleString(loc(), { maximumFractionDigits: 1 }), EXT === 'webm'));
    };
    st.set({ exporting: true });
    await new Promise(r => setTimeout(r, 700));                        // let the capture settle after the sharing bar appears
    seekTo(0);
    rec.start(500);
    await new Promise(r => setTimeout(r, 250));
    note(UI.recording);
    setPlaying(true);
  }
  function finishExport() { if (!exporting || exporting.done) return; exporting.done = true; setPlaying(false); setTimeout(() => exporting && exporting.rec.state !== 'inactive' && exporting.rec.stop(), 500); }
  function stopExport(cancel) {
    if (!exporting) return; exporting.cancelled = cancel; exporting.done = true; setPlaying(false);
    if (exporting.rec && exporting.rec.state !== 'inactive') exporting.rec.stop();
    else { exporting.stream.getTracks().forEach(t => t.stop()); if (exporting.dest) au.A.master.disconnect(exporting.dest); exporting = null; fit(); st.set({ exporting: false }); note(UI.cancelled); }
  }

  if (!embed) addEventListener('keydown', e => {
    if (e.target.closest?.('input, button, a, [role], #side')) return;   // controls handle their own keys
    if (e.code === 'Space') { e.preventDefault(); setPlaying(tl.paused); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.preventDefault(); seekTo(tl.iterationCurrentTime + (e.code === 'ArrowRight' ? 1000 : -1000)); }
  }, { signal });
  (function loop() {
    if (signal?.aborted) return;
    const t = tl.iterationCurrentTime;
    frame(t);
    clk.set({ t });
    requestAnimationFrame(loop);
  })();
  if (resume?.t != null) seekTo(resume.t);
  if (resume?.sound) soundOn();                                          // still inside the click gesture
  document.fonts.ready.then(() => { if (!signal?.aborted) setPlaying(resume?.playing ?? true); });
  signal?.addEventListener('abort', () => { tl.pause(); if (exporting) stopExport(true); au.AC?.close(); });
  const controls = { kind: 'film', total, chapters, exportLabel: EXPORT, get: st.get, subscribe: st.subscribe, clock: { get: () => clk.get().t, subscribe: clk.subscribe }, ...(embed ? {} : runControls(UI, look, signal, st)),
    play: setPlaying, toggle: () => setPlaying(tl.paused), scrub: ms => { setPlaying(false); seekTo(Math.min(ms, total - 100)); } /* the very end of a looping timeline is its start */, jump: seekTo, toggleSound, exportVideo: startExport };
  return { seekTo, setPlaying, finishExport, controls };
}
