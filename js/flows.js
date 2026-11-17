// The three workflows as illustrated compositions.
// Content and sequence come from the reference workflow slides; the drawing
// language comes from the botanical painting (see js/illustration/*).
import { C, DOMAIN } from './illustration/palette.js';
import { Pen, geo, smoothPath, hashString } from './illustration/brush.js';
import { renderScene } from './illustration/scenes.js';

/* ------------------------------------------------------------------ data */

export const FLOWS = {
  inventory: {
    view: [1600, 800],
    line: { y: 400, x0: 300, x1: 1570 },
    zones: [
      { label: 'Inbound', x: 160, y: 80 },
      { label: 'Inventory', x: 880, y: 80 },
      { label: 'Outbound', x: 1430, y: 80 },
    ],
    stems: [
      { x: 560, y0: 110, y1: 760, at: 560 },
      { x: 745, y0: 400, y1: 760, at: 745 },
      { x: 1265, y0: 110, y1: 760, at: 1265 },
    ],
    scenes: [
      { id: 'inv-receive', x: 150, y: 432, s: 0.92, at: 0 },
      { id: 'inv-inspect', x: 445, y: 668, s: 0.92, at: 600 },
      { id: 'inv-putaway', x: 680, y: 372, s: 0.86, at: 690 },
      { id: 'inv-count', x: 965, y: 372, s: 0.84, at: 900 },
      { id: 'inv-transfer', x: 1018, y: 632, s: 0.9, at: 800 },
      { id: 'inv-inquiry', x: 1040, y: 790, s: 0.8, at: 830 },
      { id: 'inv-pick', x: 1196, y: 560, s: 0.84, at: 1270 },
      { id: 'inv-issue', x: 1470, y: 790, s: 0.82, at: 1300 },
      { id: 'inv-ship', x: 1470, y: 372, s: 0.8, at: 1440 },
    ],
    nodes: [
      { x: 335, y: 400, label: 'Record receipt', at: 335 },
      { x: 700, y: 400, label: 'Put away', at: 700 },
      { x: 880, y: 400, label: 'Cycle count', at: 880 },
      { x: 1010, y: 400, label: 'PAR count', at: 1010 },
      { x: 1505, y: 400, label: 'Ship goods', at: 1505, anchor: 'middle' },
      { x: 560, y: 646, label: 'Inspect receipt', at: 600, side: 'right' },
      { x: 560, y: 692, label: 'Misc receipt', at: 620, side: 'right' },
      { x: 745, y: 556, label: 'Subinventory\ntransfer', at: 790, side: 'right' },
      { x: 745, y: 716, label: 'Stock inquiry', at: 820, side: 'right' },
      { x: 1265, y: 470, label: 'Pick confirm', at: 1280, side: 'right' },
      { x: 1265, y: 600, label: 'Misc issue', at: 1300, side: 'right' },
      { x: 1265, y: 646, label: 'Inter-org transfer', at: 1310, side: 'right' },
    ],
    arrows: [
      { pts: [[372, 452], [392, 514], [436, 546]], at: 370 },
      { pts: [[512, 548], [586, 470], [650, 452]], at: 640 },
      { pts: [[1050, 448], [1112, 452], [1146, 476]], at: 1040 },
      { pts: [[1310, 548], [1384, 576], [1448, 472]], at: 1380 },
    ],
  },

  quality: {
    view: [1600, 680],
    line: { y: 380, x0: 330, x1: 1570 },
    enclosure: { x: 48, y: 130, w: 250, h: 520, at: 0 },
    scenes: [
      { id: 'q-factory', x: 172, y: 292, s: 0.86, at: 0 },
      { id: 'q-van', x: 178, y: 546, s: 0.86, at: 0 },
      { id: 'q-plan', x: 488, y: 342, s: 0.92, at: 470 },
      { id: 'q-inspect', x: 700, y: 640, s: 0.92, at: 690 },
      { id: 'q-enter', x: 930, y: 342, s: 0.92, at: 920 },
      { id: 'q-scrap', x: 1062, y: 640, s: 0.92, at: 1130 },
      { id: 'q-analyse', x: 1356, y: 196, s: 0.88, at: 1340 },
      { id: 'q-ship', x: 1492, y: 342, s: 0.86, at: 1480 },
    ],
    stems: [
      { x: 1130, y0: 380, y1: 586, at: 1130, down: true },
      { x: 1356, y0: 214, y1: 380, at: 1340, up: true },
    ],
    nodes: [
      { x: 488, y: 380, label: 'Create inspection plans', at: 488, anchor: 'middle' },
      { x: 700, y: 380, label: 'Inspect items', at: 700, anchor: 'middle' },
      { x: 930, y: 380, label: 'Enter results', at: 930, anchor: 'middle' },
      { x: 1130, y: 586, label: 'Scrap goods', at: 1150, side: 'right' },
      { x: 1356, y: 214, label: 'Analyse results', at: 1356, side: 'left' },
      { x: 1500, y: 380, label: 'Ship items\nwith CoA', at: 1500, anchor: 'middle' },
    ],
    texts: [
      { x: 172, y: 334, label: 'Manufactured items', anchor: 'middle', at: 0 },
      { x: 172, y: 594, label: 'Purchased items', anchor: 'middle', at: 0 },
    ],
    badges: [
      { x: 1160, y: 452, kind: 'fail', label: 'Fail', at: 1130 },
      { x: 1214, y: 340, kind: 'pass', label: 'Pass', at: 1190 },
    ],
    arrows: [],
  },

  costing: {
    view: [1600, 820],
    line: { y: 430, x0: 80, x1: 1570 },
    scenes: [
      { id: 'c-purchase', x: 226, y: 400, s: 0.86, at: 120 },
      { id: 'c-invoice', x: 222, y: 210, s: 0.9, at: 150 },
      { id: 'c-storage', x: 610, y: 400, s: 0.8, at: 600 },
      { id: 'c-manufacture', x: 470, y: 760, s: 0.86, at: 640 },
      { id: 'c-total', x: 912, y: 400, s: 0.9, at: 900 },
      { id: 'c-onhand', x: 1120, y: 730, s: 0.86, at: 1110 },
      { id: 'c-cogs', x: 1345, y: 400, s: 0.92, at: 1340 },
      { id: 'c-margins', x: 1522, y: 400, s: 0.86, at: 1520 },
    ],
    stems: [
      { x: 110, y0: 186, y1: 430, at: 110, up: true },
      { x: 610, y0: 430, y1: 700, at: 610, down: true, arrowUp: true },
      { x: 1345, y0: 430, y1: 690, at: 1345, down: true, elbowTo: 1236 },
    ],
    nodes: [
      { x: 226, y: 430, label: 'Purchased goods', at: 226, anchor: 'middle' },
      { x: 110, y: 186, label: '', at: 130 },
      { x: 610, y: 430, label: 'Goods in inventory', at: 610, anchor: 'end', dx: -16 },
      { x: 610, y: 700, label: 'Manufactured goods', at: 640, side: 'right' },
      { x: 912, y: 430, label: 'Total item cost', at: 912, anchor: 'middle' },
      { x: 1120, y: 430, label: 'On-hand\ninventory value', at: 1120, anchor: 'middle' },
      { x: 1345, y: 430, label: 'Value of\ngoods sold', at: 1345, anchor: 'end', dx: -14 },
      { x: 1522, y: 430, label: 'Analyse cost\nmargins', at: 1522, anchor: 'middle' },
    ],
    texts: [
      { x: 300, y: 150, label: 'Match supplier invoice\nwith goods receipt', anchor: 'start', at: 150, cls: 'lbl' },
      { x: 120, y: 540, label: 'Purchase price\n+ freight, insurance & duties', anchor: 'start', at: 226, cls: 'formula' },
      { x: 652, y: 548, label: 'Material cost\n+ labour & machine cost\n+ factory overhead', anchor: 'start', at: 640, cls: 'formula' },
      { x: 1362, y: 600, label: 'Update inventory\nvalue', anchor: 'start', at: 1360, cls: 'lbl' },
    ],
    coins: [
      { x: 98, y: 568, at: 226 },
      { x: 880, y: 596, at: 640 },
    ],
    arrows: [],
  },
};

