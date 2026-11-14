/* Page shell: header, links, BibTeX, math, figure numbers, contents navigation, figure mounting. */
(function () {
  "use strict";
  const I = window.Imago, S = window.SITE;

  const ICON = {
    paper: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.75h8.5L19.25 7.5v13.75H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14.25 2.75V7.75h5M9 12h7M9 15.5h7M9 19h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    arxiv: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5l14 15M19 4.5l-6.2 6.9M10.8 13.6L5 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hf: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10.3" r="1.2" fill="currentColor"/><circle cx="15" cy="10.3" r="1.2" fill="currentColor"/><path d="M8.6 14.2c.9 1.4 2.1 2.1 3.4 2.1s2.5-.7 3.4-2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    data: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7.5" ry="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 17.5c2.6-.6 3.9-2.4 3.9-5.3V7H4.5v5.2h2.1M13.5 17.5c2.6-.6 3.9-2.4 3.9-5.3V7h-3.9v5.2h2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  };

  function header() {
    document.getElementById("authors").innerHTML = S.authors
      .map((a) => `<span>${a.url ? `<a href="${a.url}">${I.esc(a.name)}</a>` : I.esc(a.name)}</span>`).join(" ");
    document.getElementById("affil").textContent = S.affiliation;
    document.getElementById("foot-affil").textContent = S.affiliation;
    const live = S.links.filter((l) => l.url), soon = S.links.filter((l) => !l.url);
    const links = document.getElementById("links");
    const list = (xs) => xs.length < 3 ? xs.join(" and ") : xs.slice(0, -1).join(", ") + ", and " + xs[xs.length - 1];
    links.innerHTML = live.map((l) => `<a class="btn${l.primary ? " primary" : ""}" href="${l.url}">${ICON[l.icon] || ""}${I.esc(l.label)}</a>`).join("") +
      (soon.length ? `<span class="soon-note">${I.esc(list(soon.map((l) => l.label)))}: coming soon</span>` : "");
    document.getElementById("bibtex").textContent = S.bibtex;
    const copy = document.querySelector(".bib .copy");
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(S.bibtex); copy.textContent = "Copied"; } catch (e) { copy.textContent = "Select and copy"; }
      setTimeout(() => (copy.textContent = "Copy"), 1600);
    });
  }

  function math() {
    if (!window.katex) return;
    document.querySelectorAll("[data-tex]").forEach((el) => {
      const tex = window.innerWidth < 700 && el.dataset.texNarrow ? el.dataset.texNarrow : el.dataset.tex;
      try { window.katex.render(tex, el, { displayMode: true, throwOnError: false }); } catch (e) { /* keep the plain-text fallback */ }
    });
  }

  /* contents: side list (wide screens) and sticky tabs (narrow); a section is current once its top passes 30% of the viewport */
  function navigation() {
    const ids = ["top", "evaluation", "reward", "corpus", "imago", "citation"];
    const secs = ids.map((id) => document.getElementById(id));
    const tocLinks = [...document.querySelectorAll(".toc a")], tabLinks = [...document.querySelectorAll(".tabs a")];
    const prog = document.querySelector(".toc .prog");
    let cur = -1;
    function update() {
      const y = window.innerHeight * 0.3;
      let k = 0;
      secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < y) k = i; });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) k = secs.length - 1;
      if (k === cur) return;
      cur = k;
      tocLinks.forEach((a, i) => { a.classList.toggle("on", i === k); a.classList.toggle("done", i < k); });
      tabLinks.forEach((a, i) => a.classList.toggle("on", i === k));
      const a = tocLinks[k];
      if (a && prog) prog.style.height = a.offsetTop + a.offsetHeight / 2 - 6 + "px";
      const t = tabLinks[k];
      if (t && t.parentElement.parentElement.scrollWidth > t.parentElement.parentElement.clientWidth) t.scrollIntoView({ block: "nearest", inline: "center" });
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  header();
  math();
  I.numberFigures();
  navigation();
  const start = () => I.mountFigures();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
