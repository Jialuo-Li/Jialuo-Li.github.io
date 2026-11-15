/* Image figures: reward hacking grid, prompt designs, compositional examples, appeal mosaics.
   Images and prompt text come from the paper's figure PDFs (scripts/build.py). Every figure shows all of its
   content at once; clicking an image only enlarges it next to its counterpart. */
(function () {
  "use strict";
  const I = window.Imago, Q = I.P.qual;
  const REG = { short: "var(--short)", medium: "var(--medium)", long: "var(--long)" };
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const segHtml = (segs, cls) => segs.map((s) => (s.k ? `<span class="${cls(s.k)}">${I.esc(s.t)}</span>` : I.esc(s.t))).join("");
  const zoomBadge = () => `<span class="zoom-badge" aria-hidden="true">${I.icon("zoom")}</span>`;

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
        h += `<figure class="shot fade-in" data-r="${ri}" data-c="${ci}" style="transition-delay:${I.dur(ri * 120 + ci * 70)}ms"><img src="${it.img}" alt="${I.esc(r.model)} after RL with ${it.reward}" loading="lazy" decoding="async"></figure>`;
      });
      h += `<p class="prompt"><span class="pm">${r.model}: </span>“${I.esc(r.prompt)}”</p>`;
    });
    grid.innerHTML = h;
    const heads = grid.querySelectorAll(".colhead");
    grid.querySelectorAll(".shot").forEach((s) => {
      I.reveal(s);
      s.insertAdjacentHTML("beforeend", zoomBadge());
      // hovering an image: the others fade and its reward's column head is marked
      I.interactEl(s, {
        enter() { grid.classList.add("focusing"); s.classList.add("on"); heads[+s.dataset.c].classList.add("on"); },
        leave() { grid.classList.remove("focusing"); s.classList.remove("on"); heads[+s.dataset.c].classList.remove("on"); },
      });
      s.addEventListener("click", () => {
        const r = rows[+s.dataset.r], c = +s.dataset.c;
        const pick = (c === 0 ? [0, n - 1] : [0, c]).map((k) => r.items[k]);
        I.lightbox.open({
          title: `<b>${r.model}</b>`,
          items: pick.map((it) => ({ src: it.img, cap: it.reward === "Base model" ? "Base model (no RL)" : `RL with ${it.reward}` })),
          note: `“${I.esc(r.prompt)}”`,
        });
      });
    });
    return {};
  });

  /* ---------------------------------------------------------------- one seed prompt and its four designs, all at once */
  I.register("designs", (el) => {
    const mount = el.querySelector(".designs-mount");
    const D = Object.fromEntries(Q.designs.map((d) => [d.key, d]));
    const TAG = { balanced: "<i>Imago</i>-Long" };
    const card = (d, i) => `<div class="dcard fade-in" style="transition-delay:${I.dur(180 + i * 110)}ms">
        <img src="${d.img}" alt="${d.name} prompt, visualized" loading="lazy" decoding="async">
        <div><div class="dc-name">${d.name}${TAG[d.key] ? `<span class="dc-tag">${TAG[d.key]}</span>` : ""}</div>
        <p class="dc-text">${segHtml(d.segments, (k) => `chip ${k}`)}</p></div></div>`;
    mount.innerHTML = `
      <div class="seed-row fade-in">
        <img src="${D.seed.img}" alt="Seed prompt, visualized" loading="lazy" decoding="async">
        <div><div class="dc-name">Seed prompt<span class="dc-tag"><i>Imago</i>-Short</span></div>
        <p class="dc-text seed-text">“${I.esc(D.seed.segments.map((s) => s.t).join(""))}”</p>
        <p class="seed-note">Qwen3.5-27B expands it into four prompts of about 200 words, one per design:</p></div>
      </div>
      <div class="sg-key" aria-hidden="true"><span class="chip entity">entities</span><span class="chip attribute">attributes</span><span class="chip relation">relations</span></div>
      <div class="dgrid paint">${["balanced", "entity", "attribute", "relation"].map((k, i) => card(D[k], i)).join("")}</div>`;
    const grid = mount.querySelector(".dgrid");
    // highlights paint in, card by card, once the cards are in view; hover focus is immediate afterwards
    let paintMs = 0;
    grid.querySelectorAll(".dcard").forEach((c, ci) => c.querySelectorAll(".chip").forEach((ch, k) => {
      const ms = 450 + ci * 160 + k * 45;
      paintMs = Math.max(paintMs, ms + 350);
      ch.style.transitionDelay = `${I.dur(ms)}ms`;
    }));
    mount.querySelectorAll(".fade-in").forEach((n) => I.reveal(n));
    // hovering a key entry, or any highlighted phrase, isolates that primitive in every card
    const kindOf = (n) => ["entity", "attribute", "relation"].find((x) => n.classList.contains(x));
    const keyChip = (kind) => mount.querySelector(`.sg-key .chip.${kind}`);
    mount.querySelectorAll(".sg-key .chip, .dgrid .chip").forEach((k) => {
      const kind = kindOf(k);
      I.interactEl(k, {
        enter() { grid.classList.add("focus-" + kind); keyChip(kind).classList.add("on"); },
        leave() { grid.classList.remove("focus-" + kind); keyChip(kind).classList.remove("on"); },
      });
    });
    const paint = () => { grid.classList.remove("paint"); setTimeout(() => grid.classList.add("painted"), I.dur(paintMs)); };
    if (I.reduced) paint();

    // the corpus numbers count up once
    const nums = el.querySelectorAll(".pipe-step .n[data-count]");
    const count = () => nums.forEach((n, i) => {
      const end = +n.dataset.count, suf = n.dataset.suffix || "";
      if (I.reduced) return;
      const t0 = performance.now() + I.dur(i * 220), ms = I.dur(900);
      const tick = (t) => {
        const p = Math.min(1, Math.max(0, (t - t0) / ms)), e = 1 - Math.pow(1 - p, 3);
        n.textContent = Math.round(end * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { play: () => { count(); setTimeout(paint, 50); } };
  });

  /* ---------------------------------------------------------------- compositional fidelity, both models (as in the paper) */
  I.register("compositional", (el) => {
    const mount = el.querySelector(".comp-mount");
    const boxes = (bs) => bs.map((b) => `<span class="callout${b.thin ? " thin" : ""}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"></span>`).join("");
    const find = (m, r) => Q.compositional.find((c) => c.model === m && c.regime === r);
    const head = (c) => `<span>${c.baseName}</span><span class="ours"><i>Imago</i>${c.oursName.slice(5)}</span>`;
    let h = `<div class="cp-head"><div>${head(find("4b", "short"))}</div><div>${head(find("6b", "short"))}</div></div>`;
    ["short", "medium", "long"].forEach((r, ri) => {
      const pair = [find("4b", r), find("6b", r)];
      h += `<div class="cp-row"><div class="cp-reg"><i style="background:${REG[r]}"></i>${cap(r)} prompts · ${pair[0].source}</div><div class="cp-halves">`;
      pair.forEach((c, k) => {
        h += `<div class="cp-half"><div class="cp-half-head">${head(c)}</div><div class="cp-imgs">
            <figure class="shot fade-in callouts" data-r="${ri}" data-k="${k}" style="transition-delay:${I.dur(k * 120)}ms"><img src="${c.base}" alt="${c.baseName}: ${c.source} prompt" loading="lazy" decoding="async">${boxes(c.baseBoxes)}</figure>
            <figure class="shot fade-in callouts" data-r="${ri}" data-k="${k}" style="transition-delay:${I.dur(k * 120 + 60)}ms"><img src="${c.ours}" alt="${c.oursName}: ${c.source} prompt" loading="lazy" decoding="async">${boxes(c.oursBoxes)}</figure>
          </div><p class="cp-text">${segHtml(c.segments, () => "hl")}</p></div>`;
      });
      h += `</div></div>`;
    });
    mount.innerHTML = h;
    const rows = ["short", "medium", "long"];
    mount.querySelectorAll(".shot").forEach((s, idx) => {
      s.querySelectorAll(".callout").forEach((c, k) => (c.style.transitionDelay = `${I.dur(450 + (idx % 4) * 90 + k * 140)}ms`));
      I.reveal(s);
      s.insertAdjacentHTML("beforeend", zoomBadge());
      const half = s.closest(".cp-half");
      I.interactEl(s, {
        enter() { half.classList.add("hl-on"); s.classList.add("pulse"); },
        leave() { half.classList.remove("hl-on"); s.classList.remove("pulse"); },
      });
      s.addEventListener("click", () => {
        const c = find(+s.dataset.k ? "6b" : "4b", rows[+s.dataset.r]);
        I.lightbox.open({
          title: `<b>${cap(c.regime)} prompt</b> · ${c.source}`,
          items: [{ src: c.base, cap: c.baseName }, { src: c.ours, cap: c.oursName }],
          note: segHtml(c.segments, () => "hl").replace(/class="hl"/g, 'style="color:var(--hl);font-weight:600"'),
        });
      });
    });
    return {};
  });

  /* ---------------------------------------------------------------- visual appeal mosaic (one per figure: data-model) */
  I.register("appeal", (el) => {
    const mount = el.querySelector(".mosaic-mount");
    const A = Q.appeal[el.dataset.model];
    let narrowNow = null;
    const zoom = (pair) => I.lightbox.open({ title: "<b>Visual appeal</b> · same prompt", items: pair.map((t) => ({ src: t.img, cap: t.side === "ours" ? A.oursName : A.baseName })) });
    function pairRows() {
      const pairs = [...new Set(A.tiles.map((t) => t.pair))].map((k) => A.tiles.filter((t) => t.pair === k));
      mount.innerHTML = `<div class="pairs"><div class="pairs-head"><span>${A.baseName}</span><span class="ours"><i>Imago</i>${A.oursName.slice(5)}</span></div>${pairs.map((p, i) =>
        `<div class="pair-row">${p.map((t) => `<figure class="shot fade-in" style="aspect-ratio:${t.w * A.aspect / t.h};transition-delay:${I.dur(i * 60)}ms"><img src="${t.img}" alt="${t.side === "ours" ? A.oursName : A.baseName}" loading="lazy" decoding="async"></figure>`).join("")}</div>`).join("")}</div>`;
      mount.querySelectorAll(".pair-row").forEach((row, i) => {
        row.querySelectorAll(".shot").forEach((s) => { I.reveal(s); s.insertAdjacentHTML("beforeend", zoomBadge()); });
        row.addEventListener("click", () => zoom(pairs[i]));
      });
    }
    function render() {
      narrowNow = mount.clientWidth < 560;
      if (narrowNow) return pairRows();
      const tiles = A.tiles;
      mount.innerHTML = `<div class="mosaic" style="aspect-ratio:${A.aspect}">${tiles.map((t) => `
        <figure class="tile fade-in ${t.side}" data-pair="${t.pair}" style="left:${t.x}%;top:${t.y}%;width:${t.w}%;height:${t.h}%;transition-delay:${I.dur((t.pair * 2 + (t.side === "ours")) * 55)}ms">
          <img src="${t.img}" alt="${t.side === "ours" ? A.oursName : A.baseName}" loading="lazy" decoding="async"><span class="lab" title="${t.side === "ours" ? A.oursName : A.baseName}">${t.side === "ours" ? A.oursName : "Base"}</span></figure>`).join("")}</div>`;
      const mosaic = mount.querySelector(".mosaic");
      mosaic.querySelectorAll(".tile").forEach((t) => {
        I.reveal(t);
        t.insertAdjacentHTML("beforeend", zoomBadge());
        t.addEventListener("pointerenter", () => {
          mosaic.classList.add("pairing");
          mosaic.querySelectorAll(`.tile[data-pair="${t.dataset.pair}"]`).forEach((p) => p.classList.add("pair-on"));
        });
        t.addEventListener("pointerleave", () => {
          mosaic.classList.remove("pairing");
          mosaic.querySelectorAll(".pair-on").forEach((p) => p.classList.remove("pair-on"));
        });
        t.addEventListener("click", () => zoom(tiles.filter((x) => String(x.pair) === t.dataset.pair)));
      });
    }
    render();
    return { resize: () => { if ((mount.clientWidth < 560) !== narrowNow) render(); } };
  });
})();
