// Colours sampled directly from the botanical painting (k-means over the artwork).
// Every illustration on the site draws from this one palette so it reads as one hand.
export const C = {
  // grounds
  paper: '#f4eee3',
  paperDeep: '#ebe2d2',
  black: '#0a0908',

  // warm
  saffron: '#fdc44b', // the big yellow daisy
  marigold: '#f4ab08',
  ochre: '#cf8b32', // daisy centre
  ochreDeep: '#8a5a12',
  apricot: '#e28457', // the orange daisy behind
  burnt: '#c26416',
  vermilion: '#b82e0f', // lily / red leaf
  oxblood: '#591f17', // trailing dark-red leaves
  cocoa: '#7d5141',
  rose: '#ba6569', // the fuzzy magenta bloom
  blush: '#e5b5b0', // pink orchid
  salmon: '#e8907a',

  // cool
  teal: '#107c81', // orchid outline / vine
  tealDeep: '#0b4f55',
  aqua: '#429da7',
  cyan: '#3eb6d0', // fern
  ice: '#b9dfef', // white-blue asters
  iceDeep: '#7fb6cf',
  periwinkle: '#9faad4',
  lavender: '#c3b5ec',
  violet: '#b474e6', // trumpets
  plum: '#8a5aaf',
  aubergine: '#4a2a6b',
  leaf: '#548147',
  leafDeep: '#2f4f25',
  sage: '#86a86a',
  moss: '#426d34',

  // text
  ink: '#1d1a17',
  graphite: '#6e6e6e',
};

// Domain accents: the Figma reference colours, which sit inside the painting's palette.
export const DOMAIN = {
  inventory: { main: '#b42f12', soft: C.apricot, deep: C.oxblood },
  quality: { main: '#00718a', soft: C.aqua, deep: C.tealDeep },
  costing: { main: '#426d34', soft: C.sage, deep: C.leafDeep },
};

// Outline partners: each fill gets a deeper or contrasting line, the way the
// painting outlines its pink orchid in teal and its yellow daisy in ochre.
export const INK_FOR = {
  [C.saffron]: C.ochreDeep,
  [C.marigold]: C.oxblood,
  [C.ochre]: C.oxblood,
  [C.apricot]: C.oxblood,
  [C.burnt]: C.oxblood,
  [C.vermilion]: C.oxblood,
  [C.cocoa]: C.oxblood,
  [C.rose]: C.oxblood,
  [C.blush]: C.teal,
  [C.salmon]: C.oxblood,
  [C.teal]: C.tealDeep,
  [C.aqua]: C.tealDeep,
  [C.cyan]: C.tealDeep,
  [C.ice]: C.teal,
  [C.periwinkle]: C.aubergine,
  [C.lavender]: C.aubergine,
  [C.violet]: C.aubergine,
  [C.plum]: C.aubergine,
  [C.leaf]: C.leafDeep,
  [C.sage]: C.leafDeep,
  [C.moss]: C.leafDeep,
  [C.paper]: C.teal,
  [C.paperDeep]: C.cocoa,
};
