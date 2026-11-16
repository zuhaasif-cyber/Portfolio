// The opening: a still composition — the painting and the name on a black ground.
// Scrolling breaks the painting into torn pieces of itself (its real pixels) that
// flutter and fall away like petals, while the ground warms into the paper of the
// next page.
import { shatterPainting, shatterRegion, mulberry } from './fragments.js';

const GROUND = [0, 0, 0];
const PAPER = [244, 238, 227];
const CREAM = '#f6efe0';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function initHero({ onProgress = () => {}, still = false } = {}) {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const pin = hero.querySelector('.hero__pin');
  const canvas = hero.querySelector('.hero__canvas');
  const fig = hero.querySelector('.hero__art');
  const img = fig.querySelector('img');
  const lines = [...hero.querySelectorAll('.hero__line')];
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  root.classList.add('js-hero');
  if (still) root.classList.add('hero-still');

  let st = null;
  let p = 0, drawnP = -1, raf = 0;
  let lastW = 0, lastH = 0;

  /* --------------------------------------------------------- build */

  function drawName(nctx, pr, art) {
    const fs = parseFloat(getComputedStyle(lines[0]).fontSize);
    nctx.font = `600 ${fs}px "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif`;
    nctx.textBaseline = 'alphabetic';
    const glyphs = [];
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const range = document.createRange();
    for (const line of lines) {
      const node = [...line.childNodes].find((n) => n.nodeType === 3);
      const base = line.querySelector('.probe').getBoundingClientRect().top - pr.top;
      for (let i = 0; i < node.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        const ch = node.data[i];
        const x = r.left - pr.left;
        if (ch.trim()) glyphs.push([ch, x, base]);
        const m = nctx.measureText(ch);
        box.x0 = Math.min(box.x0, x - 4);
        box.x1 = Math.max(box.x1, r.right - pr.left + 4);
        box.y0 = Math.min(box.y0, base - m.actualBoundingBoxAscent - 4);
        box.y1 = Math.max(box.y1, base + m.actualBoundingBoxDescent + 4);
      }
    }
    nctx.fillStyle = CREAM;
    for (const [ch, x, y] of glyphs) nctx.fillText(ch, x, y);
    box.x0 = Math.max(0, box.x0);
    box.y0 = Math.max(0, box.y0);
    box.w = box.x1 - box.x0;
    box.h = box.y1 - box.y0;
    return box;
  }

  function build() {
    const pr = pin.getBoundingClientRect();
    const ar = fig.getBoundingClientRect();
    const vw = pr.width, vh = pr.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(vw * dpr), H = Math.round(vh * dpr);
    canvas.width = W;
    canvas.height = H;
    lastW = vw;
    lastH = vh;
    const art = { x: ar.left - pr.left, y: ar.top - pr.top, w: ar.width, h: ar.height };

    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = W;
    nameCanvas.height = H;
    const nctx = nameCanvas.getContext('2d', { willReadFrequently: true });
    nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const box = drawName(nctx, pr, art);

    st = { vw, vh, dpr, art, nameCanvas, frags: null, atlases: null, names: null };
    // the pieces are only needed once the visitor scrolls: cut them after first paint
    if (!still) {
      const s0 = st;
      const run = () => { if (st === s0) { prepareFall(); drawnP = -1; request(); } };
      (window.requestIdleCallback || ((f) => setTimeout(f, 60)))(run, { timeout: 800 });
    }
    return st;
  }

  function prepareFall() {
    const { art, dpr, vh, nameCanvas } = st;
    const target = Math.round(Math.max(260, Math.min(1250, (art.w * art.h) / 780)));
    // keep the painting's black ground in the pieces: on white it is part of the picture
    const { frags, atlases, atlases2 } = shatterPainting(img, { w: art.w, h: art.h, dpr, target, dual: true });
    const pr = pin.getBoundingClientRect();
    const box = nameBox(pr);
    const names = shatterRegion(nameCanvas, { x: box.x0, y: box.y0, w: box.w, h: box.h, dpr, cell: Math.max(9, Math.min(16, box.h / 22)) });

    const R = mulberry(91);
    for (const f of frags) {
      f.tx = art.x + f.cx;
      f.ty = art.y + f.cy;
      f.ph = R() * 6.283;
      const yn = f.cy / art.h;
      const nz = 0.5 + 0.5 * Math.sin(f.cx * 0.012 + 1.3) * Math.cos(f.cy * 0.015 - 0.4);
      f.dd = 0.03 + 0.5 * clamp01(0.45 * nz + 0.4 * (1 - yn) + 0.15 * R());
      f.dur = 0.26 + 0.16 * R();
      f.fall = 0.85 + 0.55 * R();
      f.wind = (R() - 0.35) * 140;
      f.swa = 14 + R() * 24;
      f.swf = 3 + R() * 5;
      f.spin = (R() - 0.5) * 6;
      f.flip = 0.8 + R() * 2.4;
    }
    for (const n of names.frags) {
      n.tx = box.x0 + n.cx;
      n.ty = box.y0 + n.cy;
      n.dd = 0.005 + 0.2 * ((n.cx / box.w) * 0.55 + R() * 0.45);
      n.dur = 0.2 + 0.12 * R();
      n.fall = 0.45 + 0.4 * R();
      n.wind = (R() - 0.5) * 90;
      n.swa = 8 + R() * 18;
      n.swf = 3 + R() * 5;
      n.spin = (R() - 0.5) * 7;
      n.flip = 1 + R() * 3;
      n.ph = R() * 6.283;
    }
    Object.assign(st, { frags, atlases, atlases2, names, vh });
  }

  // name bounds from the DOM (cheap; used for shattering the name)
  function nameBox(pr) {
    const r = hero.querySelector('.hero__name').getBoundingClientRect();
    const pad = 12;
    const x0 = Math.max(0, r.left - pr.left - pad), y0 = Math.max(0, r.top - pr.top - pad);
    return { x0, y0, w: r.width + pad * 2, h: Math.min(st.vh - y0, r.height + pad * 2) };
  }

  /* --------------------------------------------------------- draw */

  function background(pp) {
    const k = smooth(0.12, 0.46, pp);
    const c = GROUND.map((g, i) => Math.round(g + (PAPER[i] - g) * k));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function sprite(f, atlasList, x, y, rot, sx, sy, alpha) {
    if (alpha <= 0.004) return;
    const c = Math.cos(rot), s = Math.sin(rot), d = st.dpr;
    ctx.globalAlpha = alpha > 1 ? 1 : alpha;
    ctx.setTransform(c * sx, s * sx, -s * sy, c * sy, x * d, y * d);
    ctx.drawImage(atlasList[f.atlas], f.sx, f.sy, f.sw, f.sh, -f.ax, -f.ay, f.sw, f.sh);
  }

  function drawStill() {
    background(0);
    const { art, dpr } = st;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(img, art.x * dpr, art.y * dpr, art.w * dpr, art.h * dpr);
    ctx.drawImage(st.nameCanvas, 0, 0);
  }

  function fallState(f, pp) {
    const q = clamp01((pp - f.dd) / f.dur);
    if (q <= 0) return null;
    const fall = st.vh * f.fall;
    const y = f.ty + fall * (q * q * 1.25 - 0.25 * q);
    const x = f.tx + q * f.wind + Math.sin(q * f.swf + f.ph) * f.swa * q;
    const cf = Math.cos(q * f.flip * Math.PI);
    const sx = (cf < 0 ? -1 : 1) * Math.max(0.1, Math.abs(cf)) * (1 - 0.3 * q);
    return [x, y, q * f.spin, sx, 1 - 0.3 * q, 1 - smooth(0.6, 1, q), q];
  }

  function drawFall(pp) {
    background(pp);
    if (pp >= 1) return;
    const { frags, atlases, atlases2, names } = st;
    for (const f of frags) {
      const s = fallState(f, pp);
      if (!s) {
        sprite(f, atlases2, f.tx, f.ty, 0, 1, 1, 1);
        continue;
      }
      // as a piece lets go, its black ground melts away and only the paint falls
      const ground = 1 - smooth(0, 0.3, s[6]);
      sprite(f, atlases, s[0], s[1], s[2], s[3], s[4], s[5]);
      if (ground > 0.01) sprite(f, atlases2, s[0], s[1], s[2], s[3], s[4], s[5] * ground);
    }
    for (const n of names.frags) {
      const s = fallState(n, pp);
      if (!s) sprite(n, names.atlases, n.tx, n.ty, 0, 1, 1, 1);
      else sprite(n, names.atlases, s[0], s[1], s[2], s[3], s[4], s[5] * (1 - smooth(0.2, 0.45, pp)));
    }
    ctx.globalAlpha = 1;
  }

  function frame() {
    raf = 0;
    if (!st) return;
    if (p <= 0.0005 || !st.frags) {
      if (drawnP !== 0) drawStill();
      drawnP = 0;
    } else if (p !== drawnP) {
      if (!(p >= 1 && drawnP >= 1)) drawFall(p);
      drawnP = p;
    }
  }
  const request = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  function readScroll() {
    if (still) return;
    const dist = Math.max(1, hero.offsetHeight - pin.offsetHeight);
    const np = clamp01(window.scrollY / dist);
    if (np !== p) {
      p = np;
      onProgress(p);
      request();
    }
  }

  /* --------------------------------------------------------- boot */

  async function boot() {
    try {
      if (!img.complete || !img.naturalWidth) await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      await img.decode().catch(() => {});
      const fs = parseFloat(getComputedStyle(lines[0]).fontSize);
      await Promise.race([document.fonts.load(`600 ${fs}px "Bricolage Grotesque"`), new Promise((r) => setTimeout(r, 2500))]);
      await document.fonts.ready;
    } catch (e) {
      root.classList.remove('js-hero', 'hero-still');
      return;
    }
    build();
    root.classList.add('hero-ready');
    drawnP = -1;
    readScroll();
    request();
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (!st) return;
      const r = pin.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 140) return;
      build();
      drawnP = -1;
      readScroll();
      request();
    }, 220);
  });
  window.addEventListener('scroll', readScroll, { passive: true });

  boot();
  return { getProgress: () => p };
}
