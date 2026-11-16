// Cuts the original painting into irregular, torn-edged pieces made of its real pixels.
//
//  1. The image is drawn at display resolution and its black ground is keyed out
//     (so falling pieces can land on paper later without black boxes around them).
//  2. A detail-driven quadtree decides where pieces are small (busy petals, stamens)
//     and where they are large (flat washes), giving irregular sizes.
//  3. A Voronoi tessellation of those seeds gives the piece shapes; every shared edge
//     gets the same deterministic tear on both sides, so pieces still interlock.
//  4. Each piece is clipped out of the keyed image into a sprite atlas, ready to be
//     drawn with a single drawImage per piece per frame.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/* ------------------------------------------------------------ voronoi */

function clipHalf(poly, ax, ay, bx, by) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const P = poly[i], Q = poly[(i + 1) % n];
    const fp = (P[0] - mx) * dx + (P[1] - my) * dy;
    const fq = (Q[0] - mx) * dx + (Q[1] - my) * dy;
    if (fp <= 0) out.push(P);
    if ((fp <= 0) !== (fq <= 0)) {
      const t = fp / (fp - fq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}

export function voronoi(sites, w, h) {
  const cell = 40;
  const gw = Math.ceil(w / cell) + 1, gh = Math.ceil(h / cell) + 1;
  const buckets = Array.from({ length: gw * gh }, () => []);
  sites.forEach(([x, y], i) => buckets[clamp(Math.floor(y / cell), 0, gh - 1) * gw + clamp(Math.floor(x / cell), 0, gw - 1)].push(i));
  const polys = new Array(sites.length);
  for (let i = 0; i < sites.length; i++) {
    const [sx, sy] = sites[i];
    const bx = clamp(Math.floor(sx / cell), 0, gw - 1), by = clamp(Math.floor(sy / cell), 0, gh - 1);
    let poly = [[0, 0], [w, 0], [w, h], [0, h]];
    let used = 0; // ring already processed
    for (let ring = 1; ring < 40; ring++) {
      const cand = [];
      for (let yy = by - ring; yy <= by + ring; yy++) {
        if (yy < 0 || yy >= gh) continue;
        for (let xx = bx - ring; xx <= bx + ring; xx++) {
          if (xx < 0 || xx >= gw) continue;
          if (Math.max(Math.abs(xx - bx), Math.abs(yy - by)) <= used) continue;
          for (const j of buckets[yy * gw + xx]) if (j !== i) cand.push(j);
        }
      }
      cand.sort((a, b) => (sites[a][0] - sx) ** 2 + (sites[a][1] - sy) ** 2 - ((sites[b][0] - sx) ** 2 + (sites[b][1] - sy) ** 2));
      for (const j of cand) {
        poly = clipHalf(poly, sx, sy, sites[j][0], sites[j][1]);
        if (poly.length < 3) break;
      }
      used = ring;
      let maxR = 0;
      for (const [px, py] of poly) maxR = Math.max(maxR, Math.hypot(px - sx, py - sy));
      if (2 * maxR <= ring * cell || (bx - ring <= 0 && by - ring <= 0 && bx + ring >= gw - 1 && by + ring >= gh - 1)) break;
    }
    polys[i] = poly;
  }
  return polys;
}

// Torn edges. The whole tessellation is warped by one smooth displacement field:
// every edge is resampled at even steps and each sample is pushed by the field.
// Two neighbours sample their shared edge at the same points, so they always
// interlock (no holes), and the painting's border stays fixed.
export function makeWarp(seed, amp = 1) {
  const r = mulberry(seed);
  const waves = [];
  for (let i = 0; i < 8; i++) {
    const big = i < 4;
    const ang = r() * Math.PI * 2;
    const k = (Math.PI * 2) / (big ? 16 + r() * 10 : 5 + r() * 3);
    waves.push({ kx: Math.cos(ang) * k, ky: Math.sin(ang) * k, ph: r() * 6.283, a: (big ? 1.7 : 0.55) * amp, axis: i % 2 });
  }
  return (x, y) => {
    let dx = 0, dy = 0;
    for (const wv of waves) {
      const v = Math.sin(x * wv.kx + y * wv.ky + wv.ph) * wv.a;
      if (wv.axis) dy += v; else dx += v;
    }
    return [dx, dy];
  };
}

export function tearEdges(poly, w, h, amount = 1, step = 3, warp = null) {
  if (!amount) return poly;
  const field = warp || makeWarp(29, amount);
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const x = a[0] + ((b[0] - a[0]) * j) / k, y = a[1] + ((b[1] - a[1]) * j) / k;
      const fall = Math.min(1, Math.min(x, y, w - x, h - y) / 6);
      if (fall <= 0) { out.push([x, y]); continue; }
      const [dx, dy] = field(x, y);
      out.push([x + dx * fall, y + dy * fall]);
    }
  }
  return out;
}

