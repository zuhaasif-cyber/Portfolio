import { sharedDefs, Pen, geo, smoothPath } from './illustration/brush.js';
import { DOMAIN } from './illustration/palette.js';
import { initHero } from './hero/hero.js';
import { initJourney } from './journey.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// shared grain patterns + rough-edge filter for every illustration
document.body.insertAdjacentHTML('afterbegin', sharedDefs());

// chapter nodes: an ink blot that blooms into the painting's daisy when the thread arrives
document.querySelectorAll('.chapter').forEach((ch, i) => {
  const dom = DOMAIN[ch.dataset.domain];
  const p = new Pen(41 + i * 7);
  const blot = smoothPath(p.wobble(geo.ellipse(0, 0, 11, 10.5, 14), { amp: 0.9, step: 4 }), true);
  ch.querySelector('.chapter__node').innerHTML =
    `<svg viewBox="-26 -26 52 52"><g class="bloom">${p.daisy(0, 0, { r: 24, petals: 10, fill: dom.soft, centre: dom.main, ink: dom.deep })}</g><path class="blot" d="${blot}"/></svg>`;
});

// torn edge for the "fragment that didn't fall" in About
(() => {
  const p = new Pen(1234);
  const pts = p.wobble(geo.rect(4, 4, 92, 92), { amp: 2.2, step: 5, jit: 1.5 });
  const poly = pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(',');
  root.style.setProperty('--torn', `polygon(${poly})`);
})();

const topbar = document.querySelector('.topbar');
// top bar is cream over the black opening, ink once the paper page arrives
const setTone = (ink) => {
  const t = ink ? 'ink' : 'cream';
  if (topbar.dataset.tone !== t) topbar.dataset.tone = t;
};

// the opening is a still composition; with reduced motion it simply doesn't fall apart on scroll
initHero({
  still: reduced,
  onProgress: (p) => {
    root.style.setProperty('--hero-p', p.toFixed(4));
    setTone(p > 0.34);
  },
});
if (reduced) {
  const hero = document.querySelector('.hero');
  const check = () => setTone(scrollY > hero.offsetHeight - 40);
  addEventListener('scroll', check, { passive: true });
  check();
}

// once past the opening, the bar steps aside while reading and returns on scroll-up
(() => {
  let last = scrollY;
  const hero = document.querySelector('.hero');
  addEventListener('scroll', () => {
    const y = scrollY;
    const past = y > Math.max(innerHeight * 0.5, (hero.offsetHeight - innerHeight) * 0.5);
    const hide = past && y > last + 4 ? true : y < last - 4 || !past ? false : null;
    if (hide !== null && topbar.dataset.hidden !== String(hide)) topbar.dataset.hidden = String(hide);
    if (topbar.dataset.past !== String(past)) topbar.dataset.past = String(past);
    last = y;
  }, { passive: true });
})();

initJourney({ reduced });

// editorial reveals: an ink-wipe as text arrives
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-seen');
        io.unobserve(e.target);
      }
    }
  },
  { rootMargin: '0px 0px -10% 0px' },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
