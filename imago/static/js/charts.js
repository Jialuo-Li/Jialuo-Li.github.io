/* ==========================================================================
   INTERACTIVE RESPONSIVE SVG CHARTS ENGINE
   --------------------------------------------------------------------------
   Renders crisp, data-driven interactive figures matching every plot in the
   Imago paper while adding hover tooltips, click-to-inspect drilldowns,
   series isolation, and smooth view transitions.
   ========================================================================== */
(function () {
  "use strict";

  const r1 = (v) => Math.round(v * 10) / 10;
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  /* Global cursor-following tooltip */
  let tipEl = null;
  function ensureTip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "viz-tooltip";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(ev, html) {
    const el = ensureTip();
    el.innerHTML = html;
    el.classList.add("visible");
    moveTip(ev);
  }
  function moveTip(ev) {
    if (!tipEl) return;
    const pad = 14;
    const rect = tipEl.getBoundingClientRect();
    let x = ev.clientX + pad;
    let y = ev.clientY + pad;
    if (x + rect.width > window.innerWidth - 10) x = ev.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - 10) y = ev.clientY - rect.height - pad;
    tipEl.style.left = `${Math.max(8, x)}px`;
    tipEl.style.top = `${Math.max(8, y)}px`;
  }
  function hideTip() {
    if (tipEl) tipEl.classList.remove("visible");
  }

  function linScale(d0, d1, r0, r1v) {
    return (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1v - r0);
  }
  function logScale(d0, d1, r0, r1v) {
    const l0 = Math.log10(d0), l1 = Math.log10(d1);
    return (v) => r0 + ((Math.log10(Math.max(v, 1e-6)) - l0) / (l1 - l0)) * (r1v - r0);
  }

  function svgMarker(shape, cx, cy, rad, fill, stroke = "#fff", sw = 1.6, extra = "") {
    const pts = (arr) => arr.map((p) => `${r1(p[0])},${r1(p[1])}`).join(" ");
    if (shape === "square") {
      const s = rad * 1.75;
      return `<rect x="${r1(cx - s / 2)}" y="${r1(cy - s / 2)}" width="${r1(s)}" height="${r1(s)}" rx="1.6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
    }
    if (shape === "tri-up") {
      return `<polygon points="${pts([[cx, cy - rad * 1.25], [cx + rad * 1.15, cy + rad * 0.9], [cx - rad * 1.15, cy + rad * 0.9]])}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
    }
    if (shape === "diamond") {
      return `<polygon points="${pts([[cx, cy - rad * 1.3], [cx + rad * 1.1, cy], [cx, cy + rad * 1.3], [cx - rad * 1.1, cy]])}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
    }
    if (shape === "plus") {
      const a = rad * 0.42, b = rad * 1.15;
      return `<polygon points="${pts([[cx - a, cy - b], [cx + a, cy - b], [cx + a, cy - a], [cx + b, cy - a], [cx + b, cy + a], [cx + a, cy + a], [cx + a, cy + b], [cx - a, cy + b], [cx - a, cy + a], [cx - b, cy + a], [cx - b, cy - a], [cx - a, cy - a]])}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
    }
    if (shape === "cross") {
      const d = rad * 0.95;
      return `<g ${extra}><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rad * 1.05)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><path d="M${r1(cx - d * 0.52)},${r1(cy - d * 0.52)} L${r1(cx + d * 0.52)},${r1(cy + d * 0.52)} M${r1(cx + d * 0.52)},${r1(cy - d * 0.52)} L${r1(cx - d * 0.52)},${r1(cy + d * 0.52)}" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
    }
    if (shape === "hex" || shape === "pent") {
      const n = shape === "hex" ? 6 : 5;
      const poly = Array.from({ length: n }, (_, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return [cx + rad * 1.12 * Math.cos(ang), cy + rad * 1.12 * Math.sin(ang)];
      });
      return `<polygon points="${pts(poly)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
    }
    return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rad)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
  }

  /* ========================================================================
     MODULE 2A (§2 Left): Preference-Evaluator Correlation Matrix + Pair Scatter
     ======================================================================== */
  function mountPrefPairgrid() {
    const host = document.getElementById("viz-pref-pairgrid");
    if (!host || !window.PAPER_DATA) return;
    const P = window.PAPER_DATA.prefAlignment;
    const rews = P.rewards;
    let selA = "HPSv3";
    let selB = "PickScore";

    function render() {
      const rVal = P.pearson[selA][selB];
      const rhoVal = P.spearman[selA][selB];
      const metaA = rews.find((x) => x.key === selA);
      const metaB = rews.find((x) => x.key === selB);

      let matrixRows = `<tr><th style="text-align:left;padding:6px 8px;font-size:11px;color:#64748b">Pearson r</th>${rews
        .map((rw) => `<th style="padding:6px 6px;font-size:11px;color:${rw.color}">${esc(rw.name)}</th>`)
        .join("")}</tr>`;
      rews.forEach((rRow) => {
        matrixRows += `<tr><td style="padding:6px 8px;font-weight:700;font-size:11.5px;color:${rRow.color}">${esc(rRow.name)}</td>`;
        rews.forEach((rCol) => {
          const val = P.pearson[rRow.key][rCol.key];
          const diag = rRow.key === rCol.key;
          const active =
            (rRow.key === selA && rCol.key === selB) || (rRow.key === selB && rCol.key === selA);
          const bg = diag
            ? "#f1f5f9"
            : `rgba(37, 99, 235, ${(0.06 + Math.max(0, val - 0.35) * 0.42).toFixed(2)})`;
          matrixRows += `<td data-ra="${rRow.key}" data-rb="${rCol.key}" style="padding:7px 6px;text-align:center;font-family:var(--font-mono);font-size:12px;font-weight:${
            active ? "750" : "600"
          };background:${bg};border-radius:6px;cursor:${diag ? "default" : "pointer"};outline:${
            active ? "2px solid #2563eb" : "none"
          }">${diag ? "1.00" : val.toFixed(2)}</td>`;
        });
        matrixRows += `</tr>`;
      });

      const meanBars = rews
        .map((rw) => {
          const pct = Math.round((rw.meanR / 0.8) * 100);
          return `<div style="display:grid;grid-template-columns:96px 1fr 44px;align-items:center;gap:8px;margin-bottom:5px;font-size:12px">
            <span style="font-weight:${rw.selected ? 700 : 600};color:${rw.selected ? "#15803d" : "#334155"}">${esc(rw.name)}${rw.selected ? " ★" : ""}</span>
            <div style="height:8px;background:#eef2f6;border-radius:99px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${rw.color};border-radius:99px"></div>
            </div>
            <span style="font-family:var(--font-mono);font-size:11.5px;text-align:right;font-weight:600">${rw.meanR.toFixed(2)}</span>
          </div>`;
        })
        .join("");

      /* Scatter SVG of selected pair across the 133 z-scored cells */
      const W = 400, H = 200, padL = 42, padR = 16, padT = 16, padB = 34;
      const sx = linScale(-2.6, 2.6, padL, W - padR);
      const sy = linScale(-2.6, 2.6, H - padB, padT);
      const regColors = { Short: "#3b82f6", Medium: "#f59e0b", Long: "#ef4444" };

      const xs = P.points.map((pt) => pt[selA]);
      const ys = P.points.map((pt) => pt[selB]);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
      const den = xs.reduce((s, x) => s + (x - mx) * (x - mx), 0) || 1;
      const slope = num / den;
      const icpt = my - slope * mx;

      const dots = P.points
        .map(
          (pt, idx) =>
            `<circle class="pref-pt" data-idx="${idx}" cx="${r1(sx(pt[selA]))}" cy="${r1(sy(pt[selB]))}" r="4.1" fill="${
              regColors[pt.regime] || "#3b82f6"
            }" fill-opacity="0.78" stroke="#fff" stroke-width="0.9" style="cursor:pointer"/>`
        )
        .join("");

      host.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">Mean Off-Diagonal Correlation (r̄) — Lower = Less Redundant</div>
        ${meanBars}
        <div style="margin-top:12px;font-size:11.5px;color:#64748b;margin-bottom:4px">Click any off-diagonal cell to inspect 133 pooled (model, benchmark) z-scores:</div>
        <table style="width:100%;border-collapse:separate;border-spacing:3px">${matrixRows}</table>
        <div style="margin-top:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px">
            <strong>${esc(metaA.name)} vs. ${esc(metaB.name)}</strong>
            <span style="font-family:var(--font-mono);color:#1d4ed8;font-weight:700">r = ${rVal.toFixed(2)} · ρ = ${rhoVal.toFixed(2)}</span>
          </div>
          <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pairwise preference reward scatter">
            <line x1="${padL}" y1="${sy(0)}" x2="${W - padR}" y2="${sy(0)}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
            <line x1="${sx(0)}" y1="${padT}" x2="${sx(0)}" y2="${H - padB}" stroke="#e2e8f0" stroke-dasharray="3 3"/>
            <line x1="${sx(-2.3)}" y1="${r1(sy(slope * -2.3 + icpt))}" x2="${sx(2.3)}" y2="${r1(sy(slope * 2.3 + icpt))}" stroke="#1e293b" stroke-width="1.8" stroke-dasharray="5 3" opacity="0.7"/>
            ${dots}
            <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#94a3b8"/>
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#94a3b8"/>
            <text x="${(padL + W - padR) / 2}" y="${H - 7}" text-anchor="middle" font-size="11" fill="#475569">${esc(metaA.name)} (z-score)</text>
            <text x="13" y="${(padT + H - padB) / 2}" text-anchor="middle" font-size="11" fill="#475569" transform="rotate(-90 13 ${(padT + H - padB) / 2})">${esc(metaB.name)} (z)</text>
          </svg>
        </div>
      `;

      host.querySelectorAll("td[data-ra]").forEach((td) => {
        td.addEventListener("click", () => {
          const a = td.dataset.ra, b = td.dataset.rb;
          if (a === b) return;
          selA = a;
          selB = b;
          render();
        });
      });

      host.querySelectorAll(".pref-pt").forEach((el) => {
        el.addEventListener("mouseenter", (ev) => {
          const pt = P.points[+el.dataset.idx];
          showTip(
            ev,
            `<div class="tt-title">${esc(pt.model)}</div>
             <div class="tt-sub">${esc(pt.benchmark)} (${pt.regime})</div>
             <div>${esc(metaA.name)}: <b>${pt[selA].toFixed(2)}σ</b> · ${esc(metaB.name)}: <b>${pt[selB].toFixed(2)}σ</b></div>`
          );
        });
        el.addEventListener("mousemove", moveTip);
        el.addEventListener("mouseleave", hideTip);
      });
    }

    render();
  }

  /* ========================================================================
     MODULE 2B (§2 Right): 7-Benchmark Overview Bubble Chart + Live Model Ranking
     ======================================================================== */
  function mountBenchOverview() {
    const host = document.getElementById("viz-bench-overview");
    if (!host || !window.PAPER_DATA) return;
    const B = window.PAPER_DATA.benchmarks;
    let activeKey = "longbencht2i";

    const regStyle = {
      Short: { fill: "#93c5fd", stroke: "#1d4ed8" },
      Medium: { fill: "#fcd34d", stroke: "#b45309" },
      Long: { fill: "#fca5a5", stroke: "#b91c1c" },
    };

    function render() {
      const W = 490, H = 262, padL = 48, padR = 26, padT = 22, padB = 40;
      const sx = logScale(6.5, 760, padL, W - padR);
      const sy = linScale(0.52, 0.90, H - padB, padT);

      let grid = "";
      [0.55, 0.65, 0.75, 0.85].forEach((yv) => {
        const y = r1(sy(yv));
        grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eef2f6"/>
                 <text x="${padL - 7}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64748b">${yv.toFixed(2)}</text>`;
      });
      [10, 50, 100, 300, 500].forEach((xv) => {
        const x = r1(sx(xv));
        grid += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="#f1f5f9" stroke-dasharray="3 3"/>
                 <text x="${x}" y="${H - padB + 16}" text-anchor="middle" font-size="11" fill="#64748b">${xv}</text>`;
      });

      /* Downward difficulty trend arrow */
      const trend = `
        <defs><marker id="arr-trend" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,1 L9,5 L0,9 z" fill="#94a3b8"/></marker></defs>
        <path d="M${r1(sx(11))},${r1(sy(0.80))} Q${r1(sx(120))},${r1(sy(0.82))} ${r1(sx(500))},${r1(sy(0.60))}" fill="none" stroke="#cbd5e1" stroke-width="2.2" stroke-dasharray="5 4" marker-end="url(#arr-trend)"/>
      `;

      const offsets = {
        t2icompbench: [8, -24],
        tiifbench: [-14, -20],
        spatialgeneval: [8, 28],
        t2icorebench_composition: [-8, 26],
        lpdbench: [-6, -20],
        arenat2ihard: [-8, -18],
        longbencht2i: [-58, 4],
      };

      let bubbles = "";
      B.forEach((bm) => {
        const cx = sx(bm.avgWords);
        const cy = sy(bm.avgNorm);
        const rad = 9 + Math.sqrt((bm.count - 400) / 1400) * 12;
        const st = regStyle[bm.regime];
        const sel = bm.key === activeKey;
        const [dx, dy] = offsets[bm.key] || [0, -18];
        bubbles += `
          <g class="bm-bubble" data-key="${bm.key}" style="cursor:pointer">
            ${sel ? `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rad + 5)}" fill="none" stroke="${st.stroke}" stroke-width="2" stroke-dasharray="3 2"/>` : ""}
            <circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rad)}" fill="${st.fill}" fill-opacity="0.88" stroke="${sel ? st.stroke : "#fff"}" stroke-width="${sel ? 2.4 : 1.6}"/>
            <text x="${r1(cx + dx)}" y="${r1(cy + dy)}" text-anchor="middle" font-size="11.2" font-weight="${sel ? 750 : 600}" fill="${sel ? "#0f172a" : "#334155"}">${esc(bm.name)}</text>
          </g>`;
      });

      const cur = B.find((x) => x.key === activeKey) || B[0];
      const sortedModels = Object.entries(cur.modelScores).sort((a, b) => b[1] - a[1]);
      const top6 = sortedModels.slice(0, 6);
      const maxS = cur.scaleMax;

      const rankHtml = top6
        .map(([m, sc]) => {
          const pct = Math.max(6, Math.min(100, ((sc - cur.scaleMin) / (maxS - cur.scaleMin)) * 100));
          return `<div class="bi-bar-row">
            <span class="bi-bar-name" title="${esc(m)}">${esc(m)}</span>
            <div class="bi-bar-track"><div class="bi-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
            <span class="bi-bar-val">${sc.toFixed(2)}</span>
          </div>`;
        })
        .join("");

      host.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;font-size:11.5px">
          <span class="regime-badge regime-Short">● Short (&lt;100w)</span>
          <span class="regime-badge regime-Medium">● Medium (100–300w)</span>
          <span class="regime-badge regime-Long">● Long (&gt;300w)</span>
          <span style="color:#64748b;margin-left:auto">Bubble area ∝ prompt count · Click bubble to inspect</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="7 compositional benchmarks prompt length vs score">
          ${grid}${trend}${bubbles}
          <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#64748b"/>
          <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#64748b"/>
          <text x="${(padL + W - padR) / 2}" y="${H - 6}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#334155">Average Prompt Length (words, log scale)</text>
          <text x="13" y="${(padT + H - padB) / 2}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#334155" transform="rotate(-90 13 ${(padT + H - padB) / 2})">Normalized Mean Score</text>
        </svg>
        <div class="bench-inspector">
          <div class="bi-top">
            <div>
              <span class="bi-name">${esc(cur.name)}</span>
              <span class="regime-badge regime-${cur.regime}" style="margin-left:6px">${cur.regime} · ~${Math.round(cur.avgWords)} words · ${cur.count.toLocaleString()} prompts</span>
            </div>
            <span style="font-family:var(--font-mono);font-size:11.5px;color:#1d4ed8;font-weight:700">19-Model Avg: ${(cur.avgNorm * 100).toFixed(1)}%</span>
          </div>
          <div style="font-size:12px;color:#475569;line-height:1.45">${esc(cur.protocol)}</div>
          <div style="font-size:11px;font-weight:700;color:#64748b;margin-top:8px;text-transform:uppercase;letter-spacing:0.05em">Top-6 Baseline Models on ${esc(cur.name)} (${cur.unit})</div>
          <div class="bi-bars">${rankHtml}</div>
        </div>
      `;

      host.querySelectorAll(".bm-bubble").forEach((g) => {
        const bm = B.find((x) => x.key === g.dataset.key);
        g.addEventListener("click", () => {
          activeKey = bm.key;
          render();
        });
        g.addEventListener("mouseenter", (ev) => {
          showTip(
            ev,
            `<div class="tt-title">${esc(bm.name)} (${bm.regime})</div>
             <div>Prompts: <b>${bm.count.toLocaleString()}</b> · Avg length: <b>${bm.avgWords.toFixed(1)} words</b></div>
             <div>19-model normalized avg: <b>${(bm.avgNorm * 100).toFixed(1)}%</b></div>`
          );
        });
        g.addEventListener("mousemove", moveTip);
        g.addEventListener("mouseleave", hideTip);
      });
    }

    render();
  }

  /* ========================================================================
     MODULE 4 (§3.1): Reward vs. Judge Alignment Explorer (Fig. 2 & Fig. 3)
     ======================================================================== */
  function mountRewardAlignment() {
    const host = document.getElementById("viz-reward-align");
    if (!host || !window.PAPER_DATA) return;
    const B = window.PAPER_DATA.benchmarks;
    const metaList = window.PAPER_DATA.rewardSeriesMeta;
    const align = window.PAPER_DATA.rewardAlignment;

    let mode = "classic"; // "classic" (Fig. 2) | "vqa" (Fig. 3)
    let metric = "r";     // "r" | "rho"
    let selBench = "longbencht2i";
    const hidden = new Set();

    function activeSeries() {
      return metaList.filter((m) => m.group === "both" || m.group === mode);
    }

    function render() {
      const series = activeSeries();
      const bmObj = B.find((x) => x.key === selBench) || B[6];
      const benchData = align[selBench];

      const legendHtml = series
        .map((s) => {
          const isMuted = hidden.has(s.key);
          const curStat = benchData.rewards[s.key];
          const statStr = curStat.collapsed
            ? "collapsed"
            : `${metric === "r" ? "r" : "ρ"}=${curStat[metric].toFixed(2)}`;
          return `<button type="button" class="legend-chip ${isMuted ? "muted" : ""}" data-rkey="${s.key}">
            <span class="legend-swatch" style="background:${s.color}"></span>
            <span>${esc(s.short)}</span>
            <span style="font-family:var(--font-mono);font-size:11px;color:#64748b">${statStr}</span>
          </button>`;
        })
        .join("");

      /* Left SVG: Correlation curve across all 7 benchmarks */
      const LW = 510, LH = 290, lPadL = 46, lPadR = 18, lPadT = 18, lPadB = 58;
      const yMin = mode === "vqa" ? -0.05 : -0.95;
      const sxL = (i) => lPadL + (i / (B.length - 1)) * (LW - lPadL - lPadR);
      const syL = linScale(yMin, 1.04, LH - lPadB, lPadT);

      let lGrid = "";
      const yTicks = mode === "vqa" ? [0.0, 0.25, 0.5, 0.75, 1.0] : [-0.8, -0.4, 0.0, 0.5, 1.0];
      yTicks.forEach((yv) => {
        const y = r1(syL(yv));
        lGrid += `<line x1="${lPadL}" y1="${y}" x2="${LW - lPadR}" y2="${y}" stroke="${yv === 0 ? "#cbd5e1" : "#eef2f6"}" ${yv === 0 ? 'stroke-dasharray="4 3"' : ""}/>
                  <text x="${lPadL - 7}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64748b">${yv.toFixed(2)}</text>`;
      });

      B.forEach((bm, idx) => {
        const x = r1(sxL(idx));
        const active = bm.key === selBench;
        lGrid += `<g class="align-bcol" data-bkey="${bm.key}" style="cursor:pointer">
          <rect x="${r1(x - 28)}" y="${lPadT}" width="56" height="${LH - lPadT - lPadB}" fill="${active ? "rgba(37,99,235,0.08)" : "transparent"}" rx="6"/>
          <line x1="${x}" y1="${lPadT}" x2="${x}" y2="${LH - lPadB}" stroke="${active ? "#3b82f6" : "#f1f5f9"}"/>
          <text x="${x}" y="${LH - lPadB + 16}" text-anchor="end" font-size="10.8" font-weight="${active ? 750 : 500}" fill="${active ? "#1d4ed8" : "#475569"}" transform="rotate(-26 ${x} ${LH - lPadB + 16})">${esc(bm.shortName)}</text>
        </g>`;
      });

      let lLines = "";
      [...series.filter((s) => !s.highlight), ...series.filter((s) => s.highlight)].forEach((s) => {
        if (hidden.has(s.key)) return;
        const pts = [];
        B.forEach((bm, idx) => {
          const st = align[bm.key].rewards[s.key];
          const val = st.collapsed ? 0.0 : st[metric];
          pts.push([sxL(idx), syL(val), bm, st]);
        });
        const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${r1(p[0])},${r1(p[1])}`).join(" ");
        lLines += `<path d="${pathD}" fill="none" stroke="${s.color}" stroke-width="${s.highlight ? 3.2 : 2.0}" opacity="${s.highlight ? 1 : 0.82}"/>`;
        pts.forEach(([px, py, bm, st]) => {
          lLines += svgMarker(
            s.marker,
            px,
            py,
            s.highlight ? 5.2 : 4.2,
            st.collapsed ? "#fff" : s.color,
            st.collapsed ? s.color : "#fff",
            1.5,
            `class="corr-pt" data-bkey="${bm.key}" data-rname="${esc(s.name)}" data-val="${st.collapsed ? "Collapsed (0 variance)" : (metric === "r" ? "r = " : "ρ = ") + st[metric].toFixed(3)}" style="cursor:pointer"`
          );
        });
      });

      /* Right SVG: 19-Model Normalized Scatter on Selected Benchmark */
      const RW = 410, RH = 290, rPadL = 46, rPadR = 18, rPadT = 18, rPadB = 46;
      const sxR = linScale(-0.04, 1.04, rPadL, RW - rPadR);
      const syR = linScale(-0.04, 1.04, RH - rPadB, rPadT);

      let rGrid = "";
      [0.0, 0.5, 1.0].forEach((v) => {
        rGrid += `<line x1="${rPadL}" y1="${r1(syR(v))}" x2="${RW - rPadR}" y2="${r1(syR(v))}" stroke="#eef2f6"/>
                  <text x="${rPadL - 7}" y="${r1(syR(v) + 4)}" text-anchor="end" font-size="11" fill="#64748b">${v.toFixed(1)}</text>
                  <line x1="${r1(sxR(v))}" y1="${rPadT}" x2="${r1(sxR(v))}" y2="${RH - rPadB}" stroke="#eef2f6"/>
                  <text x="${r1(sxR(v))}" y="${RH - rPadB + 16}" text-anchor="middle" font-size="11" fill="#64748b">${v.toFixed(1)}</text>`;
      });
      /* Ideal diagonal y = x */
      rGrid += `<line x1="${r1(sxR(0))}" y1="${r1(syR(0))}" x2="${r1(sxR(1))}" y2="${r1(syR(1))}" stroke="#cbd5e1" stroke-dasharray="4 4"/>`;

      let rFits = "", rDots = "", collapseNote = "";
      [...series.filter((s) => !s.highlight), ...series.filter((s) => s.highlight)].forEach((s) => {
        if (hidden.has(s.key)) return;
        const st = benchData.rewards[s.key];
        if (!st.collapsed && st.slope !== null) {
          const y0 = Math.max(-0.04, Math.min(1.04, st.intercept));
          const y1 = Math.max(-0.04, Math.min(1.04, st.slope + st.intercept));
          rFits += `<line x1="${r1(sxR(0))}" y1="${r1(syR(y0))}" x2="${r1(sxR(1))}" y2="${r1(syR(y1))}" stroke="${s.color}" stroke-width="${s.highlight ? 3.0 : 1.6}" opacity="${s.highlight ? 0.95 : 0.55}"/>`;
        } else if (st.collapsed) {
          collapseNote = `<rect x="${rPadL + 10}" y="${rPadT + 8}" width="268" height="24" rx="6" fill="#fef2f2" stroke="#fecaca"/>
            <text x="${rPadL + 18}" y="${rPadT + 24}" font-size="10.5" font-weight="650" fill="#b91c1c">⚠ Strict Binary = 0.000 on all 19 models (zero signal)</text>`;
        }
        st.points.forEach((pt) => {
          rDots += svgMarker(
            s.marker,
            sxR(pt.x),
            syR(pt.y),
            s.highlight ? 5.0 : 3.9,
            s.color,
            "#fff",
            1.2,
            `class="scat-pt" data-model="${esc(pt.model)}" data-rname="${esc(s.short)}" data-rx="${pt.rawX}" data-ry="${pt.rawY}" opacity="${s.highlight ? 0.96 : 0.72}" style="cursor:pointer"`
          );
        });
      });

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div class="seg-group">
            <button type="button" class="seg-btn ${mode === "classic" ? "active" : ""}" data-mode="classic">Fig. 2 · Candidate Rewards (6)</button>
            <button type="button" class="seg-btn ${mode === "vqa" ? "active" : ""}" data-mode="vqa">Fig. 3 · Graded vs. Strict Binary &amp; Gemma</button>
          </div>
          <div class="seg-group">
            <button type="button" class="seg-btn ${metric === "r" ? "active" : ""}" data-metric="r">Pearson r</button>
            <button type="button" class="seg-btn ${metric === "rho" ? "active" : ""}" data-metric="rho">Spearman ρ</button>
          </div>
        </div>
        <div class="chart-legend">${legendHtml}</div>
        <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:18px;align-items:center" class="align-panels">
          <div style="background:#fcfcfd;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px">
            <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:4px">Cross-Benchmark Alignment Curve (Click any benchmark column)</div>
            <svg viewBox="0 0 ${LW} ${LH}" role="img" aria-label="Correlation across benchmarks">
              ${lGrid}${lLines}
              <line x1="${lPadL}" y1="${LH - lPadB}" x2="${LW - lPadR}" y2="${LH - lPadB}" stroke="#64748b"/>
              <line x1="${lPadL}" y1="${lPadT}" x2="${lPadL}" y2="${LH - lPadB}" stroke="#64748b"/>
              <text x="13" y="${(lPadT + LH - lPadB) / 2}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#334155" transform="rotate(-90 13 ${(lPadT + LH - lPadB) / 2})">${metric === "r" ? "Pearson r" : "Spearman ρ"} vs. MLLM Judge</text>
            </svg>
          </div>
          <div style="background:#fcfcfd;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px">
              <strong>19-Model Scatter: ${esc(bmObj.name)}</strong>
              <span class="regime-badge regime-${bmObj.regime}">${bmObj.regime} (~${Math.round(bmObj.avgWords)}w)</span>
            </div>
            <svg viewBox="0 0 ${RW} ${RH}" role="img" aria-label="19-model reward vs judge scatter">
              ${rGrid}${rFits}${rDots}${collapseNote}
              <line x1="${rPadL}" y1="${RH - rPadB}" x2="${RW - rPadR}" y2="${RH - rPadB}" stroke="#64748b"/>
              <line x1="${rPadL}" y1="${rPadT}" x2="${rPadL}" y2="${RH - rPadB}" stroke="#64748b"/>
              <text x="${(rPadL + RW - rPadR) / 2}" y="${RH - 8}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#334155">Normalized Reward Score [0, 1]</text>
              <text x="13" y="${(rPadT + RH - rPadB) / 2}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#334155" transform="rotate(-90 13 ${(rPadT + RH - rPadB) / 2})">Normalized MLLM Judge [0, 1]</text>
            </svg>
          </div>
        </div>
      `;

      host.querySelectorAll("[data-mode]").forEach((b) =>
        b.addEventListener("click", () => {
          mode = b.dataset.mode;
          hidden.clear();
          render();
        })
      );
      host.querySelectorAll("[data-metric]").forEach((b) =>
        b.addEventListener("click", () => {
          metric = b.dataset.metric;
          render();
        })
      );
      host.querySelectorAll("[data-rkey]").forEach((b) =>
        b.addEventListener("click", () => {
          const k = b.dataset.rkey;
          if (hidden.has(k)) hidden.delete(k);
          else if (hidden.size < series.length - 1) hidden.add(k);
          render();
        })
      );
      host.querySelectorAll(".align-bcol, .corr-pt").forEach((el) => {
        el.addEventListener("click", () => {
          selBench = el.dataset.bkey;
          render();
        });
      });
      host.querySelectorAll(".corr-pt").forEach((el) => {
        el.addEventListener("mouseenter", (ev) => {
          showTip(ev, `<div class="tt-title">${el.dataset.rname}</div><div>${el.dataset.val}</div>`);
        });
        el.addEventListener("mousemove", moveTip);
        el.addEventListener("mouseleave", hideTip);
      });
      host.querySelectorAll(".scat-pt").forEach((el) => {
        el.addEventListener("mouseenter", (ev) => {
          showTip(
            ev,
            `<div class="tt-title">${el.dataset.model}</div>
             <div class="tt-sub">${el.dataset.rname} on ${esc(bmObj.name)}</div>
             <div>Raw Reward: <b>${el.dataset.rx}</b> · Judge: <b>${el.dataset.ry}</b></div>`
          );
        });
        el.addEventListener("mousemove", moveTip);
        el.addEventListener("mouseleave", hideTip);
      });
    }

    render();
  }

  /* ========================================================================
     MODULE 7A (§3.2, Fig. 5): PromptScore vs. SpectraReward Regime/Benchmark Chart
     ======================================================================== */
  function mountSpectraChart() {
    const host = document.getElementById("viz-spectra");
    if (!host || !window.PAPER_DATA) return;
    const S = window.PAPER_DATA.spectraData;
    let gran = "regime"; // "regime" | "bench"

    function render() {
      const labels = gran === "regime" ? S.regimes.map((r) => r.name) : S.benchmarks;
      const panelsHtml = Object.entries(S.models)
        .map(([modelName, obj]) => {
          const base = obj.Base;
          const rawGains = (rk) => obj[rk].map((v, i) => ((v - base[i]) / base[i]) * 100);
          const series = {};
          ["PromptScore", "SpectraReward"].forEach((rk) => {
            const g = rawGains(rk);
            series[rk] =
              gran === "regime"
                ? S.regimes.map((rg) => rg.indices.reduce((a, idx) => a + g[idx], 0) / rg.indices.length)
                : g;
          });

          const allV = [...series.PromptScore, ...series.SpectraReward];
          const lo = Math.min(...allV) - 0.8;
          const hi = Math.max(...allV) + 0.9;
          const W = 450, H = 225, padL = 44, padR = 20, padT = 34, padB = gran === "regime" ? 36 : 56;
          const sx = (i) => padL + ((i + 0.35) / (labels.length - 0.3)) * (W - padL - padR);
          const sy = linScale(lo, hi, H - padB, padT);

          let grid = "";
          const nTicks = 4;
          for (let t = 0; t <= nTicks; t++) {
            const yv = lo + ((hi - lo) * t) / nTicks;
            grid += `<line x1="${padL}" y1="${r1(sy(yv))}" x2="${W - padR}" y2="${r1(sy(yv))}" stroke="#eef2f6" stroke-dasharray="3 3"/>
                     <text x="${padL - 7}" y="${r1(sy(yv) + 4)}" text-anchor="end" font-size="10.8" fill="#64748b">+${yv.toFixed(1)}%</text>`;
          }
          labels.forEach((lb, i) => {
            const x = r1(sx(i));
            grid +=
              gran === "regime"
                ? `<text x="${x}" y="${H - 12}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#334155">${esc(lb)}</text>`
                : `<text x="${x}" y="${H - padB + 15}" text-anchor="end" font-size="10" fill="#475569" transform="rotate(-24 ${x} ${H - padB + 15})">${esc(lb)}</text>`;
          });

          const drawLine = (rk, col, marker, lw) => {
            const pts = series[rk].map((v, i) => [sx(i), sy(v), v, labels[i]]);
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${r1(p[0])},${r1(p[1])}`).join(" ");
            return (
              `<path d="${d}" fill="none" stroke="${col}" stroke-width="${lw}"/>` +
              pts
                .map(([px, py, v, lb]) =>
                  svgMarker(
                    marker,
                    px,
                    py,
                    lw > 3 ? 5.6 : 4.8,
                    col,
                    "#fff",
                    1.5,
                    `class="spec-pt" data-m="${esc(modelName)}" data-r="${rk}" data-lb="${esc(lb)}" data-v="${v.toFixed(2)}" style="cursor:pointer"`
                  )
                )
                .join("")
            );
          };

          return `<div style="background:#fcfcfd;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px">
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(modelName)} PromptScore vs SpectraReward">
              ${grid}
              ${drawLine("SpectraReward", "#38bdf8", "tri-up", 2.4)}
              ${drawLine("PromptScore", "#2563eb", "circle", 3.6)}
              <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#64748b"/>
              <rect x="${padL + 6}" y="6" width="166" height="22" rx="5" fill="#fff" stroke="#cbd5e1"/>
              <text x="${padL + 14}" y="21" font-size="11.5" font-weight="700" fill="#0f172a">${esc(modelName)}</text>
            </svg>
          </div>`;
        })
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div style="display:flex;gap:14px;align-items:center;font-size:12.5px;font-weight:650">
            <span style="display:inline-flex;align-items:center;gap:6px;color:#1d4ed8"><span style="width:11px;height:11px;border-radius:50%;background:#2563eb"></span>PromptScore (Zero-shot Graded Score)</span>
            <span style="display:inline-flex;align-items:center;gap:6px;color:#0284c7"><span style="width:11px;height:11px;border-radius:2px;background:#38bdf8"></span>SpectraReward (Prompt Reconstruction Log-Likelihood)</span>
          </div>
          <div class="seg-group">
            <button type="button" class="seg-btn ${gran === "regime" ? "active" : ""}" data-gran="regime">By Length Regime (Fig. 5)</button>
            <button type="button" class="seg-btn ${gran === "bench" ? "active" : ""}" data-gran="bench">All 7 Benchmarks</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">${panelsHtml}</div>
      `;

      host.querySelectorAll("[data-gran]").forEach((b) =>
        b.addEventListener("click", () => {
          gran = b.dataset.gran;
          render();
        })
      );
      host.querySelectorAll(".spec-pt").forEach((el) => {
        el.addEventListener("mouseenter", (ev) => {
          showTip(
            ev,
            `<div class="tt-title">${el.dataset.r} · ${el.dataset.m}</div>
             <div>${el.dataset.lb}: <b>+${el.dataset.v}%</b> over Base</div>`
          );
        });
        el.addEventListener("mousemove", moveTip);
        el.addEventListener("mouseleave", hideTip);
      });
    }

    render();
  }

  /* ========================================================================
     MODULE 7B (§3.3, Fig. 6): Reward Backbone Scaling Boxplot + Dots
     ======================================================================== */
  function mountScalingChart() {
    const host = document.getElementById("viz-scaling");
    if (!host || !window.PAPER_DATA) return;
    const panels = window.PAPER_DATA.scalingPanels;
    const benchNames = window.PAPER_DATA.benchmarks.map((b) => b.name);
    let showDots = true;

    const palettes = {
      "FLUX.2-Klein-Base-4B": ["#FAD2CF", "#F5A7A1", "#EE7E74", "#E4574A", "#C8322A", "#A50E0E"],
      "Z-Image": ["#E8F0FE", "#BDD4F9", "#8DB6F5", "#5591F4", "#316FD5", "#174EA6"],
    };

    function render() {
      const htmlPanels = Object.entries(panels)
        .map(([baseName, items]) => {
          const allVals = items.flatMap((it) => it.normScores);
          const lo = Math.floor(Math.min(...allVals) - 3);
          const hi = Math.ceil(Math.max(...allVals) + 3);
          const W = 450, H = 240, padL = 42, padR = 18, padT = 20, padB = 40;
          const sx = (i) => padL + ((i + 0.55) / items.length) * (W - padL - padR);
          const sy = linScale(lo, hi, H - padB, padT);
          const cols = palettes[baseName];

          let grid = "";
          for (let yv = Math.ceil(lo / 10) * 10; yv <= hi; yv += 10) {
            grid += `<line x1="${padL}" y1="${r1(sy(yv))}" x2="${W - padR}" y2="${r1(sy(yv))}" stroke="#e2e8f0" stroke-dasharray="4 3"/>
                     <text x="${padL - 7}" y="${r1(sy(yv) + 4)}" text-anchor="end" font-size="11" fill="#64748b">${yv}</text>`;
          }

          let boxes = "";
          items.forEach((it, idx) => {
            const cx = sx(idx);
            const bw = 30;
            const yMin = sy(it.min), yMax = sy(it.max), yQ1 = sy(it.q1), yQ3 = sy(it.q3), yMed = sy(it.median);
            boxes += `<g class="scale-box" data-base="${esc(baseName)}" data-idx="${idx}" style="cursor:pointer">
              ${it.selected ? `<rect x="${r1(cx - bw / 2 - 5)}" y="${padT}" width="${bw + 10}" height="${H - padT - padB}" rx="6" fill="rgba(37,99,235,0.06)"/>` : ""}
              <line x1="${r1(cx)}" y1="${r1(yMax)}" x2="${r1(cx)}" y2="${r1(yQ3)}" stroke="#0f172a" stroke-width="1.6"/>
              <line x1="${r1(cx)}" y1="${r1(yQ1)}" x2="${r1(cx)}" y2="${r1(yMin)}" stroke="#0f172a" stroke-width="1.6"/>
              <line x1="${r1(cx - 8)}" y1="${r1(yMax)}" x2="${r1(cx + 8)}" y2="${r1(yMax)}" stroke="#0f172a" stroke-width="1.6"/>
              <line x1="${r1(cx - 8)}" y1="${r1(yMin)}" x2="${r1(cx + 8)}" y2="${r1(yMin)}" stroke="#0f172a" stroke-width="1.6"/>
              <rect x="${r1(cx - bw / 2)}" y="${r1(yQ3)}" width="${bw}" height="${r1(Math.max(2, yQ1 - yQ3))}" fill="${cols[idx]}" fill-opacity="0.9" stroke="#0f172a" stroke-width="1.7" rx="2"/>
              <line x1="${r1(cx - bw / 2)}" y1="${r1(yMed)}" x2="${r1(cx + bw / 2)}" y2="${r1(yMed)}" stroke="#0f172a" stroke-width="2.2"/>
              <text x="${r1(cx)}" y="${H - 14}" text-anchor="middle" font-size="11.5" font-weight="${it.selected ? 750 : 600}" fill="${it.selected ? "#1d4ed8" : "#334155"}">${esc(it.label)}</text>
            </g>`;

            if (showDots) {
              it.normScores.forEach((nv, bi) => {
                const jit = ((bi % 3) - 1) * 5.5;
                boxes += `<circle class="scale-dot" data-full="${esc(it.full)}" data-bm="${esc(benchNames[bi])}" data-nv="${nv.toFixed(1)}" cx="${r1(cx + jit)}" cy="${r1(sy(nv))}" r="3.1" fill="#0f172a" fill-opacity="0.72" stroke="#fff" stroke-width="0.8" style="cursor:pointer"/>`;
              });
            }
          });

          return `<div style="background:#fcfcfd;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px">
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(baseName)} reward backbone scaling">
              ${grid}${boxes}
              <rect x="${padL}" y="${padT}" width="${W - padL - padR}" height="${H - padT - padB}" fill="none" stroke="#334155" stroke-width="1.3"/>
              <rect x="${W - padR - 154}" y="${H - padB - 28}" width="146" height="22" rx="5" fill="#fff" stroke="#0f172a" stroke-width="1.2"/>
              <text x="${W - padR - 81}" y="${H - padB - 13}" text-anchor="middle" font-size="11.2" font-weight="700" fill="#0f172a">${esc(baseName)}</text>
            </svg>
          </div>`;
        })
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <span style="font-size:12.5px;color:#475569">Normalized [0–100] score distribution across 7 compositional benchmarks (4B → 320B MoE):</span>
          <button type="button" class="replay-btn" id="btn-toggle-scaledots">${showDots ? "Hide Individual Benchmark Dots" : "Show Individual Benchmark Dots"}</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">${htmlPanels}</div>
      `;

      host.querySelector("#btn-toggle-scaledots").addEventListener("click", () => {
        showDots = !showDots;
        render();
      });

      host.querySelectorAll(".scale-box").forEach((g) => {
        g.addEventListener("mouseenter", (ev) => {
          const it = panels[g.dataset.base][+g.dataset.idx];
          showTip(
            ev,
            `<div class="tt-title">${esc(it.full)}</div>
             <div class="tt-sub">Policy Backbone: ${g.dataset.base}</div>
             <div>Mean: <b>${it.mean.toFixed(1)}</b> · Median: <b>${it.median.toFixed(1)}</b></div>
             <div>IQR: [${it.q1.toFixed(1)}, ${it.q3.toFixed(1)}] · Range: [${it.min.toFixed(1)}, ${it.max.toFixed(1)}]</div>`
          );
        });
        g.addEventListener("mousemove", moveTip);
        g.addEventListener("mouseleave", hideTip);
      });

      host.querySelectorAll(".scale-dot").forEach((el) => {
        el.addEventListener("mouseenter", (ev) => {
          ev.stopPropagation();
          showTip(
            ev,
            `<div class="tt-title">${el.dataset.bm}</div>
             <div>Reward: ${el.dataset.full} · Normalized Score: <b>${el.dataset.nv}</b></div>`
          );
        });
        el.addEventListener("mousemove", moveTip);
        el.addEventListener("mouseleave", hideTip);
      });
    }

    render();
  }

  /* ========================================================================
     MODULE 8B (§4.2, Fig. 8): Prompt Design Relative Gain Across 7 Benchmarks
     ======================================================================== */
  function mountPromptTypeChart() {
    const host = document.getElementById("viz-prompt-type");
    if (!host || !window.PAPER_DATA) return;
    const B = window.PAPER_DATA.benchmarks;
    const P = window.PAPER_DATA.promptTypeSeries;
    let focusKey = null; // null = show all, Balance highlighted

    const markers = { Balance: "circle", Attribute: "square", Entity: "diamond", Relation: "tri-up" };

    function render() {
      const sample = P["FLUX.2-Klein-Base-4B"];
      const chips = Object.entries(sample)
        .map(([k, v]) => {
          const zMean = P["Z-Image"][k].meanGain;
          const active = focusKey === k;
          return `<button type="button" class="legend-chip ${active ? "active-focus" : ""}" data-vk="${k}">
            <span class="legend-swatch" style="background:${v.color}"></span>
            <span>${esc(v.label)}${k === "Balance" ? " ★" : ""}</span>
            <span style="font-family:var(--font-mono);font-size:11px;color:#64748b">4B: +${v.meanGain.toFixed(1)}% · 6B: +${zMean.toFixed(1)}%</span>
          </button>`;
        })
        .join("");

      const panelsHtml = Object.entries(P)
        .map(([baseName, varMap]) => {
          const allV = Object.values(varMap).flatMap((o) => o.gains);
          const lo = Math.min(0, ...allV) - 0.6;
          const hi = Math.max(...allV) + 1.0;
          const W = 455, H = 250, padL = 44, padR = 18, padT = 34, padB = 56;
          const sx = (i) => padL + (i / (B.length - 1)) * (W - padL - padR);
          const sy = linScale(lo, hi, H - padB, padT);

          let grid = "";
          for (let t = 0; t <= 4; t++) {
            const yv = lo + ((hi - lo) * t) / 4;
            grid += `<line x1="${padL}" y1="${r1(sy(yv))}" x2="${W - padR}" y2="${r1(sy(yv))}" stroke="#eef2f6" stroke-dasharray="3 3"/>
                     <text x="${padL - 6}" y="${r1(sy(yv) + 4)}" text-anchor="end" font-size="10.8" fill="#64748b">${yv >= 0 ? "+" : ""}${yv.toFixed(1)}%</text>`;
          }
          B.forEach((bm, i) => {
            const x = r1(sx(i));
            grid += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="#f8fafc"/>
                     <text x="${x}" y="${H - padB + 15}" text-anchor="end" font-size="10.2" fill="#475569" transform="rotate(-25 ${x} ${H - padB + 15})">${esc(bm.shortName)}</text>`;
          });

          const order = ["Entity", "Relation", "Attribute", "Balance"];
          let lines = "";
          order.forEach((vk) => {
            const obj = varMap[vk];
            const isHi = focusKey ? focusKey === vk : vk === "Balance";
            const op = focusKey && focusKey !== vk ? 0.22 : isHi ? 1.0 : 0.58;
            const lw = isHi ? 3.5 : 2.0;
            const pts = obj.gains.map((g, i) => [sx(i), sy(g), g, obj.raw[i], B[i].name]);
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${r1(p[0])},${r1(p[1])}`).join(" ");
            lines += `<g opacity="${op}">
              <path d="${d}" fill="none" stroke="${obj.color}" stroke-width="${lw}"/>
              ${pts
                .map(([px, py, g, raw, bname]) =>
                  svgMarker(
                    markers[vk],
                    px,
                    py,
                    isHi ? 5.3 : 4.2,
                    obj.color,
                    "#fff",
                    1.4,
                    `class="ptype-pt" data-base="${esc(baseName)}" data-v="${esc(obj.label)}" data-bm="${esc(bname)}" data-g="${g.toFixed(2)}" data-raw="${raw}" style="cursor:pointer"`
                  )
                )
                .join("")}
            </g>`;
          });

          return `<div style="background:#fcfcfd;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px">
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(baseName)} prompt design gains">
              ${grid}${lines}
              <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#64748b"/>
              <rect x="${padL + 6}" y="6" width="166" height="22" rx="5" fill="#fff" stroke="#cbd5e1"/>
              <text x="${padL + 14}" y="21" font-size="11.5" font-weight="700" fill="#0f172a">${esc(baseName)}</text>
            </svg>
          </div>`;
        })
        .join("");

      host.innerHTML = `
        <div class="chart-legend">${chips}<span style="font-size:11.5px;color:#64748b;align-self:center;margin-left:auto">Click a design pill to isolate</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">${panelsHtml}</div>
      `;

      host.querySelectorAll("[data-vk]").forEach((b) =>
        b.addEventListener("click", () => {
          focusKey = focusKey === b.dataset.vk ? null : b.dataset.vk;
          render();
        })
      );
      host.querySelectorAll(".ptype-pt").forEach((el) => {
        el.addEventListener("mouseenter", (ev) => {
          showTip(
            ev,
            `<div class="tt-title">${el.dataset.v} · ${el.dataset.base}</div>
             <div>${el.dataset.bm}: <b>+${el.dataset.g}%</b> (Score: ${el.dataset.raw})</div>`
          );
        });
        el.addEventListener("mousemove", moveTip);
        el.addEventListener("mouseleave", hideTip);
      });
    }

    render();
  }

  /* ========================================================================
     MODULE 9 (§4.3, Fig. 9): Sequential Short→Long vs Joint Mixing Trajectory
     ======================================================================== */
  function mountCurriculumChart() {
    const host = document.getElementById("viz-curriculum");
    if (!host || !window.PAPER_DATA) return;
    const B = window.PAPER_DATA.benchmarks;
    const C = window.PAPER_DATA.curriculumRaw;
    let view = "both"; // "both" | "seq" | "joint"

    const styles = {
      "Imago-Short": { color: "#f59e0b", dash: "5 4", lw: 2.0, label: "Imago-Short Only" },
      "Imago-Long": { color: "#16a34a", dash: "5 4", lw: 2.0, label: "Imago-Long Only" },
      "Imago-Short ∪ Long": { color: "#dc2626", dash: "", lw: 2.8, label: "Joint (Imago-Short ∪ Long)" },
      "Imago-Short → Long": { color: "#2563eb", dash: "", lw: 3.8, label: "Sequential (Imago-Short → Long ★)" },
    };

    function render(animate = false) {
      const panelsHtml = Object.entries(C)
        .map(([baseName, map]) => {
          const base = map.Base;
          const gainsOf = (k) => map[k].map((v, i) => ((v - base[i]) / base[i]) * 100);
          const keys =
            view === "seq"
              ? ["Imago-Short", "Imago-Long", "Imago-Short → Long"]
              : view === "joint"
              ? ["Imago-Short", "Imago-Long", "Imago-Short ∪ Long"]
              : ["Imago-Short", "Imago-Long", "Imago-Short ∪ Long", "Imago-Short → Long"];

          const allG = keys.flatMap(gainsOf);
          const lo = -0.6;
          const hi = Math.max(...allG) + 1.4;
          const W = 455, H = 258, padL = 46, padR = 20, padT = 34, padB = 46;
          const sx = linScale(0, 560, padL, W - padR);
          const sy = linScale(lo, hi, H - padB, padT);

          let grid = "";
          const yStep = hi > 11 ? 4 : 2;
          for (let yv = 0; yv <= hi; yv += yStep) {
            grid += `<line x1="${padL}" y1="${r1(sy(yv))}" x2="${W - padR}" y2="${r1(sy(yv))}" stroke="${yv === 0 ? "#94a3b8" : "#eef2f6"}" ${yv === 0 ? 'stroke-dasharray="4 3"' : ""}/>
                     <text x="${padL - 7}" y="${r1(sy(yv) + 4)}" text-anchor="end" font-size="10.8" fill="#64748b">+${yv}%</text>`;
          }
          [0, 100, 200, 300, 400, 500].forEach((xv) => {
            grid += `<line x1="${r1(sx(xv))}" y1="${padT}" x2="${r1(sx(xv))}" y2="${H - padB}" stroke="#f8fafc"/>
                     <text x="${r1(sx(xv))}" y="${H - padB + 16}" text-anchor="middle" font-size="10.8" fill="#64748b">${xv}</text>`;
          });
          grid += `<text x="${padL + 8}" y="${r1(sy(0) - 5)}" font-size="10.2" font-weight="600" fill="#64748b">Base Model (0%)</text>`;

          let paths = "";
          keys.forEach((k) => {
            const st = styles[k];
            const gs = gainsOf(k);
            const pts = gs.map((g, i) => [sx(B[i].avgWords), sy(g), g, map[k][i], B[i]]);
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${r1(p[0])},${r1(p[1])}`).join(" ");
            const animAttr =
              animate && !st.dash
                ? `stroke-dasharray="700" stroke-dashoffset="700" style="animation: drawLine 1.1s cubic-bezier(0.22,1,0.36,1) forwards"`
                : st.dash
                ? `stroke-dasharray="${st.dash}"`
                : "";
            paths += `<path d="${d}" fill="none" stroke="${st.color}" stroke-width="${st.lw}" ${animAttr}/>`;
            pts.forEach(([px, py, g, raw, bm]) => {
              paths += svgMarker(
                k.includes("→") ? "circle" : k.includes("∪") ? "diamond" : "square",
                px,
                py,
                k.includes("→") ? 5.4 : 4.2,
                st.color,
                "#fff",
                1.3,
                `class="curr-pt" data-base="${esc(baseName)}" data-k="${esc(st.label)}" data-bm="${esc(bm.name)}" data-w="${bm.avgWords}" data-g="${g.toFixed(2)}" data-raw="${raw}" style="cursor:pointer"`
              );
            });
          });

          return `<div style="background:#fcfcfd;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px">
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(baseName)} prompt length curriculum trajectory">
              <style>@keyframes drawLine { to { stroke-dashoffset: 0; } }</style>
              ${grid}${paths}
              <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#64748b"/>
              <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#64748b"/>
              <text x="${(padL + W - padR) / 2}" y="${H - 8}" text-anchor="middle" font-size="11.2" font-weight="600" fill="#334155">Benchmark Average Prompt Length (words)</text>
              <rect x="${padL + 8}" y="6" width="166" height="22" rx="5" fill="#fff" stroke="#cbd5e1"/>
              <text x="${padL + 16}" y="21" font-size="11.5" font-weight="700" fill="#0f172a">${esc(baseName)}</text>
            </svg>
          </div>`;
        })
        .join("");

      const leg = Object.entries(styles)
        .map(
          ([, st]) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#334155">
            <span style="width:18px;height:0;border-top:${st.lw}px ${st.dash ? "dashed" : "solid"} ${st.color}"></span>${esc(st.label)}
          </span>`
        )
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div style="display:flex;flex-wrap:wrap;gap:14px">${leg}</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div class="seg-group">
              <button type="button" class="seg-btn ${view === "both" ? "active" : ""}" data-cv="both">Compare All 4</button>
              <button type="button" class="seg-btn ${view === "joint" ? "active" : ""}" data-cv="joint">Joint Mixing</button>
              <button type="button" class="seg-btn ${view === "seq" ? "active" : ""}" data-cv="seq">Sequential (Ours)</button>
            </div>
            <button type="button" class="replay-btn" id="btn-replay-curr">↻ Replay</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">${panelsHtml}</div>
      `;

      host.querySelectorAll("[data-cv]").forEach((b) =>
        b.addEventListener("click", () => {
          view = b.dataset.cv;
          render(true);
        })
      );
      host.querySelector("#btn-replay-curr").addEventListener("click", () => render(true));
      host.querySelectorAll(".curr-pt").forEach((el) => {
        el.addEventListener("mouseenter", (ev) => {
          showTip(
            ev,
            `<div class="tt-title">${el.dataset.k}</div>
             <div class="tt-sub">${el.dataset.base} · ${el.dataset.bm} (~${Math.round(+el.dataset.w)} words)</div>
             <div>Relative Gain: <b>+${el.dataset.g}%</b> · Raw Score: <b>${el.dataset.raw}</b></div>`
          );
        });
        el.addEventListener("mousemove", moveTip);
        el.addEventListener("mouseleave", hideTip);
      });
    }

    render(false);
  }

  window.ImagoCharts = {
    init() {
      mountPrefPairgrid();
      mountBenchOverview();
      mountRewardAlignment();
      mountSpectraChart();
      mountScalingChart();
      mountPromptTypeChart();
      mountCurriculumChart();
    },
  };
})();