function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) return { x: poly[0][0], y: poly[0][1], area: 0 };
  return { x: cx / (6 * a), y: cy / (6 * a), area: Math.abs(a) };
}

function pip(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ------------------------------------------------------------ sprites */

/**
 * Cut polygons (CSS px, region space) out of a source canvas into atlases.
 * source: canvas in device px; region origin in source = (ox, oy) device px.
 */
export function makeSprites(polys, source, alphaData, { dpr, ox = 0, oy = 0, minCover = 0.04, atlasW = 2048, source2 = null }) {
  const frags = [];
  const atlases = [];
  const atlases2 = [];
  let atlas = null, actx = null, actx2 = null, cx = 0, cy = 0, rowH = 0;
  const sw = source.width, sh = source.height;
  const newAtlas = () => {
    atlas = document.createElement('canvas');
    atlas.width = atlasW;
    atlas.height = 4096;
    actx = atlas.getContext('2d');
    atlases.push({ canvas: atlas, used: 0 });
    if (source2) {
      const a2 = document.createElement('canvas');
      a2.width = atlasW;
      a2.height = 4096;
      actx2 = a2.getContext('2d');
      atlases2.push({ canvas: a2, used: 0 });
    }
    cx = 0; cy = 0; rowH = 0;
  };
  const pad = 3;
  const scratch = document.createElement('canvas');
  scratch.width = 256; scratch.height = 256;
  const sctx = scratch.getContext('2d');
  for (const poly of polys) {
    if (!poly || poly.length < 3) continue;
    const c = centroid(poly);
    if (c.area < 4) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of poly) {
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    // device bbox in source space
    const bx = Math.max(0, Math.floor(x0 * dpr + ox) - pad);
    const by = Math.max(0, Math.floor(y0 * dpr + oy) - pad);
    const bw = Math.min(sw, Math.ceil(x1 * dpr + ox) + pad) - bx;
    const bh = Math.min(sh, Math.ceil(y1 * dpr + oy) + pad) - by;
    if (bw <= 0 || bh <= 0) continue;

    // coverage of non-transparent paint inside the piece
    let hit = 0, tot = 0;
    const step = Math.max(2, Math.round(Math.min(bw, bh) / 9));
    for (let yy = by + 1; yy < by + bh; yy += step) {
      for (let xx = bx + 1; xx < bx + bw; xx += step) {
        if (!pip((xx - ox) / dpr, (yy - oy) / dpr, poly)) continue;
        tot++;
        if (alphaData[(yy * sw + xx) * 4 + 3] > 70) hit++;
      }
    }
    const cover = tot ? hit / tot : 0;
    if (cover < minCover) continue;

    if (!atlas || cx + bw > atlasW) {
      if (atlas) { cx = 0; cy += rowH + 1; rowH = 0; }
    }
    if (!atlas || cy + bh > 4096) newAtlas();
    // Mask = polygon filled AND stroked, so every edge grows outward by the same
    // ~1.2 device px: neighbours overlap and no hairline seams show when assembled.
    if (scratch.width < bw || scratch.height < bh) {
      scratch.width = Math.max(scratch.width, bw);
      scratch.height = Math.max(scratch.height, bh);
    }
    const cut = (src, into) => {
      sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, bw, bh);
      sctx.beginPath();
      poly.forEach(([x, y], k) => {
        const X = x * dpr + ox - bx, Y = y * dpr + oy - by;
        k ? sctx.lineTo(X, Y) : sctx.moveTo(X, Y);
      });
      sctx.closePath();
      sctx.fillStyle = '#000';
      sctx.strokeStyle = '#000';
      sctx.lineWidth = 2.4;
      sctx.lineJoin = 'round';
      sctx.fill();
      sctx.stroke();
      sctx.globalCompositeOperation = 'source-in';
      sctx.drawImage(src, bx, by, bw, bh, 0, 0, bw, bh);
      into.drawImage(scratch, 0, 0, bw, bh, cx, cy, bw, bh);
    };
    cut(source, actx);
    if (source2) cut(source2, actx2);

    frags.push({
      cx: c.x, cy: c.y, area: c.area, size: Math.sqrt(c.area), cover,
      atlas: atlases.length - 1, sx: cx, sy: cy, sw: bw, sh: bh,
      ax: c.x * dpr + ox - bx, ay: c.y * dpr + oy - by, // anchor (centroid) inside sprite
      poly,
    });
    const cur = atlases[atlases.length - 1];
    cur.used = Math.max(cur.used, cy + bh);
    if (source2) atlases2[atlases2.length - 1].used = cur.used;
    cx += bw + 1;
    rowH = Math.max(rowH, bh);
  }
  // trim atlases to used height
  const trim = ({ canvas, used }) => {
    const h = Math.max(1, Math.ceil(used) + 2);
    if (h >= canvas.height) return canvas;
    const t = document.createElement('canvas');
    t.width = canvas.width; t.height = h;
    t.getContext('2d').drawImage(canvas, 0, 0);
    canvas.width = 1; canvas.height = 1;
    return t;
  };
  return { frags, atlases: atlases.map(trim), atlases2: source2 ? atlases2.map(trim) : null };
}

