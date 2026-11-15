/* Page shell: header and links, section badges, BibTeX, math, figure numbers, figure-reference previews, navigation. */
(function () {
  "use strict";
  const I = window.Imago, S = window.SITE;
  const BRAND = { arxiv: "#b31b1b", github: "#17191c", hf: "#ff9d00", paper: "#1f5fcf", quote: "#1f5fcf" };

  function header() {
    document.getElementById("authors").innerHTML = S.authors
      .map((a) => `<span>${a.url ? `<a href="${a.url}">${I.esc(a.name)}</a>` : I.esc(a.name)}</span>`).join(" ");
    document.getElementById("affil").textContent = S.affiliation;
    document.getElementById("foot-affil").textContent = S.affiliation;
    document.querySelector(".hero .emblem").innerHTML = I.icon("emblem");
    // every link is a button; one without a url says "coming soon" when hovered or clicked
    const links = document.getElementById("links");
    links.innerHTML = S.links.map((l) => {
      const cls = `btn${l.primary ? " primary" : ""}`, style = `--brand:${BRAND[l.icon] || "var(--blue-d)"}`;
      const inner = `${I.icon(l.icon)}<span>${I.esc(l.label)}</span>`;
      return l.url ? `<a class="${cls}" href="${l.url}" style="${style}">${inner}</a>`
        : `<a class="${cls} soon" role="link" aria-disabled="true" tabindex="0" style="${style}">${inner}</a>`;
    }).join("");
    links.querySelectorAll(".btn.soon").forEach((b) => {
      const label = b.textContent.trim();
      I.interactEl(b, {
        enter(ev) { I.tip.show(I.card({ title: `${I.esc(label)}: coming soon`, sub: "The link will be added once it is public." }), ev); },
        move(ev) { I.tip.move(ev); },
        leave() { I.tip.hide(); },
      });
      b.addEventListener("click", (e) => { e.preventDefault(); I.toast(`${I.esc(label)}: coming soon`); });
      b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); I.toast(`${I.esc(label)}: coming soon`); } });
    });

    // BibTeX copy button
    document.getElementById("bibtex").textContent = S.bibtex;
    const copy = document.querySelector(".bib .copy");
    const idle = `${I.icon("copy")}<span>Copy</span>`;
    copy.innerHTML = idle;
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(S.bibtex); copy.innerHTML = `${I.icon("check")}<span>Copied</span>`; copy.classList.add("done"); }
      catch (e) { copy.innerHTML = `${I.icon("copy")}<span>Select and copy</span>`; }
      setTimeout(() => { copy.innerHTML = idle; copy.classList.remove("done"); }, 1600);
    });
  }

  /* icons: a badge for each section (in its kicker) and for each finding, enlarge hints, template header, lightbox */
  function decorate() {
    document.querySelectorAll("section.sec[data-icon] .kicker").forEach((k) => {
      k.insertAdjacentHTML("afterbegin", `<span class="badge">${I.icon(k.closest("section").dataset.icon)}</span>`);
    });
    document.querySelectorAll(".findings li[data-icon]").forEach((li) => li.insertAdjacentHTML("afterbegin", `<span class="badge">${I.icon(li.dataset.icon)}</span>`));
    document.querySelectorAll(".findings .jump").forEach((a) => (a.innerHTML = a.innerHTML.replace(/&nbsp;↓|\u00a0↓/, "") + I.icon("down")));
    document.querySelectorAll(".hint").forEach((h) => h.insertAdjacentHTML("afterbegin", I.icon("zoom")));
    document.querySelectorAll(".template .t-head").forEach((h) => h.insertAdjacentHTML("afterbegin", I.icon("chat")));
    const close = document.querySelector(".lb-close");
    close.innerHTML = I.icon("close");
    close.setAttribute("aria-label", "Close");

    // section headings: a link icon on hover; clicking it copies the section's address
    document.querySelectorAll("section.sec[id] > h2").forEach((h) => {
      const id = h.parentElement.id;
      h.insertAdjacentHTML("afterbegin", `<a class="anchor" href="#${id}" aria-label="Copy link to this section">${I.icon("link")}</a>`);
      h.querySelector(".anchor").addEventListener("click", async (e) => {
        e.preventDefault();
        history.replaceState(null, "", "#" + id);
        document.getElementById(id).scrollIntoView({ behavior: I.reduced ? "auto" : "smooth" });
        try { await navigator.clipboard.writeText(location.href); I.toast(`${I.icon("check")}Link to this section copied`); } catch (err) { /* address bar already updated */ }
      });
    });

    // back to top, once the header is out of view
    const top = document.createElement("button");
    top.className = "to-top";
    top.type = "button";
    top.setAttribute("aria-label", "Back to top");
    top.innerHTML = I.icon("up");
    document.body.appendChild(top);
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: I.reduced ? "auto" : "smooth" }));
    const hero = document.querySelector(".hero");
    new IntersectionObserver(([e]) => top.classList.toggle("on", !e.isIntersecting)).observe(hero);
  }

  function math() {
    if (!window.katex) return;
    document.querySelectorAll("[data-tex]").forEach((el) => {
      const tex = window.innerWidth < 700 && el.dataset.texNarrow ? el.dataset.texNarrow : el.dataset.tex;
      try { window.katex.render(tex, el, { displayMode: true, throwOnError: false }); } catch (e) { /* keep the plain-text fallback */ }
    });
  }

  /* hovering "Fig. N" or "Table N" in the text shows that figure in miniature, as it is drawn on the page */
  function previews() {
    const pop = document.createElement("div");
    pop.className = "ref-pop";
    pop.setAttribute("aria-hidden", "true");
    document.body.appendChild(pop);
    const BODY = ".chart, .panels, .table-wrap, .imgrid, .comp-mount, .mosaic-mount, .designs-mount";
    let t = null;
    function show(a) {
      const fig = document.getElementById(a.dataset.ref);
      if (!fig) return;
      const src = fig.querySelector(BODY);
      const fn = fig.querySelector(".fn") ? fig.querySelector(".fn").textContent : "";
      const title = fig.querySelector(".fig-title") ? fig.querySelector(".fig-title").textContent.replace(fn, "").trim() : "";
      const lead = fig.querySelector("figcaption b") ? fig.querySelector("figcaption b").innerHTML : "";
      pop.innerHTML = `<div class="rp-h"><span class="rp-fn">${fn}</span>${I.esc(title)}</div><div class="rp-thumb"></div>${lead ? `<div class="rp-cap">${lead}</div>` : ""}`;
      const thumb = pop.querySelector(".rp-thumb");
      if (src && src.offsetWidth) {
        const W = 312, s = W / src.offsetWidth;
        const legend = fig.querySelector(".legend");
        const wrap = document.createElement("div");
        wrap.className = "rp-scale";
        wrap.style.width = src.offsetWidth + "px";
        wrap.style.transform = `scale(${s})`;
        if (legend) wrap.appendChild(legend.cloneNode(true));
        wrap.appendChild(src.cloneNode(true));
        wrap.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
        wrap.querySelectorAll(".fade-in, .callouts").forEach((n) => n.classList.add("in"));
        wrap.querySelectorAll("img").forEach((n) => n.removeAttribute("loading"));
        thumb.appendChild(wrap);
        thumb.style.height = Math.min(200, Math.ceil(wrap.scrollHeight * s)) + "px";
        thumb.classList.toggle("cut", wrap.scrollHeight * s > 200);
      } else thumb.remove();
      const r = a.getBoundingClientRect(), pw = 340;
      let x = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
      pop.style.left = x + "px";
      pop.classList.add("on");
      const ph = pop.offsetHeight;
      const below = r.bottom + 10 + ph < window.innerHeight - 8;
      pop.style.top = (below ? r.bottom + 10 : Math.max(8, r.top - ph - 10)) + "px";
      pop.classList.toggle("above", !below);
    }
    document.querySelectorAll("a.ref[data-ref]").forEach((a) => {
      a.addEventListener("pointerenter", (e) => { if (e.pointerType === "touch") return; clearTimeout(t); t = setTimeout(() => show(a), 140); });
      a.addEventListener("pointerleave", () => { clearTimeout(t); pop.classList.remove("on"); });
      a.addEventListener("click", () => { clearTimeout(t); pop.classList.remove("on"); });
    });
    window.addEventListener("scroll", () => pop.classList.remove("on"), { passive: true });
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
  decorate();
  math();
  I.numberFigures();
  previews();
  navigation();
  const start = () => I.mountFigures();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
