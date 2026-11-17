// One thread through the whole page.
//
// Desktop: each chapter pins while its workflow stem grows left-to-right and
// the scenes paint themselves in as the stem reaches them. Between chapters a
// dotted thread (fixed overlay, recomputed from live positions every frame)
// carries on from the end of one workflow to the next chapter's node, shifting
// colour from Inventory red -> Quality teal -> Costing green.
//
// Mobile: no pinning; workflows run vertically and everything is driven by a
// single reading line at 70% of the viewport.
import { renderDesktop, renderMobile, FLOWS } from './flows.js';
import { C, DOMAIN } from './illustration/palette.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const NS = 'http://www.w3.org/2000/svg';

export function initJourney({ reduced = false } = {}) {
  const work = document.querySelector('.work');
  if (!work) return;
  const title = work.querySelector('.work__title');
  const outro = document.querySelector('.outro__anchor');
  const chapters = [...work.querySelectorAll('.chapter')].map((el) => ({
    el,
    key: el.dataset.domain,
    pin: el.querySelector('.chapter__pin'),
    sticky: el.querySelector('.chapter__sticky'),
    head: el.querySelector('.chapter__head'),
    node: el.querySelector('.chapter__node'),
    art: el.querySelector('.flow__art'),
    flow: el.querySelector('.flow'),
  }));

  /* ---------------------------------------------------- thread overlay */
  const thread = document.createElementNS(NS, 'svg');
  thread.setAttribute('class', 'thread');
  thread.setAttribute('aria-hidden', 'true');
  const colours = [C.ink, DOMAIN.inventory.main, DOMAIN.quality.main, DOMAIN.costing.main, C.ink];
  let defs = '';
  let paths = '';
  for (let i = 0; i < 4; i++) {
    defs += `<linearGradient id="th-g${i}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${colours[i]}"/><stop offset="1" stop-color="${colours[i + 1]}"/></linearGradient>`;
    paths += `<path class="th" d="" fill="none" stroke="url(#th-g${i})" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="0.01 10"/>`;
  }
  thread.innerHTML = `<defs>${defs}</defs>${paths}`;
  work.prepend(thread);
  const tPaths = [...thread.querySelectorAll('.th')];
  const tGrads = [...thread.querySelectorAll('linearGradient')];

  let mode = null;
  const segU = [0, 0, 0, 0]; // thread progress, latched
  let vh = innerHeight;
  let segRanges = [];

  /* ---------------------------------------------------------- render */
  function render() {
    const desktop = innerWidth >= 900;
    const m = desktop ? 'desktop' : 'mobile';
    if (m === mode) return;
    mode = m;
    for (const ch of chapters) {
      const r = desktop ? renderDesktop(ch.key) : renderMobile(ch.key, ch.art);
      ch.art.innerHTML = r.svg;
      ch.svg = ch.art.querySelector('svg');
      ch.geo = r;
      ch.items = [...ch.svg.querySelectorAll('[data-at]')].map((el) => ({
        el: el.classList.contains('scene-slot') ? el.firstElementChild : el,
        at: +el.dataset.at,
        on: false,
      }));
      ch.clipMain = ch.svg.querySelector('.clip-main, .clip-main-v');
      ch.clipStems = [...ch.svg.querySelectorAll('.clip-stem')];
      ch.F = FLOWS[ch.key];
      // reveal is latched: it only ever moves forward until the page is reloaded
      ch.reveal = -Infinity;
      ch.done = false;
      ch.active = false;
    }
  }

  /* ---------------------------------------------------------- layout */
  const docY = (el) => el.getBoundingClientRect().top + scrollY;

  let gutter = 40;
  function layout() {
    vh = innerHeight;
    gutter = Math.max(20, Math.min(64, innerWidth * 0.034));
    render();
    const desktop = mode === 'desktop';
    const pinned = desktop && !reduced;
    for (const ch of chapters) {
      ch.pin.style.height = '';
      ch.sticky.style.top = '';
      ch.svg.style.transform = '';
      ch.el.classList.toggle('is-pinned', pinned);
      const [W, H] = ch.geo.view;
      if (pinned) {
        // panorama: as tall as the viewport allows, wider than the screen, panned by scroll
        ch.winW = ch.sticky.clientWidth;
        ch.k = Math.min((vh - 48) / H, 1.45);
        ch.panW = W * ch.k;
        ch.svg.style.width = `${Math.round(ch.panW)}px`;
        ch.svg.style.marginInline = '0';
        ch.svg.style.setProperty('--lbl', Math.max(19, 14.5 / ch.k).toFixed(2));
      } else {
        const maxW = ch.flow.clientWidth;
        ch.svg.style.width = '100%';
        ch.svg.style.marginInline = '';
        ch.svg.style.setProperty('--lbl', Math.max(19, (14.5 * W) / maxW).toFixed(2));
      }
    }
    if (pinned) {
      for (const ch of chapters) {
        const h = ch.sticky.offsetHeight;
        const top = (vh - h) / 2;
        ch.sticky.style.top = `${Math.round(top)}px`;
        ch.top = top;
        ch.pan = Math.max(0, ch.panW + 2 * gutter - ch.winW);
        ch.D = Math.round(vh * 0.75 + ch.pan * 1.05);
        ch.pin.style.height = `${h + ch.D}px`;
      }
      for (const ch of chapters) {
        ch.flowStart = docY(ch.pin) - ch.top;
        ch.flowEnd = ch.flowStart + ch.D * 0.9;
      }
    } else {
      for (const ch of chapters) {
        const r = ch.svg.getBoundingClientRect();
        const k = r.width / ch.geo.view[0];
        const top = r.top + scrollY;
        ch.flowStart = top + ch.geo.entry[1] * k - vh * 0.7;
        ch.flowEnd = top + ch.geo.exit[1] * k - vh * 0.7;
      }
    }
    const tStart = docY(title) + title.offsetHeight - vh * 0.82;
    segRanges = [
      [tStart, chapters[0].flowStart],
      [chapters[0].flowEnd, chapters[1].flowStart],
      [chapters[1].flowEnd, chapters[2].flowStart],
      [chapters[2].flowEnd, chapters[2].flowEnd + vh * 0.55],
    ];
    update(true);
  }

  /* ---------------------------------------------------------- thread geometry */
  function toScreen(svg, [x, y]) {
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  }
  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const norm = ([x, y]) => {
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  function cubicSamples(A, da, B, db, out, n = 36, f1 = 0.42) {
    const dist = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const c1 = [A[0] + da[0] * dist * f1, A[1] + da[1] * dist * f1];
    const c2 = [B[0] - db[0] * dist * 0.3, B[1] - db[1] * dist * 0.3];
    for (let i = out.length ? 1 : 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([
        u * u * u * A[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * B[0],
        u * u * u * A[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * B[1],
      ]);
    }
  }
  function drawSeg(i, pts, u, nodeIndex) {
    const path = tPaths[i];
    const L = [0];
    for (let k = 1; k < pts.length; k++) L.push(L[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const total = L[L.length - 1];
    const target = u * total;
    let d = '';
    if (u > 0) {
      d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let k = 1; k < pts.length; k++) {
        if (L[k] >= target) {
          const f = (target - L[k - 1]) / (L[k] - L[k - 1] || 1);
          d += `L${(pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f).toFixed(1)} ${(pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f).toFixed(1)}`;
          break;
        }
        d += `L${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}`;
      }
    }
    path.setAttribute('d', d);
    const g = tGrads[i];
    g.setAttribute('y1', pts[0][1].toFixed(1));
    g.setAttribute('y2', pts[pts.length - 1][1].toFixed(1));
    return nodeIndex != null ? target >= L[nodeIndex] - 1 : false;
  }

  /* ---------------------------------------------------------- update */
  let ticking = false;
  function update(force) {
    ticking = false;
    const y = scrollY;
    const wr = work.getBoundingClientRect();
    const visible = wr.bottom > 0 && wr.top < vh;
    thread.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible && !force) return;
    const desktop = mode === 'desktop';

    // workflows
    chapters.forEach((ch) => {
      const prog = reduced ? 1 : clamp01((y - ch.flowStart) / (ch.flowEnd - ch.flowStart));
      const rect = (mode === 'desktop' ? ch.pin : ch.el).getBoundingClientRect();
      const near = rect.top < vh * 0.82 && rect.bottom > 0;
      ch.flow.classList.toggle('is-live', near && !reduced);
      if (desktop) {
        const { x0, x1 } = ch.F.line;
        const cam = x0 + prog * (x1 - x0);
        let off = 0;
        if (!reduced) {
          // the camera follows scroll position (so scrolling back up pans back)…
          if (ch.pan <= 0) off = -(ch.winW - ch.panW) / 2;
          else off = Math.max(-gutter, Math.min(ch.panW + gutter - ch.winW, cam * ch.k - ch.winW * 0.58));
          ch.svg.style.transform = `translate3d(${(-off).toFixed(1)}px,0,0)`;
        }
        // …but the drawing leads it: everything on screen (plus a margin ahead) is
        // revealed at once, and never un-drawn when scrolling back up.
        const camRight = (off + ch.winW) / (ch.k || 1);
        const want = reduced ? Infinity : near || prog > 0 ? Math.max(cam, camRight + 160) : -Infinity;
        if (want > ch.reveal) ch.reveal = want;
        if (ch.done) return;
        const head = Math.max(x0, Math.min(x1, ch.reveal));
        if (head >= x1) ch.done = true;
        ch.clipMain.setAttribute('width', Math.max(0, head - x0 + 20 + (ch.done ? 30 : 0)).toFixed(1));
        ch.clipStems.forEach((r, i) => {
          const st = ch.F.stems[i];
          const k = clamp01((head - st.at) / 160);
          const ly = ch.F.line.y;
          const top = Math.min(st.y0, ly), bot = Math.max(st.y1, ly);
          const x = Math.min(st.x, st.elbowTo ?? st.x) - 30;
          r.setAttribute('x', x);
          r.setAttribute('width', Math.abs(st.x - (st.elbowTo ?? st.x)) + 60);
          const pad = k > 0 ? 20 : 0;
          r.setAttribute('y', (ly - k * (ly - top) - pad).toFixed(1));
          r.setAttribute('height', (k * (bot - top) + pad * 2).toFixed(1));
        });
        for (const it of ch.items) {
          if (!it.on && (ch.done || head >= it.at)) { it.on = true; it.el.classList.add('is-in'); }
        }
      } else {
        if (ch.done) return;
        // mobile: reveal whatever has scrolled into the lower part of the screen
        const r = ch.svg.getBoundingClientRect();
        const k = r.width / ch.geo.view[0] || 1;
        const want = reduced ? Infinity : (vh * 0.95 - r.top) / k;
        if (want > ch.reveal) ch.reveal = want;
        const head = Math.max(0, Math.min(ch.geo.view[1], ch.reveal));
        if (head >= ch.geo.view[1]) ch.done = true;
        ch.clipMain.setAttribute('height', (head + 10).toFixed(1));
        for (const it of ch.items) {
          if (!it.on && (ch.done || head >= it.at - 30)) { it.on = true; it.el.classList.add('is-in'); }
        }
      }
    });

    // thread
    const P0 = (() => {
      const r = title.getBoundingClientRect();
      return [r.left + Math.min(120, r.width * 0.1), r.bottom + 34];
    })();
    const ends = chapters.map((ch) => ({
      N: centre(ch.node),
      E: toScreen(ch.svg, ch.geo.entry),
      X: toScreen(ch.svg, ch.geo.exit),
      // leave each panorama down its right edge so the thread never crosses the scenes
      Q: desktop ? toScreen(ch.svg, [ch.geo.view[0] + 12, ch.geo.view[1] - 4]) : null,
    }));
    const down = [0, 1];
    const into = desktop ? norm([0.45, 1]) : down;
    const outOf = desktop ? norm([0.7, 1]) : down;
    // Quality's node sits to the right of its text: arrive from the right, then drop
    // well clear of the paragraph before turning toward the workflow.
    const nodeDir = (i) => (desktop ? norm([i === 1 ? 0.3 : 0.1, 1]) : down);
    const dropFrom = (i) => (desktop && i === 1 ? 0.78 : 0.42);

    const segs = [];
    // 0: title -> inventory node -> inventory entry
    let pts = [];
    cubicSamples(P0, down, ends[0].N, nodeDir(0), pts);
    let nIdx = pts.length - 1;
    cubicSamples(ends[0].N, nodeDir(0), ends[0].E, into, pts);
    segs.push([pts, nIdx]);
    const leave = (e, out) => {
      if (e.Q) {
        cubicSamples(e.X, [1, 0], e.Q, down, out, 18);
        return down;
      }
      return outOf;
    };
    for (let i = 0; i < 2; i++) {
      pts = [];
      const d0 = leave(ends[i], pts);
      cubicSamples(pts.length ? pts[pts.length - 1] : ends[i].X, d0, ends[i + 1].N, nodeDir(i + 1), pts);
      nIdx = pts.length - 1;
      cubicSamples(ends[i + 1].N, nodeDir(i + 1), ends[i + 1].E, into, pts, 36, dropFrom(i + 1));
      segs.push([pts, nIdx]);
    }
    pts = [];
    const O = outro ? centre(outro) : [innerWidth / 2, ends[2].X[1] + vh * 0.5];
    const d3 = leave(ends[2], pts);
    cubicSamples(pts.length ? pts[pts.length - 1] : ends[2].X, d3, O, down, pts);
    segs.push([pts, null]);

    segs.forEach(([p, ni], i) => {
      const [a, b] = segRanges[i];
      const now = reduced ? 1 : clamp01(((y - a) / Math.max(1, b - a)) * 1.35);
      segU[i] = Math.max(segU[i], now);
      const reached = drawSeg(i, p, segU[i], ni);
      if (i < 3) {
        const ch = chapters[i];
        if (!ch.active && (reduced || reached || segU[i] >= 1)) {
          ch.active = true;
          ch.el.classList.add('is-active');
        }
      }
    });
  }

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => update(false));
    }
  };

  let rt = 0;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(layout, 160);
  };

  layout();
  // fonts change header heights; re-layout once they settle
  document.fonts?.ready.then(layout);
  addEventListener('load', layout);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  return { layout };
}
