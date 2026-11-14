/* ==========================================================================
   DECLARATIVE INTERACTIVE TABLES ENGINE
   --------------------------------------------------------------------------
   - Tab. 1 & 2: Reward RL Benchmark Suite (#tbl-reward-rl)
   - Tab. 3:     Reward Backbone Correlation (#tbl-scaling-corr)
   - Tab. 4:     Curriculum & Length Ablation (#tbl-curriculum)
   - Tab. 5:     Main 23-Model Leaderboard (#tbl-leaderboard)
   - Tab. 6:     Training Hyperparameters (#tbl-hyperparams)
   ========================================================================== */
(function () {
  "use strict";

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const COLS_COMP = [
    { key: "comp", idx: 0, label: "CompBench", short: "Comp", dec: 3 },
    { key: "tiif", idx: 1, label: "TIIF-Bench", short: "TIIF", dec: 2 },
    { key: "spatial", idx: 2, label: "SpatialGen", short: "Spatial", dec: 2 },
    { key: "core", idx: 3, label: "CoReBench", short: "CoRe", dec: 2 },
    { key: "lpd", idx: 4, label: "LPD-Bench", short: "LPD", dec: 2 },
    { key: "arena", idx: 5, label: "Arena-Hard", short: "Arena", dec: 2 },
    { key: "long", idx: 6, label: "LongBench", short: "Long", dec: 3 },
  ];

  const COLS_ALL = [
    ...COLS_COMP,
    { key: "pick", idx: 7, label: "PickScore", short: "Pick", dec: 2 },
  ];

  function computeRanks(rows, colKeys) {
    const ranks = {};
    colKeys.forEach((ck) => {
      const vals = [...new Set(rows.map((r) => r._disp[ck]).filter((v) => v != null && Number.isFinite(v)))].sort(
        (a, b) => b - a
      );
      ranks[ck] = { best: vals[0], second: vals[1] };
    });
    return ranks;
  }

  function fmtGain(val, base) {
    if (val == null || base == null || base === 0) return "—";
    const g = ((val - base) / base) * 100;
    const sign = g >= 0 ? "+" : "";
    return `${sign}${g.toFixed(1)}%`;
  }

  /* ========================================================================
     1. REWARD RL TABLE (Tab. 1 + Tab. 2 Combined Explorer)
     ======================================================================== */
  function mountRewardRlTable() {
    const host = document.getElementById("tbl-reward-rl");
    if (!host || !window.PAPER_DATA) return;
    const allRows = window.PAPER_DATA.rewardRlRows.map((r) => {
      const row = { ...r, pick: r.pickscore };
      COLS_COMP.forEach((c) => {
        row[c.key] = r.scores ? r.scores[c.idx] : r[c.key];
      });
      return row;
    });

    let baseFilter = "all"; // "all" | "FLUX.2-Klein-Base-4B" | "Z-Image"
    let unit = "native";    // "native" | "gain"
    let sortCol = null;
    let sortAsc = false;

    function render() {
      const bases = baseFilter === "all" ? ["FLUX.2-Klein-Base-4B", "Z-Image"] : [baseFilter];
      let bodyHtml = "";

      bases.forEach((bName) => {
        const sub = allRows.filter((r) => r.base === bName);
        const baseRow = sub.find((r) => r.isBase);
        const prepared = sub.map((r) => {
          const _disp = {};
          let compGainSum = 0;
          COLS_ALL.forEach((c) => {
            const v = r[c.key];
            const bv = baseRow[c.key];
            _disp[c.key] = unit === "gain" ? ((v - bv) / bv) * 100 : v;
            if (c.key !== "pick") compGainSum += ((v - bv) / bv) * 100;
          });
          _disp.avgGain = compGainSum / 7;
          return { ...r, _disp };
        });

        const ranks = computeRanks(
          prepared.filter((r) => !r.isBase),
          [...COLS_ALL.map((c) => c.key), "avgGain"]
        );

        let ordered = prepared;
        if (sortCol) {
          ordered = [...prepared].sort((a, b) =>
            sortAsc ? a._disp[sortCol] - b._disp[sortCol] : b._disp[sortCol] - a._disp[sortCol]
          );
        }

        if (bases.length > 1) {
          bodyHtml += `<tr class="group-row"><td colspan="10">${esc(bName)}</td></tr>`;
        }
        ordered.forEach((r) => {
          const trCls = r.highlight ? "ours-row" : r.isBase ? "base-row" : "";
          const cells = COLS_ALL.map((c) => {
            const dv = r._disp[c.key];
            const rk = ranks[c.key];
            const cls =
              !r.isBase && dv === rk.best ? "val-best" : !r.isBase && dv === rk.second ? "val-second" : "";
            const txt =
              unit === "gain"
                ? r.isBase
                  ? "0.0%"
                  : `${dv >= 0 ? "+" : ""}${dv.toFixed(1)}%`
                : r[c.key].toFixed(c.dec);
            return `<td class="${cls}">${txt}</td>`;
          }).join("");

          const gVal = r._disp.avgGain;
          const gCls = r.isBase ? "" : gVal >= 0 ? "val-pos" : "val-neg";
          const gTxt = r.isBase ? "Base" : `${gVal >= 0 ? "+" : ""}${gVal.toFixed(1)}%`;
          const warnTag = r.warn
            ? ` <span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-weight:700">${esc(
                r.warn
              )}</span>`
            : "";

          bodyHtml += `<tr class="${trCls}">
            <td>${esc(r.reward)}${r.highlight ? ' <span style="color:#1d4ed8;font-size:11px">★</span>' : ""}${warnTag}</td>
            ${cells}
            <td class="${gCls}">${gTxt}</td>
          </tr>`;
        });
      });

      const ths = [
        ...COLS_ALL.map((c) => ({ key: c.key, label: c.short })),
        { key: "avgGain", label: "Avg Δ%" },
      ]
        .map((c) => {
          const active = sortCol === c.key;
          const arrow = active ? (sortAsc ? " ↑" : " ↓") : "";
          return `<th class="${active ? "sorted" : ""}" data-scol="${c.key}">${esc(c.label)}${arrow}</th>`;
        })
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div class="seg-group">
            <button type="button" class="seg-btn ${baseFilter === "all" ? "active" : ""}" data-bf="all">Both Backbones</button>
            <button type="button" class="seg-btn ${baseFilter === "FLUX.2-Klein-Base-4B" ? "active" : ""}" data-bf="FLUX.2-Klein-Base-4B">FLUX.2-Klein-Base-4B (500 steps)</button>
            <button type="button" class="seg-btn ${baseFilter === "Z-Image" ? "active" : ""}" data-bf="Z-Image">Z-Image (300 steps)</button>
          </div>
          <div class="seg-group">
            <button type="button" class="seg-btn ${unit === "native" ? "active" : ""}" data-un="native">Native Score</button>
            <button type="button" class="seg-btn ${unit === "gain" ? "active" : ""}" data-un="gain">Relative Gain (%)</button>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-tbl">
            <thead><tr><th>Reward Formulation</th>${ths}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </div>
        <div style="font-size:11.8px;color:#64748b;margin-top:8px">
          <b>Bold</b> = best RL checkpoint per backbone; <span style="text-decoration:underline">underlined</span> = second best. Pick = DrawBench PickScore (×100, Tab. 2). Avg Δ% averages relative gain across the 7 compositional benchmarks. Click any column header to sort.
        </div>
      `;

      host.querySelectorAll("[data-bf]").forEach((b) =>
        b.addEventListener("click", () => {
          baseFilter = b.dataset.bf;
          render();
        })
      );
      host.querySelectorAll("[data-un]").forEach((b) =>
        b.addEventListener("click", () => {
          unit = b.dataset.un;
          render();
        })
      );
      host.querySelectorAll("[data-scol]").forEach((th) =>
        th.addEventListener("click", () => {
          const k = th.dataset.scol;
          if (sortCol === k) sortAsc = !sortAsc;
          else {
            sortCol = k;
            sortAsc = false;
          }
          render();
        })
      );
    }

    render();
  }

  /* ========================================================================
     2. SCALING CORRELATION TABLE (Tab. 3)
     ======================================================================== */
  function mountScalingCorrTable() {
    const host = document.getElementById("tbl-scaling-corr");
    if (!host || !window.PAPER_DATA) return;
    const B = window.PAPER_DATA.benchmarks;
    const rows = window.PAPER_DATA.scalingCorrelations;
    let dispMode = "val"; // "val" | "diff"

    function render() {
      const colMax = B.map((_, bi) => Math.max(...rows.map((r) => r.corrs[bi])));
      const avgMax = Math.max(...rows.map((r) => r.mean));
      const qwen9 = rows.find((r) => r.highlight) || rows[1];

      const trs = rows
        .map((r) => {
          const cells = r.corrs
            .map((v, bi) => {
              const alpha = Math.max(0.05, Math.min(0.28, (v - 0.945) * 5.2));
              const cls = v === colMax[bi] ? "val-best" : "";
              const diff = v - qwen9.corrs[bi];
              const txt =
                dispMode === "diff"
                  ? r === qwen9
                    ? "0.000"
                    : `${diff >= 0 ? "+" : ""}${diff.toFixed(3)}`
                  : v.toFixed(3);
              return `<td class="${cls}" style="background:rgba(37,99,235,${alpha.toFixed(2)})">${txt}</td>`;
            })
            .join("");
          const mDiff = r.mean - qwen9.mean;
          const mTxt =
            dispMode === "diff"
              ? r === qwen9
                ? "0.000"
                : `${mDiff >= 0 ? "+" : ""}${mDiff.toFixed(3)}`
              : r.mean.toFixed(3);
          return `<tr class="${r.highlight ? "ours-row" : ""}">
            <td>${esc(r.model)} <span style="color:#64748b;font-size:11px">(${esc(r.params)})</span>${
            r.highlight ? ' <span style="color:#1d4ed8;font-size:11px">★ Default</span>' : ""
          }</td>
            ${cells}
            <td class="${r.mean === avgMax ? "val-best" : ""}">${mTxt}</td>
          </tr>`;
        })
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <span style="font-size:13px;font-weight:650;color:#334155">Table 3 · Pearson Correlation (r) Between PromptScore Backbones &amp; Benchmark Scores</span>
          <div class="seg-group">
            <button type="button" class="seg-btn ${dispMode === "val" ? "active" : ""}" data-mc="val">Pearson r</button>
            <button type="button" class="seg-btn ${dispMode === "diff" ? "active" : ""}" data-mc="diff">Δ vs. Qwen3.5-9B</button>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-tbl">
            <thead>
              <tr>
                <th>Reward Backbone</th>
                ${B.map((b) => `<th>${esc(b.shortName)}</th>`).join("")}
                <th>Mean r</th>
              </tr>
            </thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
      `;

      host.querySelectorAll("[data-mc]").forEach((b) =>
        b.addEventListener("click", () => {
          dispMode = b.dataset.mc;
          render();
        })
      );
    }

    render();
  }

  /* ========================================================================
     3. CURRICULUM & LENGTH SCHEDULING TABLE (Tab. 4)
     ======================================================================== */
  function mountCurriculumTable() {
    const host = document.getElementById("tbl-curriculum");
    if (!host || !window.PAPER_DATA) return;
    const raw = window.PAPER_DATA.curriculumRaw;
    let unit = "native";

    function render() {
      let body = "";
      Object.entries(raw).forEach(([baseName, map]) => {
        const baseArr = map.Base;
        body += `<tr class="group-row"><td colspan="9">${esc(baseName)}</td></tr>`;

        const entries = Object.entries(map).map(([k, arr]) => {
          const isBase = k === "Base";
          const compGains = arr.slice(0, 7).map((v, i) => ((v - baseArr[i]) / baseArr[i]) * 100);
          const avgGain = compGains.reduce((a, b) => a + b, 0) / 7;
          return { key: k, arr, isBase, highlight: k.includes("→"), avgGain };
        });

        const nonBase = entries.filter((e) => !e.isBase);
        const colBest = COLS_COMP.map((_, ci) => Math.max(...nonBase.map((e) => e.arr[ci])));

        entries.forEach((e) => {
          const trCls = e.highlight ? "ours-row" : e.isBase ? "base-row" : "";
          const cells = COLS_COMP.map((c, ci) => {
            const v = e.arr[ci];
            const cls = !e.isBase && v === colBest[ci] ? "val-best" : "";
            const txt =
              unit === "gain"
                ? e.isBase
                  ? "0.0%"
                  : fmtGain(v, baseArr[ci])
                : v.toFixed(c.dec);
            return `<td class="${cls}">${txt}</td>`;
          }).join("");

          body += `<tr class="${trCls}">
            <td>${esc(e.key)}${e.highlight ? ' <span style="color:#1d4ed8;font-size:11px">★ Ours</span>' : ""}</td>
            ${cells}
            <td class="${e.isBase ? "" : "val-pos"}">${e.isBase ? "Base" : `+${e.avgGain.toFixed(1)}%`}</td>
          </tr>`;
        });
      });

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <span style="font-size:13px;font-weight:650;color:#334155">Table 4 · Prompt Length &amp; Sequential Schedule Comparison</span>
          <div class="seg-group">
            <button type="button" class="seg-btn ${unit === "native" ? "active" : ""}" data-cu="native">Native Score</button>
            <button type="button" class="seg-btn ${unit === "gain" ? "active" : ""}" data-cu="gain">Relative Gain (%)</button>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-tbl">
            <thead>
              <tr>
                <th>Training Corpus / Schedule</th>
                ${COLS_COMP.map((c) => `<th>${esc(c.short)}</th>`).join("")}
                <th>Avg Δ%</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `;

      host.querySelectorAll("[data-cu]").forEach((b) =>
        b.addEventListener("click", () => {
          unit = b.dataset.cu;
          render();
        })
      );
    }

    render();
  }

  /* ========================================================================
     4. MAIN LEADERBOARD (Tab. 5 — 23 Rows, 5-Bench Paper vs 7-Bench Extended)
     ======================================================================== */
  function mountMainLeaderboard() {
    const host = document.getElementById("tbl-leaderboard");
    if (!host || !window.PAPER_DATA) return;
    const rows = window.PAPER_DATA.leaderboard;

    let filter = "all";       // "all" | "pairs" | "compact" | "diff" | "prop"
    let suite = "paper5";     // "paper5" | "full7"
    let showDelta = true;
    let sortCol = null;
    let sortAsc = false;

    const base4B = rows.find((r) => r.isBase === "4b");
    const base6B = rows.find((r) => r.isBase === "6b");

    function activeCols() {
      if (suite === "paper5") {
        return [
          { key: "comp", short: "CompBench", dec: 3 },
          { key: "tiif", short: "TIIF-Bench", dec: 2 },
          { key: "spatial", short: "SpatialGen", dec: 2 },
          { key: "core", short: "CoReBench", dec: 2 },
          { key: "long", short: "LongBench", dec: 3 },
          { key: "pick", short: "PickScore", dec: 2 },
        ];
      }
      return COLS_ALL;
    }

    function render() {
      const cols = activeCols();
      let filtered = rows.filter((r) => {
        if (filter === "all") return true;
        if (filter === "pairs") return r.group === "4B Model Family" || r.group === "6B Model Family";
        if (filter === "prop")
          return r.group === "Proprietary Model" || r.group === "Unified Multimodal Model" || Boolean(r.isOurs);
        if (filter === "diff")
          return r.group === "Diffusion / Flow Matching" || r.group === "4B Model Family" || r.group === "6B Model Family";
        if (filter === "compact") {
          const pNum = parseFloat(r.params);
          return Boolean(r.isOurs) || Boolean(r.isBase) || (Number.isFinite(pNum) && pNum <= 9.0);
        }
        return true;
      });

      const ranks = {};
      cols.forEach((c) => {
        const vals = [...new Set(filtered.map((r) => r[c.key]).filter((v) => v != null))].sort((a, b) => b - a);
        ranks[c.key] = { best: vals[0], second: vals[1] };
      });

      const GROUPS = [
        "Proprietary Model",
        "Unified Multimodal Model",
        "Diffusion / Flow Matching",
        "4B Model Family",
        "6B Model Family",
      ];

      let body = "";
      if (sortCol) {
        const sorted = [...filtered].sort((a, b) =>
          sortAsc ? (a[sortCol] ?? -999) - (b[sortCol] ?? -999) : (b[sortCol] ?? -999) - (a[sortCol] ?? -999)
        );
        body = sorted.map((r) => renderRow(r, cols, ranks)).join("");
      } else {
        GROUPS.forEach((g) => {
          const gRows = filtered.filter((r) => r.group === g);
          if (!gRows.length) return;
          body += `<tr class="group-row"><td colspan="${cols.length + 2}">${esc(g)}</td></tr>`;
          body += gRows.map((r) => renderRow(r, cols, ranks)).join("");
        });
      }

      const ths = cols
        .map((c) => {
          const active = sortCol === c.key;
          return `<th class="${active ? "sorted" : ""}" data-lcol="${c.key}">${esc(c.short)}${
            active ? (sortAsc ? " ↑" : " ↓") : ""
          }</th>`;
        })
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div class="seg-group">
            <button type="button" class="seg-btn ${filter === "all" ? "active" : ""}" data-lf="all">All Models (23)</button>
            <button type="button" class="seg-btn ${filter === "pairs" ? "active" : ""}" data-lf="pairs">4B &amp; 6B Family</button>
            <button type="button" class="seg-btn ${filter === "compact" ? "active" : ""}" data-lf="compact">≤9B Open Models</button>
            <button type="button" class="seg-btn ${filter === "diff" ? "active" : ""}" data-lf="diff">Diffusion &amp; Flow</button>
            <button type="button" class="seg-btn ${filter === "prop" ? "active" : ""}" data-lf="prop">Proprietary &amp; UMM</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div class="seg-group">
              <button type="button" class="seg-btn ${suite === "paper5" ? "active" : ""}" data-ls="paper5">Tab. 5 (5 Benchmarks)</button>
              <button type="button" class="seg-btn ${suite === "full7" ? "active" : ""}" data-ls="full7">Extended 7-Bench Suite</button>
            </div>
            <button type="button" class="replay-btn" id="btn-toggle-delta">${showDelta ? "Hide Δ vs. Base" : "Show Δ vs. Base"}</button>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-tbl">
            <thead>
              <tr>
                <th>Model</th>
                <th>Params</th>
                ${ths}
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <div style="font-size:11.8px;color:#64748b;margin-top:8px">
          <b>Bold</b> = highest in current view; <span style="text-decoration:underline">underlined</span> = second highest. Click any benchmark header to sort globally${
            sortCol
              ? ' · <button type="button" id="btn-reset-lsort" style="border:none;background:none;color:#2563eb;font-weight:600;cursor:pointer;padding:0">Reset group order</button>'
              : ""
          }.
        </div>
      `;

      host.querySelectorAll("[data-lf]").forEach((b) =>
        b.addEventListener("click", () => {
          filter = b.dataset.lf;
          render();
        })
      );
      host.querySelectorAll("[data-ls]").forEach((b) =>
        b.addEventListener("click", () => {
          suite = b.dataset.ls;
          sortCol = null;
          render();
        })
      );
      host.querySelector("#btn-toggle-delta").addEventListener("click", () => {
        showDelta = !showDelta;
        render();
      });
      host.querySelectorAll("[data-lcol]").forEach((th) =>
        th.addEventListener("click", () => {
          const k = th.dataset.lcol;
          if (sortCol === k) sortAsc = !sortAsc;
          else {
            sortCol = k;
            sortAsc = false;
          }
          render();
        })
      );
      const resetBtn = host.querySelector("#btn-reset-lsort");
      if (resetBtn)
        resetBtn.addEventListener("click", () => {
          sortCol = null;
          render();
        });
    }

    function renderRow(r, cols, ranks) {
      const trCls = r.isOurs ? "ours-row" : r.isBase ? "base-row" : "";
      const refBase = r.isOurs === "4b" ? base4B : r.isOurs === "6b" ? base6B : null;

      const cells = cols
        .map((c) => {
          const v = r[c.key];
          if (v == null) return `<td style="color:#94a3b8">—</td>`;
          const rk = ranks[c.key];
          const cls = v === rk.best ? "val-best" : v === rk.second ? "val-second" : "";
          let deltaBadge = "";
          if (showDelta && refBase && refBase[c.key] != null) {
            const diff = v - refBase[c.key];
            deltaBadge = ` <span style="font-size:10.5px;color:#15803d;font-weight:700">(+${diff.toFixed(c.dec)})</span>`;
          }
          return `<td class="${cls}">${v.toFixed(c.dec)}${deltaBadge}</td>`;
        })
        .join("");

      return `<tr class="${trCls}">
        <td>${esc(r.model)}${r.isOurs ? ' <span style="color:#1d4ed8;font-size:11px">★ Ours</span>' : ""}</td>
        <td style="text-align:right;color:#64748b">${esc(r.params)}</td>
        ${cells}
      </tr>`;
    }

    render();
  }

  /* ========================================================================
     5. HYPERPARAMETERS TABLE (Appendix Tab. 6)
     ======================================================================== */
  function mountHyperparamTable() {
    const host = document.getElementById("tbl-hyperparams");
    if (!host || !window.PAPER_DATA) return;
    const rows = window.PAPER_DATA.hyperparams;

    const trs = rows
      .map(
        ([k, v4, v6]) => `<tr>
          <td>${esc(k)}</td>
          <td style="text-align:left;font-family:var(--font-sans)">${esc(v4)}</td>
          <td style="text-align:left;font-family:var(--font-sans)">${esc(v6)}</td>
        </tr>`
      )
      .join("");

    host.innerHTML = `
      <div class="table-scroll">
        <table class="data-tbl">
          <thead>
            <tr>
              <th>Hyperparameter</th>
              <th style="text-align:left">Imago-4B</th>
              <th style="text-align:left">Imago-6B</th>
            </tr>
          </thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
    `;
  }

  window.ImagoTables = {
    init() {
      mountRewardRlTable();
      mountScalingCorrTable();
      mountCurriculumTable();
      mountMainLeaderboard();
      mountHyperparamTable();
    },
  };
})();
