/* ==========================================================================
   MAIN BOOTSTRAPPER & DECLARATIVE SITE SHELL
   --------------------------------------------------------------------------
   Reads window.SITE_CONFIG and window.PAPER_DATA to populate:
   - Hero header (title, subtitle, authors, links)
   - Top sticky navigation + wide-screen left margin TOC + scroll-spy
   - Reading progress bar
   - FAQ accordion + BibTeX one-click copy
   - Optional SITE_CONFIG.customModules extensions
   ========================================================================== */
(function () {
  "use strict";

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const ICONS = {
    paper: `<svg viewBox="0 0 20 20" fill="none"><path d="M5 3.5h7l3.5 3.5v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.5V7h3.5M7 10.5h6M7 13.5h4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    arxiv: `<svg viewBox="0 0 20 20" fill="none"><path d="M4.5 15.5L15.5 4.5M6 4.5l9.5 11" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
    code: `<svg viewBox="0 0 20 20" fill="none"><path d="M7 6.5L3.5 10 7 13.5M13 6.5L16.5 10 13 13.5M11.2 4.5l-2.4 11" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    hf: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6"/><circle cx="7.6" cy="8.6" r="1" fill="currentColor"/><circle cx="12.4" cy="8.6" r="1" fill="currentColor"/><path d="M7.2 12.2c.7 1.1 1.7 1.6 2.8 1.6s2.1-.5 2.8-1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    data: `<svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="5.5" rx="6" ry="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M4 5.5v9c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-9M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" stroke="currentColor" stroke-width="1.6"/></svg>`,
    bib: `<svg viewBox="0 0 20 20" fill="none"><path d="M6.5 7.5h3v3h-2l-1 2.5M11.5 7.5h3v3h-2l-1 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="3.5" width="14" height="13" rx="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
  };

  function mountShell() {
    const cfg = window.SITE_CONFIG;
    if (!cfg) return;

    /* 1. Top Nav + Side TOC */
    const topNav = document.getElementById("top-nav-links");
    const sideToc = document.getElementById("side-toc");
    if (topNav) {
      topNav.innerHTML = cfg.nav
        .map((n) => `<a href="#${esc(n.id)}" data-nav="${esc(n.id)}">${n.num ? `<span style="opacity:.65;margin-right:4px;font-family:var(--font-mono);font-size:11.5px">${esc(n.num)}</span>` : ""}${esc(n.label)}</a>`)
        .join("");
    }
    if (sideToc) {
      sideToc.innerHTML =
        `<div class="toc-label">Contents</div>` +
        cfg.nav
          .map(
            (n) =>
              `<a href="#${esc(n.id)}" data-toc="${esc(n.id)}">${
                n.num ? `<span style="font-family:var(--font-mono);font-size:10.5px;opacity:.7;margin-right:5px">${esc(n.num)}</span>` : ""
              }${esc(n.label)}</a>`
          )
          .join("");
    }

    /* 2. Hero Metadata */
    const heroMount = document.getElementById("hero-header-mount");
    if (heroMount) {
      const meta = cfg.meta || {};
      const badgeText = meta.venueBadge || cfg.badge || "Technical Report";
      const fullTitle = meta.title || cfg.title || "Imago";
      const colonIdx = fullTitle.indexOf(":");
      const titleHtml =
        colonIdx > 0
          ? `<em>${esc(fullTitle.slice(0, colonIdx + 1))}</em>${esc(fullTitle.slice(colonIdx + 1))}`
          : esc(fullTitle);
      const subtitleText = meta.subtitle || cfg.tagline || "";
      const affilText = meta.affiliation || cfg.affiliationNote || "";

      const authorsHtml = (cfg.authors || [])
        .map((a) => {
          const star = a.corresponding ? "<sup>*</sup>" : "";
          return a.url
            ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}${star}</a>`
            : `<span>${esc(a.name)}${star}</span>`;
        })
        .join('<span class="sep">·</span>');

      const btnsHtml = (cfg.links || [])
        .filter((l) => l.enabled !== false)
        .map((l) => {
          const href = l.url || l.href || "#";
          const isAnchor = href.startsWith("#");
          const soonBadge = l.note || l.badge
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:rgba(148,163,184,0.22);font-weight:700">${esc(
                l.note || l.badge
              )}</span>`
            : "";
          return `<a class="btn-pill ${l.primary ? "primary" : ""}" href="${esc(href)}" ${
            isAnchor ? "" : 'target="_blank" rel="noopener"'
          }>${ICONS[l.icon] || ""}${esc(l.label)}${soonBadge}</a>`;
        })
        .join("");

      heroMount.innerHTML = `
        <div class="hero-badge"><span class="dot"></span>${esc(badgeText)}</div>
        <h1 class="hero-title">${titleHtml}</h1>
        <p class="hero-tagline">${esc(subtitleText)}</p>
        <div class="author-row">${authorsHtml}</div>
        <div class="affil-row">${esc(affilText)}${
        cfg.correspondingEmail ? ` · <code>${esc(cfg.correspondingEmail)}</code>` : ""
      }</div>
        <div class="action-row">${btnsHtml}</div>
      `;
    }

    /* 3. FAQs */
    const faqHost = document.getElementById("faq-mount");
    if (faqHost && window.PAPER_DATA && window.PAPER_DATA.faqs) {
      faqHost.innerHTML = window.PAPER_DATA.faqs
        .map(
          (f, i) => `
          <details class="faq-item" ${i === 0 ? "open" : ""}>
            <summary>${esc(f.q)}</summary>
            <div class="faq-ans">${esc(f.a)}</div>
          </details>`
        )
        .join("");
    }

    /* 4. BibTeX */
    const bibPre = document.getElementById("bibtex-code");
    const bibBtn = document.getElementById("btn-copy-bib");
    if (bibPre) bibPre.textContent = cfg.bibtex.trim();
    if (bibBtn && bibPre) {
      bibBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(cfg.bibtex.trim());
          bibBtn.textContent = "✓ Copied";
          setTimeout(() => {
            bibBtn.textContent = "Copy BibTeX";
          }, 1800);
        } catch (_) {
          const range = document.createRange();
          range.selectNodeContents(bibPre);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    }

    /* 5. Custom Declarative Modules (Future Extensibility Hook) */
    const customHost = document.getElementById("custom-modules-mount");
    if (customHost && Array.isArray(cfg.customModules) && cfg.customModules.length) {
      customHost.innerHTML = cfg.customModules
        .map(
          (m) => `
          <section class="sec" id="${esc(m.id || "")}">
            <div class="wrap">
              ${m.eyebrow ? `<span class="sec-eyebrow">${esc(m.eyebrow)}</span>` : ""}
              <h2 class="sec-title">${esc(m.title)}</h2>
              ${m.html || ""}
            </div>
          </section>`
        )
        .join("");
    }

    /* 6. Scroll-Spy + Reading Progress Bar */
    const prog = document.getElementById("reading-progress");
    const secIds = cfg.nav.map((n) => n.id);

    function onScroll() {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (prog && docH > 0) {
        prog.style.width = `${Math.min(100, Math.max(0, (window.scrollY / docH) * 100)).toFixed(1)}%`;
      }
      let activeId = secIds[0];
      const y = window.scrollY + 150;
      secIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) activeId = id;
      });
      document.querySelectorAll("[data-nav], [data-toc]").forEach((a) => {
        const id = a.dataset.nav || a.dataset.toc;
        a.classList.toggle("active", id === activeId);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountShell();
    if (window.ImagoAnim) window.ImagoAnim.init();
    if (window.ImagoCharts) window.ImagoCharts.init();
    if (window.ImagoTables) window.ImagoTables.init();
    if (window.ImagoQualitative) window.ImagoQualitative.init();
  });
})();
