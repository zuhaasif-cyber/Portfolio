// Reusable illustrated objects. Each one is drawn flat and side-on (not
// isometric) in the painting's language: chalky fills, partner-colour outlines,
// striations, stippling, and black used as "ink pools" for windows, wheels and
// interiors, echoing the black ground of the botanical artwork.
import { C, INK_FOR } from './palette.js';
import { geo } from './brush.js';

const R = geo.rect;
const RR = geo.roundRect;
const E = geo.ellipse;

export const tf = (x, y, s = 1, flip = false) =>
  `translate(${+x.toFixed(1)} ${+y.toFixed(1)}) scale(${flip ? -s : s} ${s})`;

export function darken(hex, k = 0.2) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - k));
  const g = Math.round(((n >> 8) & 255) * (1 - k));
  const b = Math.round((n & 255) * (1 - k));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const BOX_TONES = [C.apricot, C.saffron, C.blush, C.ochre, C.salmon, C.apricot, C.marigold];

/* ------------------------------------------------------------------ boxes */

export function box(p, x, y, w, h, o = {}) {
  const fill = o.fill ?? p.pick(BOX_TONES);
  let s = p.shape(R(x, y - h, w, h), {
    fill,
    ink: o.ink ?? darken(fill, 0.5),
    grain: 'light',
    amp: 0.7,
    inkWidth: 1.2,
    hatch: o.hatch ? { angle: -70, gap: 5, color: C.oxblood, width: 0.7, opacity: 0.22 } : undefined,
  });
  // tape band
  if (o.tape !== false && w > 14) {
    s += p.shape(R(x + w * 0.4, y - h, w * 0.2, h * 0.5), {
      fill: C.paper, fillOpacity: 0.55, outline: false, grain: 'none', amp: 0.3,
    });
  }
  if (o.stamp) s += p.daisy(x + w * 0.7, y - h * 0.38, { r: Math.min(w, h) * 0.17, petals: 7, fill: C.vermilion, centre: C.saffron });
  return s;
}

export function pallet(p, x, y, w) {
  let s = p.shape(R(x, y - 8, w, 4), { fill: C.cocoa, amp: 0.5, inkWidth: 1.2, grain: 'light' });
  const blocks = Math.max(2, Math.round(w / 22));
  for (let i = 0; i < blocks; i++) {
    const bx = x + 1 + (i * (w - 8)) / (blocks - 1);
    s += p.shape(R(bx, y - 4, 6, 4), { fill: C.cocoa, outline: false, amp: 0.3, grain: 'none' });
  }
  return s;
}

// boxes stacked on a pallet; returns svg
export function stack(p, x, y, { cols = 3, rows = 2, size = 18, pal = true, stampEvery = 0 } = {}) {
  let s = '';
  let base = y;
  if (pal) {
    s += pallet(p, x - 3, y, cols * size + 6);
    base = y - 8;
  }
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const c = cols - (r > 0 && p.r() < 0.4 ? 1 : 0);
    for (let i = 0; i < c; i++) {
      const w = size - p.rand(0, 2);
      const h = size * p.rand(0.82, 0.98);
      s += box(p, x + i * size + p.rand(-0.8, 0.8) + (r % 2) * p.rand(0, 3), base - r * size * 0.9, w, h, {
        stamp: stampEvery && ++k % stampEvery === 0,
      });
    }
  }
  return s;
}

/* ----------------------------------------------------------------- people */

const POSES = {
  stand: { lean: 0, hipH: 35, legs: [[3, 0], [-3, -1]], arms: [[8, 14], [-6, -4]] },
  walk: { lean: 5, hipH: 34, legs: [[24, 6], [-18, -34]], arms: [[-22, -8], [26, 46]] },
  carry: { lean: -4, hipH: 34, legs: [[18, 4], [-14, -26]], arms: [[42, 102], [34, 98]] },
  reach: { lean: -4, hipH: 35, legs: [[3, 0], [-3, -1]], arms: [[160, 172], [42, 96]] },
  kneel: { lean: 14, hipH: 20, legs: [[88, 0], [12, -92]], arms: [[58, 100], [38, 84]] },
  sit: { lean: 4, hipH: 27, shin: 26, legs: [[90, 2], [86, -2]], arms: [[60, 96], [54, 92]] },
  inspect: { lean: 8, hipH: 35, legs: [[4, 0], [-4, -2]], arms: [[48, 84], [26, 66]] },
  scan: { lean: 0, hipH: 35, legs: [[5, 0], [-4, -1]], arms: [[34, 82], [-6, -4]] },
  push: { lean: 16, hipH: 33, legs: [[26, 4], [-22, -40]], arms: [[74, 84], [66, 80]] },
  hold: { lean: 0, hipH: 35, legs: [[3, 0], [-3, -1]], arms: [[30, 70], [-6, -4]] },
};

const SKINS = [C.apricot, C.cocoa, '#d9a074', '#c98a64', '#a8674a'];
const HAIRS = [C.black, C.oxblood, '#3a2418', C.black];