export const STEPS = {
  inventory: [
    { scene: 'inv-receive', labels: ['Inbound', 'Record receipt'] },
    { scene: 'inv-inspect', labels: ['Inspect receipt', 'Misc receipt'], branch: true },
    { scene: 'inv-putaway', labels: ['Inventory', 'Put away'] },
    { scene: 'inv-count', labels: ['Cycle count', 'PAR count'] },
    { scene: 'inv-transfer', labels: ['Subinventory transfer'], branch: true },
    { scene: 'inv-inquiry', labels: ['Stock inquiry'], branch: true },
    { scene: 'inv-pick', labels: ['Outbound', 'Pick confirm'] },
    { scene: 'inv-issue', labels: ['Misc issue', 'Inter-org transfer'], branch: true },
    { scene: 'inv-ship', labels: ['Ship goods'] },
  ],
  quality: [
    { scene: 'q-factory', labels: ['Manufactured items'] },
    { scene: 'q-van', labels: ['Purchased items'] },
    { scene: 'q-plan', labels: ['Create inspection plans'] },
    { scene: 'q-inspect', labels: ['Inspect items'] },
    { scene: 'q-enter', labels: ['Enter results'] },
    { scene: 'q-scrap', labels: ['Fail', 'Scrap goods'], branch: true },
    { scene: 'q-analyse', labels: ['Pass', 'Analyse results'] },
    { scene: 'q-ship', labels: ['Ship items with CoA'] },
  ],
  costing: [
    { scene: 'c-purchase', labels: ['Purchased goods', 'Price + freight, insurance & duties'] },
    { scene: 'c-invoice', labels: ['Match supplier invoice with goods receipt'], branch: true },
    { scene: 'c-manufacture', labels: ['Manufactured goods', 'Material + labour & machine + overhead'], branch: true },
    { scene: 'c-storage', labels: ['Goods in inventory'] },
    { scene: 'c-total', labels: ['Total item cost'] },
    { scene: 'c-onhand', labels: ['On-hand inventory value'] },
    { scene: 'c-cogs', labels: ['Value of goods sold', 'Update inventory value'] },
    { scene: 'c-margins', labels: ['Analyse cost margins'] },
  ],
};

