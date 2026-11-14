/* Image figures: reward hacking grid, prompt-design explorer, compositional examples, appeal mosaic.
   Images and prompt text come from the paper's figure PDFs (scripts/build.py); nothing is annotated
   beyond what the paper shows. */
(function () {
  "use strict";
  const I = window.Imago, Q = I.P.qual;

  const segHtml = (segs, cls) => segs.map((s) => (s.k ? `<span class="${cls(s.k)}">${I.esc(s.t)}</span>` : I.esc(s.t))).join("");

  /* ---------------------------------------------------------------- reward hacking (2 x 5) */
  I.register("rewardHacking", (el) => {
    const grid = el.querySelector(".imgrid");
    const rows = Q.rewardHacking;
    const n = rows[0].items.length;
    grid.style.gridTemplateColumns = `22px repeat(${n}, minmax(0, 1fr))`;
    const brk = (t) => t.replace(/([a-z])(Reward|Score|model)/g, "$1<wbr>$2").replace(/^CLIP/, "CLIP<wbr>");
    let h = `<div></div>` + rows[0].items.map((it) => `<div class="colhead${it.reward === "PromptScore" ? " ours" : ""}">${brk(it.reward)}</div>`).join("");
    rows.forEach((r, ri) => {
      h += `<div class="rowhead">${r.model}</div>`;
      r.items.forEach((it, ci) => {
        h += `<figure class="shot fade-in" data-r="${ri}" data-c="${ci}" style="transition-delay:${ri * 120 + ci * 70}ms"><img src="${it.img}" alt="${I.esc(r.model)} after RL with ${it.reward}" loading="lazy" decoding="async"></figure>`;
      });
      h += `<p class="prompt"><span class="pm">${r.model}: </span>“${I.esc(r.prompt)}”</p>`;
    });
    grid.innerHTML = h;
    grid.querySelectorAll(".shot").forEach((s) => {
      I.reveal(s);
      s.addEventListener("click", () => {
        const r = rows[+s.dataset.r], c = +s.dataset.c, other = c === 0 ? n - 1 : 0;
        const pick = [0, c === 0 ? other : c].map((k) => r.items[k]);
        I.lightbox.open({
          title: `<b>${r.model}</b>`,
          items: pick.map((it) => ({ src: it.img, cap: it.reward === "Base model" ? "Base model (no RL)" : `RL with ${it.reward}` })),
          note: `“${I.esc(r.prompt)}”`,
        });
      });
    });
    return {};
  });

  /* ---------------------------------------------------------------- one seed prompt, four designs */
  I.register("designs", (el) => {
    const mount = el.querySelector(".designs-mount");
    const D = Q.designs;
    const NOTE = { seed: "<i>Imago</i>-Short", balanced: "<i>Imago</i>-Long", entity: "", attribute: "", relation: "" };
    let cur = "balanced", prim = null;
    mount.innerHTML = `<div class="designs">
        <div class="design-list" role="group" aria-label="Prompt design">${D.map((d) => `<button type="button" data-k="${d.key}" aria-pressed="${d.key === cur}">${d.name}${NOTE[d.key] ? `<span class="note">${NOTE[d.key]}</span>` : ""}</button>`).join("")}</div>
        <div><div class="design-text"></div>
          <div class="prim-legend" role="group" aria-label="Highlight one primitive">
            <button type="button" class="entity" data-p="entity">entities</button><button type="button" class="attribute" data-p="attribute">attributes</button><button type="button" class="relation" data-p="relation">relations</button>
          </div></div>
        <figure class="design-img"><img alt="" decoding="async"><figcaption>Nano-Banana, for visualization</figcaption></figure>
      </div>`;
    const text = mount.querySelector(".design-text"), img = mount.querySelector(".design-img img");
    D.forEach((d) => { const im = new Image(); im.src = d.img; });

    function show(animate) {
      const d = D.find((x) => x.key === cur);
      const html = segHtml(d.segments, (k) => `chip ${k}`);
      const swap = () => {
        text.innerHTML = html;
        text.className = "design-text" + (prim ? " focus-" + prim : "");
        img.src = d.img;
        img.alt = `${d.name} prompt, visualized`;
        text.style.opacity = 1; img.style.opacity = 1;
        if (animate && !I.reduced) {
          text.querySelectorAll(".chip").forEach((c, i) => {
            const bg = getComputedStyle(c).backgroundColor;
            c.animate([{ backgroundColor: "rgba(255,255,255,0)" }, { backgroundColor: bg }], { duration: 420, delay: 60 + i * 45, easing: "ease-out", fill: "backwards" });
          });
        }
      };
      if (animate && !I.reduced) { text.style.opacity = 0; img.style.opacity = 0; setTimeout(swap, 180); } else swap();
      mount.querySelectorAll(".design-list button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === cur)));
      mount.querySelector(".prim-legend").style.visibility = d.segments.some((s) => s.k) ? "visible" : "hidden";
    }
    text.style.transition = "opacity .18s"; img.style.transition = "opacity .18s";
    mount.querySelectorAll(".design-list button").forEach((b) => b.addEventListener("click", () => { cur = b.dataset.k; show(true); }));
    mount.querySelectorAll(".prim-legend button").forEach((b) => {
      const on = () => { prim = b.dataset.p; text.className = "design-text focus-" + prim; };
      const off = () => { prim = null; text.className = "design-text"; };
      b.addEventListener("pointerenter", on);
      b.addEventListener("pointerleave", off);
      b.addEventListener("focus", on);
      b.addEventListener("blur", off);
      b.addEventListener("click", () => (prim === b.dataset.p ? off() : on()));
    });
    show(false);

    // the corpus numbers count up once
    const nums = el.querySelectorAll(".pipe-step .n[data-count]");
    const run = () => nums.forEach((n, i) => {
      const end = +n.dataset.count, suf = n.dataset.suffix || "";
      if (I.reduced) return;
      const t0 = performance.now() + i * 220, ms = 900;
      const tick = (t) => {
        const p = Math.min(1, Math.max(0, (t - t0) / ms)), e = 1 - Math.pow(1 - p, 3);
        n.textContent = Math.round(end * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { play: run };
  });

  /* ---------------------------------------------------------------- compositional fidelity */
  I.register("compositional", (el, state) => {
    const mount = el.querySelector(".comp-mount");
    const REG = { short: "var(--short)", medium: "var(--medium)", long: "var(--long)" };
    const boxes = (bs) => bs.map((b) => `<span class="callout${b.thin ? " thin" : ""}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"></span>`).join("");
    function render() {
      const rows = Q.compositional.filter((c) => c.model === state.model);
      const r0 = rows[0];
      let h = `<div class="comp-heads"><div class="ph"></div><div>${r0.baseName}</div><div class="ours"><i>Imago</i>${r0.oursName.slice(5)}</div></div>`;
      rows.forEach((c, i) => {
        h += `<div class="comp-row">
          <div class="comp-text"><div class="src"><i style="background:${REG[c.regime]}"></i>${c.regime} · ${c.source}</div><p>${segHtml(c.segments, () => "hl")}</p></div>
          <figure class="shot fade-in callouts" data-i="${i}" data-side="base" style="transition-delay:${i * 90}ms"><img src="${c.base}" alt="${c.baseName}: ${c.source} prompt" loading="lazy" decoding="async">${boxes(c.baseBoxes)}</figure>
          <figure class="shot fade-in callouts" data-i="${i}" data-side="ours" style="transition-delay:${i * 90 + 60}ms"><img src="${c.ours}" alt="${c.oursName}: ${c.source} prompt" loading="lazy" decoding="async">${boxes(c.oursBoxes)}</figure>
        </div>`;
      });
      mount.innerHTML = h;
      mount.querySelectorAll(".shot").forEach((s) => {
        s.querySelectorAll(".callout").forEach((c, k) => (c.style.transitionDelay = `${450 + (+s.dataset.i) * 90 + k * 140}ms`));
        I.reveal(s);
        s.addEventListener("click", () => {
          const c = rows[+s.dataset.i];
          I.lightbox.open({
            title: `<b>${c.regime[0].toUpperCase() + c.regime.slice(1)} prompt</b> · ${c.source}`,
            items: [{ src: c.base, cap: c.baseName }, { src: c.ours, cap: c.oursName }],
            note: segHtml(c.segments, () => "hl").replace(/class="hl"/g, 'style="color:var(--hl);font-weight:600"'),
          });
        });
      });
    }
    render();
    return { update: render };
  });

  /* ---------------------------------------------------------------- visual appeal mosaic */
  I.register("appeal", (el, state) => {
    const mount = el.querySelector(".mosaic-mount");
    let narrowNow = null;
    function pairRows(A) {
      const pairs = [...new Set(A.tiles.map((t) => t.pair))].map((k) => A.tiles.filter((t) => t.pair === k));
      mount.innerHTML = `<div class="pairs"><div class="pairs-head"><span>${A.baseName}</span><span class="ours"><i>Imago</i>${A.oursName.slice(5)}</span></div>${pairs.map((p, i) =>
        `<div class="pair-row">${p.map((t) => `<figure class="shot fade-in" style="aspect-ratio:${t.w * A.aspect / t.h};transition-delay:${i * 60}ms"><img src="${t.img}" alt="${t.side === "ours" ? A.oursName : A.baseName}" loading="lazy" decoding="async"></figure>`).join("")}</div>`).join("")}</div>`;
      mount.querySelectorAll(".pair-row").forEach((row, i) => {
        row.querySelectorAll(".shot").forEach((s) => I.reveal(s));
        row.addEventListener("click", () => I.lightbox.open({ title: "<b>Visual appeal</b> · same prompt", items: pairs[i].map((t) => ({ src: t.img, cap: t.side === "ours" ? A.oursName : A.baseName })) }));
      });
    }
    function render() {
      const A = Q.appeal[state.model];
      narrowNow = mount.clientWidth < 560;
      if (narrowNow) return pairRows(A);
      const tiles = A.tiles;
      mount.innerHTML = `<div class="mosaic" style="aspect-ratio:${A.aspect}">${tiles.map((t, i) => `
        <figure class="tile fade-in ${t.side}" data-pair="${t.pair}" style="left:${t.x}%;top:${t.y}%;width:${t.w}%;height:${t.h}%;transition-delay:${(t.pair * 2 + (t.side === "ours")) * 55}ms">
          <img src="${t.img}" alt="${t.side === "ours" ? A.oursName : A.baseName}" loading="lazy" decoding="async"><span class="lab" title="${t.side === "ours" ? A.oursName : A.baseName}">${t.side === "ours" ? A.oursName : "Base"}</span></figure>`).join("")}</div>`;
      const mosaic = mount.querySelector(".mosaic");
      mosaic.querySelectorAll(".tile").forEach((t) => {
        I.reveal(t);
        t.addEventListener("pointerenter", () => {
          mosaic.classList.add("pairing");
          mosaic.querySelectorAll(`.tile[data-pair="${t.dataset.pair}"]`).forEach((p) => p.classList.add("pair-on"));
        });
        t.addEventListener("pointerleave", () => {
          mosaic.classList.remove("pairing");
          mosaic.querySelectorAll(".pair-on").forEach((p) => p.classList.remove("pair-on"));
        });
        t.addEventListener("click", () => {
          const pair = tiles.filter((x) => String(x.pair) === t.dataset.pair);  // base first, as built
          I.lightbox.open({ title: "<b>Visual appeal</b> · same prompt", items: pair.map((p) => ({ src: p.img, cap: p.side === "ours" ? A.oursName : A.baseName })) });
        });
      });
    }
    render();
    return { update: render, resize: () => { if ((mount.clientWidth < 560) !== narrowNow) render(); } };
  });
})();
