// A tiny "hand" for SVG: every primitive is generated with a seeded RNG so the
// drawings are imperfect in the same way on every load, and every shape is
// built the way the botanical painting is built:
//   flat chalky fill  ->  pastel grain  ->  striation/hatch details  ->
//   an outline in a partner colour, slightly off-register, overshooting its start.
import { C, INK_FOR } from './palette.js';

export function mulberry(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const fx = (n) => (Math.round(n * 10) / 10).toString();

/* ---------- geometry helpers (return arrays of [x, y]) ---------- */

export const geo = {
  rect(x, y, w, h) {
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  },
  roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    const pts = [];
    const arc = (cx, cy, a0) => {
      for (let i = 0; i <= 4; i++) {
        const a = a0 + (Math.PI / 2) * (i / 4);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    arc(x + w - r, y + r, -Math.PI / 2);
    arc(x + w - r, y + h - r, 0);
    arc(x + r, y + h - r, Math.PI / 2);
    arc(x + r, y + r, Math.PI);
    return pts;
  },
  ellipse(cx, cy, rx, ry, n = 22, rot = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return pts;
  },
  // petal / leaf: pointed at both ends, from (x0,y0) to (x1,y1)
  leaf(x0, y0, x1, y1, width = 0.38, n = 9) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = Math.sin(Math.PI * t) ** 0.8 * len * width * 0.5;
      const px = x0 + dx * t, py = y0 + dy * t;
      left.push([px + nx * w, py + ny * w]);
      if (i > 0 && i < n) right.unshift([px - nx * w, py - ny * w]);
    }
    return left.concat(right);
  },
  translate(pts, dx, dy) {
    return pts.map(([x, y]) => [x + dx, y + dy]);
  },
  bounds(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      if (x < x0) x0 = x; if (y < y0) y0 = y;
      if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  },
};

export function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---------- curves ---------- */