/* ------------------------------------------------------------- helpers */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function textBlock(x, y, label, { anchor = 'start', cls = 'lbl', lh = 1.22, dataAt } = {}) {
  const lines = label.split('\n');
  const tspans = lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}em">${esc(l)}</tspan>`).join('');
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}"${dataAt != null ? ` data-at="${dataAt}"` : ''}>${tspans}</text>`;
}

function nodeMark(p, x, y, dom, at) {
  // a tiny daisy: the painting's flower as a step marker
  return `<g class="node-dot" data-at="${at}">${p.daisy(x, y, { r: 8.5, petals: 7, fill: dom.soft, centre: dom.main, ink: dom.deep })}</g>`;
}

function leafPair(p, x, y, dom, at, up = true) {
  const s = up ? -1 : 1;
  const a = p.shape(geo.leaf(x, y, x - 14, y + s * 16, 0.5, 7), { fill: C.leaf, ink: C.leafDeep, inkWidth: 0.8, amp: 0.25, hatch: { angle: 50, gap: 3, color: '#fff', width: 0.5, opacity: 0.45 } });
  const b = p.shape(geo.leaf(x + 2, y, x + 16, y + s * 12, 0.5, 7), { fill: C.cyan, ink: C.tealDeep, inkWidth: 0.8, amp: 0.25 });
  return `<g class="leaflet" data-at="${at}">${a}${b}</g>`;
}

function chalkDash(p, x0, y0, x1, y1, color = C.graphite, width = 1.4) {
  const pts = p.wobble([[x0, y0], [x1, y1]], { closed: false, amp: 1.2, step: 12, jit: 0 });
  return `<path d="${smoothPath(pts, false)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="5 7" stroke-linecap="round" opacity="0.6"/>`;
}

