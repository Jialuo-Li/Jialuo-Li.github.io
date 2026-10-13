# Jialuo Li's academic homepage

A single static page served by GitHub Pages. `index.html` holds all content and `stylesheet.css` all
presentation; there is no build step and no JavaScript.

## Preview locally

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>. This only serves files on your machine; nothing is published until
changes are pushed.

## Editing

- **Design tokens** (colors, type scale, line heights, spacing, layout widths) are the custom properties
  at the top of `stylesheet.css`.
- **Publications** are grouped by year in `<section class="publication-year">`, newest first. To add a
  paper, copy an existing `<article class="publication">` and keep:
  - the full title and the complete author list (own name in `<strong>`, `*` marks equal contribution);
  - `<span class="distinction distinction-oral">Oral</span>` or `distinction-highlight` only for real
    distinctions;
  - only resource links that exist;
  - the figure's intrinsic `width` and `height`, which reserve space while it loads. Figures are shown
    uncropped at 230px wide (full width on phones).
- **News** and **Honors** use `<time class="date" datetime="YYYY-MM">` followed by a `.dated-content`
  block.
- **Experience** entries keep the order institution, date, role, advisor. Logos are decorative
  (`alt=""`) and are never stretched.
- **Last updated** in the footer is static on purpose; change it by hand when the content changes.

Design originally based on [Jon Barron's homepage](https://jonbarron.info/).
