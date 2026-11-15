/* Tables: the paper's Tab. 1 (+ Tab. 4's PickScore column) and Tab. 5, in booktabs style. */
(function () {
  "use strict";
  const I = window.Imago, P = I.P;
  const DEC7 = [3, 2, 2, 2, 2, 2, 3];
  const best = (vals) => { const v = vals.filter((x) => x != null); return v.length ? Math.max(...v) : null; };

  function reveal(table) {
    table.classList.add("reveal");
    table.querySelectorAll("tbody tr").forEach((tr, i) => (tr.style.transitionDelay = `${I.dur(Math.min(i * 35, 600))}ms`));
    I.reveal(table);
  }
  const rel = (v, b) => (v == null || b == null ? null : ((v - b) / b) * 100);

  /* crosshair: hovering a score cell highlights its row and its column (header included); info(td, col) gives the
     tooltip card. first = index of the first score cell in a row. */
  function crosshair(table, first, info) {
    const heads = [...table.querySelectorAll("thead tr:last-child th")];
    const bodyRows = [...table.querySelectorAll("tbody tr:not(.group)")];
    const set = (col, td, on) => {
      table.classList.toggle("xh", on);
      bodyRows.forEach((tr) => tr.cells[first + col] && tr.cells[first + col].classList.toggle("col-on", on));
      if (heads[col]) heads[col].classList.toggle("col-on", on);
      td.classList.toggle("cell-on", on);
      td.parentElement.classList.toggle("row-on", on);
    };
    bodyRows.forEach((tr) => [...tr.cells].slice(first).forEach((td, col) => I.interactEl(td, {
      enter(ev) { set(col, td, true); I.tip.show(info(td, col), ev); },
      move(ev) { I.tip.move(ev); },
      leave() { set(col, td, false); I.tip.hide(); },
    })));
  }

  /* ---------------------------------------------------------------- Tab. 1: RL with each reward */
  I.register("rewardTable", (el) => {
    const wrap = el.querySelector(".table-wrap");
    const cols = P.benchmarks.map((b) => b.name);
    let h = `<table class="tbl"><thead>
      <tr><th class="l" rowspan="2">Reward</th><th class="span" colspan="3"><span class="reg" style="color:var(--short)">Short</span></th>
      <th class="span" colspan="2"><span class="reg" style="color:var(--medium)">Medium</span></th><th class="span" colspan="2"><span class="reg" style="color:var(--long)">Long</span></th>
      <th class="span"><span class="reg">Appeal</span></th></tr>
      <tr>${cols.map((c) => `<th>${I.twoLine(c).join("<br>")}</th>`).join("")}<th>PickScore</th></tr></thead><tbody>`;
    Object.entries(P.rewardRL).forEach(([model, rows]) => {
      h += `<tr class="group"><td colspan="9">${model}</td></tr>`;
      const top = cols.map((_, j) => best(rows.map((r) => r.scores[j])));
      const topPick = best(rows.map((r) => r.pick));
      rows.forEach((r) => {
        h += `<tr class="${r.reward === "PromptScore" ? "ours" : ""}" data-m="${I.esc(model)}" data-r="${I.esc(r.reward)}"><td class="l">${r.reward === "Base" ? "Base (no RL)" : r.reward}</td>`;
        r.scores.forEach((v, j) => (h += `<td class="${v === top[j] ? "best" : ""}">${I.fmt(v, DEC7[j])}</td>`));
        h += `<td class="${r.pick === topPick ? "best" : ""}">${I.fmt(r.pick, 2)}</td></tr>`;
      });
    });
    wrap.innerHTML = h + "</tbody></table>";
    const table = wrap.querySelector("table");
    reveal(table);
    const COLS = cols.concat(["PickScore (DrawBench)"]);
    crosshair(table, 1, (td, col) => {
      const tr = td.parentElement, model = tr.dataset.m, rows = P.rewardRL[model];
      const r = rows.find((q) => q.reward === tr.dataset.r), base = rows.find((q) => q.reward === "Base");
      const val = (q) => (col < cols.length ? q.scores[col] : q.pick);
      const v = val(r), d = r === base ? null : rel(v, val(base));
      const ranked = rows.slice().sort((a, b) => val(b) - val(a));
      return I.card({ title: r.reward === "Base" ? "Base (no RL)" : r.reward, color: r.reward === "PromptScore" ? "#3b82f6" : null, sub: `${model} · ${COLS[col]}`,
        rows: ranked.map((q) => ({ k: q.reward === "Base" ? "Base (no RL)" : q.reward, v: I.fmt(val(q), col < cols.length ? DEC7[col] : 2) + (q === base || rel(val(q), val(base)) == null ? "" : ` <span class="tc-d ${rel(val(q), val(base)) >= 0 ? "up" : "dn"}">${I.pct(rel(val(q), val(base)), 1)}</span>`), on: q === r })),
        note: d == null ? "The base model before RL." : `${I.pct(d, 1)} over the base model.` });
    });
    return {};
  });

  /* ---------------------------------------------------------------- Tab. 5: comparison with competitive models */
  I.register("mainTable", (el) => {
    const wrap = el.querySelector(".table-wrap");
    const cols = ["T2I-CompBench", "TIIF-Bench", "SpatialGenEval", "T2I-CoReBench", "LongBench-T2I"];
    const DEC = [3, 2, 2, 2, 3];
    const groups = [];
    P.main.forEach((r) => {
      let g = groups[groups.length - 1];
      if (!g || g.name !== r.group) groups.push((g = { name: r.group, rows: [] }));
      g.rows.push(r);
    });
    const LABEL = { "Proprietary Model": "Proprietary", "Unified Multimodal Model": "Unified multimodal", "Diffusion / Flow Matching": "Diffusion and flow matching", "4B models": "4B models", "6B models": "6B models" };
    let h = `<table class="tbl"><thead>
      <tr><th class="l" rowspan="2">Model</th><th rowspan="2">Size</th><th class="span" colspan="3"><span class="reg" style="color:var(--short)">Short</span></th>
      <th class="span"><span class="reg" style="color:var(--medium)">Medium</span></th><th class="span"><span class="reg" style="color:var(--long)">Long</span></th>
      <th class="span"><span class="reg">Appeal</span></th></tr>
      <tr>${cols.map((c) => `<th>${I.twoLine(c).join("<br>")}</th>`).join("")}<th>PickScore</th></tr></thead><tbody>`;
    groups.forEach((g) => {
      h += `<tr class="group"><td colspan="8">${LABEL[g.name] || g.name}</td></tr>`;
      const top = cols.map((_, j) => best(g.rows.map((r) => r.scores[j])));
      const topPick = best(g.rows.map((r) => r.pick));
      g.rows.forEach((r) => {
        const ours = r.model.startsWith("Imago");
        const name = ours ? `<i>Imago</i>${r.model.slice(5)}` : r.model;
        h += `<tr class="${ours ? "ours" : ""}" data-i="${P.main.indexOf(r)}"><td class="l">${name}</td><td class="sz">${r.size == null ? "–" : r.size + "B"}</td>`;
        r.scores.forEach((v, j) => (h += `<td class="${v === top[j] ? "best" : ""}">${I.fmt(v, DEC[j])}</td>`));
        h += `<td class="${r.pick != null && r.pick === topPick ? "best" : ""}">${I.fmt(r.pick, 2)}</td></tr>`;
      });
    });
    wrap.innerHTML = h + "</tbody></table>";
    const table = wrap.querySelector("table");
    reveal(table);
    const COLS = cols.concat(["PickScore (DrawBench)"]);
    const BASE = { "Imago-4B": (q) => q.model === "FLUX.2-Klein-Base" && q.size === 4, "Imago-6B": (q) => q.model === "Z-Image" && q.size === 6 };
    crosshair(table, 2, (td, col) => {
      const r = P.main[+td.parentElement.dataset.i];
      const val = (q) => (col < cols.length ? q.scores[col] : q.pick), dec = col < cols.length ? DEC[col] : 2;
      const ours = r.model.startsWith("Imago"), name = (q) => (q.model.startsWith("Imago") ? `<i>Imago</i>${q.model.slice(5)}` : q.model);
      const group = P.main.filter((q) => q.group === r.group && val(q) != null).sort((a, b) => val(b) - val(a));
      const rows = group.map((q) => ({ k: name(q) + (q.size ? ` <span class="tc-s">${q.size}B</span>` : ""), v: I.fmt(val(q), dec), on: q === r }));
      let note = val(r) == null ? "Not reported." : `Rank ${group.indexOf(r) + 1} of ${group.length} in this group.`;
      if (ours) {
        const base = P.main.find(BASE[r.model]);
        if (base && val(base) != null) note = `${I.pct(rel(val(r), val(base)), 1)} over ${base.model}-${base.size}B, its base model.`;
      }
      return I.card({ title: name(r), color: ours ? "#3b82f6" : null, sub: `${COLS[col]} · ${LABEL[r.group] || r.group}`, rows, note });
    });
    return {};
  });
})();
