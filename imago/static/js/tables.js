/* Tables: the paper's Tab. 1 (+ Tab. 4's PickScore column) and Tab. 5, in booktabs style. */
(function () {
  "use strict";
  const I = window.Imago, P = I.P;
  const DEC7 = [3, 2, 2, 2, 2, 2, 3];
  const best = (vals) => { const v = vals.filter((x) => x != null); return v.length ? Math.max(...v) : null; };

  function reveal(table) {
    table.classList.add("reveal");
    table.querySelectorAll("tbody tr").forEach((tr, i) => (tr.style.transitionDelay = `${Math.min(i * 35, 600)}ms`));
    I.reveal(table);
  }

  /* ---------------------------------------------------------------- Tab. 1: RL with each reward */
  I.register("rewardTable", (el) => {
    const wrap = el.querySelector(".table-wrap");
    const cols = P.benchmarks.map((b) => b.name);
    let h = `<table class="tbl"><thead>
      <tr><th class="l" rowspan="2">Reward</th><th class="span" colspan="3"><span class="reg" style="color:var(--short)">Short</span></th>
      <th class="span" colspan="2"><span class="reg" style="color:var(--medium)">Medium</span></th><th class="span" colspan="2"><span class="reg" style="color:var(--long)">Long</span></th>
      <th class="span"><span class="reg">Appeal</span></th></tr>
      <tr>${cols.map((c) => `<th>${c.replace(/-(?=[A-Z])/, "-<br>")}</th>`).join("")}<th>PickScore</th></tr></thead><tbody>`;
    Object.entries(P.rewardRL).forEach(([model, rows]) => {
      h += `<tr class="group"><td colspan="9">${model}</td></tr>`;
      const top = cols.map((_, j) => best(rows.map((r) => r.scores[j])));
      const topPick = best(rows.map((r) => r.pick));
      rows.forEach((r) => {
        h += `<tr class="${r.reward === "PromptScore" ? "ours" : ""}"><td class="l">${r.reward === "Base" ? "Base (no RL)" : r.reward}</td>`;
        r.scores.forEach((v, j) => (h += `<td class="${v === top[j] ? "best" : ""}">${I.fmt(v, DEC7[j])}</td>`));
        h += `<td class="${r.pick === topPick ? "best" : ""}">${I.fmt(r.pick, 2)}</td></tr>`;
      });
    });
    wrap.innerHTML = h + "</tbody></table>";
    reveal(wrap.querySelector("table"));
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
      <tr>${cols.map((c) => `<th>${c.replace(/-(?=[A-Z])/, "-<br>")}</th>`).join("")}<th>PickScore</th></tr></thead><tbody>`;
    groups.forEach((g) => {
      h += `<tr class="group"><td colspan="8">${LABEL[g.name] || g.name}</td></tr>`;
      const top = cols.map((_, j) => best(g.rows.map((r) => r.scores[j])));
      const topPick = best(g.rows.map((r) => r.pick));
      g.rows.forEach((r) => {
        const ours = r.model.startsWith("Imago");
        const name = ours ? `<i>Imago</i>${r.model.slice(5)}` : r.model;
        h += `<tr class="${ours ? "ours" : ""}"><td class="l">${name}</td><td class="sz">${r.size == null ? "–" : r.size + "B"}</td>`;
        r.scores.forEach((v, j) => (h += `<td class="${v === top[j] ? "best" : ""}">${I.fmt(v, DEC[j])}</td>`));
        h += `<td class="${r.pick != null && r.pick === topPick ? "best" : ""}">${I.fmt(r.pick, 2)}</td></tr>`;
      });
    });
    wrap.innerHTML = h + "</tbody></table>";
    reveal(wrap.querySelector("table"));
    return {};
  });
})();
