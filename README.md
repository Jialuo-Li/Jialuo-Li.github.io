# Jialuo Li's academic homepage

A single static page served by GitHub Pages: `index.html` (content), `stylesheet.css` (design) and
`assets/site.js` (optional extras). There is no build step and no framework. All content works with
JavaScript turned off; the script only adds the theme toggle, copy-email button, "show more" for long
lists, the active-section highlight and the back-to-top button.

## Preview locally

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>. This only serves files on your machine.

## Design

- **Palette:** milk tea — cream background, tapioca-brown text, tea-brown accents and a red "straw"
  for links and highlights, with a matching dark theme (follows the system; the toggle remembers the
  reader's choice). Colors are custom properties at the top of `stylesheet.css`.
- **Type:** Newsreader (serif headings), Hanken Grotesk (text) and Geist Mono (dates), self-hosted in
  `assets/fonts/` with metric-matched fallbacks to avoid layout shift.
- **Icons:** inline SVG sprite at the top of `index.html` — Phosphor duotone icons (MIT) and Simple Icons
  brand logos (CC0; LinkedIn uses Phosphor's filled logo because Simple Icons no longer ships it). The
  boba-cup mark is an original drawing (header logo and the footer sticker); the favicon is
  `images/favicon/icon.ico`.
- **Motion:** quiet hover states — cards keep their place and only get a warmer edge, a soft shadow and
  an underlined title; the portrait zooms gently inside its frame; links and chips change color; and the
  pearls bob in the boba mark and footer sticker. All motion is disabled when the reader asks for reduced
  motion.

Font and icon licenses are in `assets/licenses/`.

## Editing content

- **News** (newest first) and **Honors** are lists of `<li>` with a `<time datetime="YYYY-MM">` and a
  paragraph. Lists with `data-visible="N"` show the first N items and a "Show more" button for the rest
  (all items stay visible without JavaScript). Add `id` and `data-visible` to any other list to collapse
  it the same way.
- **Experience** is a vertical timeline, newest first: copy an `<li class="tl-item">` and keep the order
  institution, date, role, advisor (the `tl-advisor` line is optional). Logos are decorative (`alt=""`),
  square, and are never stretched.
- **Currently** (the card beside News) repeats the Experience entries that run to "Present", in the same
  words. When one of them ends or a new one starts, update both places.
- **Publications** form one list inside `<div class="pub-list">`, newest first (the venue chip carries
  the year). To add one, copy an `<article class="paper">` and keep the full title, the complete author
  list (your name in `<strong class="me">`, `*` for equal contribution), the venue chip, and only
  resource links that exist. Use `chip-oral` / `chip-highlight` only for real distinctions.
- **Figures and photos:** keep originals in `images/` and add web copies to `images/web/` (WebP, about
  640 and 1280 px wide, never upscaled). Set `width`/`height` to the larger copy's pixel size. Figures
  are shown whole at their own aspect ratio, never cropped.
- **Last updated** in the footer is static on purpose; update it by hand when the content changes.
- **After editing `stylesheet.css` or `assets/site.js`,** change the `?v=` value where `index.html` links
  them (any new string works). Browsers and CDNs cache these files, and a new value makes them fetch the
  new version instead of pairing the new page with an old stylesheet.
