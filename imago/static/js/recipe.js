/* One Imago training step, drawn after DiffusionNFT's own diagram (Zheng et al., Fig. 4) and animated while in view.
   Notation follows Appendix C. The EMA generator pi_old samples G = 12 images for a prompt; PromptScore grades them and
   the grades, normalized in the group, become optimality rewards r_k. A sample is noised along the forward process; the
   trained velocity v_theta and the EMA velocity v_old give the implicit positive and negative velocities v_theta^+ and
   v_theta^-, regressed to v with weights r_k and 1 - r_k; the EMA weights then follow theta. Halfway, the prompts switch from Imago-Short to Imago-Long and
   the optimizer and EMA are reset (Appendix C). Grades are illustrative. Hovering pauses the animation. */
(function () {
  "use strict";
  const I = window.Imago, Q = I.P.qual;
  const G = 12, STEPS = 8;
  // illustrative grades for the 8 animated steps, 12 rollouts each, and the sample followed through the update
  const GRADES = [
    [5, 7, 4, 6, 8, 3, 6, 5, 7, 4, 6, 5], [6, 4, 7, 5, 8, 6, 3, 7, 5, 6, 7, 4], [6, 8, 5, 7, 4, 7, 6, 8, 5, 6, 7, 6], [7, 5, 8, 6, 7, 4, 8, 6, 7, 5, 8, 6],
    [4, 6, 3, 5, 7, 5, 4, 6, 3, 5, 6, 4], [5, 7, 4, 6, 5, 8, 6, 4, 7, 5, 6, 5], [6, 5, 7, 8, 6, 4, 7, 6, 8, 5, 6, 7], [7, 6, 8, 5, 7, 8, 6, 7, 5, 8, 7, 6],
  ];
  const PICK = [4, 6, 1, 6, 4, 5, 3, 1];
  const HUE = [212, 28, 140, 265, 190, 340, 48, 160, 230, 10, 95, 300];
  const plain = (key) => Q.designs.find((d) => d.key === key).segments.map((s) => s.t).join("");
  const tex = (s) => (window.katex ? window.katex.renderToString(s, { throwOnError: false }) : s);
  /* optimality reward of each sample: 1/2 + clip(z, -5, 5) / 10, z the grade standardized within the group */
  const rewards = (g) => {
    const mu = g.reduce((a, b) => a + b, 0) / g.length, sd = Math.sqrt(g.reduce((a, b) => a + (b - mu) ** 2, 0) / g.length) || 1;
    return g.map((v) => 0.5 + Math.max(-5, Math.min(5, (v - mu) / sd)) / 10);
  };

  /* wide layout: boxes on an 880 x 470 stage (scaled to the column); narrow screens stack the same boxes */
  const SW = 880, SH = 470, MID = 212, UP = 180, DN = 244;
  const BOX = {
    prompt: [0, 0, 880, 60], roll: [0, 102, 200, 200], score: [0, 314, 200, 92], rk: [0, 418, 200, 44],
    xt: [226, 150, 146, 124], vth: [396, UP - 22, 56, 44], vold: [396, DN - 22, 56, 44],
    vp: [480, UP - 22, 172, 44], vn: [480, DN - 22, 172, 44], lp: [676, UP - 26, 136, 52], ln: [676, DN - 26, 136, 52],
    sum: [822, MID - 12, 24, 24], min: [849, MID - 13, 31, 26], ema: [430, 72, 180, 30],
  };
  const WIRES = [   // [id, path]
    ["prompt", "M60 60V102"],
    ["roll-xt", `M200 ${MID}H224`],
    ["xt-vth", `M372 ${MID}C384 ${MID} 382 ${UP} 394 ${UP}`], ["xt-vold", `M372 ${MID}C384 ${MID} 382 ${DN} 394 ${DN}`],
    ["vth-vp", `M452 ${UP}H478`], ["vth-vn", `M452 ${UP}C466 ${UP} 464 ${DN} 478 ${DN}`],
    ["vold-vn", `M452 ${DN}H478`], ["vold-vp", `M452 ${DN}C466 ${DN} 464 ${UP} 478 ${UP}`],
    ["vp-lp", `M652 ${UP}H674`], ["vn-ln", `M652 ${DN}H674`],
    ["lp-sum", `M812 ${UP}C826 ${UP} 834 ${UP + 9} 834 ${MID - 14}`], ["ln-sum", `M812 ${DN}C826 ${DN} 834 ${DN - 9} 834 ${MID + 14}`],
    ["rk", `M200 440H744V${DN + 28}`],
    ["ema", `M865 ${MID - 14}V87H612M430 87H160V100`],
  ];

  I.register("recipe", (el) => {
    const host = el.querySelector(".chart");
    const tile = (i) => `<div class="nf-tile" style="--h:${HUE[i]}"><i></i><b></b></div>`;
    host.innerHTML = `
      <div class="nft">
        <div class="nft-stage">
          <div class="nb nb-prompt" data-b="prompt">
            <div class="nf-sets"><span class="nf-lab">Prompt</span><span class="nf-set short">${I.icon("corpus")}<span><i>Imago</i>-Short</span></span><span class="nf-to">→</span><span class="nf-set long">${I.icon("corpus")}<span><i>Imago</i>-Long</span></span></div>
            <div class="nf-time"><span class="nf-track"><span class="nf-fill"></span><span class="nf-mid"></span></span><span class="nf-reset">reset</span></div>
            <p class="nf-text"></p>
          </div>
          <div class="nb nb-roll" data-b="roll"><div class="nf-h">${tex("\\{x_0^k\\}_{k=1}^{G}\\sim\\pi^{\\mathrm{old}}(\\cdot\\mid c)")}</div><div class="nf-tiles">${Array.from({ length: G }, (_, i) => tile(i)).join("")}</div></div>
          <div class="nb nb-score" data-b="score"><div class="nf-h"><span class="nf-lab">PromptScore</span>${tex("r^{\\mathrm{raw}}_k\\in\\{1,\\dots,10\\}")}</div><div class="nf-bars">${Array.from({ length: G }, () => "<span><i></i></span>").join("")}<em class="nf-mean"></em></div></div>
          <div class="nb nb-rk" data-b="rk">${tex("r_k=\\tfrac12+\\tfrac1{10}\\,\\mathrm{clip}\\big(\\tfrac{r^{\\mathrm{raw}}_k-\\mu_R}{\\sigma_R},-5,5\\big)")}</div>
          <div class="nb nb-xt" data-b="xt"><div class="nf-xtile"><i></i><u></u></div>${tex("x_t=(1-t)\\,x_0^k+t\\epsilon")}</div>
          <div class="nb nb-net nb-vth" data-b="vth">${tex("v_\\theta")}</div>
          <div class="nb nb-net nb-vold" data-b="vold">${tex("v^{\\mathrm{old}}")}</div>
          <div class="nb nb-imp nb-vp" data-b="vp">${tex("v_\\theta^{+}=(1-\\beta)\\,v^{\\mathrm{old}}+\\beta\\,v_\\theta")}</div>
          <div class="nb nb-imp nb-vn" data-b="vn">${tex("v_\\theta^{-}=(1+\\beta)\\,v^{\\mathrm{old}}-\\beta\\,v_\\theta")}</div>
          <div class="nb nb-loss nb-lp" data-b="lp">${tex("r_k\\,\\lVert v_\\theta^{+}-v\\rVert_2^2")}<span class="nf-w"><span class="tr"><i></i></span><b></b></span></div>
          <div class="nb nb-loss nb-ln" data-b="ln">${tex("(1-r_k)\\,\\lVert v_\\theta^{-}-v\\rVert_2^2")}<span class="nf-w"><span class="tr"><i></i></span><b></b></span></div>
          <div class="nb nb-sum" data-b="sum">+</div>
          <div class="nb nb-min" data-b="min">${tex("\\min_\\theta")}</div>
          <div class="nb nb-ema" data-b="ema">${tex("\\theta^{\\mathrm{old}}\\leftarrow\\eta_i\\,\\theta^{\\mathrm{old}}+(1-\\eta_i)\\,\\theta")}</div>
          <svg class="nft-wires" viewBox="0 0 ${SW} ${SH}" aria-hidden="true">
            <defs>${[["nf-a", "#c3c9d1"], ["nf-a-on", "#3b82f6"]].map(([id, c]) => `<marker id="${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6L7.4 4L0 7.4z" fill="${c}"/></marker>`).join("")}</defs>
            ${WIRES.map(([id, d]) => `<path data-w="${id}" d="${d}"/>`).join("")}
            <text class="nf-wlab" x="752" y="${DN + 46}">r<tspan baseline-shift="sub" font-size="72%">k</tspan></text>
          </svg>
        </div>
        <div class="nf-paused">${I.icon("pause")}paused</div>
      </div>`;
    const $ = (s) => host.querySelector(s), $$ = (s) => [...host.querySelectorAll(s)];
    const nft = $(".nft"), stage = $(".nft-stage");
    const tiles = $$(".nf-tile"), bars = $$(".nf-bars span"), mean = $(".nf-mean");
    const short = plain("seed"), long = plain("balanced");

    function layout() {
      const W = nft.clientWidth, wide = W >= 700;
      nft.classList.toggle("wide", wide);
      if (!wide) {
        stage.style.transform = "";
        nft.style.height = "";
        $$(".nb").forEach((b) => b.removeAttribute("style"));
        return;
      }
      const k = W / SW;
      stage.style.transform = `scale(${k})`;
      nft.style.height = SH * k + "px";
      $$(".nb").forEach((b) => {
        const [x, y, w, h] = BOX[b.dataset.b];
        Object.assign(b.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
      });
    }

    const on = (...names) => names.forEach((n) => {
      if (n.startsWith("w:")) { const w = host.querySelector(`[data-w="${n.slice(2)}"]`); if (w) w.classList.add("on"); }
      else { const b = host.querySelector(`[data-b="${n}"]`); if (b) b.classList.add("on"); }
    });
    let token = 0, visible = false, paused = false;
    const nap = async (ms) => { await I.sleep(ms); while (paused) await new Promise((r) => setTimeout(r, 120)); };

    function weights(r) {
      [["lp", r], ["ln", 1 - r]].forEach(([b, v]) => {
        const w = host.querySelector(`[data-b="${b}"] .nf-w`);
        w.querySelector("i").style.width = v * 100 + "%";
        w.querySelector("b").textContent = v.toFixed(2);
      });
    }
    function reset(step) {
      const phase = step < STEPS / 2 ? 0 : 1;
      $(".nf-set.short").classList.toggle("on", phase === 0);
      $(".nf-set.long").classList.toggle("on", phase === 1);
      $(".nf-text").textContent = "“" + (phase === 0 ? short : long) + "”";
      tiles.forEach((t) => { t.className = "nf-tile"; t.querySelector("b").textContent = ""; });
      bars.forEach((b) => { b.className = ""; b.querySelector("i").style.height = "0%"; });
      mean.style.opacity = 0;
      $$(".nb.on, .nft-wires path.on").forEach((n) => n.classList.remove("on"));
      $(".nf-xtile").classList.remove("in");
      weights(0.5);
      $$(".nf-w").forEach((w) => w.classList.remove("in"));
      $(".nf-fill").style.width = (step / STEPS) * 100 + "%";
    }
    /* the state at the end of a step, without animation (first paint, reduced motion) */
    function still(step) {
      reset(step);
      const g = GRADES[step], mu = g.reduce((a, b) => a + b, 0) / G, r = rewards(g), k = PICK[step];
      tiles.forEach((t, i) => { t.classList.add("in", "scored", g[i] > mu ? "pos" : "neg"); t.querySelector("b").textContent = g[i]; });
      tiles[k].classList.add("pick");
      bars.forEach((b, i) => { b.querySelector("i").style.height = g[i] * 10 + "%"; b.classList.add(g[i] > mu ? "pos" : "neg"); });
      mean.style.bottom = mu * 10 + "%"; mean.style.opacity = 1;
      $(".nf-xtile").style.setProperty("--h", HUE[k]);
      $(".nf-xtile").classList.add("in");
      weights(r[k]);
      $$(".nf-w").forEach((w) => w.classList.add("in"));
    }

    async function run() {
      const my = ++token;
      const alive = () => my === token && visible;
      for (let step = 0; ; step = (step + 1) % STEPS) {
        reset(step);
        if (step === STEPS / 2) {
          $(".nb-prompt").classList.add("resetting");
          await nap(1300);
          $(".nb-prompt").classList.remove("resetting");
        }
        if (step === 0) await nap(400);
        if (!alive()) return;
        const g = GRADES[step], mu = g.reduce((a, b) => a + b, 0) / G, r = rewards(g), k = PICK[step];
        // rollouts from pi_old
        on("prompt", "w:prompt", "roll");
        for (let i = 0; i < G; i++) { tiles[i].classList.add("in"); await nap(50); }
        await nap(200);
        if (!alive()) return;
        // PromptScore grades, then rewards normalized within the group
        on("score");
        for (let i = 0; i < G; i++) { tiles[i].querySelector("b").textContent = g[i]; tiles[i].classList.add("scored"); await nap(40); }
        bars.forEach((b, i) => { b.querySelector("i").style.height = g[i] * 10 + "%"; });
        await nap(450);
        mean.style.bottom = mu * 10 + "%";
        mean.style.opacity = 1;
        await nap(300);
        bars.forEach((b, i) => b.classList.add(g[i] > mu ? "pos" : g[i] < mu ? "neg" : "mid"));
        tiles.forEach((t, i) => t.classList.add(g[i] > mu ? "pos" : g[i] < mu ? "neg" : "mid"));
        on("rk");
        await nap(650);
        if (!alive()) return;
        // one sample through the forward process
        tiles[k].classList.add("pick");
        $(".nf-xtile").style.setProperty("--h", HUE[k]);
        on("w:roll-xt", "xt");
        $(".nf-xtile").classList.add("in");
        await nap(650);
        // the two velocities, then the implicit policies
        on("w:xt-vth", "w:xt-vold", "vth", "vold");
        await nap(550);
        on("w:vth-vp", "w:vth-vn", "w:vold-vp", "w:vold-vn", "vp", "vn");
        await nap(650);
        if (!alive()) return;
        // weighted regression to v, with this sample's reward
        weights(r[k]);
        on("w:vp-lp", "w:vn-ln", "w:rk", "lp", "ln");
        $$(".nf-w").forEach((w) => w.classList.add("in"));
        await nap(800);
        on("w:lp-sum", "w:ln-sum", "sum", "min");
        await nap(500);
        // the EMA weights follow theta; the next step samples from them
        on("w:ema", "ema");
        $(".nf-fill").style.width = ((step + 1) / STEPS) * 100 + "%";
        await nap(1300);
        if (!alive()) return;
        if (step === STEPS - 1) await nap(900);
      }
    }

    // hovering pauses the animation (a tap toggles it on touch screens)
    const setPaused = (p) => { paused = p; nft.classList.toggle("paused", p); };
    I.interactEl(nft, { enter() { setPaused(true); }, leave() { setPaused(false); } });

    new IntersectionObserver((es) => es.forEach((e) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && el.classList.contains("seen")) run();
      if (!visible) token++;
    }), { threshold: 0.2 }).observe(el);

    layout();
    still(STEPS - 1);
    return {
      play: () => { visible = true; layout(); if (I.reduced) return; run(); },
      resize: layout,
    };
  });
})();