export function person(p, x, y, o = {}) {
  const P = { ...POSES[o.pose ?? 'stand'], ...(o.override ?? {}) };
  const skin = o.skin ?? p.pick(SKINS);
  const hair = o.hair ?? p.pick(HAIRS);
  const jacket = o.jacket ?? C.teal;
  const pants = o.pants ?? C.aubergine;
  const shinLen = P.shin ?? 17;
  const rad = (d) => (d * Math.PI) / 180;
  const dir = (deg, len) => [Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

  const hip = [P.hipX ?? 0, -P.hipH];
  const lean = rad(P.lean);
  const sh = [hip[0] + Math.sin(lean) * 24, hip[1] - Math.cos(lean) * 24];
  const head = [sh[0] + Math.sin(lean) * 10.5, sh[1] - Math.cos(lean) * 10.5];
  const leg = ([a1, a2], ox = 0) => {
    const h = [hip[0] + ox, hip[1]];
    const k = add(h, dir(a1, 18));
    return [h, k, add(k, dir(a2, shinLen))];
  };
  const arm = ([a1, a2], ox = 0) => {
    const s0 = [sh[0] + ox, sh[1] + 2.5];
    const e = add(s0, dir(a1, 13));
    return [s0, e, add(e, dir(a2, 12))];
  };
  const foot = (pts, col) => {
    const f = pts[2];
    return p.shape(E(f[0] + 2.6, f[1] - 1.6, 4.6, 2.4, 10), { fill: col, outline: false, grain: 'none', amp: 0.3 });
  };

  const backLeg = leg(P.legs[1], -1.5);
  const frontLeg = leg(P.legs[0], 1.5);
  const backArm = arm(P.arms[1], -2);
  const frontArm = arm(P.arms[0], 2);
  const shoe = C.black;

  let s = '';
  if (o.shadow !== false) s += p.shadow(2, 0, 15);
  // back limbs, a shade darker
  s += p.limb(backArm, { color: darken(jacket, 0.18), w0: 5.6, w1: 4.6 });
  s += p.shape(E(backArm[2][0], backArm[2][1], 2.6, 2.6, 8), { fill: darken(skin, 0.12), outline: false, grain: 'none', amp: 0.2 });
  s += p.limb(backLeg, { color: darken(pants, 0.2), w0: 7, w1: 5.6 });
  s += foot(backLeg, shoe);

  // torso
  const n = [Math.cos(lean), Math.sin(lean)];
  const torso = [
    [sh[0] - n[0] * 8.4, sh[1] - n[1] * 8.4 + 1.5],
    [sh[0] + n[0] * 8.6, sh[1] + n[1] * 8.6 + 1],
    [hip[0] + n[0] * 7.6 + 0.6, hip[1] + n[1] * 7.6 + 2],
    [hip[0] - n[0] * 7.4, hip[1] - n[1] * 7.4 + 2],
  ];
  s += p.shape(torso, {
    fill: jacket,
    amp: 0.6,
    inkWidth: 1.4,
    hatch: { angle: 80 + P.lean, gap: 4.2, color: '#fff', width: 0.7, opacity: 0.32 },
  });
  if (o.vest) {
    const t = (u, v) => [hip[0] + (sh[0] - hip[0]) * v + n[0] * u, hip[1] + (sh[1] - hip[1]) * v + n[1] * u];
    s += p.shape([t(-7.5, 0.42), t(8, 0.42), t(8, 0.56), t(-7.5, 0.56)], { fill: o.vest, outline: false, grain: 'none', amp: 0.3 });
  }

  s += p.limb(frontLeg, { color: pants, w0: 7.2, w1: 5.8 });
  s += foot(frontLeg, shoe);

  // head + hair (hair sits behind, head nudged forward: no face, just presence)
  s += p.shape(E(head[0] - 1.8, head[1] - 1.3, 7.6, 7.2, 14), { fill: hair, outline: false, grain: 'light', grainOpacity: 0.5, amp: 0.5 });
  s += p.shape(E(head[0] + 1.1, head[1] + 0.9, 6.4, 6.8, 14), { fill: skin, ink: darken(skin, 0.45), inkWidth: 1.1, amp: 0.4 });
  if (o.cap) {
    const cap = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      cap.push([head[0] + Math.cos(a) * 8, head[1] - 1 + Math.sin(a) * 6.4]);
    }
    cap.push([head[0] + 11, head[1] - 0.6]);
    s += p.shape(cap, { fill: o.cap, amp: 0.4, inkWidth: 1.2 });
  } else if (o.bun) {
    s += p.shape(E(head[0] - 6.5, head[1] - 5, 3.6, 3.4, 10), { fill: hair, outline: false, grain: 'none', amp: 0.3 });
  }

  // front arm + hand
  s += p.limb(frontArm, { color: jacket, w0: 5.8, w1: 4.8 });
  s += p.shape(E(frontArm[2][0], frontArm[2][1], 2.7, 2.7, 8), { fill: skin, outline: false, grain: 'none', amp: 0.2 });

  const g = `<g transform="${tf(x, y, o.s ?? 1, (o.facing ?? 1) < 0)}">${s}${o.extra ?? ''}</g>`;
  // expose hand position (world space) for props
  const sc = o.s ?? 1, fl = (o.facing ?? 1) < 0 ? -1 : 1;
  const world = (pt) => [x + pt[0] * sc * fl, y + pt[1] * sc];
  return { svg: g, hand: world(frontArm[2]), backHand: world(backArm[2]), head: world(head), hip: world(hip) };
}

/* -------------------------------------------------------------- vehicles */

function wheel(p, cx, cy, r) {
  let s = p.shape(E(cx, cy, r, r, 16), { fill: C.black, ink: C.oxblood, inkWidth: 1.2, amp: 0.5, grain: 'light', grainOpacity: 0.6 });
  s += `<g class="spin">`;
  s += p.shape(E(cx, cy, r * 0.42, r * 0.42, 10), { fill: C.saffron, outline: false, grain: 'none', amp: 0.2 });
  s += p.brush([[cx - r * 0.75, cy], [cx + r * 0.75, cy]], { color: C.ice, w0: 1, w1: 1, amp: 0, swell: 0 });
  s += p.brush([[cx, cy - r * 0.75], [cx, cy + r * 0.75]], { color: C.ice, w0: 1, w1: 1, amp: 0, swell: 0 });
  s += `</g>`;
  return s;
}

