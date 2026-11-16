# Zuha Asif — portfolio landing page

An illustrated, interactive landing page. No framework, no build step, no runtime dependencies.

## Run it

ES modules need a local server (opening the file directly won't work):

```sh
npm run serve        # or: python3 -m http.server 8000
```

Then open http://localhost:8000. The illustration gallery lives at http://localhost:8000/illustrations.html.

## How it's built

| Path | What it does |
| --- | --- |
| `index.html` | Semantic page: hero, About, the three chapters, outro. Readable and complete without JS. |
| `css/styles.css` | Type system (Bricolage Grotesque, opsz 14 as in Figma), paper ground, layout, scene reveal + idle motion, reduced-motion rules. |
| `js/main.js` | Boot: shared SVG defs, chapter nodes, top bar, editorial reveals. |
| `js/hero/fragments.js` | Cuts the painting into torn, irregular pieces made of its real pixels: detail-driven quadtree → Voronoi → shared warp field → sprite atlas. |
| `js/hero/hero.js` | The opening: a still composition (painting + name on the black ground). Scroll makes it fall away like petals. |
| `js/illustration/palette.js` | Colours sampled from the painting. |
| `js/illustration/brush.js` | The "hand": wobbly fills, pastel grain, off-register outlines, striations, stipple, tendrils, daisies. |
| `js/illustration/kit.js` | Reusable objects: people, trucks, vans, forklift, racks, boxes, desks, monitors, factory, storehouse… |
| `js/illustration/scenes.js` | One scene per workflow step, composed from the kit. |
| `js/flows.js` | Workflow compositions: hand-placed desktop panoramas + auto-generated vertical layouts for phones. |
| `js/journey.js` | Pins each panorama, grows the stem, pans the camera, and draws the single dotted thread through the page. |
| `assets/art/` | Web sizes of the original painting (the 16.7 MB `HeroBG.png` is kept as the master but not shipped). |
| `assets/illustrations/` | Every scene exported as a standalone SVG (`npm run export:illustrations`). |

## Editing

- **Copy:** all text is in `index.html`; workflow labels are in `js/flows.js` (`FLOWS` for desktop, `STEPS` for mobile).
- **Moving a scene:** change its `x`, `y`, `s` (scale) in `FLOWS`; `at` is the point on the stem where it appears.
- **New illustration:** add a function to `SCENES` in `js/illustration/scenes.js`, built from kit objects, then reference it in `FLOWS`/`STEPS`.
- **Painting:** to swap the hero artwork, regenerate the three JPEGs in `assets/art/` (e.g. `sips -s format jpeg -s formatOptions 84 --resampleWidth 1800 HeroBG.png --out assets/art/botanical-1800.jpg`).

## Accessibility & motion

- `prefers-reduced-motion`: no canvas animation, no pinning or panning; the hero is the plain image + real `<h1>`, workflows render complete.
- The painting has a descriptive `alt`; each scene has an `aria-label`; each workflow has a text summary in its `<figcaption>`.
