/* Core: figure registry, segmented controls, build-on-scroll, resize, tooltip, lightbox.

   A figure is <figure data-fig="name"> with optional <div class="seg" data-ctl="key"> controls and a
   .replay button. Imago.register(name, (el, state) => ({ render, play, update })) defines it:
     render()      draw the final state without animation (first paint, resize)
     play()        draw it with its build animation (first time in view, Replay)
     update(key)   a control changed; state[key] holds the new value
*/
(function () {
  "use strict";
  const I = (window.Imago = window.Imago || {});
  I.P = window.PAPER;
  I.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  I.registry = {};
  I.register = (name, factory) => { I.registry[name] = factory; };

  /* benchmark names on two lines, broken where the paper's table headers break them (\makecell{T2I\\CompBench}) */
  const TWO_LINE = {
    "T2I-CompBench": ["T2I", "CompBench"], "TIIF-Bench": ["TIIF", "Bench"], "SpatialGenEval": ["Spatial", "GenEval"],
    "T2I-CoReBench": ["T2I", "CoReBench"], "LPD-Bench": ["LPD", "Bench"], "Arena-T2I-Hard": ["Arena-T2I", "Hard"],
    "LongBench-T2I": ["LongBench", "T2I"],
  };
  I.twoLine = (name) => TWO_LINE[name] || [name];
  I.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  I.fmt = (v, d = 2) => (v == null ? "–" : (+v).toFixed(d));
  I.pct = (v, d = 1) => (v == null ? "–" : (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d) + "%");
  /* Pace of every build animation: JS delays/durations (I.dur, I.sleep) and CSS build transitions
     (calc(… * var(--pace))) are multiplied by it. Hover feedback uses I.uiDur and is not paced. */
  I.pace = 1.8;
  document.documentElement.style.setProperty("--pace", I.pace);
  I.dur = (ms) => (I.reduced ? 0 : ms * I.pace);
  I.sleep = (ms) => new Promise((r) => setTimeout(r, I.dur(ms)));
  I.uiDur = (ms) => (I.reduced ? 0 : ms);

  /* ------------------------------------------------------------ tooltip card */
  const tip = document.getElementById("tip");
  I.tip = {
    show(html, ev) { tip.innerHTML = html; tip.classList.add("on"); this.move(ev); },
    move(ev) {
      if (!ev) return;
      const pad = 16, w = tip.offsetWidth, h = tip.offsetHeight;
      let x = ev.clientX + pad, y = ev.clientY + pad;
      if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
      if (y + h > window.innerHeight - 8) y = ev.clientY - h - pad;
      tip.style.left = Math.max(8, x) + "px";
      tip.style.top = Math.max(8, y) + "px";
    },
    hide() { tip.classList.remove("on"); },
  };
  /* tooltip content: a title with a colour swatch, a subtitle, rows of label and value (each with an optional colour
     dot and a bar in [0, 1]; on = emphasised) and a note */
  I.card = ({ title = "", sub = "", color = null, rows = [], note = "" }) => {
    let h = `<div class="tc-h">${color ? `<i class="tc-sw" style="background:${color}"></i>` : ""}<span>${title}</span></div>`;
    if (sub) h += `<div class="tc-sub">${sub}</div>`;
    if (rows.length) {
      const bars = rows.some((r) => r.bar != null);
      h += `<div class="tc-rows${bars ? " has-bars" : ""}">` + rows.map((r) => `<div class="tc-r${r.on ? " on" : ""}">` +
        `<span class="k">${r.color ? `<i class="tc-dot" style="background:${r.color}"></i>` : ""}<span class="kt">${r.k}</span></span>` +
        (bars ? `<span class="tc-bar">${r.bar != null ? `<i style="width:${(Math.max(0, Math.min(1, r.bar)) * 100).toFixed(1)}%${r.color ? `;background:${r.color}` : ""}"></i>` : ""}</span>` : "") +
        `<span class="v">${r.v}</span></div>`).join("") + "</div>";
    }
    if (note) h += `<div class="tc-note">${note}</div>`;
    return h;
  };

  /* Hover, with touch: a mouse or pen hovers; a finger taps to show the same highlight and taps elsewhere to clear it.
     h = { enter(ev, d), move(ev, d), leave(ev, d), sticky } (sticky: a second tap on the same mark updates rather than
     clears, as for a crosshair). Works on d3 selections (I.interact) and on elements (I.interactEl). */
  let lastPointer = "mouse", active = null;
  document.addEventListener("pointerdown", (e) => { lastPointer = e.pointerType || "mouse"; }, true);
  document.addEventListener("click", (e) => {
    if (lastPointer !== "touch" || !active || e.imagoHandled) return;
    active.off();
    active = null;
  });
  function bind(on, h) {
    on("pointerenter", function (ev, d) { if (ev.pointerType !== "touch") h.enter && h.enter.call(this, ev, d); });
    on("pointermove", function (ev, d) { if (ev.pointerType !== "touch") h.move && h.move.call(this, ev, d); });
    on("pointerleave", function (ev, d) { if (ev.pointerType !== "touch") h.leave && h.leave.call(this, ev, d); });
    on("click", function (ev, d) {
      if (lastPointer !== "touch") return;
      ev.imagoHandled = true;
      const node = this, again = active && active.node === node && active.d === d;
      if (active) { active.off(); active = null; }
      if (again && !h.sticky) return;
      h.enter && h.enter.call(node, ev, d);
      h.move && h.move.call(node, ev, d);
      active = { node, d, off: () => h.leave && h.leave.call(node, ev, d) };
    });
  }
  I.interact = (sel, h) => { bind((type, fn) => sel.on(type + ".ix", fn), h); return sel; };
  I.interactEl = (el, h) => { bind((type, fn) => el.addEventListener(type, function (ev) { fn.call(this, ev); }), h); return el; };
  /* attach a tooltip (and optional enter / leave effects) to a d3 selection; html(d) builds the content */
  I.hover = (sel, html, onEnter, onLeave) => I.interact(sel, {
    enter(ev, d) { I.tip.show(html(d, this), ev); onEnter && onEnter.call(this, d); },
    move(ev) { I.tip.move(ev); },
    leave(ev, d) { I.tip.hide(); onLeave && onLeave.call(this, d); },
  });
  window.addEventListener("scroll", () => I.tip.hide(), { passive: true });

  /* a short message at the bottom of the screen */
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  let toastT = null;
  I.toast = (html) => {
    toast.innerHTML = html;
    toast.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("on"), 1700);
  };

  /* ------------------------------------------------------------ lightbox */
  const lb = document.getElementById("lightbox");
  I.lightbox = {
    open({ title = "", items = [], note = "" }) {
      lb.querySelector(".lb-title").innerHTML = title;
      const grid = lb.querySelector(".lb-grid");
      grid.style.setProperty("--n", items.length);
      grid.innerHTML = items.map((it) => `<figure><img src="${it.src}" alt="${I.esc(it.alt || it.cap || "")}"><figcaption>${it.cap || ""}</figcaption></figure>`).join("");
      lb.querySelector(".lb-note").innerHTML = note;
      lb.querySelector(".lb-note").style.display = note ? "" : "none";
      lb.classList.add("on");
      lb.querySelector(".lb-close").focus({ preventScroll: true });
    },
    close() { lb.classList.remove("on"); },
  };
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".lb-close")) I.lightbox.close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") I.lightbox.close(); });

  /* ------------------------------------------------------------ text measuring (labels placement) */
  const ctx = document.createElement("canvas").getContext("2d");
  I.textWidth = (text, size = 13, weight = 400) => {
    ctx.font = `${weight} ${size}px "Libertinus Sans", sans-serif`;
    return ctx.measureText(text).width;
  };

  /* Label placement: each label has candidate offsets, in order of preference. A small backtracking search picks one
     per label so that no label leaves `bounds` or touches an obstacle box (marks, lines) or another label; if no
     such arrangement exists, labels fall back to the candidate with the least overlap. */
  I.placeLabels = (labels, obstacles, bounds) => {
    const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const B = { x: bounds.x0, y: bounds.y0, w: bounds.x1 - bounds.x0, h: bounds.y1 - bounds.y0 };
    const cand = labels.map((L) => {
      const w = I.textWidth(L.text, L.size || 13, L.weight || 400), h = (L.size || 13) + 2;
      return L.cands.map((c) => {
        const x = c.anchor === "end" ? L.x + c.dx - w : c.anchor === "middle" ? L.x + c.dx - w / 2 : L.x + c.dx;
        const box = { x: x - 2, y: L.y + c.dy - h + 3, w: w + 4, h };
        const inside = box.x >= bounds.x0 && box.x + box.w <= bounds.x1 && box.y >= bounds.y0 && box.y + box.h <= bounds.y1;
        return { ...c, box, ok: inside && !obstacles.some((o) => hit(box, o)) };
      });
    });
    const pick = new Array(labels.length).fill(-1);
    let steps = 0;
    const solve = (i) => {
      if (i === labels.length) return true;
      for (let k = 0; k < cand[i].length; k++) {
        const c = cand[i][k];
        if (!c.ok || ++steps > 40000) continue;
        let clash = false;
        for (let j = 0; j < i && !clash; j++) clash = hit(c.box, cand[j][pick[j]].box);
        if (clash) continue;
        pick[i] = k;
        if (solve(i + 1)) return true;
      }
      return false;
    };
    if (solve(0)) {
      labels.forEach((L, i) => (L.pos = cand[i][pick[i]]));
      return labels;
    }
    const placed = obstacles.slice();
    labels.forEach((L, i) => {
      let best = null, bestCost = Infinity;
      cand[i].forEach((c) => {
        const cost = placed.reduce((s, o) => s + area(c.box, o), 0) + 4 * (c.box.w * c.box.h - area(c.box, B));
        if (cost < bestCost) { bestCost = cost; best = c; }
      });
      L.pos = best;
      placed.push(best.box);
    });
    return labels;
  };

  /* ------------------------------------------------------------ figures */
  const firstView = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      firstView.unobserve(el);
      el.classList.add("seen");
      if (el._fig && el._fig.play) el._fig.play();
    });
  }, { threshold: 0.28, rootMargin: "0px 0px -6% 0px" });

  I.mountFigures = () => {
    document.querySelectorAll("figure[data-fig]").forEach((el) => {
      const factory = I.registry[el.dataset.fig];
      if (!factory) return;
      const state = {};
      const segs = el.querySelectorAll(".seg[data-ctl]");
      segs.forEach((seg) => {
        const btns = [...seg.querySelectorAll("button")];
        const cur = btns.find((b) => b.getAttribute("aria-pressed") === "true") || btns[0];
        state[seg.dataset.ctl] = cur.dataset.v;
        btns.forEach((b) => {
          b.type = "button";
          b.setAttribute("aria-pressed", String(b === cur));
          b.addEventListener("click", () => {
            if (state[seg.dataset.ctl] === b.dataset.v && !b.hasAttribute("data-always")) return;
            btns.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
            state[seg.dataset.ctl] = b.dataset.v;
            if (inst.update) inst.update(seg.dataset.ctl, true);
          });
        });
      });
      // a figure's controls may also be driven from code (e.g. an auto-playing sequence)
      state.set = (key, v) => {
        state[key] = v;
        el.querySelectorAll(`.seg[data-ctl="${key}"] button`).forEach((o) => o.setAttribute("aria-pressed", String(o.dataset.v === v)));
      };
      const inst = factory(el, state) || {};
      if (inst.play) {
        const play = inst.play;
        inst.play = (...a) => { el.classList.remove("pre"); return play(...a); };
      }
      el._fig = inst;
      el.querySelectorAll(".replay").forEach((b) => b.addEventListener("click", () => inst.play && inst.play(true)));
      if (inst.render) inst.render();
      if (!I.reduced && inst.play) el.classList.add("pre");
      else el.classList.add("seen");
      firstView.observe(el);

      // re-render on width changes only
      const target = el.querySelector(".chart, .panels, .table-wrap, .imgrid, .comp-mount, .mosaic-mount, .designs-mount") || el;
      let lastW = target.clientWidth, t = null;
      new ResizeObserver(() => {
        const w = target.clientWidth;
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        clearTimeout(t);
        t = setTimeout(() => inst.resize ? inst.resize() : inst.render && inst.render(), 120);
      }).observe(target);
    });
  };

  /* number figures and tables in document order and fill <a class="ref" data-ref="id"> */
  I.numberFigures = () => {
    let f = 0, t = 0;
    const label = {};
    document.querySelectorAll("figure[id]").forEach((el) => {
      const isTable = el.classList.contains("is-table");
      const text = isTable ? `Table ${++t}` : `Fig. ${++f}`;
      label[el.id] = text;
      const fn = el.querySelector(".fn");
      if (fn) fn.textContent = text;
    });
    document.querySelectorAll("a.ref[data-ref]").forEach((a) => {
      a.textContent = label[a.dataset.ref] || "?";
      a.href = "#" + a.dataset.ref;
    });
  };

  /* simple reveal for non-chart elements (images, table rows) */
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); reveal.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  I.reveal = (el) => { if (I.reduced) el.classList.add("in"); else reveal.observe(el); };
})();
