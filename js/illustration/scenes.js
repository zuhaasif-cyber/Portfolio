// One illustrated scene per workflow step, composed from the kit.
// Local coordinates: (0,0) is the ground at the scene's centre; up is negative y.
// Each scene returns markup whose top-level <g class="pc"> pieces reveal in order.
import { C } from './palette.js';
import { Pen, geo, hashString } from './brush.js';
import {
  box, stack, person, truck, van, forklift, trolley, rack, ladder, storehouse, depot,
  factory, conveyor, desk, chair, monitor, plant, clipboard, paper, badge, certificate,
  magnifier, caliper, bin, coins, banknote, calculator, openBox, sprig, tf,
} from './kit.js';

const motion = (p, x, y, n = 3, len = 26, color = C.graphite) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += p.brush([[x, y + i * 9], [x - len + i * 5, y + i * 9 + p.rand(-1, 1)]], { color, w0: 1.6, w1: 0.3, amp: 0.3, opacity: 0.55 });
  }
  return `<g class="whoosh">${s}</g>`;
};

export const SCENES = {
  /* ============================ INVENTORY ============================ */

  'inv-receive'(p) {
    let s = '';
    let cargo = '';
    for (let c = 0; c < 6; c++) for (let r = 0; r < 3; r++) {
      if (c > 3 && r === 2) continue;
      cargo += box(p, 6 + c * 20, -26 - r * 19, 18, 17, { tape: false });
    }
    s += p.group(truck(p, 46, 0, { flip: true, open: true, cargo, body: C.ice, cab: C.teal }), { cls: 'drive' });
    s += p.group(stack(p, 64, 0, { cols: 3, rows: 2, size: 18, stampEvery: 4 }));
    const w = person(p, 150, 0, { pose: 'scan', facing: -1, jacket: C.vermilion, pants: C.aubergine, vest: C.saffron, cap: C.saffron });
    const beam = `<g class="beam"><path d="M${w.hand[0] - 4} ${w.hand[1] - 1}L${w.hand[0] - 44} ${w.hand[1] + 8}M${w.hand[0] - 4} ${w.hand[1] - 1}L${w.hand[0] - 42} ${w.hand[1] - 10}" stroke="${C.saffron}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2 3"/></g>`;
    const scanner = p.shape(geo.rect(w.hand[0] - 6, w.hand[1] - 4, 9, 5), { fill: C.black, amp: 0.2, inkWidth: 0.9, grain: 'none' });
    s += p.group(w.svg + scanner + beam, { cls: 'worker' });
    return s;
  },

  'inv-inspect'(p) {
    let s = '';
    let left = '';
    left += box(p, -78, 0, 26, 24, { stamp: true });
    left += box(p, -50, 0, 24, 22);
    left += box(p, -66, -23, 24, 22);
    left += box(p, -88, -24, 18, 18);
    left += box(p, -60, -44, 20, 18);
    s += p.group(p.shadow(-52, 1, 40, 3.5) + left);
    let right = box(p, 36, 0, 28, 24) + box(p, 46, -24, 20, 18, { stamp: true }) + box(p, 64, 0, 18, 15);
    s += p.group(p.shadow(52, 1, 26, 3) + right);
    const w = person(p, 2, 0, { pose: 'kneel', facing: -1, jacket: C.teal, pants: C.periwinkle, bun: true });
    const tab = p.shape(geo.roundRect(w.hand[0] - 9, w.hand[1] - 12, 11, 14, 1.6), { fill: C.black, ink: C.tealDeep, inkWidth: 1, amp: 0.2, grain: 'none' }) +
      p.shape(geo.rect(w.hand[0] - 7.5, w.hand[1] - 10.5, 8, 10), { fill: C.ice, outline: false, grain: 'none', amp: 0.1, cls: 'glow' });
    s += p.group(w.svg + tab, { cls: 'worker' });
    s += p.group(badge(p, -30, -86, 'pass', 10), { cls: 'pop' });
    return s;
  },

  'inv-putaway'(p) {
    let s = '';
    s += p.group(rack(p, -78, 0, { w: 118, h: 176, levels: 4 }));
    s += p.group(ladder(p, 70, 0, 50, -128));
    const w = person(p, 66, -58, { pose: 'reach', facing: -1, jacket: C.leaf, pants: C.aubergine, cap: C.saffron, shadow: false });
    const held = `<g class="lift-box">${box(p, w.hand[0] - 14, w.hand[1] + 2, 20, 16, { stamp: true })}</g>`;
    s += p.group(w.svg + held, { cls: 'worker' });
    return s;
  },

  'inv-count'(p) {
    let s = '';
    s += p.group(rack(p, -96, 0, { w: 132, h: 128, levels: 3, upright: C.aqua, beam: C.apricot }));
    let marks = '';
    [[-74, -96], [-40, -96], [-6, -96], [-60, -54], [-22, -54]].forEach(([mx, my], i) => {
      marks += `<g class="count" style="--c:${i}">${p.shape(geo.ellipse(mx, my - 26, 7, 7, 12), { fill: C.saffron, ink: C.ochreDeep, inkWidth: 1, amp: 0.3 })}<text x="${mx}" y="${my - 23}" text-anchor="middle" class="count-n" fill="${C.oxblood}">${i + 1}</text></g>`;
    });
    s += p.group(marks);
    const w = person(p, 72, 0, { pose: 'scan', facing: -1, jacket: C.violet, pants: C.tealDeep, hair: C.oxblood, bun: true });
    const scanner = p.shape(geo.rect(w.hand[0] - 6, w.hand[1] - 4, 9, 5), { fill: C.black, amp: 0.2, inkWidth: 0.9, grain: 'none' });
    const beam = `<g class="beam"><path d="M${w.hand[0] - 5} ${w.hand[1] - 2}L${w.hand[0] - 36} ${w.hand[1] - 30}M${w.hand[0] - 5} ${w.hand[1] - 2}L${w.hand[0] - 40} ${w.hand[1] - 12}" stroke="${C.saffron}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2 3"/></g>`;
    s += p.group(w.svg + scanner + beam, { cls: 'worker' });
    return s;
  },

  'inv-transfer'(p) {
    let s = '';
    const zone = p.outline(geo.rect(40, -6, 70, 10), { ink: C.saffron, width: 1.6, amp: 0.4 });
    s += p.group(`<g opacity="0.9" stroke-dasharray="4 4">${zone}</g>`);
    s += p.group(motion(p, -70, -60, 3, 28));
    s += p.group(forklift(p, -64, 0, { jacket: C.teal }), { cls: 'drive' });
    return s;
  },

  'inv-inquiry'(p) {
    let s = '';
    s += p.group(rack(p, -74, 0, { w: 82, h: 96, levels: 2, upright: C.plum, beam: C.saffron }));
    const w = person(p, 44, 0, { pose: 'hold', facing: -1, jacket: C.apricot, pants: C.tealDeep, hair: C.black });
    const tab = p.shape(geo.roundRect(w.hand[0] - 12, w.hand[1] - 14, 13, 17, 2), { fill: C.black, ink: C.tealDeep, inkWidth: 1, amp: 0.2, grain: 'none' }) +
      p.shape(geo.rect(w.hand[0] - 10.5, w.hand[1] - 12.5, 10, 13), { fill: C.ice, outline: false, grain: 'none', amp: 0.1 });
    s += p.group(w.svg + tab, { cls: 'worker' });
    s += p.group(magnifier(p, 6, -112, 13, p.shape(geo.rect(0, -117, 12, 10), { fill: C.apricot, amp: 0.3, inkWidth: 0.9 })), { cls: 'pop float' });
    return s;
  },

  'inv-pick'(p) {
    let s = '';
    s += p.group(rack(p, -92, 0, { w: 66, h: 112, levels: 3, upright: C.teal, beam: C.vermilion }));
    const w = person(p, 22, 0, { pose: 'carry', facing: 1, jacket: C.cyan, pants: C.aubergine, cap: C.vermilion });
    const held = box(p, w.hand[0] - 10, w.hand[1] + 6, 22, 18, { stamp: true });
    s += p.group(`<g class="bob">${w.svg}${held}</g>`, { cls: 'worker' });
    s += p.group(badge(p, 58, -96, 'pass', 9), { cls: 'pop' });
    return s;
  },

  'inv-issue'(p) {
    let s = '';
    const w = person(p, -30, 0, { pose: 'push', facing: 1, jacket: C.rose, pants: C.tealDeep, hair: C.black, bun: true });
    s += p.group(`<g class="bob">${w.svg}</g>`, { cls: 'worker' });
    s += p.group(trolley(p, 4, 0, { boxes: 3 }), { cls: 'drive' });
    s += p.group(motion(p, -58, -50, 3, 22));
    // the transfer: an arrow loop out to another site
    const arrow = p.brush([[44, -60], [70, -84], [96, -70]], { color: C.vermilion, w0: 2.2, w1: 1.2, amp: 0.3 }) +
      p.brush([[88, -78], [97, -70], [86, -64]], { color: C.vermilion, w0: 2, w1: 1.4, amp: 0.2 });
    s += p.group(arrow, { cls: 'pop' });
    return s;
  },

  'inv-ship'(p) {
    let s = '';
    let cargo = '';
    for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) {
      if (c === 0 && r === 2) continue;
      cargo += box(p, 6 + c * 22, -26 - r * 19, 20, 17, { tape: false, stamp: (c + r) % 4 === 0 });
    }
    s += p.group(truck(p, -60, 0, { open: true, cargo, body: C.blush, cab: C.vermilion }), { cls: 'drive' });
    const w = person(p, -112, 0, { pose: 'push', facing: 1, jacket: C.teal, pants: C.aubergine, cap: C.saffron, vest: C.saffron });
    s += p.group(w.svg, { cls: 'worker' });
    s += p.group(stack(p, -88, 0, { cols: 1, rows: 2, size: 18, pal: true }));
    return s;
  },

  /* ============================= QUALITY ============================= */

  'q-factory'(p) {
    let s = '';
    s += p.group(factory(p, -62, 0));
    s += p.group(stack(p, 66, 0, { cols: 2, rows: 1, size: 16, stampEvery: 2 }));
    return s;
  },

  'q-van'(p) {
    let s = '';
    s += p.group(van(p, -32, 0, { open: true, body: C.aqua, mark: p.daisy(40, -36, { r: 9, petals: 8, fill: C.saffron, centre: C.vermilion }) }), { cls: 'drive' });
    const w = person(p, -62, 0, { pose: 'carry', facing: -1, jacket: C.saffron, pants: C.aubergine, hair: C.black, s: 0.9 });
    s += p.group(w.svg + box(p, w.hand[0] - 12, w.hand[1] + 5, 18, 15), { cls: 'worker' });
    return s;
  },

  'q-plan'(p) {
    let s = '';
    s += p.group(`<g transform="rotate(-6)">${clipboard(p, -34, 0, { w: 70, h: 92 })}</g>`);
    s += p.group(sprig(p, 48, 0, { h: 30, color: C.cyan }));
    return s;
  },

  'q-inspect'(p) {
    let s = '';
    s += p.group(p.shadow(16, 1, 52, 3.5) + p.shape(geo.rect(-28, -46, 104, 6), { fill: C.cocoa, amp: 0.4 }) +
      p.brush([[-22, -40], [-24, 0]], { color: C.oxblood, w0: 2.8, w1: 2.4, amp: 0.3 }) +
      p.brush([[70, -40], [72, 0]], { color: C.oxblood, w0: 2.8, w1: 2.4, amp: 0.3 }));
    s += p.group(box(p, 4, -46, 22, 16, { fill: C.saffron }) + caliper(p, 0, -66, 40));
    const w = person(p, -54, 0, { pose: 'inspect', facing: 1, jacket: C.ice, pants: C.tealDeep, cap: C.teal, s: 1.05 });
    s += p.group(w.svg, { cls: 'worker' });
    const inner = p.shape(geo.rect(70, -112, 22, 16), { fill: C.saffron, amp: 0.4, inkWidth: 1.1 }) +
      `<path d="M73 -94h16" stroke="${C.vermilion}" stroke-width="1.2"/>` +
      p.stipple(geo.rect(72, -110, 18, 12), { n: 8, color: C.ochreDeep, r0: 0.4, r1: 0.9 });
    s += p.group(`<g class="sway">${magnifier(p, 81, -104, 22, inner)}</g>`, { cls: 'pop' });
    return s;
  },

  'q-enter'(p) {
    let s = '';
    s += p.group(chair(p, -44, 0));
    const w = person(p, -44, 0, { pose: 'sit', facing: 1, jacket: C.violet, pants: C.tealDeep, hair: C.black, bun: true });
    s += p.group(w.svg, { cls: 'worker' });
    s += p.group(desk(p, -16, 0, 104));
    s += p.group(monitor(p, 22, -54, 58, 42, { kind: 'sheet', standH: 9 }) +
      p.shape(geo.roundRect(-6, -44, 32, 4, 1.5), { fill: C.black, amp: 0.2, inkWidth: 0.8, grain: 'none' }));
    s += p.group(plant(p, 76, -40, { leaves: 5 }));
    return s;
  },

  'q-analyse'(p) {
    let s = '';
    s += p.group(p.shadow(0, 1, 30, 3) + monitor(p, -52, -26, 104, 74, { kind: 'control', standH: 22 }));
    return s;
  },

  'q-scrap'(p) {
    let s = '';
    s += p.group(bin(p, -26, 0), { cls: 'shake' });
    s += p.group(`<g class="drop">${p.shape([[30, -92], [42, -98], [44, -86], [32, -82]], { fill: C.vermilion, amp: 0.3, inkWidth: 1 })}</g>`);
    return s;
  },

  'q-ship'(p) {
    let s = '';
    s += p.group(truck(p, -86, 0, { s: 0.8, body: C.periwinkle, cab: C.vermilion, stampFill: C.blush }), { cls: 'drive' });
    s += p.group(`<g class="float">${certificate(p, 52, -64, { w: 52, h: 64 })}</g>`, { cls: 'pop' });
    return s;
  },

  /* ============================= COSTING ============================= */

  'c-purchase'(p) {
    let s = '';
    s += p.group(truck(p, -96, 0, { s: 0.92, body: C.saffron, cab: C.teal, stampFill: C.vermilion }), { cls: 'drive' });
    s += p.group(coins(p, 104, 0, 4) + coins(p, 86, 0, 2), { cls: 'pop' });
    return s;
  },

  'c-invoice'(p) {
    let s = '';
    let a = paper(p, -46, 0, 54, 66, { fill: C.paper, ink: C.teal, lines: 4, top: 24 });
    a += `<text x="-38" y="-48" class="doc-head" fill="${C.teal}">$</text>`;
    s += p.group(`<g transform="rotate(-7 -20 -30)">${a}</g>`);
    let b = paper(p, -2, 6, 54, 66, { fill: C.blush, ink: C.teal, lines: 4, top: 26 });
    b += box(p, 6, -42, 14, 12, { tape: false });
    s += p.group(`<g transform="rotate(5 24 -26)">${b}</g>`);
    s += p.group(badge(p, 50, -70, 'pass', 12), { cls: 'pop' });
    return s;
  },

  'c-storage'(p) {
    return p.group(storehouse(p, -88, 0));
  },

  'c-manufacture'(p) {
    return p.group(conveyor(p, -86, 0, { w: 170 }));
  },

  'c-total'(p) {
    let s = '';
    s += p.group(p.shadow(-34, 1, 26, 3) + `<g transform="rotate(-6 -34 -30)">${calculator(p, -56, 0)}</g>`);
    s += p.group(openBox(p, -2, 0, 58, 40));
    s += p.group(coins(p, 76, 0, 3), { cls: 'pop' });
    return s;
  },

  'c-onhand'(p) {
    let s = '';
    s += p.group(depot(p, -70, 0));
    s += p.group(coins(p, 70, 0, 5) + coins(p, 88, 0, 3) + coins(p, 79, -18, 2), { cls: 'pop' });
    return s;
  },

  'c-cogs'(p) {
    let s = '';
    s += p.group(van(p, -24, 0, { open: true, body: C.periwinkle, flip: false }), { cls: 'drive' });
    const w = person(p, -50, 0, { pose: 'carry', facing: -1, jacket: C.leaf, pants: C.aubergine, cap: C.vermilion, s: 0.95 });
    s += p.group(w.svg + box(p, w.hand[0] - 12, w.hand[1] + 6, 20, 16, { stamp: true }), { cls: 'worker' });
    s += p.group(`<g class="float">${banknote(p, 36, -96, -10)}${banknote(p, 58, -84, 8)}</g>`, { cls: 'pop' });
    return s;
  },

  'c-margins'(p) {
    let s = '';
    s += p.group(p.shadow(0, 1, 30, 3) + monitor(p, -54, -26, 108, 76, { kind: 'margin', frame: C.leafDeep, screen: C.paper, standH: 22 }));
    s += p.group(coins(p, 70, 0, 3), { cls: 'pop' });
    return s;
  },
};

// Render one scene to an SVG <g>. Seeds come from the scene id so drawings are stable.
export function renderScene(id, { x = 0, y = 0, s = 1, label = '' } = {}) {
  const p = new Pen(hashString(id));
  const inner = SCENES[id](p);
  return `<g class="scene" data-scene="${id}" transform="${tf(x, y, s)}" role="img" aria-label="${label}"><g class="scene__art">${inner}</g></g>`;
}