// Catmull–Rom through points -> cubic Bézier path data.
export function smoothPath(pts, closed) {
  const n = pts.length;
  if (n < 2) return '';
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${fx(pts[0][0])} ${fx(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${fx(c1x)} ${fx(c1y)} ${fx(c2x)} ${fx(c2y)} ${fx(p2[0])} ${fx(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

// Dense samples along a Catmull–Rom spline (for brush ribbons).
export function splineSamples(pts, closed = false, per = 8) {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const out = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/* ---------- the pen ---------- */

export class Pen {
  constructor(seed = 1) {
    this.r = mulberry(seed);
    this.piece = 0;
  }
  rand(a = 0, b = 1) {
    return a + (b - a) * this.r();
  }
  pick(arr) {
    return arr[Math.floor(this.r() * arr.length)];
  }

  // Resample a polyline and push each point along its normal with smooth noise:
  // the line breathes like a hand-held pastel instead of a ruler.
  wobble(pts, { closed = true, amp = 1.1, step = 7, jit = 0.8 } = {}) {
    const n = pts.length;
    const segs = closed ? n : n - 1;
    const ph1 = this.rand(0, 6.28), ph2 = this.rand(0, 6.28);
    const f1 = this.rand(0.07, 0.11), f2 = this.rand(0.17, 0.27);
    const src = pts.map(([x, y]) => [x + this.rand(-jit, jit), y + this.rand(-jit, jit)]);
    const out = [];
    let s = 0;
    for (let i = 0; i < segs; i++) {
      const a = src[i], b = src[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1e-6;
      const k = Math.max(1, Math.round(len / step));
      const nx = -dy / len, ny = dx / len;
      for (let j = 0; j < k; j++) {
        const t = j / k;
        const ss = s + len * t;
        const w = amp * (Math.sin(ss * f1 + ph1) * 0.65 + Math.sin(ss * f2 + ph2) * 0.35);
        out.push([a[0] + dx * t + nx * w, a[1] + dy * t + ny * w]);
      }
      s += len;
    }
    if (!closed) out.push(src[n - 1]);
    return out;
  }

  /*
   * A filled, outlined, textured shape.
   * opts: fill, ink, grain ('light'|'dark'|'warm'|'none'), grainOpacity,
   *       hatch {angle, gap, color, width, opacity}, stipple {...},
   *       outline (bool), inkWidth, amp, cls, attrs, fillOpacity
   */
  shape(pts, o = {}) {
    const fill = o.fill ?? C.saffron;
    const ink = o.ink ?? INK_FOR[fill] ?? C.ink;
    const amp = o.amp ?? 1.1;
    const body = this.wobble(pts, { amp, step: o.step ?? 7, jit: o.jit ?? 0.7 });
    const dFill = smoothPath(body, true);
    let s = `<g${o.cls ? ` class="${o.cls}"` : ''}${o.attrs ? ' ' + o.attrs : ''}>`;
    s += `<path d="${dFill}" fill="${fill}"${o.fillOpacity != null ? ` fill-opacity="${o.fillOpacity}"` : ''}/>`;
    const grain = o.grain ?? 'light';
    if (grain !== 'none') {
      s += `<path d="${dFill}" fill="url(#g-${grain})" opacity="${o.grainOpacity ?? 1}"/>`;
    }
    if (o.hatch) s += this.hatch(pts, o.hatch);
    if (o.stipple) s += this.stipple(pts, o.stipple);
    if (o.outline !== false) s += this.outline(pts, { ink, width: o.inkWidth ?? 1.7, amp });
    return s + '</g>';
  }

  // Off-register outline that overshoots where it started, like a quick pastel line.
  outline(pts, { ink = C.ink, width = 1.7, amp = 1.1, closed = true, offset = 1, overshoot = 0.07 } = {}) {
    let line = this.wobble(pts, { amp: amp * 1.05, step: 6, jit: 0.8, closed });
    const ox = this.rand(0.3, 1.1) * offset, oy = -this.rand(0.2, 0.9) * offset;
    line = line.map(([x, y]) => [x + ox, y + oy]);
    if (closed) {
      const n = line.length;
      const start = Math.floor(this.rand(0, n));
      const extra = Math.max(2, Math.round(n * overshoot));
      const open = [];
      for (let i = 0; i <= n + extra; i++) open.push(line[(start + i) % n]);
      // let the overshoot drift outward a hair
      const cx = line.reduce((a, p) => a + p[0], 0) / n;
      const cy = line.reduce((a, p) => a + p[1], 0) / n;
      for (let i = n; i < open.length; i++) {
        const k = ((i - n + 1) / extra) * 1.6;
        const [x, y] = open[i];
        const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1;
        open[i] = [x + (dx / l) * k, y + (dy / l) * k];
      }
      line = open;
    }
    return `<path class="ol" pathLength="1" d="${smoothPath(line, false)}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // Tapered brush stroke along a path (limbs, stems, tendrils, connectors).
  brush(pts, { color = C.ink, w0 = 3, w1 = 1, swell = 0.35, amp = 0.5, per = 6, cls = '', opacity } = {}) {
    let path = pts.length > 2 ? splineSamples(pts, false, per) : resampleLine(pts, 4);
    if (amp) path = this.wobble(path, { closed: false, amp, step: 5, jit: 0 });
    const n = path.length;
    if (n < 2) return '';
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      const t = i / (n - 1);
      const w = (w0 + (w1 - w0) * t) * (1 + swell * Math.sin(Math.PI * t)) * 0.5;
      left.push([path[i][0] + nx * w, path[i][1] + ny * w]);
      right.push([path[i][0] - nx * w, path[i][1] - ny * w]);
    }
    const ring = left.concat(right.reverse());
    let d = `M${fx(ring[0][0])} ${fx(ring[0][1])}`;
    for (let i = 1; i < ring.length; i++) d += `L${fx(ring[i][0])} ${fx(ring[i][1])}`;
    return `<path${cls ? ` class="${cls}"` : ''} d="${d}Z" fill="${color}"${opacity != null ? ` opacity="${opacity}"` : ''}/>`;
  }

  // A limb or band with an off-register darker edge.
  limb(pts, { color, ink, w0 = 6.5, w1 = 5.5 } = {}) {
    const shifted = pts.map(([x, y]) => [x + 0.9, y - 0.7]);
    return (
      this.brush(shifted, { color: ink ?? INK_FOR[color] ?? C.ink, w0: w0 + 1.6, w1: w1 + 1.6, swell: 0.1, amp: 0.35 }) +
      this.brush(pts, { color, w0, w1, swell: 0.1, amp: 0.35 })
    );
  }

  // Parallel striations clipped to a polygon (the purple trumpets, the fern ribs).
  hatch(pts, { angle = -60, gap = 6, color = '#fff', width = 1, opacity = 0.55, inset = 0.18, drop = 0.18, bow = 1.2 } = {}) {
    const a = (angle * Math.PI) / 180;
    const ca = Math.cos(-a), sa = Math.sin(-a);
    const rot = pts.map(([x, y]) => [x * ca - y * sa, x * sa + y * ca]);
    const b = geo.bounds(rot);
    let d = '';
    const cb = Math.cos(a), sb = Math.sin(a);
    const back = (x, y) => [x * cb - y * sb, x * sb + y * cb];
    for (let y = b.y0 + gap * this.rand(0.3, 0.8); y < b.y1; y += gap * this.rand(0.8, 1.2)) {
      const xs = [];
      for (let i = 0, j = rot.length - 1; i < rot.length; j = i++) {
        const [x1, y1] = rot[i], [x2, y2] = rot[j];
        if ((y1 > y) !== (y2 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        if (this.r() < drop) continue;
        const len = xs[k + 1] - xs[k];
        if (len < gap * 0.8) continue;
        const s0 = xs[k] + len * inset * this.rand(0.2, 1.4);
        const s1 = xs[k + 1] - len * inset * this.rand(0.2, 1.4);
        if (s1 - s0 < 2) continue;
        const yy = y + this.rand(-0.6, 0.6);
        const P0 = back(s0, yy), P1 = back(s1, yy + this.rand(-0.8, 0.8));
        const M = back((s0 + s1) / 2, yy + this.rand(-bow, bow));
        d += `M${fx(P0[0])} ${fx(P0[1])}Q${fx(M[0])} ${fx(M[1])} ${fx(P1[0])} ${fx(P1[1])}`;
      }
    }
    if (!d) return '';
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
  }

  // Speckles inside a polygon (the leopard-spotted daisy centre).
  stipple(pts, { n = 30, color = C.oxblood, r0 = 0.6, r1 = 1.6, opacity = 0.8 } = {}) {
    const b = geo.bounds(pts);
    let d = '';
    let tries = 0, placed = 0;
    while (placed < n && tries < n * 20) {
      tries++;
      const x = this.rand(b.x0, b.x1), y = this.rand(b.y0, b.y1);
      if (!pointInPoly(x, y, pts)) continue;
      const r = this.rand(r0, r1);
      const ry = r * this.rand(0.6, 1);
      d += `M${fx(x - r)} ${fx(y)}a${fx(r)} ${fx(ry)} 0 1 0 ${fx(2 * r)} 0a${fx(r)} ${fx(ry)} 0 1 0 ${fx(-2 * r)} 0`;
      placed++;
    }
    return `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
  }

  // Spiral tendril, like the curling teal vine in the painting.
  tendril(x, y, { r = 10, turns = 1.4, dir = 1, angle = 0, color = C.teal, w0 = 2.2, w1 = 0.6, cls = '' } = {}) {
    const pts = [];
    const steps = Math.round(turns * 14);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = angle + dir * t * turns * Math.PI * 2;
      const rr = r * (1 - t * 0.78);
      pts.push([x + Math.cos(a) * rr - Math.cos(angle) * r, y + Math.sin(a) * rr - Math.sin(angle) * r]);
    }
    return this.brush(pts, { color, w0, w1, swell: 0, amp: 0.15, per: 3, cls });
  }

  // Small daisy, the painting's signature flower, used as a stamp and as step nodes.
  daisy(x, y, { r = 8, petals = 9, fill = C.saffron, centre = C.ochre, ink, rot = 0 } = {}) {
    let s = '';
    for (let i = 0; i < petals; i++) {
      const a = rot + (i / petals) * Math.PI * 2 + this.rand(-0.12, 0.12);
      const l = r * this.rand(0.85, 1.1);
      const pts = geo.leaf(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.5, 6);
      s += `<path d="${smoothPath(this.wobble(pts, { amp: 0.25, step: 3, jit: 0.15 }), true)}" fill="${fill}"/>`;
    }
    const cpts = geo.ellipse(x, y, r * 0.32, r * 0.3, 10);
    s += `<path d="${smoothPath(this.wobble(cpts, { amp: 0.25, step: 2, jit: 0.2 }), true)}" fill="${centre}"/>`;
    s += this.stipple(cpts, { n: 5, color: ink ?? C.oxblood, r0: 0.25, r1: 0.6, opacity: 0.8 });
    return s;
  }

  // Soft chalk shadow that grounds an object on the paper.
  shadow(cx, cy, rx, ry = 3.2) {
    const pts = this.wobble(geo.ellipse(cx, cy, rx, ry, 16), { amp: 0.5, step: 6 });
    return `<path d="${smoothPath(pts, true)}" fill="${C.ink}" opacity="0.09"/>`;
  }

  // Wrap a group of shapes as one revealable "piece" with a stagger index.
  group(inner, { cls = '', transform = '' } = {}) {
    const i = this.piece++;
    return `<g class="pc${cls ? ' ' + cls : ''}" style="--i:${i}"${transform ? ` transform="${transform}"` : ''}>${inner}</g>`;
  }
}

function resampleLine(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const k = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let j = 0; j < k; j++) out.push([x0 + ((x1 - x0) * j) / k, y0 + ((y1 - y0) * j) / k]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* ---------- shared <defs>: grain patterns + rough-edge filter ---------- */

// The grain is a few hundred tiny pastel marks per tile. In the browser each tile is
// painted once into a small bitmap and the pattern references that image: a vector
// pattern would be re-rasterised mark by mark on every repaint, which made scrolling
// through the workflows stutter. (In Node, for the SVG export, the marks stay vector.)
const RASTER_SCALE = 3; // tile pixels per unit, so the grain stays crisp on retina screens

export function sharedDefs() {
  const r = mulberry(7);
  const canRaster = typeof document !== 'undefined';
  const grain = (id, colour, count, op0, op1, size = 72) => {
    const marks = [];
    for (let i = 0; i < count; i++) {
      const x = r() * size, y = r() * size;
      const a = r() * Math.PI;
      const l = 0.5 + r() * 1.9;
      const w = 0.5 + r() * 0.9;
      const op = op0 + r() * (op1 - op0);
      marks.push([x, y, Math.cos(a) * l, Math.sin(a) * l, w, op]);
    }
    let body;
    if (canRaster) {
      const c = document.createElement('canvas');
      c.width = c.height = size * RASTER_SCALE;
      const g = c.getContext('2d');
      g.scale(RASTER_SCALE, RASTER_SCALE);
      g.strokeStyle = colour;
      g.lineCap = 'round';
      // draw each mark at x and its wrapped twin so the tile repeats without seams
      for (const [x, y, dx, dy, w, op] of marks) {
        g.globalAlpha = op;
        g.lineWidth = w;
        for (const ox of [0, -size, size]) for (const oy of [0, -size, size]) {
          if ((ox && x > 3 && x < size - 3) || (oy && y > 3 && y < size - 3)) continue;
          g.beginPath();
          g.moveTo(x + ox, y + oy);
          g.lineTo(x + ox + dx, y + oy + dy);
          g.stroke();
        }
      }
      body = `<image href="${c.toDataURL('image/png')}" width="${size}" height="${size}" preserveAspectRatio="none"/>`;
    } else {
      body = marks
        .map(([x, y, dx, dy, w, op]) => `<path d="M${fx(x)} ${fx(y)}l${fx(dx)} ${fx(dy)}" stroke="${colour}" stroke-width="${fx(w)}" stroke-linecap="round" opacity="${fx(op)}"/>`)
        .join('');
    }
    return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  };
  return `<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <defs>
    ${grain('g-light', '#ffffff', 220, 0.18, 0.55)}
    ${grain('g-dark', '#1d1a17', 170, 0.08, 0.26)}
    ${grain('g-warm', '#591f17', 170, 0.1, 0.3)}
    ${grain('g-paper', '#7d5141', 120, 0.05, 0.14, 96)}
    <filter id="rough" x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
</svg>`;
}