function arrowHead(p, x, y, angle, color, size = 9) {
  const a1 = angle + Math.PI * 0.82, a2 = angle - Math.PI * 0.82;
  return p.brush([[x + Math.cos(a1) * size, y + Math.sin(a1) * size], [x, y], [x + Math.cos(a2) * size, y + Math.sin(a2) * size]], { color, w0: 2, w1: 1.6, amp: 0.15, per: 2 });
}

/* ------------------------------------------------------ desktop render */

export function renderDesktop(key) {
  const F = FLOWS[key];
  const dom = DOMAIN[key];
  const p = new Pen(hashString('flow-' + key));
  const [W, H] = F.view;
  const { y: ly, x0, x1 } = F.line;
  let back = '', mid = '', front = '';
  const id = `fl-${key}`;

  // dashed stems (branches / zone dividers)
  (F.stems ?? []).forEach((st, i) => {
    let d = chalkDash(p, st.x, st.y0, st.x, st.y1, dom.main, 1.6);
    if (st.elbowTo) {
      d += chalkDash(p, st.x, st.y1, st.elbowTo, st.y1, dom.main, 1.6);
      d += arrowHead(p, st.elbowTo, st.y1, Math.PI, dom.main);
    }
    if (st.arrowUp) d += arrowHead(p, st.x, ly + 14, -Math.PI / 2, dom.main);
    back += `<g class="stem-wrap" clip-path="url(#${id}-c${i})">${d}</g>`;
  });

  // zones
  (F.zones ?? []).forEach((z) => (mid += textBlock(z.x, z.y, z.label, { anchor: 'middle', cls: 'zone', dataAt: x0 })));

  // enclosure (quality: where items come from)
  if (F.enclosure) {
    const e = F.enclosure;
    const pts = geo.roundRect(e.x, e.y, e.w, e.h, 36);
    const line = p.wobble(pts, { amp: 2.2, step: 14 });
    back += `<path class="enclosure" d="${smoothPath(line, true)}" fill="none" stroke="${C.graphite}" stroke-width="1.4" stroke-dasharray="4 7" stroke-linecap="round" opacity="0.65"/>`;
    back += chalkDash(p, e.x + 50, e.y + e.h * 0.5, e.x + e.w - 50, e.y + e.h * 0.5, C.graphite, 1.2);
  }

  // main stem: a painted line with a soft under-stroke
  const stemPts = [];
  for (let x = x0; x <= x1; x += 40) stemPts.push([x, ly]);
  if (stemPts[stemPts.length - 1][0] !== x1) stemPts.push([x1, ly]);
  const stem = p.brush(stemPts, { color: dom.main, w0: 3.4, w1: 2.6, swell: 0.05, amp: 1.1, per: 4 });
  const under = p.brush(stemPts.map(([x, y]) => [x + 1.5, y + 2.2]), { color: dom.soft, w0: 2.2, w1: 1.6, swell: 0, amp: 1.4, per: 4, opacity: 0.55 });
  const head = arrowHead(p, x1 + 2, ly, 0, dom.main, 11);
  back += `<g class="main-stem" clip-path="url(#${id}-main)">${under}${stem}${head}</g>`;

  // leaves sprouting along the stem near nodes
  (F.nodes ?? []).filter((n) => n.y === ly).forEach((n, i) => {
    back += leafPair(p, n.x + 26, ly - 2, dom, n.at + 20, i % 2 === 0);
  });

  // arrows between scenes
  (F.arrows ?? []).forEach((a) => {
    const [pa, pb] = [a.pts[a.pts.length - 2], a.pts[a.pts.length - 1]];
    const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
    mid += `<g class="leaflet" data-at="${a.at}">${p.brush(a.pts, { color: C.graphite, w0: 1.8, w1: 1.2, amp: 0.4, opacity: 0.7 })}${arrowHead(p, pb[0], pb[1], ang, C.graphite, 8)}</g>`;
  });

  // scenes
  F.scenes.forEach((s) => {
    mid += `<g class="scene-slot" data-at="${s.at}">${renderScene(s.id, { x: s.x, y: s.y, s: s.s, label: sceneLabel(key, s.id) })}</g>`;
  });

  // coins (costing formulas)
  (F.coins ?? []).forEach((c) => {
    mid += `<g class="leaflet" data-at="${c.at}">${coinCluster(p, c.x, c.y)}</g>`;
  });

  // badges
  (F.badges ?? []).forEach((b) => {
    const art = badgeArt(p, b.x, b.y, b.kind);
    front += `<g class="leaflet" data-at="${b.at}">${art}${textBlock(b.x + 20, b.y + 6, b.label, { cls: 'lbl is-in' })}</g>`;
  });

  // nodes + labels
  (F.nodes ?? []).forEach((n) => {
    front += nodeMark(p, n.x, n.y, dom, n.at);
    if (!n.label) return;
    let tx = n.x, ty = n.y, anchor = n.anchor ?? 'start';
    if (n.side === 'right') { tx = n.x + 18; ty = n.y + 6; anchor = 'start'; }
    else if (n.side === 'left') { tx = n.x - 18; ty = n.y + 6; anchor = 'end'; }
    else { tx = n.x + (n.dx ?? (anchor === 'start' ? -4 : 0)); ty = n.y + 40; }
    front += textBlock(tx, ty, n.label, { anchor, dataAt: n.at });
  });
  (F.texts ?? []).forEach((t) => (front += textBlock(t.x, t.y, t.label, { anchor: t.anchor, cls: t.cls ?? 'lbl', dataAt: t.at })));

  // clip paths that grow with progress
  let defs = `<clipPath id="${id}-main"><rect class="clip-main" x="${x0 - 20}" y="${ly - 40}" width="0" height="80"/></clipPath>`;
  (F.stems ?? []).forEach((st, i) => {
    defs += `<clipPath id="${id}-c${i}"><rect class="clip-stem" data-i="${i}" x="${st.x - 30}" y="${ly}" width="${(st.elbowTo ? Math.abs(st.x - st.elbowTo) : 0) + 60 + (st.elbowTo ? 0 : 0)}" height="0"/></clipPath>`;
  });

  const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="false" focusable="false"><defs>${defs}</defs>${back}${mid}${front}</svg>`;
  return { svg, entry: [x0, ly], exit: [x1 + 6, ly], view: F.view, mode: 'desktop' };
}

function coinCluster(p, x, y) {
  let s = '';
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 3 - k; i++) {
      s += p.shape(geo.ellipse(x + k * 20, y - i * 3.6 - 3, 9, 3.4, 14), { fill: i === 2 - k ? C.saffron : C.marigold, ink: C.ochreDeep, inkWidth: 1, amp: 0.25 });
    }
  }
  return s;
}

function badgeArt(p, cx, cy, kind) {
  const r = 12;
  const fill = kind === 'pass' ? C.leaf : C.vermilion;
  let s = p.shape(geo.ellipse(cx, cy, r, r, 14), { fill, ink: kind === 'pass' ? C.leafDeep : C.oxblood, amp: 0.6 });
  if (kind === 'pass') s += `<path d="M${cx - 5} ${cy + 0.5}l3.6 4 6.8-8.4" fill="none" stroke="${C.paper}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  else s += `<path d="M${cx - 4.5} ${cy - 4.5}l9 9M${cx + 4.5} ${cy - 4.5}l-9 9" stroke="${C.paper}" stroke-width="2.6" stroke-linecap="round"/>`;
  return s;
}