/* --------------------------------------------- painting -> pieces */

// dual: also cut every piece from the un-keyed painting (black ground kept), so a
// piece can sit in the still picture with its ground and lose it as it falls.
export function shatterPainting(image, { w, h, dpr, target = 900, seed = 11, tear = 1, dual = false }) {
  const rnd = mulberry(seed);
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(image, 0, 0, W, H);
  let plain = null;
  if (dual) {
    plain = document.createElement('canvas');
    plain.width = W; plain.height = H;
    plain.getContext('2d').drawImage(src, 0, 0);
  }
  const img = sctx.getImageData(0, 0, W, H);
  const d = img.data;

  // key out the black ground + collect a coarse detail / coverage grid
  const G = 6; // css px per grid cell
  const gw = Math.ceil(w / G), gh = Math.ceil(h / G);
  const cov = new Float32Array(gw * gh), det = new Float32Array(gw * gh), cnt = new Float32Array(gw * gh);
  const lumPrev = new Float32Array(W);
  for (let y = 0; y < H; y++) {
    const gy = Math.min(gh - 1, Math.floor(y / dpr / G));
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const m = r > g ? (r > b ? r : b) : g > b ? g : b;
      const a = clamp((m - 9) / 26, 0, 1);
      d[i + 3] = a * 255;
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      if ((x & 1) === 0 && (y & 1) === 0) {
        const gi = gy * gw + Math.min(gw - 1, Math.floor(x / dpr / G));
        cov[gi] += a;
        det[gi] += Math.abs(lum - lumPrev[x]) + (x > 1 ? Math.abs(lum - lumPrev[x - 2]) : 0);
        cnt[gi]++;
      }
      lumPrev[x] = lum;
    }
  }
  sctx.putImageData(img, 0, 0);
  for (let i = 0; i < cov.length; i++) {
    if (cnt[i]) { cov[i] /= cnt[i]; det[i] /= cnt[i]; }
  }
  // summed-area tables for fast region queries
  const sat = (arr) => {
    const s = new Float64Array((gw + 1) * (gh + 1));
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      s[(y + 1) * (gw + 1) + x + 1] = arr[y * gw + x] + s[y * (gw + 1) + x + 1] + s[(y + 1) * (gw + 1) + x] - s[y * (gw + 1) + x];
    }
    return s;
  };
  const sCov = sat(cov), sDet = sat(det);
  const q = (s, x0, y0, x1, y1) => {
    const a = clamp(Math.floor(x0 / G), 0, gw), b = clamp(Math.floor(y0 / G), 0, gh);
    const c = clamp(Math.ceil(x1 / G), 0, gw), e = clamp(Math.ceil(y1 / G), 0, gh);
    const n = Math.max(1, (c - a) * (e - b));
    return (s[e * (gw + 1) + c] - s[b * (gw + 1) + c] - s[e * (gw + 1) + a] + s[b * (gw + 1) + a]) / n;
  };

  // quadtree: split the most "interesting" cells first until we hit the target
  const maxLeaf = Math.max(48, Math.min(96, Math.sqrt((w * h) / target) * 2.4));
  const minLeaf = Math.max(9, Math.sqrt((w * h) / target) * 0.42);
  let nodes = [];
  for (let y = 0; y < h; y += maxLeaf) for (let x = 0; x < w; x += maxLeaf) {
    nodes.push({ x, y, s: maxLeaf, sw: Math.min(maxLeaf, w - x), sh: Math.min(maxLeaf, h - y) });
  }
  const score = (n) => {
    const c = q(sCov, n.x, n.y, n.x + n.sw, n.y + n.sh);
    if (c < 0.03) return 0;
    const dd = q(sDet, n.x, n.y, n.x + n.sw, n.y + n.sh);
    return (0.35 + Math.min(1, dd / 26)) * (0.25 + c) * n.sw * n.sh * (0.7 + rnd() * 0.6);
  };
  nodes.forEach((n) => (n.score = score(n)));
  let guard = 0;
  while (nodes.length < target && guard++ < 20000) {
    let bi = -1, bs = 0;
    for (let i = 0; i < nodes.length; i++) if (nodes[i].s / 2 >= minLeaf && nodes[i].score > bs) { bs = nodes[i].score; bi = i; }
    if (bi < 0) break;
    const n = nodes[bi];
    const hs = n.s / 2;
    const kids = [];
    for (const [ox, oy] of [[0, 0], [hs, 0], [0, hs], [hs, hs]]) {
      if (ox >= n.sw || oy >= n.sh) continue;
      const k = { x: n.x + ox, y: n.y + oy, s: hs, sw: Math.min(hs, n.sw - ox), sh: Math.min(hs, n.sh - oy) };
      k.score = score(k);
      kids.push(k);
    }
    nodes.splice(bi, 1, ...kids);
  }
  const sites = nodes.map((n) => [n.x + n.sw * (0.18 + rnd() * 0.64), n.y + n.sh * (0.18 + rnd() * 0.64)]);
  const warp = makeWarp(seed + 3, tear);
  const polys = voronoi(sites, w, h).map((p) => (p && p.length > 2 ? tearEdges(p, w, h, tear, 3, warp) : null));
  const sprites = makeSprites(polys, src, d, { dpr, minCover: dual ? 0 : 0.05, source2: plain });
  src.width = 1; src.height = 1;
  if (plain) { plain.width = 1; plain.height = 1; }
  return sprites;
}

/* --------------------------------------------- name -> cream shards */

export function shatterRegion(source, { x, y, w, h, dpr, cell = 14, seed = 5 }) {
  const rnd = mulberry(seed);
  const sites = [];
  for (let yy = cell / 2; yy < h; yy += cell * 0.86) {
    for (let xx = cell / 2; xx < w; xx += cell) {
      sites.push([clamp(xx + (rnd() - 0.5) * cell * 0.9, 0.5, w - 0.5), clamp(yy + (rnd() - 0.5) * cell * 0.9, 0.5, h - 0.5)]);
    }
  }
  const nameWarp = makeWarp(seed + 9, 0.6);
  const polys = voronoi(sites, w, h).map((p) => (p && p.length > 2 ? tearEdges(p, w, h, 0.6, 2, nameWarp) : null));
  const sctx = source.getContext('2d', { willReadFrequently: true });
  const data = sctx.getImageData(0, 0, source.width, source.height).data;
  const res = makeSprites(polys, source, data, { dpr, ox: x * dpr, oy: y * dpr, minCover: 0.03, atlasW: 2048 });
  return res;
}