/** Box truck. Cab on the right; flip for left-facing. (x,y) = rear wheel ground. */
export function truck(p, x, y, o = {}) {
  const body = o.body ?? C.ice;
  const cab = o.cab ?? C.teal;
  let s = p.shadow(98, 1, 98, 4);
  s += p.shape(R(2, -26, 190, 9), { fill: C.black, ink: C.black, amp: 0.4, inkWidth: 1 });
  if (o.open) {
    // side curtain rolled up: the ink-black interior with goods inside
    s += p.shape(R(0, -100, 134, 78), { fill: C.black, ink: INK_FOR[body], amp: 0.8 });
    s += o.cargo ?? '';
    s += p.shape(R(0, -104, 134, 12), { fill: body, amp: 0.6, hatch: { angle: -10, gap: 3, color: C.teal, width: 0.6, opacity: 0.35 } });
    s += p.shape(R(0, -30, 134, 7), { fill: body, amp: 0.5 });
    s += p.shape(R(-2, -104, 6, 80), { fill: darken(body, 0.15), amp: 0.4, inkWidth: 1.2 });
  } else {
    s += p.shape(R(0, -100, 134, 76), {
      fill: body,
      hatch: { angle: -84, gap: 6.5, color: INK_FOR[body] ?? C.teal, width: 0.8, opacity: 0.28 },
    });
    if (o.stamp !== false) s += p.daisy(67, -62, { r: 14, petals: 9, fill: o.stampFill ?? C.saffron, centre: C.ochre });
  }
  s += p.shape([[136, -78], [168, -78], [188, -52], [193, -48], [193, -22], [136, -22]], {
    fill: cab,
    hatch: { angle: 70, gap: 5, color: '#fff', width: 0.8, opacity: 0.22 },
  });
  s += p.shape([[143, -72], [165, -72], [181, -52], [143, -52]], { fill: C.black, ink: C.black, amp: 0.4, inkWidth: 1 });
  s += p.brush([[150, -69], [158, -56]], { color: C.ice, w0: 2, w1: 0.6, amp: 0.2, opacity: 0.8 });
  s += p.brush([[143, -46], [143, -26]], { color: INK_FOR[cab] ?? C.ink, w0: 1.2, w1: 1, amp: 0.2 });
  s += p.shape(E(190, -36, 2.6, 3.2, 8), { fill: C.saffron, outline: false, grain: 'none' });
  s += `<g class="wheels">${wheel(p, 30, -12, 12)}${wheel(p, 58, -12, 12)}${wheel(p, 166, -12, 12)}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/** Delivery van, front on the right. */
export function van(p, x, y, o = {}) {
  const body = o.body ?? C.aqua;
  let s = p.shadow(56, 1, 60, 3.5);
  if (o.open) s += p.shape(R(-11, -62, 10, 44), { fill: darken(body, 0.12), amp: 0.4, inkWidth: 1.2 });
  s += p.shape([[0, -64], [80, -64], [102, -42], [110, -37], [110, -16], [0, -16]], {
    fill: body,
    hatch: { angle: -80, gap: 6, color: '#fff', width: 0.8, opacity: 0.25 },
  });
  if (o.open) {
    s += p.shape(R(2, -58, 24, 38), { fill: C.black, ink: C.black, amp: 0.4, inkWidth: 1 });
    s += box(p, 5, -21, 11, 11, { tape: false });
    s += box(p, 14, -21, 10, 13, { tape: false });
  }
  s += p.shape([[82, -58], [97, -42], [82, -42]], { fill: C.black, ink: C.black, amp: 0.3, inkWidth: 1 });
  s += p.shape(R(56, -58, 20, 14), { fill: C.black, ink: C.black, amp: 0.3, inkWidth: 1 });
  if (o.mark) s += o.mark;
  s += p.shape(E(108, -28, 2, 2.6, 8), { fill: C.saffron, outline: false, grain: 'none' });
  s += `<g class="wheels">${wheel(p, 24, -12, 11)}${wheel(p, 88, -12, 11)}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/** Forklift with a liftable carriage (.lift). Forks face right. */
export function forklift(p, x, y, o = {}) {
  let s = p.shadow(54, 1, 58, 3.5);
  s += p.brush([[12, -48], [16, -94]], { color: C.black, w0: 3.2, w1: 2.6, amp: 0.3 });
  s += p.brush([[10, -94], [60, -94]], { color: C.black, w0: 3.4, w1: 3, amp: 0.3 });
  const driver = person(p, 22, -30, { pose: 'sit', s: 0.9, jacket: o.jacket ?? C.vermilion, pants: C.aubergine, cap: C.saffron, shadow: false, override: { arms: [[60, 70], [50, 70]] } });
  s += driver.svg;
  s += p.shape([[0, -14], [0, -46], [12, -52], [44, -52], [60, -36], [66, -14]], {
    fill: C.saffron,
    hatch: { angle: -60, gap: 5, color: C.ochreDeep, width: 0.8, opacity: 0.3 },
  });
  s += p.shape(R(-4, -40, 10, 26), { fill: C.black, amp: 0.4, inkWidth: 1 });
  s += p.brush([[54, -52], [58, -94]], { color: C.black, w0: 3, w1: 2.6, amp: 0.3 });
  s += p.shape(R(68, -112, 7, 102), { fill: C.tealDeep, ink: C.black, amp: 0.4, inkWidth: 1.1 });
  let lift = p.shape(R(72, -16, 46, 4), { fill: C.black, amp: 0.3, inkWidth: 1 });
  lift += p.shape(R(72, -44, 5, 30), { fill: C.black, amp: 0.3, inkWidth: 1 });
  lift += o.load ?? stack(p, 80, -12, { cols: 2, rows: 2, size: 17 });
  s += `<g class="lift">${lift}</g>`;
  s += `<g class="wheels">${wheel(p, 14, -11, 10)}${wheel(p, 52, -12, 12)}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/** Two-wheel hand truck with boxes. (x,y) = wheel ground; handle rises to the left. */
export function trolley(p, x, y, o = {}) {
  let s = '';
  s += p.brush([[2, -8], [-10, -78]], { color: C.tealDeep, w0: 3, w1: 2.6, amp: 0.3 });
  s += p.brush([[-10, -78], [-18, -82]], { color: C.tealDeep, w0: 2.6, w1: 2.6, amp: 0.2 });
  s += p.brush([[2, -4], [26, -4]], { color: C.tealDeep, w0: 3, w1: 3, amp: 0.2 });
  const n = o.boxes ?? 3;
  for (let i = 0; i < n; i++) s += box(p, 2 - i * 2.6 + p.rand(-1, 1), -6 - i * 19, 22, 18);
  s += `<g class="wheels">${wheel(p, 4, -6, 6.5)}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/* -------------------------------------------------------------- storage */

/** Pallet racking: teal uprights, vermilion beams, goods on every level. (x,y) bottom-left. */
export function rack(p, x, y, o = {}) {
  const w = o.w ?? 110, h = o.h ?? 150, levels = o.levels ?? 4;
  const up = o.upright ?? C.teal, beam = o.beam ?? C.vermilion;
  let s = p.shadow(w / 2, 1, w * 0.55, 3.5);
  const L = (h - 10) / levels;
  let goods = '';
  for (let i = 0; i < levels; i++) {
    const by = -6 - i * L;
    if (o.skipLevel === i) continue;
    let cx = 6 + p.rand(0, 4);
    while (cx < w - 22) {
      const bw = p.rand(15, 25), bh = Math.min(L - 10, p.rand(14, 24));
      if (cx + bw > w - 6) break;
      goods += box(p, cx, by - 5, bw, bh, { stamp: p.r() < 0.12 });
      cx += bw + p.rand(2, 6);
    }
  }
  s += goods;
  s += p.shape(R(0, -h, 6, h), { fill: up, amp: 0.5, inkWidth: 1.3 });
  s += p.shape(R(w - 6, -h, 6, h), { fill: up, amp: 0.5, inkWidth: 1.3 });
  for (let i = 0; i <= levels; i++) {
    const by = -6 - i * L;
    s += p.shape(R(2, by - 5, w - 4, 5), { fill: beam, amp: 0.4, inkWidth: 1.1, grain: 'light' });
  }
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

export function ladder(p, x0, y0, x1, y1, o = {}) {
  const col = o.color ?? C.cocoa;
  const w = o.w ?? 13;
  let s = p.brush([[x0, y0], [x1, y1]], { color: col, w0: 2.6, w1: 2.4, amp: 0.3 });
  s += p.brush([[x0 + w, y0], [x1 + w, y1]], { color: col, w0: 2.6, w1: 2.4, amp: 0.3 });
  const len = Math.hypot(x1 - x0, y1 - y0);
  const rungs = Math.floor(len / 13);
  for (let i = 1; i < rungs; i++) {
    const t = i / rungs;
    const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
    s += p.brush([[px, py], [px + w, py]], { color: col, w0: 2, w1: 2, amp: 0.2, swell: 0 });
  }
  return s;
}

/** Cut-away storage building: raw materials on the left, finished goods on the right. */
export function storehouse(p, x, y, o = {}) {
  let s = p.shadow(88, 1, 96, 4);
  s += p.shape([[-6, -112], [88, -160], [182, -112]], {
    fill: C.vermilion,
    hatch: { angle: 0, gap: 6, color: C.saffron, width: 0.9, opacity: 0.45 },
  });
  s += p.shape(R(0, -114, 176, 114), { fill: C.periwinkle, hatch: { angle: -88, gap: 7, color: C.aubergine, width: 0.7, opacity: 0.22 } });
  s += p.shape(R(10, -102, 156, 100), { fill: C.black, ink: C.aubergine, amp: 0.7 });
  // raw: barrels, logs, sacks
  for (let i = 0; i < 3; i++) {
    const bx = 18 + i * 21;
    s += p.shape(RR(bx, -32, 18, 28, 4), { fill: i === 1 ? C.cocoa : C.burnt, inkWidth: 1.2, amp: 0.5, hatch: { angle: 0, gap: 7, color: C.oxblood, width: 1, opacity: 0.6 } });
  }
  s += p.shape(R(16, -60, 66, 4), { fill: C.teal, amp: 0.4, inkWidth: 1.1 });
  for (let i = 0; i < 4; i++) {
    s += p.shape(E(26 + i * 15, -68, 7.5, 7.5, 12), { fill: C.ochre, inkWidth: 1.1, amp: 0.4, stipple: { n: 4, color: C.oxblood, r0: 0.5, r1: 1 } });
  }
  s += p.shape(R(16, -88, 66, 4), { fill: C.teal, amp: 0.4, inkWidth: 1.1 });
  s += p.shape(RR(20, -102, 26, 14, 5), { fill: C.paperDeep, inkWidth: 1.1, amp: 0.4 });
  s += p.shape(RR(50, -102, 26, 14, 5), { fill: C.sage, inkWidth: 1.1, amp: 0.4 });
  // divider
  s += p.shape(R(86, -102, 4, 100), { fill: C.periwinkle, outline: false, amp: 0.3 });
  // finished goods: stamped boxes on racks
  s += rack(p, 96, -2, { w: 64, h: 96, levels: 3, s: 1, upright: C.teal, beam: C.saffron });
  if (o.labels !== false) {
    s += `<text x="49" y="-106" class="tiny" text-anchor="middle" fill="${C.paper}">raw</text>`;
    s += `<text x="128" y="-106" class="tiny" text-anchor="middle" fill="${C.paper}">finished</text>`;
  }
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/** Small shop / site holding on-hand stock. */
export function depot(p, x, y, o = {}) {
  let s = p.shadow(62, 1, 70, 3.5);
  s += p.shape(R(0, -74, 124, 74), { fill: C.ice, hatch: { angle: -86, gap: 7, color: C.teal, width: 0.7, opacity: 0.25 } });
  s += p.shape(R(-6, -86, 136, 14), { fill: C.teal, amp: 0.5 });
  // scalloped awning in stripes
  for (let i = 0; i < 8; i++) {
    const ax = -4 + i * 16.5;
    const col = i % 2 ? C.paper : C.vermilion;
    const pts = [[ax, -72], [ax + 16.5, -72], [ax + 16.5, -62]];
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI;
      pts.push([ax + 8.25 + Math.cos(a) * 8.25, -62 + Math.sin(a) * 5]);
    }
    s += p.shape(pts, { fill: col, ink: C.oxblood, inkWidth: 1, amp: 0.3, grain: 'light' });
  }
  s += p.shape(R(14, -50, 38, 30), { fill: C.black, ink: C.teal, amp: 0.4 });
  s += box(p, 18, -22, 14, 12, { tape: false });
  s += box(p, 33, -22, 14, 16, { tape: false });
  s += p.shape(R(76, -50, 30, 50), { fill: C.black, ink: C.teal, amp: 0.4 });
  s += p.shape(E(101, -24, 1.6, 1.6, 6), { fill: C.saffron, outline: false, grain: 'none' });
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/** Factory with sawtooth roof and curling smoke (tendrils from the painting). */
export function factory(p, x, y, o = {}) {
  let s = p.shadow(60, 1, 66, 3.5);
  s += p.shape(R(84, -110, 13, 60), { fill: C.cocoa, amp: 0.5, hatch: { angle: 0, gap: 6, color: C.oxblood, width: 0.8, opacity: 0.5 } });
  const roof = [[0, -58]];
  for (let i = 0; i < 3; i++) {
    roof.push([i * 40, -84], [i * 40 + 40, -64]);
  }
  roof.push([120, -58]);
  s += p.shape(roof, { fill: C.plum, hatch: { angle: -40, gap: 5, color: C.lavender, width: 0.8, opacity: 0.5 } });
  s += p.shape(R(0, -62, 120, 62), { fill: C.violet, hatch: { angle: -84, gap: 6, color: C.aubergine, width: 0.8, opacity: 0.3 } });
  for (let i = 0; i < 3; i++) {
    s += p.shape(R(10 + i * 26, -48, 18, 18), { fill: C.black, ink: C.aubergine, amp: 0.4, inkWidth: 1.2 });
    s += p.shape(R(13 + i * 26, -45, 6, 6), { fill: C.saffron, outline: false, grain: 'none', amp: 0.3, cls: 'glow' });
  }
  s += p.shape(R(88, -34, 22, 34), { fill: C.black, ink: C.aubergine, amp: 0.4 });
  s += `<g class="smoke">${p.tendril(92, -118, { r: 9, turns: 1.2, dir: -1, angle: 0.4, color: C.periwinkle, w0: 3, w1: 0.8 })}${p.tendril(104, -134, { r: 7, turns: 1.1, dir: 1, angle: 2.4, color: C.lavender, w0: 2.6, w1: 0.6 })}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/** Conveyor line with a machine; boxes travel along (.belt-item). */
export function conveyor(p, x, y, o = {}) {
  const w = o.w ?? 150;
  let s = p.shadow(w / 2 + 10, 1, w * 0.58, 3.5);
  s += p.shape(RR(-6, -80, 46, 80, 6), { fill: C.teal, hatch: { angle: -80, gap: 5, color: '#fff', width: 0.7, opacity: 0.25 } });
  s += p.shape(R(2, -70, 30, 18), { fill: C.black, ink: C.tealDeep, amp: 0.4, inkWidth: 1.1 });
  for (let i = 0; i < 3; i++) s += p.shape(E(9 + i * 9, -42, 2.6, 2.6, 8), { fill: i === 1 ? C.vermilion : C.saffron, outline: false, grain: 'none', cls: `blink b${i}` });
  s += p.shape(R(40, -36, w - 40, 10), { fill: C.black, ink: C.black, amp: 0.4, inkWidth: 1 });
  for (let i = 0; i < Math.floor((w - 40) / 14); i++) s += p.shape(E(48 + i * 14, -31, 2.4, 2.4, 8), { fill: C.saffron, outline: false, grain: 'none', amp: 0.2 });
  s += p.brush([[52, -26], [48, 0]], { color: C.tealDeep, w0: 3, w1: 2.6, amp: 0.3 });
  s += p.brush([[w - 12, -26], [w - 8, 0]], { color: C.tealDeep, w0: 3, w1: 2.6, amp: 0.3 });
  let items = '';
  for (let i = 0; i < 3; i++) items += `<g class="belt-item" style="--k:${i}">${box(p, 46, -36, 18, 16)}</g>`;
  s += `<g class="belt">${items}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/* ------------------------------------------------------- desks & screens */

export function desk(p, x, y, w = 90) {
  let s = p.shape(R(x, y - 40, w, 5), { fill: C.cocoa, amp: 0.4, inkWidth: 1.2 });
  s += p.brush([[x + 6, y - 36], [x + 4, y]], { color: C.oxblood, w0: 2.6, w1: 2.2, amp: 0.3 });
  s += p.brush([[x + w - 6, y - 36], [x + w - 4, y]], { color: C.oxblood, w0: 2.6, w1: 2.2, amp: 0.3 });
  return s;
}

export function chair(p, x, y) {
  let s = p.shape(RR(x - 13, y - 30, 24, 5, 2), { fill: C.vermilion, amp: 0.4, inkWidth: 1.1 });
  s += p.shape(RR(x - 17, y - 58, 6, 32, 3), { fill: C.vermilion, amp: 0.4, inkWidth: 1.1 });
  s += p.brush([[x, y - 26], [x, y - 6]], { color: C.black, w0: 2.4, w1: 2.4, amp: 0.2 });
  s += p.brush([[x - 10, y - 3], [x + 10, y - 3]], { color: C.black, w0: 2.2, w1: 2.2, amp: 0.2 });
  return s;
}

/** Monitor. kind: 'sheet' (spreadsheet), 'control' (control chart), 'margin' (bars + line) */
export function monitor(p, x, y, w, h, o = {}) {
  const kind = o.kind ?? 'sheet';
  let s = p.shape(RR(x, y - h, w, h, 3), { fill: o.frame ?? C.teal, amp: 0.5 });
  const sx = x + 4, sy = y - h + 4, sw = w - 8, sh = h - 9;
  s += p.shape(R(sx, sy, sw, sh), { fill: o.screen ?? C.ice, ink: C.tealDeep, inkWidth: 1, amp: 0.3, grain: 'light' });
  if (kind === 'sheet') {
    let d = '';
    for (let i = 1; i < 4; i++) d += `M${sx + 2} ${sy + (sh * i) / 4}H${sx + sw - 2}`;
    for (let i = 1; i < 3; i++) d += `M${sx + (sw * i) / 3} ${sy + 2}V${sy + sh - 2}`;
    s += `<path d="${d}" stroke="${C.teal}" stroke-width="0.8" opacity="0.7"/>`;
    s += `<g class="cells">`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      if ((r + c) % 2 && r !== 0) continue;
      s += `<rect class="cell" style="--c:${r * 3 + c}" x="${(sx + (sw * c) / 3 + 2).toFixed(1)}" y="${(sy + (sh * r) / 4 + 2).toFixed(1)}" width="${(sw / 3 - 4).toFixed(1)}" height="${(sh / 4 - 4).toFixed(1)}" fill="${r === 0 ? C.teal : C.vermilion}" opacity="${r === 0 ? 0.55 : 0.75}"/>`;
    }
    s += `</g>`;
  } else if (kind === 'control') {
    const yU = sy + sh * 0.25, yL = sy + sh * 0.75;
    s += `<path d="M${sx + 3} ${yU}H${sx + sw - 3}M${sx + 3} ${yL}H${sx + sw - 3}" stroke="${C.teal}" stroke-width="1" stroke-dasharray="3 3"/>`;
    const pts = [];
    const n = 7;
    for (let i = 0; i < n; i++) pts.push([sx + 5 + (i * (sw - 10)) / (n - 1), sy + sh * (0.62 - 0.08 * i + (i % 2 ? 0.12 : -0.05))]);
    pts[n - 1][1] = sy + sh * 0.18;
    s += `<path class="chart-line" pathLength="1" d="M${pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}" fill="none" stroke="${C.vermilion}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const q of pts) s += `<circle class="chart-dot" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="1.8" fill="${C.oxblood}"/>`;
  } else if (kind === 'margin') {
    const bars = [0.35, 0.5, 0.42, 0.66, 0.78];
    bars.forEach((b, i) => {
      const bw = sw / 7;
      const bx = sx + 4 + i * (bw + 2.5);
      s += `<rect class="bar" style="--c:${i}" x="${bx.toFixed(1)}" y="${(sy + sh - 3 - sh * b * 0.8).toFixed(1)}" width="${bw.toFixed(1)}" height="${(sh * b * 0.8).toFixed(1)}" fill="${i % 2 ? C.sage : C.leaf}"/>`;
    });
    const pts = bars.map((b, i) => [sx + 4 + i * (sw / 7 + 2.5) + sw / 14, sy + sh - 6 - sh * b * 0.8 - 6]);
    s += `<path class="chart-line" pathLength="1" d="M${pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}" fill="none" stroke="${C.vermilion}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (o.stand !== false) {
    s += p.shape([[x + w / 2 - 4, y - 5], [x + w / 2 + 4, y - 5], [x + w / 2 + 5, y + (o.standH ?? 10)], [x + w / 2 - 5, y + (o.standH ?? 10)]], { fill: o.frame ?? C.teal, amp: 0.3, inkWidth: 1.1 });
    s += p.shape(RR(x + w / 2 - 15, y + (o.standH ?? 10) - 1, 30, 4, 2), { fill: o.frame ?? C.teal, amp: 0.3, inkWidth: 1.1 });
  }
  return s;
}

export function plant(p, x, y, o = {}) {
  let s = p.shape([[x - 7, y - 12], [x + 7, y - 12], [x + 5, y], [x - 5, y]], { fill: o.pot ?? C.vermilion, amp: 0.3, inkWidth: 1.1 });
  const leaves = o.leaves ?? 5;
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + (i - (leaves - 1) / 2) * 0.42;
    const l = p.rand(14, 22);
    s += p.shape(geo.leaf(x, y - 12, x + Math.cos(a) * l, y - 12 + Math.sin(a) * l, 0.42, 7), {
      fill: i % 2 ? C.leaf : C.cyan,
      ink: C.leafDeep,
      inkWidth: 0.9,
      amp: 0.3,
      hatch: { angle: (a * 180) / Math.PI, gap: 3, color: '#fff', width: 0.6, opacity: 0.45 },
    });
  }
  return `<g class="sway">${s}</g>`;
}

/* ----------------------------------------------------- paper & instruments */

export function clipboard(p, x, y, o = {}) {
  const w = o.w ?? 64, h = o.h ?? 84;
  let s = p.shadow(w / 2, 2, w * 0.6, 3);
  s += p.shape(RR(0, -h, w, h, 4), { fill: C.cocoa, amp: 0.5 });
  s += p.shape(R(5, -h + 8, w - 10, h - 13), { fill: C.paper, ink: C.teal, amp: 0.5, grain: 'warm', grainOpacity: 0.4 });
  s += p.shape(RR(w / 2 - 11, -h - 4, 22, 9, 3), { fill: C.ochre, amp: 0.3, inkWidth: 1.1 });
  for (let i = 0; i < 4; i++) {
    const ry = -h + 20 + i * 12;
    s += p.shape(R(10, ry - 5, 6.5, 6.5), { fill: C.paper, ink: C.teal, inkWidth: 1, amp: 0.25, grain: 'none' });
    s += `<path class="tick" style="--c:${i}" pathLength="1" d="M10.5 ${ry - 2}l2.4 3.4 5-7.5" fill="none" stroke="${C.leaf}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += p.brush([[21, ry - 1.5], [21 + p.rand(18, w - 32), ry - 1.5]], { color: C.graphite, w0: 1.1, w1: 0.7, amp: 0.3, opacity: 0.7 });
  }
  // spec drawing
  const dy = -h + 64;
  s += `<rect x="12" y="${dy}" width="${w - 30}" height="14" fill="none" stroke="${C.teal}" stroke-width="0.9"/>`;
  s += `<circle cx="${12 + (w - 30) / 2}" cy="${dy + 7}" r="4" fill="none" stroke="${C.teal}" stroke-width="0.9"/>`;
  s += `<path d="M12 ${dy + 18}h${w - 30}M12 ${dy + 16}v4M${w - 18} ${dy + 16}v4" stroke="${C.vermilion}" stroke-width="0.8"/>`;
  // pencil
  s += `<g class="pencil">${p.shape([[w - 4, -h + 30], [w + 2, -h + 32], [w - 6, -10], [w - 9, -4], [w - 10, -12]], { fill: C.saffron, ink: C.ochreDeep, inkWidth: 1, amp: 0.3 })}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

export function paper(p, x, y, w, h, o = {}) {
  let s = p.shape(R(x, y - h, w, h), { fill: o.fill ?? C.paper, ink: o.ink ?? C.teal, amp: 0.5, grain: 'warm', grainOpacity: 0.35 });
  const lines = o.lines ?? 4;
  for (let i = 0; i < lines; i++) {
    const ly = y - h + (o.top ?? 14) + i * 7;
    s += p.brush([[x + 6, ly], [x + 6 + p.rand(w * 0.35, w - 14), ly]], { color: C.graphite, w0: 1, w1: 0.6, amp: 0.25, opacity: 0.6 });
  }
  return s;
}

export function badge(p, cx, cy, kind = 'pass', r = 11) {
  const fill = kind === 'pass' ? C.leaf : C.vermilion;
  let s = p.shape(E(cx, cy, r, r, 14), { fill, ink: kind === 'pass' ? C.leafDeep : C.oxblood, amp: 0.6 });
  if (kind === 'pass') {
    s += `<path class="tick" pathLength="1" d="M${cx - r * 0.45} ${cy + 0.5}l${r * 0.32} ${r * 0.36} ${r * 0.58} ${-r * 0.74}" fill="none" stroke="${C.paper}" stroke-width="${(r * 0.22).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else {
    const k = r * 0.38;
    s += `<path class="tick" pathLength="1" d="M${cx - k} ${cy - k}L${cx + k} ${cy + k}M${cx + k} ${cy - k}L${cx - k} ${cy + k}" fill="none" stroke="${C.paper}" stroke-width="${(r * 0.22).toFixed(1)}" stroke-linecap="round"/>`;
  }
  return s;
}

export function certificate(p, x, y, o = {}) {
  const w = o.w ?? 58, h = o.h ?? 70;
  let s = p.shape(R(0, -h, w, h), { fill: C.blush, ink: C.teal, amp: 0.6, grain: 'light' });
  s += p.shape(R(5, -h + 5, w - 10, h - 10), { fill: 'none', ink: C.teal, inkWidth: 0.8, amp: 0.4, grain: 'none' });
  for (let i = 0; i < 4; i++) s += p.brush([[11, -h + 18 + i * 8], [11 + p.rand(18, w - 26), -h + 18 + i * 8]], { color: C.teal, w0: 1.2, w1: 0.6, amp: 0.25, opacity: 0.75 });
  // rosette: a flower, of course
  const rx = w - 14, ry = -16;
  s += p.shape(geo.leaf(rx - 2, ry, rx - 7, ry + 18, 0.5, 6), { fill: C.vermilion, amp: 0.3, inkWidth: 0.9 });
  s += p.shape(geo.leaf(rx + 2, ry, rx + 7, ry + 18, 0.5, 6), { fill: C.vermilion, amp: 0.3, inkWidth: 0.9 });
  s += `<g class="rosette">${p.daisy(rx, ry, { r: 11, petals: 11, fill: C.saffron, centre: C.vermilion })}</g>`;
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

export function magnifier(p, cx, cy, r, inner = '') {
  let s = p.shape(geo.translate(geo.leaf(0, 0, r * 1.3, r * 1.3, 0.24, 6), cx + r * 0.62, cy + r * 0.62), { fill: C.cocoa, amp: 0.3, inkWidth: 1.1 });
  s += p.shape(E(cx, cy, r, r, 18), { fill: C.ice, fillOpacity: 0.85, ink: C.tealDeep, amp: 0.4, grain: 'light' });
  s += inner;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.teal}" stroke-width="${(r * 0.22).toFixed(1)}"/>`;
  s += p.brush([[cx - r * 0.55, cy - r * 0.25], [cx - r * 0.25, cy - r * 0.58]], { color: '#fff', w0: 1.8, w1: 0.6, amp: 0.1, opacity: 0.8 });
  return s;
}

export function caliper(p, x, y, len = 46) {
  let s = p.shape(R(x, y - 3, len, 5), { fill: C.ice, ink: C.tealDeep, amp: 0.3, inkWidth: 1 });
  s += `<path d="M${x + 4} ${y - 1}h${len - 8}" stroke="${C.tealDeep}" stroke-width="0.6" stroke-dasharray="1 2"/>`;
  s += p.shape([[x, y - 3], [x + 5, y - 3], [x + 5, y + 12], [x + 1, y + 9]], { fill: C.ice, ink: C.tealDeep, amp: 0.2, inkWidth: 1 });
  s += `<g class="jaw">${p.shape([[x + 22, y - 5], [x + 30, y - 5], [x + 29, y + 12], [x + 25, y + 9]], { fill: C.aqua, ink: C.tealDeep, amp: 0.2, inkWidth: 1 })}</g>`;
  return s;
}

export function bin(p, x, y, o = {}) {
  let s = p.shadow(26, 1, 30, 3);
  // scraps poking out
  s += p.shape([[10, -54], [18, -70], [24, -52]], { fill: C.vermilion, amp: 0.4, inkWidth: 1.1 });
  s += p.shape([[24, -54], [34, -66], [40, -50]], { fill: C.saffron, amp: 0.4, inkWidth: 1.1 });
  s += p.shape(RR(16, -62, 14, 10, 2), { fill: C.apricot, amp: 0.3, inkWidth: 1 });
  s += p.shape([[0, -56], [52, -56], [46, 0], [6, 0]], {
    fill: C.rose,
    hatch: { angle: -84, gap: 5, color: C.oxblood, width: 0.9, opacity: 0.35 },
  });
  s += `<g class="lid">${p.shape([[-4, -60], [50, -66], [51, -60], [-3, -54]], { fill: C.oxblood, amp: 0.3, inkWidth: 1.1, ink: C.black })}</g>`;
  s += p.brush([[16, -38], [36, -16]], { color: C.paper, w0: 4, w1: 3, amp: 0.4 });
  s += p.brush([[36, -38], [16, -16]], { color: C.paper, w0: 4, w1: 3, amp: 0.4 });
  return `<g transform="${tf(x, y, o.s ?? 1, o.flip)}">${s}</g>`;
}

/* ----------------------------------------------------------------- money */

export function coins(p, x, y, n = 4, o = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += p.shape(E(x + p.rand(-0.8, 0.8), y - i * 3.6 - 3, 9, 3.4, 14), { fill: i === n - 1 ? C.saffron : C.marigold, ink: C.ochreDeep, inkWidth: 1, amp: 0.25, grain: 'light' });
  }
  if (o.top !== false) s += `<text x="${x}" y="${(y - (n - 1) * 3.6 - 1.2).toFixed(1)}" class="coin-glyph" text-anchor="middle" fill="${C.ochreDeep}">$</text>`;
  return `<g class="coins">${s}</g>`;
}

export function banknote(p, x, y, rot = -8) {
  let s = p.shape(R(-17, -10, 34, 20), { fill: C.sage, ink: C.leafDeep, amp: 0.4, inkWidth: 1.1, hatch: { angle: 0, gap: 3, color: C.leafDeep, width: 0.5, opacity: 0.25 } });
  s += p.shape(E(0, 0, 6, 6, 12), { fill: C.paper, ink: C.leafDeep, inkWidth: 0.8, amp: 0.2, grain: 'none' });
  s += `<text x="0" y="3" class="coin-glyph" text-anchor="middle" fill="${C.leafDeep}">$</text>`;
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${s}</g>`;
}

export function calculator(p, x, y) {
  let s = p.shape(RR(x, y - 64, 42, 64, 5), { fill: C.teal, amp: 0.5, hatch: { angle: -80, gap: 4, color: '#fff', width: 0.6, opacity: 0.2 } });
  s += p.shape(R(x + 5, y - 58, 32, 13), { fill: C.ice, ink: C.tealDeep, inkWidth: 1, amp: 0.3 });
  s += `<text x="${x + 34}" y="${y - 48}" class="calc-digits" text-anchor="end" fill="${C.tealDeep}">$$</text>`;
  const keys = [C.saffron, C.paper, C.paper, C.blush];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    s += p.shape(RR(x + 6 + c * 11, y - 40 + r * 9, 8, 6, 1.5), { fill: c === 2 ? keys[3] : r === 0 ? keys[0] : keys[1], outline: false, grain: 'none', amp: 0.15 });
  }
  return s;
}

export function openBox(p, x, y, w = 56, h = 40) {
  let s = p.shadow(x + w / 2, y + 1, w * 0.6, 3);
  s += p.shape([[x - 4, y - h], [x + w * 0.42, y - h - 4], [x + w * 0.2, y - h - 20], [x - 14, y - h - 14]], { fill: C.ochre, amp: 0.4, inkWidth: 1.2 });
  s += p.shape([[x + w + 4, y - h], [x + w * 0.58, y - h - 4], [x + w * 0.8, y - h - 22], [x + w + 16, y - h - 12]], { fill: C.ochre, amp: 0.4, inkWidth: 1.2 });
  s += p.shape(R(x + 4, y - h - 10, 10, 12), { fill: C.blush, amp: 0.3, inkWidth: 1 });
  s += p.shape(RR(x + 18, y - h - 16, 9, 18, 2), { fill: C.aqua, amp: 0.3, inkWidth: 1 });
  s += p.shape(E(x + 38, y - h - 4, 7, 7, 10), { fill: C.saffron, amp: 0.3, inkWidth: 1 });
  s += p.shape(R(x, y - h, w, h), { fill: C.apricot, amp: 0.6, hatch: { angle: -70, gap: 5, color: C.oxblood, width: 0.7, opacity: 0.2 } });
  return s;
}

/* -------------------------------------------------------- botanical bits */

export function sprig(p, x, y, o = {}) {
  const h = o.h ?? 26;
  const col = o.color ?? C.leaf;
  let s = p.brush([[x, y], [x + (o.lean ?? 3), y - h * 0.5], [x + (o.lean ?? 3) * 1.6, y - h]], { color: C.leafDeep, w0: 1.8, w1: 0.6, amp: 0.3 });
  const n = o.leaves ?? 4;
  for (let i = 0; i < n; i++) {
    const t = 0.25 + (i / n) * 0.7;
    const px = x + (o.lean ?? 3) * 1.6 * t, py = y - h * t;
    const side = i % 2 ? 1 : -1;
    s += p.shape(geo.leaf(px, py, px + side * 9, py - 5, 0.45, 6), { fill: col, ink: C.leafDeep, inkWidth: 0.8, amp: 0.2, grain: 'light' });
  }
  return `<g class="sway">${s}</g>`;
}
