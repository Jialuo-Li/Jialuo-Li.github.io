/* Charts: every quantitative figure, drawn with d3 from window.PAPER (written by scripts/build.py).
   Each figure shows all of its information at once; nothing needs a click. On first view a figure builds
   itself in reading order (points pop, lines draw left to right, boxes open from the median); Replay repeats it.
   Hovering a legend entry highlights that series, and hovering a mark shows its exact value. */
(function () {
  "use strict";
  const I = window.Imago, P = I.P;
  const BLUE = "#4285f4";
  const REG = { short: "#3a8dde", medium: "#e59837", long: "#d94f4f" };
  const REGL = { short: "#a8d5ff", medium: "#ffd6a5", long: "#ffadad" };
  const BENCH = P.benchmarks;                     // seven benchmarks, by mean prompt length
  const SHORTNAME = { "T2I-CompBench": "CompBench", "TIIF-Bench": "TIIF", "SpatialGenEval": "Spatial", "T2I-CoReBench": "CoReBench",
    "LPD-Bench": "LPD", "Arena-T2I-Hard": "Arena", "LongBench-T2I": "LongBench" };
  const light = (c, a) => d3.interpolateRgb(c, "#fff")(a);
  const dur = I.dur;
  let uid = 0;

  function svgIn(host, H) {
    host.innerHTML = "";
    const W = Math.max(260, Math.floor(host.clientWidth));
    const svg = d3.select(host).append("svg").attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);
    return { svg, W, H };
  }

  /* a clip rectangle that uncovers its contents from left to right */
  function wipe(svg, x0, y0, w, h, animate, delay = 0, ms = 900) {
    const id = "wipe" + ++uid;
    const r = svg.append("defs").append("clipPath").attr("id", id).append("rect")
      .attr("x", x0).attr("y", y0).attr("height", h).attr("width", animate ? 0 : w);
    if (animate) r.transition().delay(dur(delay)).duration(dur(ms)).ease(d3.easeCubicInOut).attr("width", w);
    return `url(#${id})`;
  }

  function twoLineTicks(g, names) {
    g.selectAll(".tick text").each(function (d, i) {
      const t = d3.select(this), parts = I.twoLine(names[i]);
      t.text(null);
      parts.forEach((p, k) => t.append("tspan").attr("x", 0).attr("dy", k ? "1.15em" : "0.9em").text(p));
    });
  }

  /* the short / medium / long strip under a seven-benchmark axis; it never extends past the plot [lo, hi] */
  function regimeStrip(svg, xOf, half, lo, hi, y) {
    [["short", 0, 2], ["medium", 3, 4], ["long", 5, 6]].forEach(([r, a, b]) => {
      const x0 = Math.max(lo, xOf(a) - half) + (a ? 2 : 0), x1 = Math.min(hi, xOf(b) + half) - (b < 6 ? 2 : 0);
      svg.append("rect").attr("class", "regime-strip").attr("x", x0).attr("width", x1 - x0).attr("y", y).attr("height", 3)
        .attr("fill", REG[r]).attr("opacity", 0.75);
    });
  }

  /* text with a white halo underneath, drawn as two layers so tspans never clip each other */
  function haloText(g, x, y, anchor, size, weight, color, build) {
    const gg = g.append("g").attr("transform", `translate(${x},${y})`);
    ["halo", "ink"].forEach((layer) => {
      const t = gg.append("text").attr("text-anchor", anchor).style("font-size", size + "px").style("font-weight", weight).attr("fill", layer === "halo" ? "#fff" : color);
      if (layer === "halo") t.attr("stroke", "#fff").attr("stroke-width", 3.6).attr("stroke-linejoin", "round");
      build(t);
    });
    return gg;
  }
  const imagoName = (t, name) => { t.append("tspan").attr("font-style", "italic").text("Imago"); t.append("tspan").text(name.slice(5)); };

  /* static legend; hovering an entry focuses that series through onFocus(key). mark(key) dims the other entries when
     the series is focused from inside the chart. */
  function legend(el, items, onFocus) {
    const L = el.querySelector(".legend");
    L.innerHTML = items.map((it) => `<span class="li" data-key="${it.key}"><span class="sw${it.dashed ? " dash" : ""}" style="color:${it.color};border-top-width:${it.thick ? 3.5 : 2.5}px"></span>${it.name}</span>`).join("");
    const mark = (key) => L.querySelectorAll(".li").forEach((x) => x.classList.toggle("dim", !!key && x.dataset.key !== key));
    L.querySelectorAll(".li").forEach((li) => I.interactEl(li, {
      enter() { mark(li.dataset.key); onFocus(li.dataset.key); },
      leave() { mark(null); onFocus(null); },
    }));
    return { mark };
  }

  /* focus one series inside root: everything tagged [data-s] that is not that series fades (CSS: .focusing) */
  function focusSeries(root, key) {
    const r = d3.select(root);
    r.classed("focusing", key != null);
    r.selectAll("[data-s]").classed("on", function () { return key != null && this.getAttribute("data-s") === key; });
  }

  /* a rounded value badge (on an axis, or under a crosshair) */
  function badge(g, x, y, text, color, anchor = "middle", size = 11.5) {
    const w = I.textWidth(text, size, 700) + 12, h = size + 8;
    const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    const gg = g.append("g").attr("class", "vbadge");
    gg.append("rect").attr("x", x0).attr("y", y - h / 2).attr("width", w).attr("height", h).attr("rx", h / 2).attr("fill", color);
    gg.append("text").attr("x", x0 + w / 2).attr("y", y + size * 0.35).attr("text-anchor", "middle").style("font-size", size + "px")
      .style("font-weight", 700).attr("fill", "#fff").text(text);
    return gg;
  }
  const darker = (c, k = 0.35) => d3.interpolateRgb(c, "#17191c")(k);

  const symbolOf = { o: d3.symbolCircle, s: d3.symbolSquare, D: d3.symbolDiamond, "^": d3.symbolTriangle, v: d3.symbolTriangle, "*": d3.symbolStar, X: d3.symbolCross };

  /* ======================================================================== Fig.: score vs. size, all five benchmarks
     One panel per benchmark. Text sits only in the band above each plot (the two Imago names); everything else is
     encoded by mark style and explained once in the key. The Imago point rises from its base model, leaving a stem. */
  I.register("teaser", (el) => {
    const host = el.querySelector(".chart");
    const BN = ["T2I-CompBench", "TIIF-Bench", "SpatialGenEval", "T2I-CoReBench", "LongBench-T2I"];
    const REGIME = ["short", "short", "short", "medium", "long"];
    const DEC = [3, 2, 2, 2, 3];
    const rows = P.main.map((r) => {
      const id = `${r.model}|${r.size == null ? "p" : r.size}`;
      const kind = r.model.startsWith("Imago") ? "imago"
        : (r.model === "FLUX.2-Klein-Base" && r.size === 4) || (r.model === "Z-Image" && r.size === 6) ? "base"
          : r.model === "FLUX.2-dev" ? "dev" : r.size == null ? "prop" : "other";
      const disp = /^FLUX\.2-Klein/.test(r.model) ? `${r.model}-${r.size}B` : r.model;
      return { ...r, id, kind, disp };
    });
    const pts = rows.filter((r) => r.kind !== "prop" && r.kind !== "imago").sort((a, b) => a.size - b.size);
    const props = rows.filter((r) => r.kind === "prop");
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    const PAIRS = [["FLUX.2-Klein-Base|4", "Imago-4B|4", "end"], ["Z-Image|6", "Imago-6B|6", "start"]];
    const PROP_DASH = { "Nano-Banana": "5 3", "Imagen-4-Fast": "1.4 2.6" };
    // models of equal size sit side by side instead of on top of each other (pixels at a 280px panel)
    const JIT = { "SDXL|2.6": -4, "Lumina-Image-2|2.6": 4, "LongCat-Image|6": -6, "Z-Image-Turbo|6": 6, "FLUX.2-Klein|4": 6,
      "FLUX.2-Klein-Base|9": -4, "FLUX.2-Klein|9": 4, "FLUX.1-schnell|12": -4, "FLUX.1-dev|12": 4 };

    const fmtv = (v, b) => v.toFixed(DEC[b]);
    const swatch = (r) => (r.kind === "imago" ? BLUE : r.kind === "base" ? "#59616b" : r.kind === "prop" ? "#7d858f" : r.kind === "dev" ? "#7d858f" : "#c9ced5");
    const nameHtml = (r) => (r.kind === "imago" ? `<i>Imago</i>${I.esc(r.disp.slice(5))}` : I.esc(r.disp));
    /* the tooltip lists the model's scores on all five benchmarks (this panel's in bold); an Imago model or its base
       model shows the pair, base -> Imago */
    function tipCard(r, b) {
      const pair = PAIRS.find((p) => p[0] === r.id || p[1] === r.id);
      if (pair) {
        const b0 = byId[pair[0]], b1 = byId[pair[1]];
        return I.card({ title: `${nameHtml(b0)} → ${nameHtml(b1)}`, color: BLUE, sub: `${b0.size}B parameters · RL post-training`,
          rows: BN.map((nm, j) => ({ k: nm, v: `${fmtv(b0.scores[j], j)} → <b>${fmtv(b1.scores[j], j)}</b>`, on: j === b })) });
      }
      return I.card({ title: nameHtml(r), color: swatch(r), sub: r.size ? `${r.size}B parameters` : "proprietary, size undisclosed",
        rows: BN.map((nm, j) => ({ k: nm, v: fmtv(r.scores[j], j), on: j === b })) });
    }

    let api = [];
    /* focus a model in every panel: it (and its RL pair) stays, the rest fades, and each panel labels it */
    function focus(id) {
      const grid = host.querySelector(".sm-grid");
      if (!grid) return;
      const pair = id ? PAIRS.find((p) => p[0] === id || p[1] === id) : null;
      const ids = new Set(pair ? [pair[0], pair[1]] : id ? [id] : []);
      grid.classList.toggle("focusing", !!id);
      grid.querySelectorAll("[data-m]").forEach((n) => n.classList.toggle("on", ids.has(n.getAttribute("data-m"))));
      api.forEach((p) => p.label(id, pair));
    }

    function panel(node, b, build, delay) {
      const W = Math.max(150, Math.floor(node.clientWidth)), H = Math.round(Math.min(236, Math.max(176, W * 0.8)));
      const svg = d3.select(node).append("svg").attr("width", W).attr("height", H);
      const m = { t: 24, r: 6, b: 20, l: 34 };
      const x = d3.scaleLog().domain([1.3, 44]).range([m.l, W - m.r]);
      const vals = rows.map((r) => r.scores[b]);
      const lo = d3.min(vals), hi = d3.max(vals), pad = (hi - lo) * 0.08;
      const y = d3.scaleLinear().domain([lo - pad, hi + pad]).nice(4).range([H - m.b, m.t]);
      const R = W < 230 ? 3.2 : 3.9, RI = R * 1.35, jk = W / 280;
      const fmt = b === 0 || b === 4 ? d3.format(".1f") : d3.format("d");
      svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)).tickFormat("")).call((g) => g.select(".domain").remove());
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x).tickValues(W < 240 ? [2, 8, 32] : [2, 4, 8, 16, 32]).tickFormat((d) => d + "B").tickSizeOuter(0));
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(fmt).tickSizeOuter(0));
      const pos = (r) => ({ x: x(r.size) + (JIT[r.id] || 0) * jk, y: y(r.scores[b]) });
      const cands = [];   // hover targets: every point, and the proprietary lines

      // proprietary models: a line each, dashed (Nano-Banana) or dotted (Imagen-4-Fast)
      props.forEach((r, i) => {
        const yy = y(r.scores[b]);
        const ln = svg.append("line").attr("data-m", r.id).attr("x1", m.l).attr("x2", build ? m.l : W - m.r).attr("y1", yy).attr("y2", yy)
          .attr("stroke", "#7d858f").attr("stroke-width", 1.3).attr("stroke-dasharray", PROP_DASH[r.model] || "4 3").attr("stroke-linecap", "round");
        if (build) ln.transition().delay(dur(delay + 400 + i * 90)).duration(dur(650)).ease(d3.easeCubicInOut).attr("x2", W - m.r);
        cands.push({ id: r.id, line: true, y: yy });
      });

      // open-weight models (FLUX.2-dev as a ring, the two base models dark)
      const gp = svg.append("g");
      const dots = gp.selectAll("circle").data(pts).join("circle").attr("data-m", (d) => d.id)
        .attr("cx", (d) => pos(d).x).attr("cy", (d) => pos(d).y).attr("r", build ? 0 : R)
        .attr("fill", (d) => (d.kind === "base" ? "#59616b" : d.kind === "dev" ? "#fff" : "#c9ced5"))
        .attr("stroke", (d) => (d.kind === "dev" ? "#7d858f" : "#fff")).attr("stroke-width", (d) => (d.kind === "dev" ? 1.5 : 1));
      if (build) dots.transition().delay((d, i) => dur(delay + 60 + i * 24)).duration(dur(360)).ease(d3.easeBackOut.overshoot(2)).attr("r", R);
      pts.forEach((d) => cands.push({ id: d.id, ...pos(d) }));

      // Imago: rises from its base model; its name sits in the band above the plot with a faint leader
      PAIRS.forEach(([bi, ii, anchor], k) => {
        const B = pos(byId[bi]), Y = y(byId[ii].scores[b]), t0 = delay + 1050 + k * 160;
        const stemTop = Y + RI + 1, stemBot = B.y - R - 1, hasStem = stemBot - stemTop > 2;
        const stem = svg.append("line").attr("data-m", ii).attr("x1", B.x).attr("x2", B.x).attr("y1", stemBot).attr("y2", build ? stemBot : stemTop)
          .attr("stroke", BLUE).attr("stroke-width", 2).attr("stroke-linecap", "round").attr("opacity", hasStem ? 0.9 : 0);
        const dot = svg.append("circle").attr("data-m", ii).attr("cx", B.x).attr("cy", build ? B.y : Y).attr("r", build ? 0 : RI)
          .attr("fill", BLUE).attr("stroke", "#fff").attr("stroke-width", 1.2);
        const leader = svg.append("line").attr("data-m", ii).attr("x1", B.x).attr("x2", B.x).attr("y1", 17).attr("y2", Y - RI - 2)
          .attr("stroke", BLUE).attr("stroke-width", 1).attr("stroke-dasharray", "1.5 2").attr("opacity", Y - RI - 2 > 19 ? 0.45 : 0);
        const label = haloText(svg, B.x + (anchor === "end" ? 5 : -5), 13, anchor, W < 230 ? 10 : 11.5, 700, "#1f5fcf", (t) => imagoName(t, byId[ii].disp)).attr("data-m", ii);
        if (build) {
          stem.transition().delay(dur(t0 + 120)).duration(dur(700)).ease(d3.easeCubicOut).attr("y2", stemTop);
          dot.transition().delay(dur(t0)).duration(dur(160)).attr("r", RI)
            .transition().duration(dur(700)).ease(d3.easeCubicOut).attr("cy", Y);
          [leader, label].forEach((n) => { const o = n.attr("opacity") || 1; n.attr("opacity", 0).transition().delay(dur(t0 + 750)).duration(dur(350)).attr("opacity", o); });
        }
        cands.push({ id: ii, x: B.x, y: Y });
      });

      // hover layer: labels of the focused model, then an invisible surface that finds the nearest mark
      const hl = svg.append("g").attr("class", "hl").style("pointer-events", "none");
      function label(id, pair) {
        hl.selectAll("*").remove();
        if (!id) return;
        const size = W < 230 ? 10 : 11;
        const place = (px, py, text, color, prefer) => {
          const w = I.textWidth(text, size, 700);
          let right = prefer != null ? prefer : px < (m.l + W - m.r) / 2;
          if (right && px + 9 + w > W - 1) right = false;
          if (!right && px - 9 - w < 1) right = true;
          haloText(hl, px + (right ? 9 : -9), py + size * 0.36, right ? "start" : "end", size, 700, color, (t) => t.text(text));
        };
        if (pair) {
          const b0 = byId[pair[0]], b1 = byId[pair[1]], B = pos(b0), Y = y(b1.scores[b]);
          hl.append("circle").attr("class", "ping").attr("cx", B.x).attr("cy", Y).attr("r", RI + 1).attr("stroke", BLUE);
          place(B.x, (Y + B.y) / 2, `${fmtv(b0.scores[b], b)} → ${fmtv(b1.scores[b], b)}`, "#1f5fcf", pair[2] !== "end");
          return;
        }
        const r = byId[id];
        if (r.kind === "prop") {
          haloText(hl, W - m.r - 2, y(r.scores[b]) - 6, "end", size, 700, "#33383f", (t) => t.text(`${r.model} ${fmtv(r.scores[b], b)}`));
          return;
        }
        const P0 = pos(r);
        hl.append("circle").attr("class", "ping").attr("cx", P0.x).attr("cy", P0.y).attr("r", R + 1).attr("stroke", "#17191c");
        place(P0.x, P0.y, `${r.disp} ${fmtv(r.scores[b], b)}`, "#17191c");
      }
      const hit = svg.append("rect").attr("class", "hit").attr("x", m.l - 6).attr("y", m.t - 6).attr("width", W - m.l - m.r + 12).attr("height", H - m.t - m.b + 12).attr("fill", "transparent");
      let cur = null;
      const near = (ev) => {
        const [mx, my] = d3.pointer(ev, svg.node());
        let best = null, bd = 18;
        cands.forEach((c) => { const dd = c.line ? Math.abs(my - c.y) + 5 : Math.hypot(mx - c.x, my - c.y); if (dd < bd) { bd = dd; best = c; } });
        return best;
      };
      const onMove = (ev) => {
        const c = near(ev);
        if (!c) { if (cur) { cur = null; focus(null); I.tip.hide(); } return; }
        if (!cur || cur.id !== c.id) { cur = c; focus(c.id); }
        I.tip.show(tipCard(byId[c.id], b), ev);
      };
      I.interact(hit, { sticky: true, enter: onMove, move: onMove, leave() { cur = null; focus(null); I.tip.hide(); } });
      return { label };
    }

    function draw(build) {
      host.innerHTML = "";
      api = [];
      const grid = d3.select(host).append("div").attr("class", "sm-grid");
      BN.forEach((name, b) => {
        const cell = grid.append("div").attr("class", "sm-cell");
        cell.append("p").attr("class", "sm-title").html(`<span class="nm">${name}</span><span class="reg" style="color:${REG[REGIME[b]]}">${REGIME[b]}</span>`);
        api.push(panel(cell.node(), b, build, b * 110));
      });
      grid.append("div").attr("class", "sm-cell sm-key").html(`
        <div><svg width="34" height="12" aria-hidden="true"><circle cx="5" cy="6" r="3.6" fill="#59616b"/><line x1="9.5" y1="6" x2="23" y2="6" stroke="${BLUE}" stroke-width="2" stroke-linecap="round"/><circle cx="28" cy="6" r="4.6" fill="${BLUE}"/></svg>
          <span>Base model, raised by RL to <i>Imago</i>: FLUX.2-Klein-Base-4B to <i>Imago</i>-4B, Z-Image to <i>Imago</i>-6B</span></div>
        <div><svg width="34" height="12" aria-hidden="true"><circle cx="17" cy="6" r="3.6" fill="#c9ced5"/></svg><span>Other open-weight models</span></div>
        <div><svg width="34" height="12" aria-hidden="true"><circle cx="17" cy="6" r="3.6" fill="#fff" stroke="#7d858f" stroke-width="1.5"/></svg><span>FLUX.2-dev, the largest (32B)</span></div>
        <div><svg width="34" height="12" aria-hidden="true"><line x1="2" y1="6" x2="32" y2="6" stroke="#7d858f" stroke-width="1.3" stroke-dasharray="5 3"/></svg><span>Nano-Banana (proprietary)</span></div>
        <div><svg width="34" height="12" aria-hidden="true"><line x1="2" y1="6" x2="32" y2="6" stroke="#7d858f" stroke-width="1.4" stroke-dasharray="1.4 2.6" stroke-linecap="round"/></svg><span>Imagen-4-Fast (proprietary)</span></div>
        <p>x: parameters (log scale) · y: benchmark score</p>`);
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== benchmarks by prompt length */
  I.register("benchmarks", (el) => {
    const host = el.querySelector(".chart");
    function draw(build) {
      const tight = host.clientWidth < 420;   // phones: a taller plot and smaller bubbles leave room for every label
      const H = tight ? 340 : Math.round(Math.max(290, Math.min(400, host.clientWidth * 0.46)));
      const { svg, W } = svgIn(host, H);
      const m = { t: 14, r: 16, b: 46, l: 54 };
      const x = d3.scaleLog().domain([5.2, 1000]).range([m.l, W - m.r]);
      const y = d3.scaleLinear().domain([0.515, 0.915]).range([H - m.b, m.t]);
      const k = Math.min(1, W / 820);

      svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).tickValues([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]).tickSize(-(W - m.l - m.r)).tickFormat(""))
        .call((g) => g.select(".domain").remove());
      // regimes: faint bands, dashed borders, names
      const regimes = [["short", 5.2, 100], ["medium", 100, 300], ["long", 300, 1000]];
      const gReg = svg.append("g").attr("opacity", build ? 0 : 1);
      gReg.selectAll("rect").data(regimes).join("rect").attr("x", (d) => x(d[1])).attr("width", (d) => x(d[2]) - x(d[1]))
        .attr("y", m.t).attr("height", H - m.b - m.t).attr("fill", (d) => REGL[d[0]]).attr("opacity", 0.13);
      gReg.selectAll("line").data([100, 300]).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b)
        .attr("stroke", "#5d646e").attr("stroke-width", 1).attr("stroke-dasharray", "6 5");
      gReg.selectAll("text").data(regimes).join("text").attr("x", (d) => (d[0] === "long" ? x(780) : (x(d[1]) + x(d[2])) / 2))
        .attr("y", (d) => (d[0] === "long" ? m.t + 22 : H - m.b - 10))
        .attr("text-anchor", "middle").attr("fill", (d) => REG[d[0]]).style("font-size", tight ? "12px" : "14px").style("font-weight", 700).text((d) => d[0]);
      if (build) gReg.transition().duration(dur(500)).attr("opacity", 1);

      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x).tickValues([10, 30, 100, 300, 1000]).tickFormat(d3.format("d")).tickSizeOuter(0));
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).tickValues([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]).tickFormat(d3.format(".2f")).tickSizeOuter(0));
      svg.append("text").attr("class", "axis-title").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").text("Mean prompt length (words, log scale)");
      svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(14,${(m.t + H - m.b) / 2}) rotate(-90)`).text("Mean normalized score");

      // the paper's trend arrow: one filled shape along the fitted trend, narrow at its tail and widening toward
      // its head (plot_benchmark_overview.py); it runs behind the bubbles and is uncovered from left to right
      const C = P.benchTrend.map(([w, s]) => [x(w), y(s)]);
      const arc = [0];
      for (let i = 1; i < C.length; i++) arc.push(arc[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
      const tan = C.map((p, i) => {
        const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      });
      const s = Math.max(0.65, Math.min(1.15, W / 820));
      const w0 = 1.3 * s, w1 = 6.8 * s, hw = 13.5 * s, hl = 19 * s, L = arc[arc.length - 1];
      let kk = arc.findIndex((a) => a >= L - hl);
      if (kk < 1) kk = 1;
      const left = [], right = [];
      for (let i = 0; i <= kk; i++) {
        const w = w0 + (w1 - w0) * (arc[i] / arc[kk]);
        const n = [-tan[i][1], tan[i][0]];
        left.push([C[i][0] + n[0] * w, C[i][1] + n[1] * w]);
        right.push([C[i][0] - n[0] * w, C[i][1] - n[1] * w]);
      }
      const nk = [-tan[kk][1], tan[kk][0]], tip = C[C.length - 1];
      const outline = left.concat([[C[kk][0] + nk[0] * hw, C[kk][1] + nk[1] * hw], tip, [C[kk][0] - nk[0] * hw, C[kk][1] - nk[1] * hw]], right.reverse());
      svg.append("path").attr("d", "M" + outline.map((p) => p.map((v) => v.toFixed(1)).join(",")).join("L") + "Z")
        .attr("fill", "#d9d9d9").attr("clip-path", wipe(svg, 0, 0, W, H, build, 1150, 1100));

      const nmin = d3.min(BENCH, (d) => d.prompts), nmax = d3.max(BENCH, (d) => d.prompts);
      const r0 = tight ? 7 : Math.max(9, Math.min(15.5, W * 0.0175));
      const rOf = (d) => Math.sqrt((1 + 6 * (d.prompts - nmin) / (nmax - nmin))) * r0;   // area 1x .. 7x, as in the paper
      const guide = svg.append("g").attr("class", "guide").style("pointer-events", "none");
      const bub = svg.append("g").selectAll("circle").data(BENCH).join("circle").attr("class", "bub")
        .attr("cx", (d) => x(d.words)).attr("cy", (d) => y(d.score)).attr("r", (d) => (build ? 0 : rOf(d)))
        .attr("fill", (d) => REGL[d.regime]).attr("fill-opacity", 0.92).attr("stroke", "#fff").attr("stroke-width", 1.5);
      if (build) bub.transition().delay((d, i) => dur(250 + i * 130)).duration(dur(550)).ease(d3.easeBackOut.overshoot(1.6)).attr("r", rOf);
      I.hover(bub, (d) => I.card({ title: d.name, color: REG[d.regime], sub: `${d.regime} prompts`, rows: [
        { k: "Mean prompt length", v: `${d.words} words` }, { k: "Prompts", v: d.prompts.toLocaleString() },
        { k: `Mean score, ${d.models} models`, v: d.score.toFixed(3) }] }),
      (d) => focusBench(d), () => focusBench(null));
      /* hovering a benchmark: it grows, the others fade, and dashed guides carry its values to both axes */
      function focusBench(d) {
        svg.classed("focusing", !!d);
        bub.classed("on", (q) => q === d);
        svg.selectAll(".blab").classed("on", (q) => q === d);
        gReg.selectAll("rect").attr("opacity", (q) => (d && q[0] === d.regime ? 0.32 : 0.13));
        guide.selectAll("*").remove();
        if (!d) return;
        const cx = x(d.words), cy = y(d.score), r = rOf(d) * 1.08, c = darker(REG[d.regime], 0.15);
        guide.append("line").attr("x1", cx).attr("x2", cx).attr("y1", cy + r + 2).attr("y2", H - m.b).attr("stroke", c).attr("stroke-width", 1.4).attr("stroke-dasharray", "3 3");
        guide.append("line").attr("x1", m.l).attr("x2", cx - r - 2).attr("y1", cy).attr("y2", cy).attr("stroke", c).attr("stroke-width", 1.4).attr("stroke-dasharray", "3 3");
        badge(guide, cx, H - m.b + 12, `${d.words} words`, c, "middle");
        badge(guide, m.l - 3, cy, d.score.toFixed(3), c, "end");
      }

      // labels: where the paper puts them on wide screens; placed clear of everything on narrow ones
      const where = { tiifbench: [-14, "above"], spatialgeneval: [-4, "below"], t2icorebench_composition: [8, "below"], lpdbench: [-22, "above"], arenat2ihard: [0, "left"], longbencht2i: [46, "above"] };
      const side = (d) => (where[d.key] || [0, "above"])[1];
      const fs = tight ? 10.5 : W < 520 ? 11.5 : 13.5;
      let pos = BENCH.map((d) => ({
        x: side(d) === "left" ? x(d.words) - rOf(d) - 8 : x(d.words) + (where[d.key] ? where[d.key][0] : 0) * k,
        y: side(d) === "below" ? y(d.score) + rOf(d) + 16 : side(d) === "left" ? y(d.score) + 4.5 : y(d.score) - rOf(d) - 7,
        anchor: side(d) === "left" ? "end" : "middle" }));
      if (W < 640) {
        const obstacles = BENCH.map((d) => ({ x: x(d.words) - rOf(d), y: y(d.score) - rOf(d), w: 2 * rOf(d), h: 2 * rOf(d) }));
        C.forEach((q, i) => { if (i % 4 === 0) obstacles.push({ x: q[0] - 5, y: q[1] - 5, w: 10, h: 10 }); });
        gReg.selectAll("text").each(function () { const bb = this.getBBox(); obstacles.push({ x: bb.x, y: bb.y, w: bb.width, h: bb.height }); });
        const labels = BENCH.map((d) => {
          const r = rOf(d);
          return { text: SHORTNAME[d.name], x: x(d.words), y: y(d.score), size: fs, cands: [
            { dx: 0, dy: -r - 6, anchor: "middle" }, { dx: 0, dy: r + 15, anchor: "middle" }, { dx: r + 5, dy: 4, anchor: "start" },
            { dx: -r - 5, dy: 4, anchor: "end" }, { dx: r * 0.7, dy: -r - 6, anchor: "start" }, { dx: -r * 0.7, dy: -r - 6, anchor: "end" },
            { dx: r * 0.7, dy: r + 15, anchor: "start" }, { dx: -r * 0.7, dy: r + 15, anchor: "end" },
            { dx: -r - 5, dy: -8, anchor: "end" }, { dx: -r - 5, dy: 16, anchor: "end" }, { dx: 0, dy: -r - 19, anchor: "middle" }, { dx: 0, dy: r + 28, anchor: "middle" }] };
        });
        I.placeLabels(labels, obstacles, { x0: m.l + 2, x1: W - 2, y0: 2, y1: H - m.b });
        pos = labels.map((Lb) => ({ x: Lb.x + Lb.pos.dx, y: Lb.y + Lb.pos.dy, anchor: Lb.pos.anchor }));
      }
      svg.append("g").selectAll("text").data(BENCH).join("text").attr("class", "blab")
        .attr("x", (d, i) => pos[i].x).attr("y", (d, i) => pos[i].y).attr("text-anchor", (d, i) => pos[i].anchor)
        .style("font-size", fs + "px").attr("fill", "#33383f")
        .attr("stroke", "#fff").attr("stroke-width", 3.5).attr("paint-order", "stroke").text((d) => (W < 640 ? SHORTNAME[d.name] : d.name))
        .attr("opacity", build ? 0 : 1)
        .call((sel) => build && sel.transition().delay((d, i) => dur(450 + i * 130)).duration(dur(400)).attr("opacity", 1));
      guide.raise();
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== preference-evaluator pair grid */
  I.register("prefEval", (el) => {
    const host = el.querySelector(".chart");
    const D = P.prefEval, names = D.order, n = names.length;
    function draw(build) {
      const Wc = Math.max(260, host.clientWidth);
      const narrow = Wc < 620;
      const gridW = Wc - 26, cw = gridW / n, ch = narrow ? cw * 0.62 : cw * 0.44;
      // narrow screens: each row gets a band above it for the panel labels, so they never cover the regions
      const band = narrow ? 14 : 0, rowH = ch + band;
      const barsBelow = narrow;
      const barH = barsBelow ? 4 * 26 + 32 : 0;
      const H = Math.round(n * rowH + 30 + barH);
      const { svg } = svgIn(host, H);
      const x0 = 24, y0 = 4;
      const cells = [];
      for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) cells.push({ i, j });
      const gCells = svg.append("g");
      const regionPath = (name) => D.regions[name].map((poly) =>
        "M" + poly.map(([u, v]) => `${(u * cw).toFixed(1)},${((1 - v) * ch).toFixed(1)}`).join("L") + "Z").join("");

      const cellG = gCells.selectAll("g.cell").data(cells).join("g").attr("class", "cell")
        .attr("transform", (d) => `translate(${x0 + d.j * cw},${y0 + d.i * rowH + band})`);
      cellG.append("rect").attr("width", cw).attr("height", ch).attr("fill", "#fff").attr("stroke", "#c9ced5").attr("stroke-width", 0.8);
      cellG.each(function () {
        const g = d3.select(this);
        [1, 2, 3].forEach((q) => {
          g.append("line").attr("x1", (cw * q) / 4).attr("x2", (cw * q) / 4).attr("y1", 0).attr("y2", ch).attr("stroke", "#f0f1f3");
          g.append("line").attr("y1", (ch * q) / 4).attr("y2", (ch * q) / 4).attr("x1", 0).attr("x2", cw).attr("stroke", "#f0f1f3");
        });
      });
      const regionsOf = (d) => (d.i === d.j ? [names[d.i]] : [names[d.j], names[d.i]]);
      cellG.each(function (d, idx) {
        const g = d3.select(this);
        regionsOf(d).forEach((name, k) => {
          const p = g.append("path").attr("d", regionPath(name)).attr("fill", D.fill[name]).attr("fill-opacity", 0.55)
            .attr("stroke", D.edge[name]).attr("stroke-width", 1.8);
          if (build) {
            const delay = d.i === d.j ? 120 + d.i * 160 : 800 + idx * 70 + k * 120;
            p.attr("fill-opacity", 0).attr("stroke-opacity", 0).attr("transform", `translate(${cw / 2},${ch / 2}) scale(0.6) translate(${-cw / 2},${-ch / 2})`)
              .transition().delay(dur(delay)).duration(dur(650)).ease(d3.easeCubicOut)
              .attr("fill-opacity", 0.55).attr("stroke-opacity", 1).attr("transform", "translate(0,0) scale(1)");
          }
        });
        const label = d.i === d.j ? names[d.i] : `r = ${D.r[names[d.i]][names[d.j]].toFixed(2)}`;
        g.append("text").attr("x", narrow ? 1 : 8).attr("y", narrow ? -4 : 17).text(label)
          .style("font-size", (narrow ? 10 : 14.5) + "px").style("font-weight", 700)
          .attr("fill", d.i === d.j ? D.edge[names[d.i]] : "#33383f").attr("opacity", build ? 0 : 1)
          .call((s) => build && s.transition().delay(dur(d.i === d.j ? 300 + d.i * 160 : 1000 + idx * 70)).duration(dur(350)).attr("opacity", 1));
      });
      svg.append("text").attr("class", "axis-title").attr("x", x0 + gridW / 2).attr("y", y0 + n * rowH + 20).attr("text-anchor", "middle").text("PC1");
      svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(12,${y0 + (n * rowH) / 2}) rotate(-90)`).text("PC2");

      // r-bar per evaluator: right-anchored bars, as in the paper (upper-right block, or below on narrow screens)
      const sorted = names.slice().sort((a, b) => D.rbar[b] - D.rbar[a]);
      const bx0 = barsBelow ? x0 : x0 + cw + 18, bx1 = barsBelow ? x0 + gridW - 110 : x0 + gridW - 112;
      const by0 = barsBelow ? y0 + n * rowH + 58 : y0 + 10, bh = barsBelow ? 16 : Math.min(18, ch * 0.2), gap = barsBelow ? 10 : Math.min(15, ch * 0.16);
      const base = d3.min(sorted, (r) => D.rbar[r]) - 0.03;
      const bw = d3.scaleLinear().domain([base, d3.max(sorted, (r) => D.rbar[r])]).range([18, (bx1 - bx0) * 0.86]);
      const gb = svg.append("g");
      sorted.forEach((name, k) => {
        const yy = by0 + k * (bh + gap);
        const w = bw(D.rbar[name]);
        const rect = gb.append("rect").attr("data-name", name).attr("x", bx1 - (build ? 0 : w)).attr("y", yy).attr("width", build ? 0 : w).attr("height", bh)
          .attr("fill", D.fill[name]).attr("rx", 2);
        if (build) rect.transition().delay(dur(400 + k * 120)).duration(dur(700)).ease(d3.easeCubicOut).attr("x", bx1 - w).attr("width", w);
        gb.append("text").attr("data-name", name).attr("x", bx1 - w - 7).attr("y", yy + bh / 2 + 4.5).attr("text-anchor", "end")
          .style("font-size", "13.5px").style("font-weight", 700).attr("fill", "#33383f").text(D.rbar[name].toFixed(2))
          .attr("opacity", build ? 0 : 1).call((s) => build && s.transition().delay(dur(900 + k * 120)).duration(dur(300)).attr("opacity", 1));
        gb.append("text").attr("data-name", name).attr("x", bx1 + 8).attr("y", yy + bh / 2 + 4.5).style("font-size", "13.5px")
          .style("font-weight", name === "PickScore" ? 700 : 400).attr("fill", D.edge[name]).text(name);
      });
      gb.append("text").attr("x", barsBelow ? bx0 : bx1 - bw(D.rbar[sorted[0]])).attr("y", by0 - 8).style("font-size", "12.5px").attr("fill", "#8c939c")
        .text("mean correlation with the other three (r̄)");

      // hover a panel: outline it, keep it and its evaluators' diagonal panels and bars, fade the rest
      const focusCells = (keep, names_) => {
        gCells.classed("focusing", !!keep);
        cellG.classed("on", (c) => !!keep && keep(c));
        gb.classed("focusing", !!names_);
        gb.selectAll("[data-name]").classed("on", function () { return !!names_ && names_.has(this.getAttribute("data-name")); });
      };
      I.hover(cellG, (d) => (d.i === d.j
        ? I.card({ title: names[d.i], color: D.edge[names[d.i]], sub: "where it rates samples highly",
          rows: names.filter((q) => q !== names[d.i]).map((q) => ({ k: `r with ${q}`, v: rOf(names[d.i], q).toFixed(2), color: D.edge[q] })) })
        : I.card({ title: `${names[d.i]} × ${names[d.j]}`, sub: "pooled samples of 19 models", rows: [{ k: "Pearson r", v: D.r[names[d.i]][names[d.j]].toFixed(2) }] })),
      function (d) {
        d3.select(this).select("rect").attr("stroke", "#17191c").attr("stroke-width", 1.6);
        focusCells((c) => (c.i === d.i && c.j === d.j) || (c.i === c.j && (c.i === d.i || c.i === d.j)), new Set([names[d.i], names[d.j]]));
      },
      function () {
        d3.select(this).select("rect").attr("stroke", "#c9ced5").attr("stroke-width", 0.8);
        focusCells(null, null);
      });
      // hover an evaluator's bar: its row and column of panels stay, with its correlation to each of the others
      const rOf = (a, b2) => (D.r[a] && D.r[a][b2] != null ? D.r[a][b2] : D.r[b2][a]);
      sorted.forEach((name, k) => {
        const yy = by0 + k * (bh + gap), w = bw(D.rbar[name]);
        const hit = gb.append("rect").attr("x", bx1 - w - 44).attr("y", yy - gap / 2).attr("width", w + 44 + 110).attr("height", bh + gap).attr("fill", "transparent");
        I.hover(hit, () => I.card({ title: name, color: D.edge[name], sub: `mean correlation with the other three: ${D.rbar[name].toFixed(2)}`,
          rows: names.filter((q) => q !== name).map((q) => ({ k: q, v: rOf(name, q).toFixed(2), color: D.edge[q], bar: rOf(name, q) })) }),
        () => focusCells((c) => names[c.i] === name || names[c.j] === name, new Set([name])), () => focusCells(null, null));
      });
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== reward alignment (two figures)
     Top: the 19 models on each of the seven benchmarks (reward vs. benchmark score, both min-max normalized, with
     a linear fit per reward). Bottom: each reward's Pearson r per benchmark, in the same columns. */
  const MARK = { CLIPScore: "s", HPSv3: "P", PickScore: "D", ImageReward: "*", UnifiedReward: "^", PromptScore: "o",
    "Binary · Qwen3.5-9B": "X", "Graded · Gemma-4-E4B": "h", "Graded · Qwen3.5-9B": "o" };
  // filled versions of matplotlib's "X" and hexagon markers, which d3 lacks (d3.symbolX is drawn by stroke only)
  const symbolXFill = { draw(c, size) {
    const r = Math.sqrt(size / 5) / 2, q = Math.SQRT1_2;
    const pts = [[-3, -1], [-1, -1], [-1, -3], [1, -3], [1, -1], [3, -1], [3, 1], [1, 1], [1, 3], [-1, 3], [-1, 1], [-3, 1]];
    pts.forEach(([a, b], i) => { const x = (a - b) * q * r, y = (a + b) * q * r; i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
  } };
  const symbolHex = { draw(c, size) {
    const s = Math.sqrt((2 * size) / (3 * Math.sqrt(3)));
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; i ? c.lineTo(s * Math.cos(a), s * Math.sin(a)) : c.moveTo(s * Math.cos(a), s * Math.sin(a)); }
    c.closePath();
  } };
  const symFor = (name, size) => d3.symbol().type({ s: d3.symbolSquare, P: d3.symbolCross, D: d3.symbolDiamond, "*": d3.symbolStar, "^": d3.symbolTriangle,
    o: d3.symbolCircle, X: symbolXFill, h: symbolHex }[MARK[name]] || d3.symbolCircle).size(size)();

  function alignFigure(el, groupKey) {
    const host = el.querySelector(".chart");
    const S = P.rewardAlign[groupKey];
    const byName = Object.fromEntries(S.map((s) => [s.name, s]));
    const order = S.filter((s) => !s.highlight).concat(S.filter((s) => s.highlight));
    let api = null;
    const leg = legend(el, S.map((s) => ({ key: s.name, name: s.name, color: s.color, thick: s.highlight })), (key) => api && api.series(key));
    const rDomain = groupKey === "classic" ? [-1, 1] : [0.7, 1];
    const rTicks = groupKey === "classic" ? [-1, -0.5, 0, 0.5, 1] : [0.7, 0.8, 0.9, 1];

    function draw(build) {
      const Wc = Math.max(280, host.clientWidth);
      const stacked = Wc < 640;
      const cols = stacked ? 4 : 7, ml = stacked ? 34 : 50, gap = stacked ? 7 : 9;
      const pw = Math.floor((Wc - ml - (cols - 1) * gap) / cols);
      const titleH = stacked ? 16 : 30, rowGap = stacked ? 10 : 0;
      const nRows = Math.ceil(7 / cols);
      const scatterH = nRows * (titleH + pw) + (nRows - 1) * rowGap;
      const rTop = scatterH + (stacked ? 46 : 40), rH = stacked ? 170 : 190, rBottom = stacked ? 26 : 30;
      const H = rTop + rH + rBottom + (Wc < 400 ? 12 : 0);
      const { svg } = svgIn(host, H);

      /* scatter panels */
      const sx = d3.scaleLinear().domain([-0.04, 1.04]).range([0, pw]);
      const sy = d3.scaleLinear().domain([-0.04, 1.04]).range([pw, 0]);
      const centers = [], frames = [], spots = [];   // spots[i]: every point of panel i, in svg coordinates
      BENCH.forEach((B, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const px = ml + col * (pw + gap), py = row * (titleH + pw + rowGap) + titleH;
        centers.push(px + pw / 2);
        const g = svg.append("g").attr("transform", `translate(${px},${py})`);
        const t = g.append("text").attr("class", "ptitle").attr("x", pw / 2).attr("text-anchor", "middle").style("font-size", stacked ? "11px" : "12.5px").attr("fill", "#33383f");
        if (stacked) t.attr("y", -5).text(SHORTNAME[B.name]);
        else I.twoLine(B.name).forEach((q, k) => t.append("tspan").attr("x", pw / 2).attr("y", -19 + k * 14).text(q));
        frames.push(g.append("rect").attr("class", "pframe").attr("width", pw).attr("height", pw).attr("fill", "#fff").attr("stroke", "#d5d9de"));
        g.append("line").attr("x1", sx(0.5)).attr("x2", sx(0.5)).attr("y1", 0).attr("y2", pw).attr("stroke", "#eef0f2");
        g.append("line").attr("y1", sy(0.5)).attr("y2", sy(0.5)).attr("x1", 0).attr("x2", pw).attr("stroke", "#eef0f2");
        const cp = "ac" + ++uid;
        g.append("defs").append("clipPath").attr("id", cp).append("rect").attr("width", pw).attr("height", pw);
        const gf = g.append("g").attr("clip-path", `url(#${cp})`), gpts = g.append("g");
        const delay = 100 + i * 90;
        spots.push([]);
        order.forEach((s) => {
          const b = s.bench[i], hi = s.highlight;
          const col_ = hi ? s.color : light(s.color, 0.35), op = hi ? 1 : 0.8;
          const e = b.fit.flat != null ? [0, b.fit.flat, 1, b.fit.flat] : [0, b.fit.intercept, 1, b.fit.slope + b.fit.intercept];
          const ln = gf.append("line").attr("data-s", s.name).attr("opacity", op)
            .attr("x1", sx(e[0])).attr("y1", sy(e[1])).attr("x2", build ? sx(e[0]) : sx(e[2])).attr("y2", build ? sy(e[1]) : sy(e[3]))
            .attr("stroke", col_).attr("stroke-width", hi ? 2.6 : 1.4).attr("stroke-dasharray", b.fit.flat != null ? "2 3" : null);
          if (build) ln.transition().delay(dur(delay + 450)).duration(dur(550)).ease(d3.easeCubicOut).attr("x2", sx(e[2])).attr("y2", sy(e[3]));
          const po = hi ? 0.95 : 0.65;
          const dots = gpts.append("g").attr("data-s", s.name).attr("opacity", build ? 0 : po).selectAll("path")
            .data(b.pts.map((q) => ({ m: q[0], x: q[1], y: q[2], s }))).join("path")
            .attr("transform", (d) => `translate(${sx(d.x)},${sy(d.y)})`).attr("d", symFor(s.name, hi ? (stacked ? 20 : 30) : (stacked ? 11 : 16)))
            .attr("fill", hi ? light(s.color, 0.15) : light(s.color, 0.45)).attr("stroke", hi ? s.color : "none").attr("stroke-width", 0.6);
          if (build) d3.select(dots.node().parentNode).transition().delay(dur(delay)).duration(dur(420)).attr("opacity", po);
          b.pts.forEach((q) => spots[i].push({ m: q[0], x: q[1], y: q[2], s, r: b.r, px: px + sx(q[1]), py: py + sy(q[2]) }));
        });
        gpts.selectAll("g").filter(function () { return byName[this.getAttribute("data-s")].highlight; }).raise();
      });
      // scatter axes, once: on the left of the first panel
      const p0y = titleH;
      svg.append("text").attr("x", ml - 6).attr("y", p0y + 9).attr("text-anchor", "end").style("font-size", "11px").attr("fill", "#8c939c").text("1");
      svg.append("text").attr("x", ml - 6).attr("y", p0y + pw).attr("text-anchor", "end").style("font-size", "11px").attr("fill", "#8c939c").text("0");
      svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(${stacked ? 10 : 16},${p0y + pw / 2}) rotate(-90)`)
        .style("font-size", "12px").text(stacked ? "score" : "Benchmark");
      svg.append("text").attr("x", ml).attr("y", (stacked ? scatterH : p0y + pw) + 14).style("font-size", "11.5px").attr("fill", "#8c939c").text("x: reward →");

      /* Pearson r per benchmark */
      const xr = stacked ? d3.scalePoint().domain(d3.range(7)).range([ml, Wc - 8]).padding(0.4) : null;
      const xc = (i) => (stacked ? xr(i) : centers[i]);
      const half = stacked ? xr.step() / 2 : (pw + gap) / 2;
      const y = d3.scaleLinear().domain(rDomain).range([rTop + rH, rTop]);
      const x0 = ml, x1 = Wc - 2;
      svg.append("g").attr("class", "grid").attr("transform", `translate(${x0},0)`)
        .call(d3.axisLeft(y).tickValues(rTicks).tickSize(-(x1 - x0)).tickFormat("")).call((g) => g.select(".domain").remove());
      if (rDomain[0] < 0) svg.append("line").attr("x1", x0).attr("x2", x1).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#c8cdd4");
      svg.append("g").attr("class", "axis").attr("transform", `translate(${x0},0)`).call(d3.axisLeft(y).tickValues(rTicks).tickSizeOuter(0));
      if (stacked) svg.append("text").attr("class", "axis-title").attr("x", 2).attr("y", rTop - 12).text("Pearson r");
      else svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(14,${rTop + rH / 2}) rotate(-90)`).text("Pearson r");
      regimeStrip(svg, xc, half, x0, x1, rTop + rH + 2);
      const stagger = xc(1) - xc(0) < 48;
      const blabs = BENCH.map((B, i) => svg.append("text").attr("class", "blab").attr("x", xc(i)).attr("y", rTop + rH + 19 + (stagger && i % 2 ? 12 : 0)).attr("text-anchor", "middle")
        .style("font-size", stacked ? "10px" : "12px").attr("fill", "#5d646e").text(SHORTNAME[B.name]));
      // a column band per benchmark sits behind the lines; hovering it ranks every reward on that benchmark
      const colBand = svg.append("rect").attr("class", "colband").attr("y", rTop - 8).attr("height", rH + 16).attr("width", 2 * half - 4).attr("rx", 6).attr("opacity", 0);
      const cols_ = svg.append("g");
      const gl = svg.append("g").attr("clip-path", wipe(svg, 0, rTop - 12, Wc, rH + 24, build, 900, 1100));
      const ptSel = [];
      order.forEach((s) => {
        const vals = s.bench.map((b) => b.r), hi = s.highlight, op = hi ? 1 : 0.85;
        const g = gl.append("g").attr("data-s", s.name).attr("opacity", op);
        g.append("path").attr("class", "rline").attr("d", d3.line().defined((v) => v != null).x((v, i) => xc(i)).y((v) => y(Math.max(rDomain[0], v)))(vals))
          .attr("fill", "none").attr("stroke", hi ? s.color : light(s.color, 0.35)).attr("stroke-width", hi ? 3.4 : 1.9);
        ptSel.push(g.selectAll("path.pt").data(vals.map((v, i) => ({ v, i, s })).filter((d) => d.v != null)).join("path").attr("class", "pt")
          .attr("transform", (d) => `translate(${xc(d.i)},${y(Math.max(rDomain[0], d.v))})`)
          .attr("d", symFor(s.name, hi ? 85 : 52)).attr("fill", hi ? light(s.color, 0.25) : light(s.color, 0.5)).attr("stroke", hi ? s.color : "#fff").attr("stroke-width", hi ? 1.3 : 0.8));
      });

      /* ---- hover ---- */
      const labs = svg.append("g").attr("class", "hl").style("pointer-events", "none");
      const rings = svg.append("g").attr("class", "hl").style("pointer-events", "none");
      const rText = (v, d = 2) => (v == null ? "n/a" : v.toFixed(d));
      // a reward in focus: every panel keeps only it, and its r is written above each of its points
      function series(key) {
        focusSeries(svg.node(), key);
        leg.mark(key);
        labs.selectAll("*").remove();
        if (!key) return;
        const s = byName[key];
        s.bench.forEach((b, i) => {
          if (b.r == null) return;
          const py = y(Math.max(rDomain[0], b.r));
          const above = py - 11 > rTop + 2;
          haloText(labs, xc(i), above ? py - 10 : py + 19, "middle", stacked ? 10.5 : 11.5, 700, darker(s.color, 0.25), (t) => t.text(rText(b.r)));
        });
      }
      api = { series };
      ptSel.forEach((sel) => I.hover(sel, (d) => I.card({ title: d.s.name, color: d.s.color, sub: `Pearson r with each benchmark, 19 models`,
        rows: d.s.bench.map((b, i) => ({ k: BENCH[i].name, v: rText(b.r, 3), on: i === d.i })) }),
      (d) => series(d.s.name), () => series(null)));
      // a benchmark column in focus
      BENCH.forEach((B, i) => {
        const hit = cols_.append("rect").attr("x", xc(i) - half + 2).attr("width", 2 * half - 4).attr("y", rTop - 8).attr("height", rH + 16).attr("fill", "transparent");
        I.hover(hit, () => {
          const ranked = S.map((s) => ({ s, r: s.bench[i].r })).sort((a2, b2) => (b2.r == null ? -9 : b2.r) - (a2.r == null ? -9 : a2.r));
          return I.card({ title: B.name, color: REG[B.regime], sub: `Pearson r across 19 models · ${B.regime} prompts`,
            rows: ranked.map(({ s, r }) => ({ k: s.name, v: rText(r, 3), color: s.color, on: s.highlight, bar: r == null ? 0 : (r - rDomain[0]) / (1 - rDomain[0]) })) });
        }, () => {
          colBand.attr("x", xc(i) - half + 2).attr("opacity", 1);
          frames[i].classed("on", true);
          blabs[i].classed("on", true);
        }, () => {
          colBand.attr("opacity", 0);
          frames[i].classed("on", false);
          blabs[i].classed("on", false);
        });
      });
      // a scatter point in focus: its reward stays, and the same model is ringed in all seven panels
      BENCH.forEach((B, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const px = ml + col * (pw + gap), py = row * (titleH + pw + rowGap) + titleH;
        const hit = svg.append("rect").attr("x", px).attr("y", py).attr("width", pw).attr("height", pw).attr("fill", "transparent");
        let cur = null;
        const onMove = (ev) => {
          const [mx, my] = d3.pointer(ev, svg.node());
          let best = null, bd = 12;
          spots[i].forEach((q) => { const dd = Math.hypot(q.px - mx, q.py - my) - (q.s.highlight ? 1.5 : 0); if (dd < bd) { bd = dd; best = q; } });
          if (!best) { if (cur) { cur = null; series(null); rings.selectAll("*").remove(); I.tip.hide(); } return; }
          if (!cur || cur !== best) {
            cur = best;
            series(best.s.name);
            rings.selectAll("*").remove();
            spots.forEach((sp, j) => sp.filter((q) => q.s === best.s && q.m === best.m).forEach((q) => rings.append("circle").attr("class", j === i ? "ring ping" : "ring")
              .attr("cx", q.px).attr("cy", q.py).attr("r", stacked ? 4.5 : 5.5)));
          }
          I.tip.show(I.card({ title: I.esc(best.m), color: best.s.color, sub: `${best.s.name} on ${B.name}`, rows: [
            { k: "Reward (normalized)", v: best.x.toFixed(2) }, { k: "Benchmark (normalized)", v: best.y.toFixed(2) },
            { k: "Pearson r, this benchmark", v: rText(best.r, 3) }], note: "Ringed in every panel." }), ev);
        };
        I.interact(hit, { sticky: true, enter: onMove, move: onMove, leave() { cur = null; series(null); rings.selectAll("*").remove(); I.tip.hide(); } });
      });
      labs.raise();
      rings.raise();
    }
    return { render: () => draw(false), play: () => draw(true) };
  }
  I.register("rewardAlign", (el) => alignFigure(el, "classic"));
  I.register("rewardVariants", (el) => alignFigure(el, "variants"));

  /* ======================================================================== line panels (shared)
     The y-range fits the series drawn in the panel with a small margin, so the lines fill the plot; the base-model
     line appears when 0 lies in that range. Hover: a crosshair at the nearest x position, the nearest series in focus
     with its value written beside it (linkPanels keeps all panels of a figure on the same position). */
  function linePanel(host, o) {
    const W = Math.max(240, host.clientWidth), H = o.height || 260;
    host.innerHTML = "";
    if (o.title) d3.select(host).append("p").attr("class", "panel-title").html(o.title);
    const svg = d3.select(host).append("svg").attr("width", W).attr("height", H);
    const m = { t: 12, r: 12, b: (o.xTitle ? 46 : 34) + (o.xShort && W < 360 ? 12 : 0), l: o.yTitle ? 58 : 44, ...(o.margin || {}) };
    const n = o.xs.length;
    const x = o.xLinear ? d3.scaleLinear().domain(o.xDomain).range([m.l, W - m.r]) : d3.scalePoint().domain(d3.range(n)).range([m.l, W - m.r]).padding(0.3);
    const xOf = (i) => (o.xLinear ? x(o.xs[i]) : x(i));
    const all = o.series.flatMap((s) => s.values).filter((v) => v != null);
    const lo = d3.min(all), hi = d3.max(all), pad = Math.max((hi - lo) * 0.07, 0.15);
    const y = d3.scaleLinear().domain([lo - pad, hi + pad]).range([H - m.b, m.t]);
    const yt = y.ticks(5);
    svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues(yt).tickSize(-(W - m.l - m.r)).tickFormat("")).call((g) => g.select(".domain").remove());
    if (o.zero && y.domain()[0] < 0 && y.domain()[1] > 0) {
      svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#9aa1aa").attr("stroke-dasharray", "4 4");
      svg.append("text").attr("x", m.l + 6).attr("y", y(0) - 16 > m.t ? y(0) - 6 : y(0) + 15).style("font-size", "12px").attr("fill", "#8c939c").text("Base model");
    }
    const xa = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`);
    if (o.xLinear) xa.call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
    else {
      xa.call(d3.axisBottom(x).tickFormat((i) => (o.xShort ? SHORTNAME[o.xs[i]] || o.xs[i] : o.xs[i])).tickSizeOuter(0));
      if (o.xShort) {
        xa.selectAll(".tick text").style("font-size", W < 380 ? "10.5px" : "12px");
        if (x.step() < 46) xa.selectAll(".tick text").attr("dy", (d, i) => (i % 2 ? "1.95em" : "0.71em"));
      }
      if (o.regimeStrip) {
        regimeStrip(svg, (i) => x(i), x.step() / 2, m.l, W - m.r, H - m.b + 1);
        xa.attr("transform", `translate(0,${H - m.b + 4})`).call((g) => g.select(".domain").remove()).selectAll(".tick line").remove();
      }
    }
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues(yt).tickFormat((d) => (o.yFormat ? o.yFormat(d) : d)).tickSizeOuter(0));
    if (o.xTitle) svg.append("text").attr("class", "axis-title").attr("x", (m.l + W - m.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").text(o.xTitle);
    if (o.yTitle) svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`).text(o.yTitle);

    const groups = {}, marks = {};
    o.series.forEach((s) => {
      const g = svg.append("g").attr("data-s", s.key).attr("opacity", s.opacity == null ? 1 : s.opacity);
      g.attr("clip-path", wipe(svg, 0, 0, W, H, o.animate, s.delay != null ? s.delay : o.delay || 0, o.wipeMs || 1000));
      g.append("path").attr("d", d3.line().defined((v) => v != null).x((v, i) => xOf(i)).y((v) => y(v))(s.values))
        .attr("fill", "none").attr("stroke", s.color).attr("stroke-width", s.width || 2.2).attr("stroke-dasharray", s.dashed ? "7 5" : null).attr("stroke-linecap", "round");
      const type = symbolOf[s.marker || "o"], size = s.markerSize || 55, flip = s.marker === "v";
      const at = (d) => `translate(${xOf(d.i)},${y(d.v)})${flip ? " rotate(180)" : ""}`;
      const pts = g.selectAll("path.pt").data(s.values.map((v, i) => ({ v, i, s })).filter((d) => d.v != null)).join("path").attr("class", "pt")
        .attr("transform", at).attr("d", d3.symbol().type(type).size(size)())
        .attr("fill", s.markerFill || s.color).attr("stroke", "#fff").attr("stroke-width", 1.1);
      groups[s.key] = g;
      marks[s.key] = { pts, type, size };
    });
    o.series.filter((s) => s.top).forEach((s) => groups[s.key].raise());

    /* hover layer */
    const cur = svg.append("g").attr("class", "cursor").style("pointer-events", "none");
    const hl = svg.append("g").attr("class", "hl").style("pointer-events", "none");
    const hit = svg.append("rect").attr("class", "hit").attr("x", m.l - 8).attr("y", m.t - 6).attr("width", W - m.l - m.r + 16).attr("height", H - m.t - m.b + 12).attr("fill", "transparent");
    const tickText = o.xLinear ? null : xa.selectAll(".tick text");
    const byKey = Object.fromEntries(o.series.map((s) => [s.key, s]));
    const valueText = o.valueText || ((v) => I.pct(v, 1));
    function label(s, i, every) {
      const v = s.values[i];
      if (v == null) return;
      const px = xOf(i), py = y(v), col = darker(s.swatch || s.color, 0.3), size = W < 380 ? 10.5 : 11.5;
      if (every) { haloText(hl, px, py - 11 > m.t - 4 ? py - 11 : py + 20, "middle", size, 700, col, (t) => t.text(valueText(v))); return; }
      const w = I.textWidth(valueText(v), size, 700), right = px + 11 + w < W - 2;
      haloText(hl, px + (right ? 11 : -11), py + size * 0.36, right ? "start" : "end", size, 700, col, (t) => t.text(valueText(v)));
    }
    /* i: x position for the crosshair (null: none); key: series in focus (null: none); every: label all of its points */
    function mark(i, key, every) {
      cur.selectAll("*").remove();
      hl.selectAll("*").remove();
      if (i != null) {
        cur.append("line").attr("class", "xhair").attr("x1", xOf(i)).attr("x2", xOf(i)).attr("y1", m.t - 4).attr("y2", H - m.b);
        if (o.xLinear && o.names) badge(cur, xOf(i), H - m.b + 11, `${SHORTNAME[o.names[i]] || o.names[i]} · ${o.xs[i]} words`, "#5d646e", xOf(i) < m.l + 70 ? "start" : xOf(i) > W - m.r - 70 ? "end" : "middle", 11);
      }
      if (tickText) tickText.classed("on", (d, j) => j === i);
      Object.values(marks).forEach(({ pts, type, size }) => pts.attr("d", (d) => d3.symbol().type(type).size(d.i === i ? size * 2.1 : size)()).classed("on", (d) => d.i === i));
      focusSeries(svg.node(), key && byKey[key] ? key : null);
      if (key && byKey[key]) {
        if (every) o.series.find((s) => s.key === key).values.forEach((v, j) => label(byKey[key], j, true));
        else if (i != null) label(byKey[key], i, false);
      }
      hl.raise();
    }
    function nearest(ev) {
      const [mx, my] = d3.pointer(ev, svg.node());
      let i = 0, bd = Infinity;
      for (let j = 0; j < n; j++) { const dd = Math.abs(xOf(j) - mx); if (dd < bd) { bd = dd; i = j; } }
      let key = null, kd = Infinity;
      o.series.forEach((s) => { const v = s.values[i]; if (v == null) return; const dd = Math.abs(y(v) - my); if (dd < kd) { kd = dd; key = s.key; } });
      return { i, key };
    }
    return { svg, groups, x, y, hit, mark, nearest, series: o.series, has: (k) => !!byKey[k] };
  }

  /* the panels of one figure share the cursor; legend hover focuses a series in all of them */
  function linkPanels(apis, tipFor, leg) {
    const clear = () => { apis.forEach((q) => q.mark(null, null)); leg && leg.mark(null); I.tip.hide(); };
    apis.forEach((p) => {
      const onMove = (ev) => {
        const { i, key } = p.nearest(ev);
        apis.forEach((q) => q.mark(i, q.has(key) ? key : null));
        leg && leg.mark(key);
        I.tip.show(tipFor(p, i, key), ev);
      };
      I.interact(p.hit, { sticky: true, enter: onMove, move: onMove, leave: clear });
    });
  }
  /* tooltip for a line panel: every series at this position, best first, with bars */
  function lineCard(title, sub, p, i, key, fmt) {
    const rows = p.series.filter((s) => s.values[i] != null).map((s) => ({ s, v: s.values[i] })).sort((a, b) => b.v - a.v);
    const top = d3.max(rows, (r) => Math.abs(r.v)) || 1;
    return I.card({ title, sub, rows: rows.map(({ s, v }) => ({ k: s.tip || s.name || s.key, v: fmt(v), color: s.swatch || s.color, on: s.key === key, bar: Math.max(0, v) / top })) });
  }

  /* ======================================================================== PromptScore vs SpectraReward */
  I.register("spectra", (el) => {
    const panels = el.querySelector(".panels");
    const D = P.spectra;
    let apis = [];
    function draw(build) {
      panels.innerHTML = "";
      apis = Object.entries(D.models).map(([model, rs], k) => {
        const host = panels.appendChild(document.createElement("div"));
        const api = linePanel(host, {
          title: `<b>${model}</b>`, xs: D.regimes, height: 240, animate: build, delay: 150 + k * 250, zero: false,
          yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
          series: [
            { key: "SpectraReward", name: "SpectraReward", values: rs.SpectraReward, color: light("#00acc1", 0.45), swatch: "#00acc1", markerFill: light("#00acc1", 0.4), width: 2.6, marker: "v", markerSize: 85 },
            { key: "PromptScore", name: "PromptScore", values: rs.PromptScore, color: BLUE, width: 4, marker: "o", markerSize: 110, top: true },
          ],
        });
        api.model = model;
        return api;
      });
      linkPanels(apis, (p, i, key) => lineCard(`${D.regimes[i]} prompts`, `${p.model} · relative gain over base`, p, i, key, (v) => I.pct(v, 2)));
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== reward backbone scaling (box plots) */
  I.register("scaling", (el) => {
    const panels = el.querySelector(".panels");
    function draw(build) {
      panels.innerHTML = "";
      const boxes = [];   // every box of both panels, so hovering one backbone highlights it in both
      const focus = (label) => {
        d3.select(panels).classed("focusing", !!label);
        boxes.forEach((q) => {
          const on = q.b.label === label;
          q.g.classed("on", on);
          q.dots.transition().duration(I.uiDur(160)).attr("opacity", on ? 1 : 0);
          q.med.attr("opacity", on ? 1 : 0);
          q.tick.classed("on", on);
        });
      };
      P.scaling.panels.forEach((pn, k) => {
        const host = panels.appendChild(document.createElement("div"));
        const W = Math.max(240, host.clientWidth), H = 300;
        d3.select(host).append("p").attr("class", "panel-title").html(`<b>${pn.model}</b>`);
        const svg = d3.select(host).append("svg").attr("width", W).attr("height", H);
        const m = { t: 10, r: 8, b: 62, l: k === 0 ? 44 : 34 };
        const x = d3.scaleBand().domain(pn.boxes.map((b) => b.label)).range([m.l, W - m.r]).padding(0.38);
        const lo = d3.min(pn.boxes, (b) => b.min), hi = d3.max(pn.boxes, (b) => b.max);
        const y = d3.scaleLinear().domain([lo - 3, hi + 3]).nice(5).range([H - m.b, m.t]);
        svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat("")).call((g) => g.select(".domain").remove());
        svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
        const xa = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSizeOuter(0));
        xa.selectAll(".tick text").style("font-size", "12.5px").attr("fill", (d) => (d === "9B" ? "#1f5fcf" : null)).style("font-weight", (d) => (d === "9B" ? 700 : 400));
        // mean correlation of each backbone (Tab. 3 of the paper)
        svg.append("g").selectAll("text").data(pn.boxes).join("text").attr("x", (b) => x(b.label) + x.bandwidth() / 2).attr("y", H - m.b + 36)
          .attr("text-anchor", "middle").style("font-size", "11.5px").attr("fill", "#8c939c").text((b) => (b.meanR == null ? "–" : b.meanR.toFixed(3)));
        if (k === 0) {
          svg.append("text").attr("x", m.l - 4).attr("y", H - m.b + 36).attr("text-anchor", "end").style("font-size", "11.5px").attr("fill", "#8c939c").text("r̄");
          svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(11,${(m.t + H - m.b) / 2}) rotate(-90)`).text("Normalized score");
        }
        svg.append("text").attr("x", (m.l + W - m.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("class", "axis-title").text("PromptScore backbone");

        const bw = x.bandwidth();
        const box = svg.append("g").selectAll("g").data(pn.boxes).join("g").attr("class", "box").attr("transform", (b) => `translate(${x(b.label)},0)`);
        box.each(function (b, i) {
          const g = d3.select(this), cx = bw / 2, delay = 150 + i * 110 + k * 200;
          const wh = g.append("line").attr("x1", cx).attr("x2", cx).attr("stroke", "#17191c").attr("stroke-width", 1.4);
          const caps = [b.min, b.max].map((v) => g.append("line").attr("x1", cx - bw * 0.22).attr("x2", cx + bw * 0.22).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", "#17191c").attr("stroke-width", 1.4));
          const rect = g.append("rect").attr("class", "boxr").attr("x", 0).attr("width", bw).attr("fill", b.color).attr("fill-opacity", 0.92).attr("stroke", "#17191c").attr("stroke-width", 1.3).attr("rx", 2);
          const med = g.append("line").attr("x1", 0).attr("x2", bw).attr("y1", y(b.med)).attr("y2", y(b.med)).attr("stroke", "#17191c").attr("stroke-width", 2.2);
          if (build) {
            wh.attr("y1", y(b.med)).attr("y2", y(b.med)).transition().delay(dur(delay + 250)).duration(dur(500)).ease(d3.easeCubicOut).attr("y1", y(b.min)).attr("y2", y(b.max));
            caps.forEach((c) => c.attr("opacity", 0).transition().delay(dur(delay + 650)).duration(dur(200)).attr("opacity", 1));
            rect.attr("y", y(b.med)).attr("height", 0).transition().delay(dur(delay)).duration(dur(550)).ease(d3.easeCubicOut).attr("y", y(b.q3)).attr("height", y(b.q1) - y(b.q3));
            med.attr("opacity", 0).transition().delay(dur(delay)).duration(dur(200)).attr("opacity", 1);
          } else {
            wh.attr("y1", y(b.min)).attr("y2", y(b.max));
            rect.attr("y", y(b.q3)).attr("height", y(b.q1) - y(b.q3));
          }
          rect.raise(); med.raise();
          const dots = g.append("g").attr("opacity", 0).style("pointer-events", "none");
          Object.values(b.values).forEach((v, j) => dots.append("circle").attr("cx", cx + (j - 3) * bw * 0.09).attr("cy", y(v)).attr("r", 2.6).attr("fill", "#17191c").attr("stroke", "#fff").attr("stroke-width", 0.6));
          const medLab = haloText(g, bw + 5, y(b.med) + 4, "start", 11.5, 700, "#17191c", (t) => t.text(b.med.toFixed(1))).attr("opacity", 0).style("pointer-events", "none");
          const tick = xa.selectAll(".tick").filter((d) => d === b.label).select("text");
          boxes.push({ b, g, dots, med: medLab, tick });
          const hit = g.append("rect").attr("x", -4).attr("width", bw + 8).attr("y", y(b.max) - 6).attr("height", y(b.min) - y(b.max) + 12).attr("fill", "transparent");
          const span = hi + 3 - (lo - 3);
          I.hover(hit, () => I.card({ title: b.backbone, color: b.color, sub: `${pn.model} · normalized scores on the seven benchmarks`,
            rows: [{ k: "Median", v: b.med.toFixed(1), on: true }, { k: "Quartiles", v: `${b.q1.toFixed(1)}–${b.q3.toFixed(1)}` }]
              .concat(Object.entries(b.values).map(([nm, v]) => ({ k: SHORTNAME[nm.replace("-Composition", "")] || nm.replace("-Composition", ""), v: v.toFixed(1), bar: (v - (lo - 3)) / span, color: "#5d646e" }))),
            note: b.meanR == null ? "" : `Mean Pearson r with the benchmarks: ${b.meanR.toFixed(3)}` }),
          () => focus(b.label), () => focus(null));
        });
      });
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== gains by prompt design */
  I.register("designGain", (el) => {
    const panels = el.querySelector(".panels");
    const names = BENCH.map((b) => b.name);
    const first = Object.values(P.designs)[0];
    let apis = [];
    const leg = legend(el, first.map((s) => ({ key: s.key, name: s.name, color: s.color, thick: s.highlight })), (key) => apis.forEach((q) => q.mark(null, key, true)));
    function draw(build) {
      panels.innerHTML = "";
      apis = Object.entries(P.designs).map(([model, series], k) => {
        const host = panels.appendChild(document.createElement("div"));
        const api = linePanel(host, {
          title: `<b>${model}</b>`, xs: names, xShort: true, regimeStrip: true, height: 270, animate: build, delay: 150 + k * 250, zero: false,
          yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
          series: series.slice().sort((a, b) => a.highlight - b.highlight).map((s) => ({
            key: s.key, values: s.gain, color: s.highlight ? s.color : light(s.color, 0.4), markerFill: s.highlight ? s.color : light(s.color, 0.35), swatch: s.color,
            width: s.highlight ? 3.8 : 2.2, marker: { Balance: "o", Attribute: "s", Entity: "D", Relation: "^" }[s.key], markerSize: s.highlight ? 100 : 60, top: s.highlight, name: s.name,
          })),
        });
        api.model = model;
        return api;
      });
      linkPanels(apis, (p, i, key) => lineCard(names[i], `${p.model} · relative gain over base`, p, i, key, (v) => I.pct(v, 2)), leg);
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== schedules: joint (top) and sequential (bottom) */
  I.register("schedule", (el) => {
    const panels = el.querySelector(".panels");
    const D = P.schedules;
    const names = BENCH.map((b) => b.name);
    const first = Object.values(D.models)[0];
    let apis = [];
    const leg = legend(el, first.map((s) => ({ key: s.key, name: s.name, color: s.color, dashed: s.dashed, thick: !s.dashed })), (key) => apis.forEach((q) => q.mark(null, q.has(key) ? key : null, true)));
    const ROWS = [["joint", "Joint training"], ["seq", "Sequential training"]];
    function draw(build) {
      panels.innerHTML = "";
      apis = [];
      ROWS.forEach(([key, label], r) => {
        const head = panels.appendChild(document.createElement("p"));
        head.className = "row-title";
        head.innerHTML = label;
        Object.entries(D.models).forEach(([model, series], k) => {
          const host = panels.appendChild(document.createElement("div"));
          const t0 = 150 + r * 900 + k * 150;
          const api = linePanel(host, {
            title: model, xs: D.words, names, xLinear: true, xDomain: [0, 560], height: 250, zero: true, animate: build, wipeMs: 900,
            xTitle: "Mean prompt length of the benchmark (words)", yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
            series: series.filter((s) => s.dashed || s.key === key).map((s) => ({ key: s.key, name: s.name, tip: s.name.replace(/\s*\(.*\)$/, ""), values: s.gain, color: s.color, dashed: s.dashed,
              width: s.dashed ? 2.2 : 3.6, markerSize: s.dashed ? 38 : 70, top: !s.dashed, opacity: s.dashed ? 0.9 : 1, delay: s.dashed ? t0 : t0 + 500 })),
          });
          api.model = model;
          api.row = label;
          apis.push(api);
        });
      });
      linkPanels(apis, (p, i, key) => lineCard(names[i], `${p.model} · ${p.row.toLowerCase()} · ${D.words[i]} words`, p, i, key, (v) => I.pct(v, 2)), leg);
    }
    return { render: () => draw(false), play: () => draw(true) };
  });
})();
