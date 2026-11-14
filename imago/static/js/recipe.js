/* The recipe at a glance: one Imago training step, animated while the figure is in view.
   Rollout (G = 12 samples from the EMA generator, no CFG) -> PromptScore grades -> group normalization ->
   DiffusionNFT update; halfway through, the prompts switch from Imago-Short to Imago-Long and the optimizer
   and EMA weights are reset (Appendix B of the paper). Grades shown are illustrative. */
(function () {
  "use strict";
  const I = window.Imago, Q = I.P.qual;
  const G = 12, STEPS = 8;
  // illustrative grades for the 8 animated steps, 12 rollouts each
  const GRADES = [
    [5, 7, 4, 6, 8, 3, 6, 5, 7, 4, 6, 5], [6, 4, 7, 5, 8, 6, 3, 7, 5, 6, 7, 4], [6, 8, 5, 7, 4, 7, 6, 8, 5, 6, 7, 6], [7, 5, 8, 6, 7, 4, 8, 6, 7, 5, 8, 6],
    [4, 6, 3, 5, 7, 5, 4, 6, 3, 5, 6, 4], [5, 7, 4, 6, 5, 8, 6, 4, 7, 5, 6, 5], [6, 5, 7, 8, 6, 4, 7, 6, 8, 5, 6, 7], [7, 6, 8, 5, 7, 8, 6, 7, 5, 8, 7, 6],
  ];
  const plain = (key) => Q.designs.find((d) => d.key === key).segments.map((s) => s.t).join("");

  I.register("recipe", (el) => {
    const host = el.querySelector(".chart");
    const hue = (i) => [212, 28, 140, 265, 190, 340, 48, 160, 230, 10, 95, 300][i];
    host.innerHTML = `
      <div class="rc">
        <div class="rc-col rc-corpus">
          <div class="rc-h">Prompts</div>
          <div class="rc-sets">
            <div class="rc-set short"><b><i>Imago</i>-Short</b><span>150K prompts · ~30 words</span></div>
            <div class="rc-set long"><b><i>Imago</i>-Long</b><span>150K prompts · ~200 words</span></div>
          </div>
          <div class="rc-time">
            <div class="rc-track"><span class="rc-fill"></span><span class="rc-mid"></span></div>
            <div class="rc-tl"><span>first half</span><span>second half</span></div>
            <div class="rc-reset">optimizer and EMA reset</div>
          </div>
          <p class="rc-prompt"></p>
        </div>
        <div class="rc-arrow" data-a="1"><i></i></div>
        <div class="rc-col rc-rollout">
          <div class="rc-h">Rollouts</div>
          <div class="rc-sub">EMA generator, <i>G</i> = 12 samples, no CFG</div>
          <div class="rc-tiles">${Array.from({ length: G }, (_, i) => `<div class="rc-tile" style="--h:${hue(i)}"><i></i><b></b></div>`).join("")}</div>
        </div>
        <div class="rc-arrow" data-a="2"><i></i></div>
        <div class="rc-col rc-reward">
          <div class="rc-h">PromptScore</div>
          <div class="rc-sub">frozen Qwen3.5-9B grades each sample 1–10</div>
          <div class="rc-bars">${Array.from({ length: G }, () => `<span><i></i></span>`).join("")}<em class="rc-mean"></em></div>
          <div class="rc-cap">grades normalized within the group: <i>r<sub>k</sub></i></div>
        </div>
        <div class="rc-arrow" data-a="3"><i></i></div>
        <div class="rc-col rc-update">
          <div class="rc-h">DiffusionNFT update</div>
          <div class="rc-sub">LoRA adapters, no KL regularization</div>
          <div class="rc-vel pos">positive velocity target, weight <i>r<sub>k</sub></i></div>
          <div class="rc-vel neg">negative velocity target, weight&nbsp;1&nbsp;−&nbsp;<i>r<sub>k</sub></i></div>
          <div class="rc-ema">soft EMA update of the sampling generator</div>
        </div>
        <svg class="rc-loop" aria-hidden="true"></svg>
        <div class="rc-loop-lab">next step, with the updated generator</div>
      </div>`;
    const $ = (s) => host.querySelector(s), $$ = (s) => [...host.querySelectorAll(s)];

    // the dashed loop from the update back to the rollouts, in pixels of the current layout
    function placeLoop() {
      const rc = $(".rc"), svg = $(".rc-loop"), lab = $(".rc-loop-lab");
      const wide = getComputedStyle(rc).gridTemplateColumns.split(" ").length > 1;
      svg.style.display = lab.style.display = wide ? "" : "none";
      if (!wide) return;
      const box = rc.getBoundingClientRect();
      const a = $(".rc-rollout").getBoundingClientRect(), b = $(".rc-update").getBoundingClientRect();
      const x0 = a.left + a.width / 2 - box.left, x1 = b.left + b.width / 2 - box.left;
      const top = Math.max(a.bottom, b.bottom, $(".rc-reward").getBoundingClientRect().bottom) - box.top + 8;
      const h = 30, w = x1 - x0;
      svg.setAttribute("width", w + 12); svg.setAttribute("height", h + 4);
      svg.style.left = x0 - 6 + "px"; svg.style.top = top + "px";
      svg.innerHTML = `<path d="M${w + 6} 0 V${h - 8} Q${w + 6} ${h} ${w - 2} ${h} H14 Q6 ${h} 6 ${h - 8} V8" fill="none"/><path class="hd" d="M1 9 L6 1 L11 9 Z"/>`;
      lab.style.left = x0 + w / 2 + "px"; lab.style.top = top + h - 7 + "px";
      rc.style.paddingBottom = h + 16 + "px";
    }
    const tiles = $$(".rc-tile"), bars = $$(".rc-bars span"), mean = $(".rc-mean");
    const short = plain("seed"), long = plain("balanced");
    let token = 0, visible = false;

    function reset(step) {
      const phase = step < STEPS / 2 ? 0 : 1;
      $(".rc-set.short").classList.toggle("on", phase === 0);
      $(".rc-set.long").classList.toggle("on", phase === 1);
      $(".rc-prompt").textContent = "“" + (phase === 0 ? short : long) + "”";
      $(".rc-prompt").classList.toggle("long", phase === 1);
      tiles.forEach((t) => { t.className = "rc-tile"; t.querySelector("b").textContent = ""; });
      bars.forEach((b) => { b.className = ""; b.querySelector("i").style.height = "0%"; });
      mean.style.opacity = 0;
      $$(".rc-vel, .rc-ema, .rc-arrow, .rc-loop, .rc-loop-lab").forEach((n) => n.classList.remove("on"));
      $(".rc-fill").style.width = (step / STEPS) * 100 + "%";
    }

    async function run() {
      const my = ++token;
      const alive = () => my === token && visible;
      for (let step = 0; ; step = (step + 1) % STEPS) {
        reset(step);
        if (step === STEPS / 2) {
          $(".rc-reset").classList.add("on");
          await I.sleep(1300);
          $(".rc-reset").classList.remove("on");
        }
        if (step === 0) await I.sleep(500);
        if (!alive()) return;
        const g = GRADES[step], mu = g.reduce((a, b) => a + b, 0) / G;
        $(".rc-arrow[data-a='1']").classList.add("on");
        for (let i = 0; i < G; i++) { tiles[i].classList.add("in"); await I.sleep(55); }
        await I.sleep(250);
        if (!alive()) return;
        $(".rc-arrow[data-a='2']").classList.add("on");
        for (let i = 0; i < G; i++) { tiles[i].querySelector("b").textContent = g[i]; tiles[i].classList.add("scored"); await I.sleep(45); }
        bars.forEach((b, i) => { b.querySelector("i").style.height = g[i] * 10 + "%"; });
        await I.sleep(500);
        mean.style.bottom = mu * 10 + "%";
        mean.style.opacity = 1;
        await I.sleep(350);
        bars.forEach((b, i) => b.classList.add(g[i] > mu ? "pos" : g[i] < mu ? "neg" : "mid"));
        tiles.forEach((t, i) => t.classList.add(g[i] > mu ? "pos" : g[i] < mu ? "neg" : "mid"));
        await I.sleep(650);
        if (!alive()) return;
        $(".rc-arrow[data-a='3']").classList.add("on");
        $(".rc-vel.pos").classList.add("on");
        await I.sleep(250);
        $(".rc-vel.neg").classList.add("on");
        await I.sleep(450);
        $(".rc-ema").classList.add("on");
        $(".rc-loop").classList.add("on");
        $(".rc-loop-lab").classList.add("on");
        $(".rc-fill").style.width = ((step + 1) / STEPS) * 100 + "%";
        await I.sleep(1200);
        if (!alive()) return;
        if (step === STEPS - 1) await I.sleep(900);
      }
    }

    new IntersectionObserver((es) => es.forEach((e) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && el.classList.contains("seen")) run();
      if (!visible) token++;
    }), { threshold: 0.2 }).observe(el);

    reset(STEPS - 1);
    {
      const g = GRADES[STEPS - 1], mu = g.reduce((a, b) => a + b, 0) / G;
      tiles.forEach((t, i) => { t.classList.add("in", "scored", g[i] > mu ? "pos" : "neg"); t.querySelector("b").textContent = g[i]; });
      bars.forEach((b, i) => { b.querySelector("i").style.height = g[i] * 10 + "%"; b.classList.add(g[i] > mu ? "pos" : "neg"); });
      mean.style.bottom = mu * 10 + "%"; mean.style.opacity = 1;
    }
    placeLoop();
    return {
      play: () => { visible = true; placeLoop(); if (I.reduced) return; run(); },
      resize: placeLoop,
    };
  });
})();
