/* Charts: every quantitative figure, drawn with d3 from window.PAPER (written by scripts/build.py).
   Each figure draws its final state in render() and builds itself up in play(): marks enter in reading
   order (points pop, lines draw left to right, boxes open from the median), so the eye follows the claim. */
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

  function legendButtons(el, items, onToggle) {
    const L = el.querySelector(".legend");
    L.innerHTML = "";
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.key = it.key;
      b.innerHTML = `<span class="sw${it.dashed ? " dash" : ""}" style="color:${it.color};border-top-width:${it.thick ? 3.5 : 2.5}px"></span>${it.name}`;
      b.addEventListener("click", () => onToggle(it.key));
      L.appendChild(b);
    });
    return (focus) => L.querySelectorAll("button").forEach((b) => b.classList.toggle("dim", !!focus && b.dataset.key !== focus));
  }

  const symbolOf = { o: d3.symbolCircle, s: d3.symbolSquare, D: d3.symbolDiamond, "^": d3.symbolTriangle, v: d3.symbolTriangle, "*": d3.symbolStar, X: d3.symbolCross };

  /* ======================================================================== teaser: score vs. size */
  I.register("teaser", (el, state) => {
    const host = el.querySelector(".chart");
    const BN = ["T2I-CompBench", "TIIF-Bench", "SpatialGenEval", "T2I-CoReBench", "LongBench-T2I"];
    const DEC = [3, 2, 2, 2, 3];
    const rows = P.main.map((r) => {
      const id = `${r.model}|${r.size == null ? "p" : r.size}`;
      const kind = r.model.startsWith("Imago") ? "imago"
        : (r.model === "FLUX.2-Klein-Base" && r.size === 4) || (r.model === "Z-Image" && r.size === 6) ? "base"
          : r.size == null ? "prop" : "other";
      const disp = /^FLUX\.2-Klein/.test(r.model) ? `${r.model}-${r.size}B` : r.model;
      return { ...r, id, kind, disp };
    });
    const pts = rows.filter((r) => r.kind !== "prop").sort((a, b) => a.size - b.size);
    const props = rows.filter((r) => r.kind === "prop");
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    const pairs = [["FLUX.2-Klein-Base|4", "Imago-4B|4"], ["Z-Image|6", "Imago-6B|6"]];
    // models of equal size sit side by side instead of on top of each other (pixels)
    const JIT = { "SDXL|2.6": -6, "Lumina-Image-2|2.6": 6, "LongCat-Image|6": -9, "Z-Image-Turbo|6": 9, "FLUX.2-Klein|4": 9,
      "FLUX.2-Klein-Base|9": -6, "FLUX.2-Klein|9": 6, "FLUX.1-schnell|12": -6, "FLUX.1-dev|12": 6 };
    const COL = { other: "#c9ced5", base: "#59616b", imago: BLUE };
    let S;

    function scaffold() {
      const H = Math.round(Math.max(300, Math.min(430, host.clientWidth * 0.47)));
      const { svg, W } = svgIn(host, H);
      const m = { t: 12, r: 12, b: 46, l: 56 };
      const x = d3.scaleLog().domain([1.3, 44]).range([m.l, W - m.r]);
      const R = W < 520 ? 4.3 : 5.4;
      svg.append("defs").append("marker").attr("id", "tz-head").attr("viewBox", "0 0 10 10").attr("refX", 6).attr("refY", 5)
        .attr("markerWidth", 6.5).attr("markerHeight", 6.5).attr("orient", "auto-start-reverse")
        .append("path").attr("d", "M0,0 L10,5 L0,10 z").attr("fill", BLUE);
      const g = {};
      ["grid", "xa", "ya", "prop", "arrows", "pts", "lab"].forEach((k) => (g[k] = svg.append("g")));
      g.grid.attr("class", "grid");
      g.xa.attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x).tickValues([2, 4, 8, 16, 32]).tickFormat((d) => d + "B").tickSizeOuter(0));
      g.ya.attr("class", "axis").attr("transform", `translate(${m.l},0)`);
      svg.append("text").attr("class", "axis-title").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").text("Model parameters (log scale)");
      const yTitle = svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle")
        .attr("transform", `translate(14,${(m.t + H - m.b) / 2}) rotate(-90)`);
      S = { svg, W, H, m, x, R, g, yTitle };
    }

    function layout() {
      const b = +state.bench, { x, m, H, W, R } = S;
      const vals = rows.map((r) => r.scores[b]);
      const lo = d3.min(vals), hi = d3.max(vals), pad = (hi - lo) * 0.07;
      const y = d3.scaleLinear().domain([lo - pad, hi + pad]).nice(5).range([H - m.b, m.t]);
      const pos = {};
      pts.forEach((r) => { pos[r.id] = { x: x(r.size) + (JIT[r.id] || 0) * (W < 520 ? 0.7 : 1), y: y(r.scores[b]) }; });
      props.forEach((r) => { pos[r.id] = { y: y(r.scores[b]) }; });
      // an arrow too short to read is left out (the gain is then visible from the two points alone)
      const arrows = pairs.map(([bi, ii]) => { const y1 = pos[bi].y - R - 3, y2 = pos[ii].y + R * 1.25 + 5; return { id: ii, x: pos[bi].x, y1, y2, show: y1 - y2 > 12 }; });

      // labels, placed clear of points, arrows and each other
      const obstacles = pts.map((r) => ({ x: pos[r.id].x - R - 2, y: pos[r.id].y - R - 2, w: 2 * R + 4, h: 2 * R + 4 }))
        .concat(arrows.map((a) => ({ x: a.x - 4, y: a.y2, w: 8, h: a.y1 - a.y2 })));
      const side = [{ dx: -11, dy: 4.5, anchor: "end" }, { dx: 11, dy: 4.5, anchor: "start" }, { dx: 0, dy: -11, anchor: "middle" }, { dx: 0, dy: 20, anchor: "middle" }];
      const below = [{ dx: 0, dy: 20, anchor: "middle" }, { dx: -10, dy: 4.5, anchor: "end" }, { dx: 10, dy: 4.5, anchor: "start" }, { dx: 0, dy: -11, anchor: "middle" }];
      const labels = [];
      ["Imago-4B|4", "Imago-6B|6"].forEach((id) => labels.push({ id, text: byId[id].disp, x: pos[id].x, y: pos[id].y, size: 13.5, weight: 700, cls: "imago", cands: side }));
      ["FLUX.2-Klein-Base|4", "Z-Image|6"].forEach((id) => labels.push({ id, text: byId[id].disp, x: pos[id].x, y: pos[id].y, size: 12.5, cls: "base", cands: below }));
      props.forEach((r) => labels.push({ id: r.id, text: r.disp, x: W - m.r, y: pos[r.id].y, size: 12.5, cls: "prop",
        cands: [{ dx: 0, dy: -6, anchor: "end" }, { dx: 0, dy: 15, anchor: "end" }, { dx: m.l - W + m.r + 6, dy: -6, anchor: "start" }, { dx: m.l - W + m.r + 6, dy: 15, anchor: "start" }] }));
      const dev = "FLUX.2-dev|32";
      labels.push({ id: dev, text: "FLUX.2-dev", x: pos[dev].x, y: pos[dev].y, size: 12.5, cls: "other", cands: [{ dx: -10, dy: 4.5, anchor: "end" }, { dx: 0, dy: 20, anchor: "middle" }, { dx: 0, dy: -11, anchor: "middle" }] });
      I.placeLabels(labels, obstacles, { x0: m.l + 2, x1: W, y0: 0, y1: H - m.b - 2 });
      return { b, y, pos, arrows, labels };
    }

    function tipHtml(r, L) {
      const s = r.scores[L.b];
      let h = `<b>${I.esc(r.disp)}</b>${r.size ? ` · ${r.size}B` : ""}<br>${BN[L.b]}: ${s.toFixed(DEC[L.b])}`;
      const pair = pairs.find((p) => p[1] === r.id);
      if (pair) {
        const base = byId[pair[0]], bs = base.scores[L.b];
        h += `<br><span class="s">${I.esc(base.disp)}: ${bs.toFixed(DEC[L.b])} (${I.pct((s - bs) / bs * 100)})</span>`;
      }
      if (r.kind === "base") h += `<br><span class="s">base model of ${byId[pairs.find((p) => p[0] === r.id)[1]].disp}</span>`;
      return h;
    }

    function axes(L, t) {
      const { g, m, W } = S;
      const ya = d3.axisLeft(L.y).ticks(5).tickSizeOuter(0).tickFormat((d) => (L.b === 0 || L.b === 4 ? d.toFixed(1) : d));
      const grid = (s) => s.call(d3.axisLeft(L.y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat("")).call((q) => q.select(".domain").remove());
      if (t) { g.ya.transition(t).call(ya); g.grid.attr("transform", `translate(${m.l},0)`).transition(t).call(grid); }
      else { g.ya.call(ya); g.grid.attr("transform", `translate(${m.l},0)`).call(grid); }
      S.yTitle.text(`${BN[L.b]} score`);
    }

    function draw(build) {
      scaffold();
      const L = layout(), { g, R, m, W } = S;
      axes(L);
      const order = new Map(pts.map((r, i) => [r.id, i]));

      g.prop.selectAll("line").data(props, (d) => d.id).join("line")
        .attr("x1", m.l).attr("x2", build ? m.l : W - m.r).attr("y1", (d) => L.pos[d.id].y).attr("y2", (d) => L.pos[d.id].y)
        .attr("stroke", "#9aa1aa").attr("stroke-width", 1.3).attr("stroke-dasharray", "5 4")
        .call((s) => build && s.transition().delay(dur(650)).duration(dur(700)).ease(d3.easeCubicInOut).attr("x2", W - m.r));

      g.arrows.selectAll("line").data(L.arrows, (d) => d.id).join("line")
        .attr("x1", (d) => d.x).attr("x2", (d) => d.x).attr("y1", (d) => d.y1).attr("y2", (d) => (build ? d.y1 : d.y2))
        .attr("stroke", BLUE).attr("stroke-width", 2.2).attr("marker-end", "url(#tz-head)").attr("opacity", (d) => (build || !d.show ? 0 : 1))
        .call((s) => build && s.transition().delay((d, i) => dur(1350 + i * 160)).duration(dur(750)).ease(d3.easeCubicOut).attr("opacity", (d) => (d.show ? 1 : 0)).attr("y2", (d) => d.y2));

      const rOf = (d) => (d.kind === "imago" ? R * 1.25 : d.kind === "base" ? R : R * 0.9);
      const circles = g.pts.selectAll("circle.pt").data(pts, (d) => d.id).join("circle").attr("class", "pt")
        .attr("cx", (d) => L.pos[d.id].x).attr("cy", (d) => L.pos[d.id].y).attr("r", (d) => (build ? 0 : rOf(d)))
        .attr("fill", (d) => COL[d.kind]).attr("stroke", "#fff").attr("stroke-width", 1.4).style("cursor", "default");
      if (build) {
        circles.filter((d) => d.kind !== "imago").transition().delay((d) => dur(120 + order.get(d.id) * 38)).duration(dur(420)).ease(d3.easeBackOut.overshoot(2)).attr("r", rOf);
        circles.filter((d) => d.kind === "imago").transition().delay((d, i) => dur(1950 + i * 160)).duration(dur(500)).ease(d3.easeBackOut.overshoot(2.4)).attr("r", rOf)
          .on("start", function (d) {
            g.pts.insert("circle", ":first-child").attr("cx", L.pos[d.id].x).attr("cy", L.pos[d.id].y).attr("r", R).attr("fill", "none")
              .attr("stroke", BLUE).attr("stroke-width", 2).attr("opacity", 0.6)
              .transition().duration(dur(900)).ease(d3.easeCubicOut).attr("r", R * 4).attr("opacity", 0).remove();
          });
      }
      circles.raise();
      I.hover(circles, (d) => tipHtml(d, S.L));
      I.hover(g.prop.selectAll("line").style("pointer-events", "stroke").attr("stroke-width", 1.3), (d) => `<b>${d.disp}</b> · proprietary<br>${BN[S.L.b]}: ${d.scores[S.L.b].toFixed(DEC[S.L.b])}`);

      // each label is a white halo copy under the coloured text, so a tspan's halo never clips its neighbour
      g.lab.selectAll("g.lab").data(L.labels, (d) => d.id).join("g").attr("class", "lab")
        .attr("transform", (d) => `translate(${d.x + d.pos.dx},${d.y + d.pos.dy})`)
        .each(function (d) {
          const gg = d3.select(this).html("");
          ["halo", "ink"].forEach((layer) => {
            const t = gg.append("text").attr("text-anchor", d.pos.anchor).style("font-size", d.size + "px").style("font-weight", d.weight || 400)
              .attr("fill", layer === "halo" ? "#fff" : { imago: "#1f5fcf", base: "#4a525c", prop: "#7d858f", other: "#7d858f" }[d.cls]);
            if (layer === "halo") t.attr("stroke", "#fff").attr("stroke-width", 4).attr("stroke-linejoin", "round");
            if (d.cls === "imago") { t.append("tspan").attr("font-style", "italic").text("Imago"); t.append("tspan").text(d.text.slice(5)); }
            else t.text(d.text);
          });
        })
        .attr("opacity", build ? 0 : 1)
        .call((s) => build && s.transition().delay((d) => dur(d.cls === "imago" ? 2250 : d.cls === "base" ? 1200 : 1000)).duration(dur(400)).attr("opacity", 1));
      S.L = L;
    }

    function morph() {
      if (!S) return draw(false);
      const L = layout(), { g, R } = S;
      const t = d3.transition().duration(dur(650)).ease(d3.easeCubicInOut);
      axes(L, t);
      g.pts.selectAll("circle.pt").transition(t).attr("cy", (d) => L.pos[d.id].y).attr("cx", (d) => L.pos[d.id].x);
      g.prop.selectAll("line").transition(t).attr("y1", (d) => L.pos[d.id].y).attr("y2", (d) => L.pos[d.id].y);
      g.arrows.selectAll("line").data(L.arrows, (d) => d.id)
        .transition(t).attr("y1", (d) => d.y1).attr("y2", (d) => d.y1).attr("opacity", 0)
        .transition().duration(dur(520)).ease(d3.easeCubicOut).attr("y2", (d) => d.y2).attr("opacity", (d) => (d.show ? 1 : 0));
      g.lab.selectAll("g.lab").data(L.labels, (d) => d.id)
        .transition().duration(dur(150)).attr("opacity", 0)
        .transition().duration(0).attr("transform", (d) => `translate(${d.x + d.pos.dx},${d.y + d.pos.dy})`)
        .on("end", function (d) { d3.select(this).selectAll("text").attr("text-anchor", d.pos.anchor); })
        .transition().delay(dur(520)).duration(dur(300)).attr("opacity", 1);
      S.L = L;
      void R;
    }

    return { render: () => draw(false), play: () => draw(true), update: morph };
  });

  /* ======================================================================== benchmarks by prompt length */
  I.register("benchmarks", (el) => {
    const host = el.querySelector(".chart");
    function draw(build) {
      const H = Math.round(Math.max(290, Math.min(400, host.clientWidth * 0.46)));
      const { svg, W } = svgIn(host, H);
      const m = { t: 14, r: 16, b: 46, l: 54 };
      const x = d3.scaleLog().domain([5.2, 1000]).range([m.l, W - m.r]);
      const y = d3.scaleLinear().domain([0.515, 0.915]).range([H - m.b, m.t]);
      const k = Math.min(1, W / 820);

      svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).tickValues([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]).tickSize(-(W - m.l - m.r)).tickFormat(""))
        .call((g) => g.select(".domain").remove());
      // regimes: faint bands, dashed borders, names along the bottom
      const regimes = [["short", 5.2, 100], ["medium", 100, 300], ["long", 300, 1000]];
      const gReg = svg.append("g").attr("opacity", build ? 0 : 1);
      gReg.selectAll("rect").data(regimes).join("rect").attr("x", (d) => x(d[1])).attr("width", (d) => x(d[2]) - x(d[1]))
        .attr("y", m.t).attr("height", H - m.b - m.t).attr("fill", (d) => REGL[d[0]]).attr("opacity", 0.13);
      gReg.selectAll("line").data([100, 300]).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b)
        .attr("stroke", "#5d646e").attr("stroke-width", 1).attr("stroke-dasharray", "6 5");
      gReg.selectAll("text").data(regimes).join("text").attr("x", (d) => (d[0] === "long" ? x(780) : (x(d[1]) + x(d[2])) / 2))
        .attr("y", (d) => (d[0] === "long" ? m.t + 22 : H - m.b - 10))
        .attr("text-anchor", "middle").attr("fill", (d) => REG[d[0]]).style("font-size", "14px").style("font-weight", 700).text((d) => d[0]);
      if (build) gReg.transition().duration(dur(500)).attr("opacity", 1);

      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x).tickValues([10, 30, 100, 300, 1000]).tickFormat(d3.format("d")).tickSizeOuter(0));
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).tickValues([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]).tickFormat(d3.format(".2f")).tickSizeOuter(0));
      svg.append("text").attr("class", "axis-title").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").text("Mean prompt length (words, log scale)");
      svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(14,${(m.t + H - m.b) / 2}) rotate(-90)`).text("Mean normalized score");

      // the downward trend, drawn last
      const p0 = [x(6.4), y(0.872)], c1 = [x(40), y(0.876)], c2 = [x(200), y(0.842)], p3 = [x(452), y(0.584)];
      const path = d3.path();
      path.moveTo(...p0);
      path.bezierCurveTo(...c1, ...c2, ...p3);
      const trend = svg.append("path").attr("d", path.toString()).attr("fill", "none").attr("stroke", "#dcdfe3")
        .attr("stroke-width", Math.max(6, 10 * k)).attr("stroke-linecap", "butt");
      const head = svg.append("path").attr("fill", "#dcdfe3")
        .attr("d", (() => { const a = Math.atan2(p3[1] - c2[1], p3[0] - c2[0]), s = 16 * Math.max(0.7, k); const tip = [p3[0] + 10 * Math.cos(a), p3[1] + 10 * Math.sin(a)];
          return `M${tip[0]},${tip[1]} L${tip[0] - s * Math.cos(a - 0.45)},${tip[1] - s * Math.sin(a - 0.45)} L${tip[0] - s * Math.cos(a + 0.45)},${tip[1] - s * Math.sin(a + 0.45)} Z`; })());
      if (build) {
        const len = trend.node().getTotalLength();
        trend.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
          .transition().delay(dur(1250)).duration(dur(1100)).ease(d3.easeCubicInOut).attr("stroke-dashoffset", 0)
          .on("end", function () { d3.select(this).attr("stroke-dasharray", null); });
        head.attr("opacity", 0).transition().delay(dur(2300)).duration(dur(250)).attr("opacity", 1);
      }

      const nmin = d3.min(BENCH, (d) => d.prompts), nmax = d3.max(BENCH, (d) => d.prompts);
      const r0 = Math.max(9, Math.min(15.5, W * 0.0175));
      const rOf = (d) => Math.sqrt((1 + 6 * (d.prompts - nmin) / (nmax - nmin))) * r0;   // area 1x .. 7x, as in the paper
      const bub = svg.append("g").selectAll("circle").data(BENCH).join("circle")
        .attr("cx", (d) => x(d.words)).attr("cy", (d) => y(d.score)).attr("r", (d) => (build ? 0 : rOf(d)))
        .attr("fill", (d) => REGL[d.regime]).attr("fill-opacity", 0.92).attr("stroke", "#fff").attr("stroke-width", 1.5);
      if (build) bub.transition().delay((d, i) => dur(250 + i * 130)).duration(dur(550)).ease(d3.easeBackOut.overshoot(1.6)).attr("r", rOf);
      I.hover(bub, (d) => `<b>${d.name}</b> · ${d.regime}<br>${d.words} words on average · ${d.prompts.toLocaleString()} prompts<br>mean score of ${d.models} models: ${d.score.toFixed(3)}`,
        function () { d3.select(this).attr("stroke", "#17191c"); }, function () { d3.select(this).attr("stroke", "#fff"); });

      // labels where the paper puts them: above the bubble unless noted
      const where = { tiifbench: [-12, "above"], spatialgeneval: [-4, "below"], t2icorebench_composition: [8, "below"], lpdbench: [-22, "above"], arenat2ihard: [0, "left"], longbencht2i: [46, "above"] };
      const side = (d) => (where[d.key] || [0, "above"])[1];
      const fs = W < 520 ? 11.5 : 13.5;
      let pos = BENCH.map((d) => ({
        x: side(d) === "left" ? x(d.words) - rOf(d) - 8 : x(d.words) + (where[d.key] ? where[d.key][0] : 0) * k,
        y: side(d) === "below" ? y(d.score) + rOf(d) + 16 : side(d) === "left" ? y(d.score) + 4.5 : y(d.score) - rOf(d) - 7,
        anchor: side(d) === "left" ? "end" : "middle" }));
      if (W < 640) {
        // narrow: place each label where it collides with no bubble, regime name, arrow or other label
        const obstacles = BENCH.map((d) => ({ x: x(d.words) - rOf(d), y: y(d.score) - rOf(d), w: 2 * rOf(d), h: 2 * rOf(d) }));
        const tp = trend.node(), tl = tp.getTotalLength();
        for (let s = 0; s <= tl; s += 10) { const q = tp.getPointAtLength(s); obstacles.push({ x: q.x - 4, y: q.y - 4, w: 8, h: 8 }); }
        gReg.selectAll("text").each(function () { const b = this.getBBox(); obstacles.push({ x: b.x, y: b.y, w: b.width, h: b.height }); });
        const labels = BENCH.map((d) => {
          const r = rOf(d);
          return { text: d.name, x: x(d.words), y: y(d.score), size: fs, cands: [
            { dx: 0, dy: -r - 6, anchor: "middle" }, { dx: 0, dy: r + 15, anchor: "middle" }, { dx: r + 5, dy: 4, anchor: "start" },
            { dx: -r - 5, dy: 4, anchor: "end" }, { dx: r * 0.7, dy: -r - 6, anchor: "start" }, { dx: -r * 0.7, dy: -r - 6, anchor: "end" },
            { dx: r * 0.7, dy: r + 15, anchor: "start" }, { dx: -r * 0.7, dy: r + 15, anchor: "end" }] };
        });
        I.placeLabels(labels, obstacles, { x0: m.l + 2, x1: W - 2, y0: 2, y1: H - m.b });
        pos = labels.map((L) => ({ x: L.x + L.pos.dx, y: L.y + L.pos.dy, anchor: L.pos.anchor }));
      }
      svg.append("g").selectAll("text").data(BENCH).join("text")
        .attr("x", (d, i) => pos[i].x).attr("y", (d, i) => pos[i].y).attr("text-anchor", (d, i) => pos[i].anchor)
        .style("font-size", fs + "px").attr("fill", "#33383f")
        .attr("stroke", "#fff").attr("stroke-width", 3.5).attr("paint-order", "stroke").text((d) => d.name)
        .attr("opacity", build ? 0 : 1)
        .call((s) => build && s.transition().delay((d, i) => dur(450 + i * 130)).duration(dur(400)).attr("opacity", 1));
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
      const barsBelow = narrow;
      const barH = barsBelow ? 4 * 26 + 32 : 0;
      const H = Math.round(n * ch + 30 + barH);
      const { svg } = svgIn(host, H);
      const x0 = 24, y0 = 4;
      const cells = [];
      for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) cells.push({ i, j });
      const gCells = svg.append("g");
      const regionPath = (name, cx, cy) => D.regions[name].map((poly) =>
        "M" + poly.map(([u, v]) => `${(cx + u * cw).toFixed(1)},${(cy + (1 - v) * ch).toFixed(1)}`).join("L") + "Z").join("");

      const cellG = gCells.selectAll("g.cell").data(cells).join("g").attr("class", "cell")
        .attr("transform", (d) => `translate(${x0 + d.j * cw},${y0 + d.i * ch})`);
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
          const p = g.append("path").attr("d", regionPath(name, 0, 0)).attr("fill", D.fill[name]).attr("fill-opacity", 0.55)
            .attr("stroke", D.edge[name]).attr("stroke-width", 1.8);
          if (build) {
            const delay = d.i === d.j ? 120 + d.i * 160 : 800 + idx * 70 + k * 120;
            p.attr("fill-opacity", 0).attr("stroke-opacity", 0).attr("transform", `translate(${cw / 2},${ch / 2}) scale(0.6) translate(${-cw / 2},${-ch / 2})`)
              .transition().delay(dur(delay)).duration(dur(650)).ease(d3.easeCubicOut)
              .attr("fill-opacity", 0.55).attr("stroke-opacity", 1).attr("transform", "translate(0,0) scale(1)");
          }
        });
        const label = d.i === d.j ? names[d.i] : `r = ${D.r[names[d.i]][names[d.j]].toFixed(2)}`;
        g.append("text").attr("x", narrow ? 5 : 8).attr("y", narrow ? 14 : 17).text(label)
          .style("font-size", (narrow ? 10 : 14.5) + "px").style("font-weight", 700)
          .attr("fill", d.i === d.j ? D.edge[names[d.i]] : "#33383f").attr("opacity", build ? 0 : 1)
          .call((s) => build && s.transition().delay(dur(d.i === d.j ? 300 + d.i * 160 : 1000 + idx * 70)).duration(dur(350)).attr("opacity", 1));
      });
      svg.append("text").attr("class", "axis-title").attr("x", x0 + gridW / 2).attr("y", y0 + n * ch + 20).attr("text-anchor", "middle").text("PC1");
      svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(12,${y0 + (n * ch) / 2}) rotate(-90)`).text("PC2");

      // r-bar per evaluator: right-anchored bars, as in the paper (upper-right block, or below on narrow screens)
      const sorted = names.slice().sort((a, b) => D.rbar[b] - D.rbar[a]);
      const bx0 = barsBelow ? x0 : x0 + cw + 18, bx1 = barsBelow ? x0 + gridW - 110 : x0 + gridW - 112;
      const by0 = barsBelow ? y0 + n * ch + 58 : y0 + 10, bh = barsBelow ? 16 : Math.min(18, ch * 0.2), gap = barsBelow ? 10 : Math.min(15, ch * 0.16);
      const base = d3.min(sorted, (r) => D.rbar[r]) - 0.03;
      const bw = d3.scaleLinear().domain([base, d3.max(sorted, (r) => D.rbar[r])]).range([18, (bx1 - bx0) * 0.86]);
      const gb = svg.append("g").attr("class", "rbar");
      if (!barsBelow) gb.append("text").attr("x", bx1).attr("y", by0 - 1).attr("text-anchor", "end").style("font-size", "12.5px").attr("fill", "#8c939c");
      sorted.forEach((name, k) => {
        const yy = by0 + k * (bh + gap);
        const w = bw(D.rbar[name]);
        const rect = gb.append("rect").attr("class", "b-" + k).attr("data-name", name).attr("x", bx1 - (build ? 0 : w)).attr("y", yy).attr("width", build ? 0 : w).attr("height", bh)
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

      // hover a lower panel: outline it and keep its two evaluators' bars
      cellG.filter((d) => d.i !== d.j).style("cursor", "default");
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

  /* ======================================================================== reward alignment */
  I.register("rewardAlign", (el, state) => {
    const host = el.querySelector(".chart");
    let focus = null, sel = 6, setLegend;
    const marker = { CLIPScore: "s", HPSv3: "P", PickScore: "D", ImageReward: "*", UnifiedReward: "^", PromptScore: "o",
      "Binary · Qwen3.5-9B": "X", "Graded · Gemma-4-E4B": "h", "Graded · Qwen3.5-9B": "o" };
    const sym = (name, size) => d3.symbol().type({ s: d3.symbolSquare, P: d3.symbolCross, D: d3.symbolDiamond, "*": d3.symbolStar, "^": d3.symbolTriangle, o: d3.symbolCircle, X: d3.symbolX || d3.symbolCross, h: d3.symbolDiamond2 || d3.symbolSquare }[marker[name]] || d3.symbolCircle).size(size)();

    function series() { return P.rewardAlign[state.view]; }
    function legend() {
      const S = series();
      setLegend = legendButtons(el, S.map((s) => ({ key: s.name, name: s.name, color: s.color, thick: s.highlight })), (k) => { focus = focus === k ? null : k; setLegend(focus); applyFocus(); });
      setLegend(focus);
    }
    function applyFocus() {
      d3.select(host).selectAll("[data-s]").transition().duration(dur(200))
        .attr("opacity", function () { const s = this.getAttribute("data-s"); return !focus || s === focus ? (this.getAttribute("data-o") || 1) : 0.08; });
    }

    function draw(build) {
      const S = series();
      const Wc = Math.max(260, host.clientWidth), narrow = Wc < 640;
      const leftW = narrow ? Wc : Math.round(Wc * 0.58), rightW = narrow ? Wc : Wc - leftW - 34;
      const hL = narrow ? 270 : 330, hR = narrow ? Math.min(rightW, 330) : 330;
      const H = narrow ? hL + hR + 40 : hL;
      const { svg } = svgIn(host, H);

      /* left: Pearson r per benchmark */
      const m = { t: 10, r: 10, b: 56, l: 44 };
      const gl = svg.append("g");
      const x = d3.scalePoint().domain(d3.range(7)).range([m.l, leftW - m.r]).padding(0.35);
      const lo = state.view === "classic" ? -1 : 0.7;
      const y = d3.scaleLinear().domain([lo, 1]).range([hL - m.b, m.t]);
      const yTicks = state.view === "classic" ? [-1, -0.5, 0, 0.5, 1] : [0.7, 0.8, 0.9, 1];
      gl.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-(leftW - m.l - m.r)).tickFormat("")).call((g) => g.select(".domain").remove());
      if (state.view === "classic") gl.append("line").attr("x1", m.l).attr("x2", leftW - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#c8cdd4");
      // regime strip under the axis
      const half = x.step() / 2;
      [["short", 0, 2], ["medium", 3, 4], ["long", 5, 6]].forEach(([r, a, b]) => gl.append("rect").attr("x", x(a) - half + 2).attr("width", x(b) - x(a) + 2 * half - 4)
        .attr("y", hL - m.b + 1).attr("height", 3).attr("fill", REG[r]).attr("opacity", 0.75));
      const compact = leftW < 560;
      const xa = gl.append("g").attr("class", "axis").attr("transform", `translate(0,${hL - m.b + 4})`)
        .call(d3.axisBottom(x).tickFormat((i) => (compact ? SHORTNAME[BENCH[i].name] : BENCH[i].name)).tickSize(0)).call((g) => g.select(".domain").remove());
      if (!compact) twoLineTicks(xa, BENCH.map((b) => b.name));
      xa.selectAll(".tick text").style("font-size", compact ? "10px" : "12px");
      gl.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues(yTicks).tickSizeOuter(0));
      gl.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(12,${(m.t + hL - m.b) / 2}) rotate(-90)`).text("Pearson r");

      // the selected benchmark (drives the scatter on the right)
      const band = gl.append("rect").attr("y", m.t).attr("height", hL - m.b - m.t).attr("width", x.step() * 0.8).attr("x", x(sel) - x.step() * 0.4)
        .attr("fill", "#17191c").attr("opacity", 0.045).attr("rx", 4);
      gl.append("g").selectAll("rect").data(d3.range(7)).join("rect").attr("x", (i) => x(i) - half).attr("width", 2 * half)
        .attr("y", m.t).attr("height", hL - m.t).attr("fill", "transparent").style("cursor", "pointer")
        .on("click", (ev, i) => { sel = i; band.transition().duration(dur(250)).attr("x", x(i) - x.step() * 0.4); scatter(true); });

      const clip = wipe(svg, 0, 0, leftW, hL, build, 100, 1100);
      const order = S.filter((s) => !s.highlight).concat(S.filter((s) => s.highlight));
      const gLines = gl.append("g").attr("clip-path", clip);
      order.forEach((s) => {
        const vals = s.bench.map((b) => b.r);
        const hi = s.highlight;
        const col = hi ? s.color : light(s.color, 0.35);
        const op = hi ? 1 : 0.85;
        gLines.append("path").attr("data-s", s.name).attr("data-o", op).attr("d", d3.line().defined((v) => v != null).x((v, i) => x(i)).y((v) => y(Math.max(lo, v)))(vals))
          .attr("fill", "none").attr("stroke", col).attr("stroke-width", hi ? 3.6 : 2).attr("opacity", op);
        const pts = gLines.append("g").attr("data-s", s.name).attr("data-o", op).attr("opacity", op).selectAll("path").data(vals.map((v, i) => ({ v, i, s }))
          .filter((d) => d.v != null)).join("path").attr("transform", (d) => `translate(${x(d.i)},${y(Math.max(lo, d.v))})`)
          .attr("d", sym(s.name, hi ? 95 : 60)).attr("fill", hi ? light(s.color, 0.25) : light(s.color, 0.5)).attr("stroke", hi ? s.color : "#fff").attr("stroke-width", hi ? 1.4 : 0.8);
        I.hover(pts, (d) => `<b>${d.s.name}</b><br>${BENCH[d.i].name}: r = ${d.v.toFixed(3)}`);
      });

      /* right: the 19 models on the selected benchmark */
      const ox = narrow ? 0 : leftW + 34, oy = narrow ? hL + 30 : 0;
      const gr = svg.append("g").attr("transform", `translate(${ox},${oy})`);
      const mm = { t: 26, r: 8, b: 40, l: 40 };
      const side = Math.min(rightW - mm.l - mm.r, hR - mm.t - mm.b);
      const sx = d3.scaleLinear().domain([-0.03, 1.03]).range([mm.l, mm.l + side]);
      const sy = d3.scaleLinear().domain([-0.03, 1.03]).range([mm.t + side, mm.t]);
      gr.append("g").attr("class", "grid").attr("transform", `translate(${mm.l},0)`).call(d3.axisLeft(sy).tickValues([0, 0.5, 1]).tickSize(-side).tickFormat("")).call((g) => g.select(".domain").remove());
      gr.append("g").attr("class", "grid").attr("transform", `translate(0,${mm.t + side})`).call(d3.axisBottom(sx).tickValues([0, 0.5, 1]).tickSize(-side).tickFormat("")).call((g) => g.select(".domain").remove());
      gr.append("g").attr("class", "axis").attr("transform", `translate(0,${mm.t + side})`).call(d3.axisBottom(sx).tickValues([0, 0.5, 1]).tickSizeOuter(0));
      gr.append("g").attr("class", "axis").attr("transform", `translate(${mm.l},0)`).call(d3.axisLeft(sy).tickValues([0, 0.5, 1]).tickSizeOuter(0));
      gr.append("text").attr("class", "axis-title").attr("x", mm.l + side / 2).attr("y", mm.t + side + 34).attr("text-anchor", "middle").text("Reward (normalized)");
      gr.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(${mm.l - 30},${mm.t + side / 2}) rotate(-90)`).text("Benchmark score (normalized)");
      const title = gr.append("text").attr("x", mm.l).attr("y", 15).style("font-size", "14px").style("font-weight", 700).attr("fill", "#17191c");
      const gFit = gr.append("g"), gPts = gr.append("g");
      const cp = "sc" + ++uid;
      gr.append("defs").append("clipPath").attr("id", cp).append("rect").attr("x", sx(0)).attr("y", sy(1)).attr("width", sx(1) - sx(0)).attr("height", sy(0) - sy(1));
      gFit.attr("clip-path", `url(#${cp})`);

      function scatter(animate) {
        const B = BENCH[sel];
        title.text(`${B.name} · 19 models`);
        const fits = order.map((s) => ({ s, b: s.bench[sel] }));
        const lines = gFit.selectAll("line").data(fits, (d) => d.s.name).join("line")
          .attr("data-s", (d) => d.s.name).attr("data-o", (d) => (d.s.highlight ? 1 : 0.85))
          .attr("stroke", (d) => (d.s.highlight ? d.s.color : light(d.s.color, 0.35))).attr("stroke-width", (d) => (d.s.highlight ? 3.2 : 1.8))
          .attr("stroke-dasharray", (d) => (d.b.fit.flat != null ? "2 4" : null))
          .attr("opacity", (d) => (!focus || d.s.name === focus ? (d.s.highlight ? 1 : 0.85) : 0.08));
        const ends = (d) => (d.b.fit.flat != null ? [0, d.b.fit.flat, 1, d.b.fit.flat] : [0, d.b.fit.intercept, 1, d.b.fit.slope + d.b.fit.intercept]);
        lines.attr("x1", (d) => sx(0)).attr("y1", (d) => sy(ends(d)[1]));
        (animate ? lines.attr("x2", sx(0)).attr("y2", (d) => sy(ends(d)[1])).transition().duration(dur(600)).delay(dur(150)) : lines)
          .attr("x2", sx(1)).attr("y2", (d) => sy(ends(d)[3]));
        const all = fits.flatMap((f) => f.b.pts.map((p) => ({ s: f.s, m: p[0], x: p[1], y: p[2], key: f.s.name + "|" + p[0] })));
        const dots = gPts.selectAll("path").data(all, (d) => d.key).join("path").attr("data-s", (d) => d.s.name)
          .attr("data-o", (d) => (d.s.highlight ? 0.95 : 0.7))
          .attr("d", (d) => sym(d.s.name, d.s.highlight ? 62 : 40))
          .attr("fill", (d) => (d.s.highlight ? light(d.s.color, 0.2) : light(d.s.color, 0.5))).attr("stroke", (d) => (d.s.highlight ? d.s.color : "#fff")).attr("stroke-width", 0.8)
          .attr("opacity", (d) => (!focus || d.s.name === focus ? (d.s.highlight ? 0.95 : 0.7) : 0.06));
        (animate ? dots.transition().duration(dur(500)).ease(d3.easeCubicInOut) : dots).attr("transform", (d) => `translate(${sx(d.x)},${sy(d.y)})`);
        dots.filter((d) => d.s.highlight).raise();
        I.hover(dots, (d) => `<b>${I.esc(d.m)}</b><br>${d.s.name}: ${d.x.toFixed(2)} · benchmark: ${d.y.toFixed(2)}<br><span class="s">${B.name}, r = ${d.s.bench[sel].r == null ? "n/a (constant reward)" : d.s.bench[sel].r.toFixed(3)}</span>`);
      }
      scatter(false);
      if (build) {
        gPts.attr("opacity", 0).transition().delay(dur(900)).duration(dur(500)).attr("opacity", 1);
        gFit.attr("opacity", 0).transition().delay(dur(1200)).duration(dur(500)).attr("opacity", 1);
      }
    }
    legend();
    return {
      render: () => draw(false),
      play: () => draw(true),
      update: () => { focus = null; legend(); draw(true); },
    };
  });

  /* ======================================================================== line panels (shared) */
  function linePanel(host, o) {
    const W = Math.max(240, host.clientWidth), H = o.height || 260;
    host.innerHTML = "";
    if (o.title) d3.select(host).append("p").attr("class", "panel-title").html(o.title);
    const svg = d3.select(host).append("svg").attr("width", W).attr("height", H);
    const m = { t: 12, r: 12, b: o.xTitle ? 46 : 34, l: o.yTitle ? 58 : 44, ...(o.margin || {}) };
    const x = o.xLinear ? d3.scaleLinear().domain(o.xDomain).range([m.l, W - m.r]) : d3.scalePoint().domain(d3.range(o.xs.length)).range([m.l, W - m.r]).padding(0.3);
    const xOf = (i) => (o.xLinear ? x(o.xs[i]) : x(i));
    const all = o.series.flatMap((s) => s.values).filter((v) => v != null).concat(o.zero ? [0] : []);
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
      if (o.xShort) xa.selectAll(".tick text").style("font-size", W < 380 ? "10.5px" : "12px");
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
      const animate = o.animate && (!o.animateKeys || o.animateKeys.has(s.key));
      const g = svg.append("g").attr("data-s", s.key).attr("data-o", s.opacity || 1).attr("opacity", s.opacity == null ? 1 : s.opacity);
      g.attr("clip-path", wipe(svg, 0, 0, W, H, animate, o.delay || 0, o.wipeMs || 1000));
      g.append("path").attr("d", d3.line().defined((v) => v != null).x((v, i) => xOf(i)).y((v) => y(v))(s.values))
        .attr("fill", "none").attr("stroke", s.color).attr("stroke-width", s.width || 2.2).attr("stroke-dasharray", s.dashed ? "7 5" : null).attr("stroke-linecap", "round");
      const pts = g.selectAll("path.pt").data(s.values.map((v, i) => ({ v, i, s })).filter((d) => d.v != null)).join("path").attr("class", "pt")
        .attr("transform", (d) => `translate(${xOf(d.i)},${y(d.v)})`).attr("d", d3.symbol().type(symbolOf[s.marker || "o"]).size(s.markerSize || 55)())
        .attr("fill", s.markerFill || s.color).attr("stroke", "#fff").attr("stroke-width", 1.1);
      if (s.marker === "v") pts.attr("transform", (d) => `translate(${xOf(d.i)},${y(d.v)}) rotate(180)`);
      I.hover(pts, (d) => o.tip(d.s, d.i, d.v));
      groups[s.key] = g;
    });
    // the highlighted series stays on top
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
        svg.append("text").attr("x", m.l - 4).attr("y", H - m.b + 36).attr("text-anchor", "end").style("font-size", "11.5px").attr("fill", "#8c939c").text(k === 0 ? "r̄" : "");
        if (k === 0) svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", `translate(11,${(m.t + H - m.b) / 2}) rotate(-90)`).text("Normalized score");
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
          // per-benchmark values appear on hover
          const dots = g.append("g").attr("opacity", 0);
          Object.values(b.values).forEach((v, j) => dots.append("circle").attr("cx", cx + (j - 3) * bw * 0.09).attr("cy", y(v)).attr("r", 2.6).attr("fill", "#17191c").attr("stroke", "#fff").attr("stroke-width", 0.6));
          const hit = g.append("rect").attr("x", -4).attr("width", bw + 8).attr("y", y(b.max) - 6).attr("height", y(b.min) - y(b.max) + 12).attr("fill", "transparent");
          I.hover(hit, () => `<b>${b.backbone}</b> · ${pn.model}<br>median ${b.med.toFixed(1)}, range ${b.min.toFixed(1)}–${b.max.toFixed(1)}<br>` +
            Object.entries(b.values).map(([n, v]) => `<span class="s">${n.replace("-Composition", "")}: ${v.toFixed(1)}</span>`).join("<br>"),
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
    let focus = null;
    const first = Object.values(P.designs)[0];
    const setLegend = legendButtons(el, first.map((s) => ({ key: s.key, name: s.name, color: s.color, thick: s.highlight })), (k) => {
      focus = focus === k ? null : k;
      setLegend(focus);
      d3.select(panels).selectAll("g[data-s]").transition().duration(dur(200)).attr("opacity", function () {
        return !focus || this.getAttribute("data-s") === focus ? this.getAttribute("data-o") : 0.08;
      });
    });
    function draw(build) {
      panels.innerHTML = "";
      Object.entries(P.designs).forEach(([model, series], k) => {
        const host = panels.appendChild(document.createElement("div"));
        linePanel(host, {
          title: `<b>${model}</b>`, xs: names, xShort: true, regimeStrip: true, height: 270, animate: build, delay: 150 + k * 250, zero: false,
          yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
          series: series.slice().sort((a, b) => a.highlight - b.highlight).map((s) => ({
            key: s.key, values: s.gain, color: s.highlight ? s.color : light(s.color, 0.4), markerFill: s.highlight ? s.color : light(s.color, 0.35),
            width: s.highlight ? 3.8 : 2.2, marker: { Balance: "o", Attribute: "s", Entity: "D", Relation: "^" }[s.key], markerSize: s.highlight ? 100 : 60, top: s.highlight,
            opacity: !focus || focus === s.key ? 1 : 0.08, name: s.name,
          })),
          tip: (s, i, v) => `<b>${s.name}</b> · ${model}<br>${names[i]}: ${I.pct(v, 2)}`,
        });
      });
      d3.select(panels).selectAll("g[data-s]").attr("data-o", 1);
    }
    return { render: () => draw(false), play: () => draw(true) };
  });

  /* ======================================================================== schedules: short, long, joint, sequential */
  I.register("schedule", (el, state) => {
    const panels = el.querySelector(".panels");
    const note = el.querySelector(".step-note");
    const D = P.schedules;
    const names = BENCH.map((b) => b.name);
    const SHOWN = [["short", "long"], ["short", "long", "joint"], ["short", "long", "seq"]];
    const first = Object.values(D.models)[0];
    legendButtons(el, first.map((s) => ({ key: s.key, name: s.name, color: s.color, dashed: s.dashed, thick: !s.dashed })), () => {});
    el.querySelectorAll(".legend button").forEach((b) => (b.style.cursor = "default"));
    let shownBefore = new Set(), timer = null, auto = false;

    function legendState(step) {
      const on = new Set(SHOWN[step]);
      el.querySelectorAll(".legend button").forEach((b) => b.classList.toggle("dim", !on.has(b.dataset.key)));
    }
    function draw(step, build, animateKeys) {
      panels.innerHTML = "";
      const on = SHOWN[step];
      Object.entries(D.models).forEach(([model, series], k) => {
        const host = panels.appendChild(document.createElement("div"));
        const vis = series.filter((s) => on.includes(s.key));
        linePanel(host, {
          title: `<b>${model}</b>`, xs: D.words, xLinear: true, xDomain: [0, 560], height: 270, zero: true,
          animate: build, animateKeys, delay: build && !animateKeys ? 150 + k * 200 : 60 + k * 120, wipeMs: 1000,
          xTitle: "Mean prompt length of the benchmark (words)", yTitle: k === 0 ? "Relative gain over base (%)" : null, yFormat: (d) => d + "%",
          // the y range covers all four runs so that stepping does not rescale the axes
          series: series.map((s) => ({ key: s.key, values: s.gain, color: s.color, dashed: s.dashed, width: s.dashed ? 2.2 : 3.6,
            markerSize: s.dashed ? 38 : 70, top: !s.dashed, opacity: on.includes(s.key) ? (s.dashed ? 0.9 : 1) : 0 })),
          tip: (s, i, v) => `<b>${series.find((q) => q.key === s.key).name}</b><br>${names[i]} (${D.words[i]} words): ${I.pct(v, 2)}`,
        });
        void vis;
      });
      d3.select(panels).selectAll("g[data-s]").filter(function () { return !on.includes(this.getAttribute("data-s")); }).style("pointer-events", "none");
      const li = el.querySelectorAll(".step-notes li")[step];
      note.innerHTML = li ? li.innerHTML : "";
      legendState(step);
      shownBefore = new Set(on);
    }
    function goto(step, animate) {
      const added = new Set(SHOWN[step].filter((k) => !shownBefore.has(k)));
      draw(step, animate, added);
    }
    async function sequence() {
      auto = true;
      for (let s = 0; s < 3; s++) {
        if (!auto) return;
        state.set("step", String(s));
        if (s === 0) { shownBefore = new Set(); draw(0, true); } else goto(s, true);
        await I.sleep(s === 2 ? 0 : 2300);
      }
      auto = false;
    }
    el.querySelectorAll('.seg[data-ctl="step"] button').forEach((b) => b.addEventListener("click", () => { auto = false; clearTimeout(timer); }));
    return {
      render: () => draw(+state.step, false),
      play: () => (I.reduced ? draw(2, false) : sequence()),
      update: () => goto(+state.step, true),
    };
  });
})();
