// Export every illustrated scene as a standalone SVG file (plus the favicon).
// The illustration modules are pure string generators, so they run in Node as-is.
//
//   node scripts/export-illustrations.mjs
//
// Output: assets/illustrations/<scene-id>.svg, assets/favicon.svg
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sharedDefs, Pen } from '../js/illustration/brush.js';
import { SCENES, renderScene } from '../js/illustration/scenes.js';
import { C } from '../js/illustration/palette.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'illustrations');
mkdirSync(outDir, { recursive: true });

// pull the <defs> out of the shared hidden svg so each file is self-contained
const defs = sharedDefs().match(/<defs>[\s\S]*<\/defs>/)[0];
const style = `<style>text{font-family:"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif}.tiny{font-size:9px;font-weight:500}.count-n{font-size:9px;font-weight:600}.coin-glyph{font-size:5.5px;font-weight:700}.doc-head{font-size:14px;font-weight:700}.calc-digits{font-size:8px;font-weight:600}</style>`;

let n = 0;
for (const id of Object.keys(SCENES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-175 -225 350 250" width="700" height="500">${style}${defs}${renderScene(id, { label: id })}</svg>\n`;
  writeFileSync(join(outDir, `${id}.svg`), svg);
  n++;
}

const p = new Pen(7);
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64"><rect x="-32" y="-32" width="64" height="64" rx="14" fill="#000"/>${p.daisy(0, 0, { r: 25, petals: 11, fill: C.saffron, centre: C.ochre })}</svg>\n`;
writeFileSync(join(root, 'assets', 'favicon.svg'), fav);

console.log(`exported ${n} scenes to assets/illustrations/ and assets/favicon.svg`);
