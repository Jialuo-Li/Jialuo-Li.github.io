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
  const TWO_LINE = {
    "T2I-CompBench": ["T2I-", "CompBench"], "TIIF-Bench": ["TIIF-", "Bench"], "SpatialGenEval": ["Spatial-", "GenEval"],
    "T2I-CoReBench": ["T2I-", "CoReBench"], "LPD-Bench": ["LPD-", "Bench"], "Arena-T2I-Hard": ["Arena-", "T2I-Hard"],
    "LongBench-T2I": ["LongBench-", "T2I"],
  };
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
      const t = d3.select(this), parts = TWO_LINE[names[i]] || [names[i]];
      t.text(null);
      parts.forEach((p, k) => t.append("tspan").attr("x", 0).attr("dy", k ? "1.15em" : "0.9em").text(p));
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

  /* static legend; hovering an entry highlights its series ([data-s]) inside scope() */
  function legend(el, items, scope) {
    const L = el.querySelector(".legend");
    L.innerHTML = items.map((it) => `<span class="li" data-key="${it.key}"><span class="sw${it.dashed ? " dash" : ""}" style="color:${it.color};border-top-width:${it.thick ? 3.5 : 2.5}px"></span>${it.name}</span>`).join("");
    const focus = (key) => {
      L.querySelectorAll(".li").forEach((x) => x.classList.toggle("dim", !!key && x.dataset.key !== key));
      d3.select(scope()).selectAll("[data-s]").transition("focus").duration(dur(160)).attr("opacity", function () {
        const o = +(this.getAttribute("data-o") || 1);
        return !key || this.getAttribute("data-s") === key ? o : 0.07;
      });
    };
    L.querySelectorAll(".li").forEach((li) => {
      li.addEventListener("pointerenter", () => focus(li.dataset.key));
      li.addEventListener("pointerleave", () => focus(null));
    });
  }

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

    function tipHtml(r, b) {
      let h = `<b>${I.esc(r.disp)}</b>${r.size ? ` · ${r.size}B` : " · proprietary"}<br>${BN[b]}: ${r.scores[b].toFixed(DEC[b])}`;
      const pair = PAIRS.find((p) => p[1] === r.id);
      if (pair) h += `<br><span class="s">${I.esc(byId[pair[0]].disp)}: ${byId[pair[0]].scores[b].toFixed(DEC[b])}</span>`;
      const asBase = PAIRS.find((p) => p[0] === r.id);
      if (asBase) h += `<br><span class="s">base model of ${byId[asBase[1]].disp}</span>`;
      return h;
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

      // proprietary models: a line each, dashed (Nano-Banana) or dotted (Imagen-4-Fast)
      props.forEach((r, i) => {
        const yy = y(r.scores[b]);
        const ln = svg.append("line").attr("x1", m.l).attr("x2", build ? m.l : W - m.r).attr("y1", yy).attr("y2", yy)
          .attr("stroke", "#7d858f").attr("stroke-width", 1.3).attr("stroke-dasharray", PROP_DASH[r.model] || "4 3").attr("stroke-linecap", "round");
        if (build) ln.transition().delay(dur(delay + 400 + i * 90)).duration(dur(650)).ease(d3.easeCubicInOut).attr("x2", W - m.r);
        I.hover(svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", yy).attr("y2", yy).attr("stroke", "transparent").attr("stroke-width", 8), () => tipHtml(r, b));
      });

      // open-weight models (FLUX.2-dev as a ring, the two base models dark)
      const gp = svg.append("g");
      const dots = gp.selectAll("circle").data(pts).join("circle")
        .attr("cx", (d) => pos(d).x).attr("cy", (d) => pos(d).y).attr("r", build ? 0 : R)
        .attr("fill", (d) => (d.kind === "base" ? "#59616b" : d.kind === "dev" ? "#fff" : "#c9ced5"))
        .attr("stroke", (d) => (d.kind === "dev" ? "#7d858f" : "#fff")).attr("stroke-width", (d) => (d.kind === "dev" ? 1.5 : 1));
      if (build) dots.transition().delay((d, i) => dur(delay + 60 + i * 24)).duration(dur(360)).ease(d3.easeBackOut.overshoot(2)).attr("r", R);
      I.hover(dots, (d) => tipHtml(d, b));

      // Imago: rises from its base model; its name sits in the band above the plot with a faint leader
      PAIRS.forEach(([bi, ii, anchor], k) => {
        const B = pos(byId[bi]), Y = y(byId[ii].scores[b]), t0 = delay + 1050 + k * 160;
        const stemTop = Y + RI + 1, stemBot = B.y - R - 1, hasStem = stemBot - stemTop > 2;
        const stem = svg.append("line").attr("x1", B.x).attr("x2", B.x).attr("y1", stemBot).attr("y2", build ? stemBot : stemTop)
          .attr("stroke", BLUE).attr("stroke-width", 2).attr("stroke-linecap", "round").attr("opacity", hasStem ? 0.9 : 0);
        const dot = svg.append("circle").attr("cx", B.x).attr("cy", build ? B.y : Y).attr("r", build ? 0 : RI)
          .attr("fill", BLUE).attr("stroke", "#fff").attr("stroke-width", 1.2);
        const leader = svg.append("line").attr("x1", B.x).attr("x2", B.x).attr("y1", 17).attr("y2", Y - RI - 2)
          .attr("stroke", BLUE).attr("stroke-width", 1).attr("stroke-dasharray", "1.5 2").attr("opacity", Y - RI - 2 > 19 ? 0.45 : 0);
        const label = haloText(svg, B.x + (anchor === "end" ? 5 : -5), 13, anchor, W < 230 ? 10 : 11.5, 700, "#1f5fcf", (t) => imagoName(t, byId[ii].disp));
        if (build) {
          stem.transition().delay(dur(t0 + 120)).duration(dur(700)).ease(d3.easeCubicOut).attr("y2", stemTop);
          dot.transition().delay(dur(t0)).duration(dur(160)).attr("r", RI)
            .transition().duration(dur(700)).ease(d3.easeCubicOut).attr("cy", Y);
          [leader, label].forEach((n) => { const o = n.attr("opacity") || 1; n.attr("opacity", 0).transition().delay(dur(t0 + 750)).duration(dur(350)).attr("opacity", o); });
        }
        I.hover(dot, () => tipHtml(byId[ii], b));
      });
    }

    function draw(build) {
      host.innerHTML = "";
      const grid = d3.select(host).append("div").attr("class", "sm-grid");
      BN.forEach((name, b) => {
        const cell = grid.append("div").attr("class", "sm-cell");
        cell.append("p").attr("class", "sm-title").html(`<span class="nm">${name}</span><span class="reg" style="color:${REG[REGIME[b]]}">${REGIME[b]}</span>`);
        panel(cell.node(), b, build, b * 110);
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
      const bub = svg.append("g").selectAll("circle").data(BENCH).join("circle")
        .attr("cx", (d) => x(d.words)).attr("cy", (d) => y(d.score)).attr("r", (d) => (build ? 0 : rOf(d)))
        .attr("fill", (d) => REGL[d.regime]).attr("fill-opacity", 0.92).attr("stroke", "#fff").attr("stroke-width", 1.5);
      if (build) bub.transition().delay((d, i) => dur(250 + i * 130)).duration(dur(550)).ease(d3.easeBackOut.overshoot(1.6)).attr("r", rOf);
      I.hover(bub, (d) => `<b>${d.name}</b> · ${d.regime}<br>${d.words} words on average · ${d.prompts.toLocaleString()} prompts<br>mean score of ${d.models} models: ${d.score.toFixed(3)}`,
        function () { d3.select(this).attr("stroke", "#17191c"); }, function () { d3.select(this).attr("stroke", "#fff"); });

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
      svg.append("g").selectAll("text").data(BENCH).join("text")
        .attr("x", (d, i) => pos[i].x).attr("y", (d, i) => pos[i].y).attr("text-anchor", (d, i) => pos[i].anchor)
        .style("font-size", fs + "px").attr("fill", "#33383f")
        .attr("stroke", "#fff").attr("stroke-width", 3.5).attr("paint-order", "stroke").text((d) => (W < 640 ? SHORTNAME[d.name] : d.name))
        .attr("opacity", build ? 0 : 1)
        .call((sel) => build && sel.transition().delay((d, i) => dur(450 + i * 130)).duration(dur(400)).attr("opacity", 1));
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

      // hover a panel: outline it and keep its evaluators' bars
      I.hover(cellG, (d) => (d.i === d.j ? `<b>${names[d.i]}</b><br>r̄ with the others: ${D.rbar[names[d.i]].toFixed(2)}` : `<b>${names[d.i]}</b> and <b>${names[d.j]}</b><br>Pearson r = ${D.r[names[d.i]][names[d.j]].toFixed(2)}`),
        function (d) {
          d3.select(this).select("rect").attr("stroke", "#17191c").attr("stroke-width", 1.6);
          const keep = new Set([names[d.i], names[d.j]]);
          gb.selectAll("[data-name]").attr("opacity", function () { return keep.has(this.getAttribute("data-name")) ? 1 : 0.28; });
        },
        function () {
          d3.select(this).select("rect").attr("stroke", "#c9ced5").attr("stroke-width", 0.8);
          gb.selectAll("[data-name]").attr("opacity", 1);
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
    const order = S.filter((s) => !s.highlight).concat(S.filter((s) => s.highlight));
    legend(el, S.map((s) => ({ key: s.name, name: s.name, color: s.color, thick: s.highlight })), () => host);
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
      const centers = [];
      BENCH.forEach((B, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const px = ml + col * (pw + gap), py = row * (titleH + pw + rowGap) + titleH;
        centers.push(px + pw / 2);
        const g = svg.append("g").attr("transform", `translate(${px},${py})`);
        const t = g.append("text").attr("x", pw / 2).attr("text-anchor", "middle").style("font-size", stacked ? "11px" : "12.5px").attr("fill", "#33383f");
        if (stacked) t.attr("y", -5).text(SHORTNAME[B.name]);
        else (TWO_LINE[B.name] || [B.name]).forEach((p, k) => t.append("tspan").attr("x", pw / 2).attr("y", -19 + k * 14).text(p));
        g.append("rect").attr("width", pw).attr("height", pw).attr("fill", "#fff").attr("stroke", "#d5d9de");
        g.append("line").attr("x1", sx(0.5)).attr("x2", sx(0.5)).attr("y1", 0).attr("y2", pw).attr("stroke", "#eef0f2");
        g.append("line").attr("y1", sy(0.5)).attr("y2", sy(0.5)).attr("x1", 0).attr("x2", pw).attr("stroke", "#eef0f2");
        const cp = "ac" + ++uid;
        g.append("defs").append("clipPath").attr("id", cp).append("rect").attr("width", pw).attr("height", pw);
        const gf = g.append("g").attr("clip-path", `url(#${cp})`), gpts = g.append("g");
        const delay = 100 + i * 90;
        order.forEach((s) => {
          const b = s.bench[i], hi = s.highlight;
          const col_ = hi ? s.color : light(s.color, 0.35), op = hi ? 1 : 0.8;
          const e = b.fit.flat != null ? [0, b.fit.flat, 1, b.fit.flat] : [0, b.fit.intercept, 1, b.fit.slope + b.fit.intercept];
          const ln = gf.append("line").attr("data-s", s.name).attr("data-o", op).attr("opacity", op)
            .attr("x1", sx(e[0])).attr("y1", sy(e[1])).attr("x2", build ? sx(e[0]) : sx(e[2])).attr("y2", build ? sy(e[1]) : sy(e[3]))
            .attr("stroke", col_).attr("stroke-width", hi ? 2.6 : 1.4).attr("stroke-dasharray", b.fit.flat != null ? "2 3" : null);
          if (build) ln.transition().delay(dur(delay + 450)).duration(dur(550)).ease(d3.easeCubicOut).attr("x2", sx(e[2])).attr("y2", sy(e[3]));
          const po = hi ? 0.95 : 0.65;
          const dots = gpts.append("g").attr("data-s", s.name).attr("data-o", po).attr("opacity", build ? 0 : po).selectAll("path")
            .data(b.pts.map((q) => ({ m: q[0], x: q[1], y: q[2], s }))).join("path")
            .attr("transform", (d) => `translate(${sx(d.x)},${sy(d.y)})`).attr("d", symFor(s.name, hi ? (stacked ? 20 : 30) : (stacked ? 11 : 16)))
            .attr("fill", hi ? light(s.color, 0.15) : light(s.color, 0.45)).attr("stroke", hi ? s.color : "none").attr("stroke-width", 0.6);
          if (build) d3.select(dots.node().parentNode).transition().delay(dur(delay)).duration(dur(420)).attr("opacity", po);
          I.hover(dots, (d) => `<b>${I.esc(d.m)}</b> · ${B.name}<br>${d.s.name}: ${d.x.toFixed(2)}, benchmark: ${d.y.toFixed(2)} (normalized)<br><span class="s">r = ${b.r == null ? "undefined (constant reward)" : b.r.toFixed(3)}</span>`);
        });
        gpts.selectAll("g").filter(function () { return S.find((q) => q.name === this.getAttribute("data-s")).highlight; }).raise();
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
      const x0 = stacked ? ml : ml, x1 = Wc - 2;
      svg.append("g").attr("class", "grid").attr("transform", `translate(${x0},0)`)
        .call(d3.axisLeft(y).tickValues(rTicks).tickSize(-(x1 - x0)).tickFormat("")).call((g) => g.select(".domain").remove());
      if (rDomain[0] < 0) svg.append("line").attr("x1", x0).attr("x2", x1).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#c8cdd4");
      svg.append("g").attr("class", "axis").attr("transform", `translate(${x0},0)`).call(d3.axisLeft(y).tickValues(rTicks).tickSizeOuter(0));
      if (stacked) svg.append("text").attr("class", "axis-title").attr("x", 2).attr("y", rTop - 12).text("Pearson r");
      else svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(14,${rTop + rH / 2}) rotate(-90)`).text("Pearson r");
      [["short", 0, 2], ["medium", 3, 4], ["long", 5, 6]].forEach(([r, a, b]) => svg.append("rect").attr("x", xc(a) - half + 3).attr("width", xc(b) - xc(a) + 2 * half - 6)
        .attr("y", rTop + rH + 2).attr("height", 3).attr("fill", REG[r]).attr("opacity", 0.75));
      const stagger = xc(1) - xc(0) < 48;
      BENCH.forEach((B, i) => svg.append("text").attr("x", xc(i)).attr("y", rTop + rH + 19 + (stagger && i % 2 ? 12 : 0)).attr("text-anchor", "middle")
        .style("font-size", stacked ? "10px" : "12px").attr("fill", "#5d646e").text(SHORTNAME[B.name]));
      const gl = svg.append("g").attr("clip-path", wipe(svg, 0, rTop - 12, Wc, rH + 24, build, 900, 1100));
      order.forEach((s) => {
        const vals = s.bench.map((b) => b.r), hi = s.highlight, op = hi ? 1 : 0.85;
        const g = gl.append("g").attr("data-s", s.name).attr("data-o", op).attr("opacity", op);
        g.append("path").attr("d", d3.line().defined((v) => v != null).x((v, i) => xc(i)).y((v) => y(Math.max(rDomain[0], v)))(vals))
          .attr("fill", "none").attr("stroke", hi ? s.color : light(s.color, 0.35)).attr("stroke-width", hi ? 3.4 : 1.9);
        const pts = g.selectAll("path.pt").data(vals.map((v, i) => ({ v, i, s })).filter((d) => d.v != null)).join("path").attr("class", "pt")
          .attr("transform", (d) => `translate(${xc(d.i)},${y(Math.max(rDomain[0], d.v))})`)
          .attr("d", symFor(s.name, hi ? 85 : 52)).attr("fill", hi ? light(s.color, 0.25) : light(s.color, 0.5)).attr("stroke", hi ? s.color : "#fff").attr("stroke-width", hi ? 1.3 : 0.8);
        I.hover(pts, (d) => `<b>${d.s.name}</b><br>${BENCH[d.i].name}: r = ${d.v.toFixed(3)}`);
      });
    }
    return { render: () => draw(false), play: () => draw(true) };
  }
  I.register("rewardAlign", (el) => alignFigure(el, "classic"));
  I.register("rewardVariants", (el) => alignFigure(el, "variants"));

  /* ======================================================================== line panels (shared) */
  function linePanel(host, o) {
    const W = Math.max(240, host.clientWidth), H = o.height || 260;
    host.innerHTML = "";
    if (o.title) d3.select(host).append("p").attr("class", "panel-title").html(o.title);
    const svg = d3.select(host).append("svg").attr("width", W).attr("height", H);
    const m = { t: 12, r: 12, b: (o.xTitle ? 46 : 34) + (o.xShort && W < 360 ? 12 : 0), l: o.yTitle ? 58 : 44, ...(o.margin || {}) };
    const x = o.xLinear ? d3.scaleLinear().domain(o.xDomain).range([m.l, W - m.r]) : d3.scalePoint().domain(d3.range(o.xs.length)).range([m.l, W - m.r]).padding(0.3);
    const xOf = (i) => (o.xLinear ? x(o.xs[i]) : x(i));
    const all = (o.yValues || o.series.flatMap((s) => s.values)).filter((v) => v != null).concat(o.zero ? [0] : []);
    const lo = d3.min(all), hi = d3.max(all), pad = Math.max((hi - lo) * 0.09, 0.4);
    const y = d3.scaleLinear().domain([lo - pad, hi + pad]).nice(5).range([H - m.b, m.t]);
    svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat("")).call((g) => g.select(".domain").remove());
    if (o.zero) {
      svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#9aa1aa").attr("stroke-dasharray", "4 4");
      svg.append("text").attr("x", m.l + 6).attr("y", y(0) - 6).style("font-size", "12px").attr("fill", "#8c939c").text("Base model");
    }
    const xa = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`);
    if (o.xLinear) xa.call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
    else {
      xa.call(d3.axisBottom(x).tickFormat((i) => (o.xShort ? SHORTNAME[o.xs[i]] || o.xs[i] : o.xs[i])).tickSizeOuter(0));
      if (o.xShort) {
        xa.selectAll(".tick text").style("font-size", W < 380 ? "10.5px" : "12px");
        if (!o.xLinear && x.step() < 46) xa.selectAll(".tick text").attr("dy", (d, i) => (i % 2 ? "1.95em" : "0.71em"));
      }
      if (o.regimeStrip) {
        const half = x.step() / 2;
        [["short", 0, 2], ["medium", 3, 4], ["long", 5, 6]].forEach(([r, a, b]) => svg.append("rect").attr("x", x(a) - half + 2).attr("width", x(b) - x(a) + 2 * half - 4)
          .attr("y", H - m.b + 1).attr("height", 3).attr("fill", REG[r]).attr("opacity", 0.75));
        xa.attr("transform", `translate(0,${H - m.b + 4})`).call((g) => g.select(".domain").remove()).selectAll(".tick line").remove();
      }
    }
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((d) => (o.yFormat ? o.yFormat(d) : d)).tickSizeOuter(0));
    if (o.xTitle) svg.append("text").attr("class", "axis-title").attr("x", (m.l + W - m.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").text(o.xTitle);
    if (o.yTitle) svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`).text(o.yTitle);

    const groups = {};
    o.series.forEach((s) => {
      const g = svg.append("g").attr("data-s", s.key).attr("data-o", s.opacity || 1).attr("opacity", s.opacity == null ? 1 : s.opacity);
      g.attr("clip-path", wipe(svg, 0, 0, W, H, o.animate, s.delay != null ? s.delay : o.delay || 0, o.wipeMs || 1000));
      g.append("path").attr("d", d3.line().defined((v) => v != null).x((v, i) => xOf(i)).y((v) => y(v))(s.values))
        .attr("fill", "none").attr("stroke", s.color).attr("stroke-width", s.width || 2.2).attr("stroke-dasharray", s.dashed ? "7 5" : null).attr("stroke-linecap", "round");
      const pts = g.selectAll("path.pt").data(s.values.map((v, i) => ({ v, i, s })).filter((d) => d.v != null)).join("path").attr("class", "pt")
        .attr("transform", (d) => `translate(${xOf(d.i)},${y(d.v)})`).attr("d", d3.symbol().type(symbolOf[s.marker || "o"]).size(s.markerSize || 55)())
        .attr("fill", s.markerFill || s.color).attr("stroke", "#fff").attr("stroke-width", 1.1);
      if (s.marker === "v") pts.attr("transform", (d) => `translate(${xOf(d.i)},${y(d.v)}) rotate(180)`);
      I.hover(pts, (d) => o.tip(d.s, d.i, d.v));
      groups[s.key] = g;
    });
    o.series.filter((s) => s.top).forEach((s) => groups[s.key].raise());
    return { svg, groups, x, y };
  }

  /* ======================================================================== PromptScore vs SpectraReward */
  I.register("spectra", (el) => {
    const panels = el.querySelector(".panels");
    const D = P.spectra;
    function draw(build) {
      panels.innerHTML = "";
      Object.entries(D.models).forEach(([model, rs], k) => {
        const host = panels.appendChild(document.createElement("div"));
        linePanel(host, {
          title: `<b>${model}</b>`, xs: D.regimes, height: 240, animate: build, delay: 150 + k * 250, zero: false,
          yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
          series: [
            { key: "SpectraReward", values: rs.SpectraReward, color: light("#00acc1", 0.45), markerFill: light("#00acc1", 0.4), width: 2.6, marker: "v", markerSize: 85 },
            { key: "PromptScore", values: rs.PromptScore, color: BLUE, width: 4, marker: "o", markerSize: 110, top: true },
          ],
          tip: (s, i, v) => `<b>${s.key}</b> · ${model}<br>${D.regimes[i]} prompts: ${I.pct(v, 2)}`,
        });
      });
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== reward backbone scaling (box plots) */
  I.register("scaling", (el) => {
    const panels = el.querySelector(".panels");
    function draw(build) {
      panels.innerHTML = "";
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
        const box = svg.append("g").selectAll("g").data(pn.boxes).join("g").attr("transform", (b) => `translate(${x(b.label)},0)`);
        box.each(function (b, i) {
          const g = d3.select(this), cx = bw / 2, delay = 150 + i * 110 + k * 200;
          const wh = g.append("line").attr("x1", cx).attr("x2", cx).attr("stroke", "#17191c").attr("stroke-width", 1.4);
          const caps = [b.min, b.max].map((v) => g.append("line").attr("x1", cx - bw * 0.22).attr("x2", cx + bw * 0.22).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", "#17191c").attr("stroke-width", 1.4));
          const rect = g.append("rect").attr("x", 0).attr("width", bw).attr("fill", b.color).attr("fill-opacity", 0.92).attr("stroke", "#17191c").attr("stroke-width", 1.3).attr("rx", 2);
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
          const dots = g.append("g").attr("opacity", 0);
          Object.values(b.values).forEach((v, j) => dots.append("circle").attr("cx", cx + (j - 3) * bw * 0.09).attr("cy", y(v)).attr("r", 2.6).attr("fill", "#17191c").attr("stroke", "#fff").attr("stroke-width", 0.6));
          const hit = g.append("rect").attr("x", -4).attr("width", bw + 8).attr("y", y(b.max) - 6).attr("height", y(b.min) - y(b.max) + 12).attr("fill", "transparent");
          I.hover(hit, () => `<b>${b.backbone}</b> · ${pn.model}<br>median ${b.med.toFixed(1)}, range ${b.min.toFixed(1)}–${b.max.toFixed(1)}<br>` +
            Object.entries(b.values).map(([nm, v]) => `<span class="s">${nm.replace("-Composition", "")}: ${v.toFixed(1)}</span>`).join("<br>"),
          () => dots.transition().duration(150).attr("opacity", 1), () => dots.transition().duration(150).attr("opacity", 0));
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
    legend(el, first.map((s) => ({ key: s.key, name: s.name, color: s.color, thick: s.highlight })), () => panels);
    function draw(build) {
      panels.innerHTML = "";
      Object.entries(P.designs).forEach(([model, series], k) => {
        const host = panels.appendChild(document.createElement("div"));
        linePanel(host, {
          title: `<b>${model}</b>`, xs: names, xShort: true, regimeStrip: true, height: 270, animate: build, delay: 150 + k * 250, zero: false,
          yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
          series: series.slice().sort((a, b) => a.highlight - b.highlight).map((s) => ({
            key: s.key, values: s.gain, color: s.highlight ? s.color : light(s.color, 0.4), markerFill: s.highlight ? s.color : light(s.color, 0.35),
            width: s.highlight ? 3.8 : 2.2, marker: { Balance: "o", Attribute: "s", Entity: "D", Relation: "^" }[s.key], markerSize: s.highlight ? 100 : 60, top: s.highlight, name: s.name,
          })),
          tip: (s, i, v) => `<b>${s.name}</b> · ${model}<br>${names[i]}: ${I.pct(v, 2)}`,
        });
      });
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== schedules: joint (top) and sequential (bottom) */
  I.register("schedule", (el) => {
    const panels = el.querySelector(".panels");
    const D = P.schedules;
    const names = BENCH.map((b) => b.name);
    const first = Object.values(D.models)[0];
    legend(el, first.map((s) => ({ key: s.key, name: s.name, color: s.color, dashed: s.dashed, thick: !s.dashed })), () => panels);
    const ROWS = [["joint", "Joint training"], ["seq", "Sequential training"]];
    function draw(build) {
      panels.innerHTML = "";
      ROWS.forEach(([key, label], r) => {
        const head = panels.appendChild(document.createElement("p"));
        head.className = "row-title";
        head.innerHTML = label;
        Object.entries(D.models).forEach(([model, series], k) => {
          const host = panels.appendChild(document.createElement("div"));
          const t0 = 150 + r * 900 + k * 150;
          linePanel(host, {
            title: model, xs: D.words, xLinear: true, xDomain: [0, 560], height: 250, zero: true, animate: build, wipeMs: 900,
            yValues: series.flatMap((s) => s.gain),
            xTitle: "Mean prompt length of the benchmark (words)", yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
            series: series.filter((s) => s.dashed || s.key === key).map((s) => ({ key: s.key, values: s.gain, color: s.color, dashed: s.dashed,
              width: s.dashed ? 2.2 : 3.6, markerSize: s.dashed ? 38 : 70, top: !s.dashed, opacity: s.dashed ? 0.9 : 1, delay: s.dashed ? t0 : t0 + 500 })),
            tip: (s, i, v) => `<b>${series.find((q) => q.key === s.key).name}</b> · ${model}<br>${names[i]} (${D.words[i]} words): ${I.pct(v, 2)}`,
          });
        });
      });
    }
    return { render: () => draw(false), play: () => draw(true) };
  });
})();