/* ------------------------------------------------------- mobile render */

export function renderMobile(key, measureHost) {
  const steps = STEPS[key];
  const dom = DOMAIN[key];
  const p = new Pen(hashString('flow-m-' + key));
  const W = 400;
  const stemX = 18;
  // measure scenes once
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  probe.setAttribute('width', '400');
  probe.setAttribute('height', '400');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
  measureHost.appendChild(probe);
  const boxes = steps.map((st) => {
    probe.innerHTML = renderScene(st.scene, {});
    const b = probe.querySelector('.scene').getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  probe.remove();

  let y = 26;
  let mid = '', front = '', back = '';
  const marks = [];
  steps.forEach((st, i) => {
    const b = boxes[i];
    const nx = st.branch ? stemX + 30 : stemX;
    const ny = y;
    if (st.branch) back += `<g class="leaflet" data-at="${ny}">${chalkDash(p, stemX, ny, nx, ny, dom.main, 1.6)}</g>`;
    front += nodeMark(p, nx, ny, dom, ny);
    st.labels.forEach((l, k) => {
      front += textBlock(nx + 20, ny + 7 + k * 25, l, { anchor: 'start', cls: k === 0 && ['Inbound', 'Inventory', 'Outbound', 'Pass', 'Fail'].includes(l) ? 'lbl zone-m' : 'lbl', dataAt: ny });
    });
    const labelsH = st.labels.length * 25 + 16;
    const avail = W - 70;
    const sc = Math.min(1.05, avail / b.w);
    const sx = 60 + (avail - b.w * sc) / 2 - b.x * sc;
    const sy = ny + labelsH - b.y * sc;
    mid += `<g class="scene-slot" data-at="${ny + 10}">${renderScene(st.scene, { x: sx, y: sy, s: sc, label: sceneLabel(key, st.scene) })}</g>`;
    marks.push(ny);
    y = ny + labelsH + b.h * sc + 46;
  });
  const H = y;
  const stemPts = [];
  for (let yy = 0; yy <= H - 20; yy += 40) stemPts.push([stemX, yy]);
  const stem = p.brush(stemPts, { color: dom.main, w0: 3.2, w1: 2.4, amp: 1, per: 4 });
  back = `<g class="main-stem" clip-path="url(#flm-${key}-main)">${stem}</g>` + back;
  marks.forEach((m, i) => (back += leafPair(p, stemX + 2, m + 60, dom, m + 40, i % 2 === 1)));
  const defs = `<clipPath id="flm-${key}-main"><rect class="clip-main-v" x="0" y="-10" width="${W}" height="0"/></clipPath>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="false" focusable="false"><defs>${defs}</defs>${back}${mid}${front}</svg>`;
  return { svg, entry: [stemX, 0], exit: [stemX, H - 20], view: [W, H], mode: 'mobile' };
}

/* ------------------------------------------------- accessible labels */

const LABELS = {
  'inv-receive': 'A truck unloads boxes at the dock while a worker scans the pallet to record the receipt',
  'inv-inspect': 'A worker kneels among delivered boxes, checking them on a tablet',
  'inv-putaway': 'A worker on a ladder puts a box away on tall pallet racking',
  'inv-count': 'A worker scans shelves while counted boxes are numbered one by one',
  'inv-transfer': 'A forklift lifts a pallet to move it to another subinventory',
  'inv-inquiry': 'A worker checks stock levels for a shelf on a tablet',
  'inv-pick': 'A worker carries a picked box away from the racking',
  'inv-issue': 'A worker pushes a hand truck of boxes out to another organisation',
  'inv-ship': 'A worker loads goods into a truck for shipping',
  'q-factory': 'A factory producing manufactured items',
  'q-van': 'A delivery van bringing purchased items',
  'q-plan': 'An inspection plan on a clipboard: checklist and specification drawing',
  'q-inspect': 'An inspector measures a part with a caliper, a magnifier showing the detail',
  'q-enter': 'An operator enters inspection results into a spreadsheet at a workstation',
  'q-analyse': 'A monitor showing a quality trend chart with control limits',
  'q-scrap': 'Rejected parts thrown into a scrap bin',
  'q-ship': 'A truck ships accepted goods with a certificate of conformance',
  'c-purchase': 'A truck delivers purchased goods, with the cost in coins beside it',
  'c-invoice': 'A supplier invoice matched against a goods receipt',
  'c-storage': 'A storehouse holding raw materials and finished goods',
  'c-manufacture': 'A machine and conveyor producing manufactured goods',
  'c-total': 'A calculator and an open box: the total cost of an item',
  'c-onhand': 'A depot holding on-hand stock, valued in coins',
  'c-cogs': 'A van delivering sold goods, with banknotes for their value',
  'c-margins': 'A monitor showing cost margins as bars with a trend line',
};
function sceneLabel(_key, id) {
  return LABELS[id] ?? '';
}
