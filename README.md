# Jialuo Li's academic homepage

A single static page served by GitHub Pages: `index.html` (content), `stylesheet.css` (design) and
`assets/site.js` (optional extras). There is no build step and no framework. All content works with
JavaScript turned off; the script only adds the theme toggle, copy-email button, active-section
highlight in the navigation, and the back-to-top button.

## Preview locally

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>. This only serves files on your machine.

## Design

- **Palette:** warm ivory background, slate text and a clay accent, with automatic light/dark themes
  (follows the system; the toggle remembers the reader's choice). Colors are custom properties at the top
  of `stylesheet.css`; the `light-dark()` pairs define both themes.
- **Type:** Newsreader (serif headings), Hanken Grotesk (text) and Geist Mono (labels), self-hosted in
  `assets/fonts/` with metric-matched fallbacks to avoid layout shift.
- **Icons:** inline SVG sprite at the top of `index.html` from Lucide (ISC) and Simple Icons (CC0).
- **Motion:** gentle hover effects and a short intro; everything is disabled when the reader asks for
  reduced motion.

Font and icon licenses are in `assets/licenses/`.

## Editing content

- **Publications** are grouped by year (`<section class="pub-year">`, newest first). To add one, copy an
  `<article class="paper">` and keep the full title, the complete author list (your name in
  `<strong class="me">`, `*` for equal contribution), the venue chip, and only resource links that exist.
  Use `chip-oral` / `chip-highlight` only for real distinctions.
- **Figures and photos:** keep originals in `images/` and add web copies to `images/web/` (WebP, about
  640 and 1280 px wide). Set `width`/`height` to the larger copy's pixel size. Figures are shown whole
  (`object-fit: contain`), never cropped.
- **News** and **Honors** use `<time datetime="YYYY-MM">` followed by a paragraph.
- **Experience** cards keep the order institution, date, role, advisor; logos are decorative (`alt=""`).
- **Last updated** in the footer is static on purpose; update it by hand when the content changes.

Originally based on [Jon Barron's homepage](https://jonbarron.info/).
