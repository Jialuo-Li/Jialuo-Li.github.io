/* ==========================================================================
   ANIMATED SVG FIGURES (INSPIRED BY UNBUNDLING.GITHUB.IO, TAILORED TO IMAGO)
   1. #teaser-anim   — Hero 3-Pillar Research Question & Finding Animation
   2. #pipeline-anim — §5.1 Imago Two-Stage RL Pipeline & DiffusionNFT Loop
   Supports viewport scroll-trigger, Replay button, click-to-jump, responsive
   wide/mobile layouts, and prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const outCubic = (x) => 1 - Math.pow(1 - x, 3);
  const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const r1 = (v) => Math.round(v * 10) / 10;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const reduceMotion =
    new URLSearchParams(location.search).has("static") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function grp(body, o = {}) {
    const op = o.o == null ? 1 : o.o;
    if (op <= 0.004 || !body) return "";
    const dx = o.x || 0;
    const dy = o.y || 0;
    const sc = o.s == null ? 1 : o.s;
    let tr = "";
    if (sc !== 1) {
      const cx = o.cx || 0, cy = o.cy || 0;
      tr = ` transform="translate(${r1(dx + cx)} ${r1(dy + cy)}) scale(${sc.toFixed(3)}) translate(${r1(-cx)} ${r1(-cy)})"`;
    } else if (dx || dy) {
      tr = ` transform="translate(${r1(dx)} ${r1(dy)})"`;
    }
    return `<g${op < 0.999 ? ` opacity="${op.toFixed(3)}"` : ""}${tr}>${body}</g>`;
  }

  function checkBadge(cx, cy, r, prog) {
    if (prog <= 0.01) return "";
    const sc = 0.65 + 0.35 * outCubic(prog);
    const body =
      `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="#2563eb"/>` +
      `<path d="M${r1(cx - r * 0.42)},${r1(cy + r * 0.03)} l${r1(r * 0.3)},${r1(r * 0.3)} l${r1(r * 0.56)},${r1(-r * 0.6)}" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`;
    return grp(body, { o: prog, s: sc, cx, cy });
  }

  function crossBadge(cx, cy, r, prog) {
    if (prog <= 0.01) return "";
    const d = r * 0.34;
    const body =
      `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="#fee2e2" stroke="#fca5a5" stroke-width="1.2"/>` +
      `<path d="M${r1(cx - d)},${r1(cy - d)} L${r1(cx + d)},${r1(cy + d)} M${r1(cx + d)},${r1(cy - d)} L${r1(cx - d)},${r1(cy + d)}" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"/>`;
    return grp(body, { o: prog });
  }

  /* ------------------------------------------------------------------------
     1. HERO TEASER ANIMATION: Controlled Setup + 3 Core Questions Answered
     ------------------------------------------------------------------------ */
  const PILLARS = [
    {
      sec: "§4",
      href: "#reward",
      q: "What reward signal guides RL?",
      baseTitle: "Preference / Strict Binary",
      baseSub: "HPSv3 hacks subjects · Binary = 0 on long",
      baseBar: 0.34,
      baseVal: "−5.2%",
      oursTitle: "PromptScore (Graded 1–10)",
      oursSub: "Zero-shot Qwen3.5-9B rubric s / 10",
      oursBar: 0.94,
      oursVal: "r = 0.98",
      ans: "Zero-shot graded MLLM reward wins.",
    },
    {
      sec: "§5",
      href: "#corpus",
      q: "How should prompts be structured?",
      baseTitle: "Single-Axis Expansion",
      baseSub: "Entity / Attribute / Relation skewed",
      baseBar: 0.56,
      baseVal: "+5.8%",
      oursTitle: "Balanced Scene-Graph",
      oursSub: "150K Short + 150K Balanced Long",
      oursBar: 0.91,
      oursVal: "+6.8%",
      ans: "Balanced scene-graph density is key.",
    },
    {
      sec: "§6",
      href: "#imago",
      q: "How should lengths be scheduled?",
      baseTitle: "Single-Length or Joint Mix",
      baseSub: "Early gradient conflict on 200w scenes",
      baseBar: 0.68,
      baseVal: "+7.5%",
      oursTitle: "Sequential Short → Long",
      oursSub: "Local binding first, global layout next",
      oursBar: 0.96,
      oursVal: "+8.7%",
      ans: "Curriculum matures 4B & 6B models.",
    },
  ];

  function drawTeaserFrame(t, mobile) {
    const W = mobile ? 460 : 970;
    const H = mobile ? 758 : 408;

    const stripP = outCubic(seg(t, 0.0, 0.55));
    const controls = [
      ["RL Engine", "DiffusionNFT"],
      ["Backbones", "FLUX.2-4B & Z-Image"],
      ["Suite", "7 Comp. Benchmarks"],
      ["Judge", "Qwen3.5-27B + PickScore"],
    ];

    let stripSvg = "";
    if (!mobile) {
      let pills = "";
      controls.forEach(([k, v], i) => {
        const x = 198 + i * 190;
        pills += `<g transform="translate(${x} 16)">
          <rect x="0" y="0" width="178" height="34" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2"/>
          <text x="11" y="14" font-size="9.5" font-weight="700" fill="#64748b" letter-spacing="0.05em">${esc(k.toUpperCase())}</text>
          <text x="11" y="27" font-size="11.5" font-weight="650" fill="#1e293b">${esc(v)}</text>
        </g>`;
      });
      stripSvg = grp(
        `<text x="22" y="30" font-size="12" font-weight="700" fill="#1d4ed8" font-family="JetBrains Mono, monospace">§3 CONTROLLED</text>
         <text x="22" y="45" font-size="11.5" font-weight="500" fill="#64748b">Fixed RL testbed</text>
         <line x1="176" y1="16" x2="176" y2="50" stroke="#cbd5e1" stroke-width="1.4"/>
         ${pills}
         <line x1="18" y1="64" x2="${W - 18}" y2="64" stroke="#e2e8f0" stroke-width="1.2"/>`,
        { o: stripP, y: (1 - stripP) * -6 }
      );
    } else {
      let pills = "";
      controls.forEach(([k, v], i) => {
        const x = 16 + (i % 2) * 218;
        const y = 38 + Math.floor(i / 2) * 38;
        pills += `<g transform="translate(${x} ${y})">
          <rect x="0" y="0" width="210" height="32" rx="7" fill="#f8fafc" stroke="#e2e8f0"/>
          <text x="9" y="13" font-size="8.8" font-weight="700" fill="#64748b">${esc(k.toUpperCase())}</text>
          <text x="9" y="25" font-size="11" font-weight="650" fill="#1e293b">${esc(v)}</text>
        </g>`;
      });
      stripSvg = grp(
        `<text x="18" y="26" font-size="11.5" font-weight="700" fill="#1d4ed8" font-family="JetBrains Mono, monospace">§3 CONTROLLED RL TESTBED</text>
         ${pills}
         <line x1="16" y1="122" x2="${W - 16}" y2="122" stroke="#e2e8f0" stroke-width="1.2"/>`,
        { o: stripP }
      );
    }

    let colsSvg = "";
    PILLARS.forEach((p, idx) => {
      const start = 0.45 + idx * 1.15;
      const cardIn = outCubic(seg(t, start, start + 0.55));
      const ansIn = inOutCubic(seg(t, start + 0.55, start + 1.05));

      const cw = mobile ? W - 32 : 298;
      const cx = mobile ? 16 : 20 + idx * 316;
      const cy = mobile ? 136 + idx * 204 : 78;

      const barMax = cw - 98;
      const bW = r1(barMax * p.baseBar * cardIn);
      const oW = r1(barMax * (0.25 + 0.75 * ansIn) * p.oursBar);

      const divider =
        !mobile && idx > 0
          ? `<line x1="${cx - 9}" y1="84" x2="${cx - 9}" y2="${H - 18}" stroke="#eef2f6" stroke-width="1.3"/>`
          : mobile && idx > 0
          ? `<line x1="16" y1="${cy - 10}" x2="${W - 16}" y2="${cy - 10}" stroke="#eef2f6" stroke-width="1.3"/>`
          : "";

      const oursBorder = ansIn > 0.1 ? "#2563eb" : "#cbd5e1";
      const oursBg = ansIn > 0.1 ? "#eff6ff" : "#f8fafc";

      const colBody = `
        <a href="${p.href}" style="text-decoration:none">
          <g transform="translate(${cx} ${cy})" style="cursor:pointer">
            <rect x="0" y="0" width="34" height="20" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
            <text x="17" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#1d4ed8" font-family="JetBrains Mono, monospace">${p.sec}</text>
            <text x="42" y="15" font-size="14" font-weight="700" fill="#0f172a" font-family="Newsreader, Georgia, serif">${esc(p.q)}</text>

            <!-- Baseline option card -->
            <g transform="translate(0 ${mobile ? 28 : 34})">
              <rect x="0" y="0" width="${cw}" height="${mobile ? 62 : 98}" rx="10" fill="#fafafa" stroke="#e2e8f0" stroke-width="1.3"/>
              <text x="13" y="21" font-size="12.5" font-weight="650" fill="#334155">${esc(p.baseTitle)}</text>
              <text x="13" y="38" font-size="10.8" fill="#64748b">${esc(p.baseSub)}</text>
              ${
                !mobile
                  ? `<rect x="13" y="56" width="${barMax}" height="9" rx="4.5" fill="#e2e8f0"/>
                     <rect x="13" y="56" width="${bW}" height="9" rx="4.5" fill="#94a3b8"/>
                     <text x="${20 + barMax}" y="64" font-size="11" font-weight="700" fill="#64748b" font-family="JetBrains Mono, monospace">${esc(p.baseVal)}</text>`
                  : ""
              }
              ${crossBadge(cw - 20, 21, 9.5, ansIn)}
            </g>

            <!-- Imago winning option card -->
            <g transform="translate(0 ${mobile ? 98 : 144})">
              <rect x="0" y="0" width="${cw}" height="${mobile ? 66 : 108}" rx="10" fill="${oursBg}" stroke="${oursBorder}" stroke-width="${(1.3 + 0.9 * ansIn).toFixed(2)}"/>
              <text x="13" y="22" font-size="13" font-weight="700" fill="#1e3a8a">${esc(p.oursTitle)}</text>
              <text x="13" y="40" font-size="10.8" fill="#3b5998">${esc(p.oursSub)}</text>
              ${
                !mobile
                  ? `<rect x="13" y="60" width="${barMax}" height="10" rx="5" fill="#dbeafe"/>
                     <rect x="13" y="60" width="${oW}" height="10" rx="5" fill="#2563eb"/>
                     <text x="${20 + barMax}" y="69" font-size="11.2" font-weight="700" fill="#1d4ed8" font-family="JetBrains Mono, monospace">${esc(p.oursVal)}</text>`
                  : `<text x="${cw - 42}" y="42" text-anchor="end" font-size="11" font-weight="700" fill="#1d4ed8" font-family="JetBrains Mono, monospace">${esc(p.oursVal)}</text>`
              }
              ${checkBadge(cw - 20, 22, 10, ansIn)}
            </g>

            <!-- Bottom Answer Banner -->
            ${grp(
              `<g transform="translate(0 ${mobile ? 172 : 268})">
                 <rect x="0" y="0" width="${cw}" height="${mobile ? 24 : 36}" rx="8" fill="#f3f6f5" stroke="#1c4e42" stroke-width="1.2"/>
                 <text x="${cw / 2}" y="${mobile ? 16 : 23}" text-anchor="middle" font-size="${mobile ? 11.5 : 12.6}" font-weight="700" fill="#133930">${esc(p.ans)}</text>
               </g>`,
              { o: ansIn, y: (1 - ansIn) * 6 }
            )}
          </g>
        </a>`;

      colsSvg += divider + grp(colBody, { o: cardIn, y: (1 - cardIn) * 10 });
    });

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Imago three-part research overview">${stripSvg}${colsSvg}</svg>`;
  }

  /* ------------------------------------------------------------------------
     2. §5.1 IMAGO PIPELINE SCHEMATIC ANIMATION
     ------------------------------------------------------------------------ */
  function drawPipelineFrame(t, mobile) {
    const W = mobile ? 460 : 970;
    const H = mobile ? 430 : 252;

    const p1 = outCubic(seg(t, 0.0, 0.7));
    const p2 = outCubic(seg(t, 0.55, 1.35));
    const p3 = outCubic(seg(t, 1.15, 1.95));
    const p4 = outCubic(seg(t, 1.75, 2.5));

    const defs = `<defs>
      <marker id="arr-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,1 L9,5 L0,9 z" fill="#2563eb"/>
      </marker>
      <marker id="arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,1 L9,5 L0,9 z" fill="#1c4e42"/>
      </marker>
    </defs>`;

    if (mobile) {
      const box = (y, tag, title, sub, bg, stroke, op) =>
        grp(
          `<g transform="translate(18 ${y})">
             <rect x="0" y="0" width="${W - 36}" height="82" rx="11" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
             <text x="14" y="22" font-size="10" font-weight="700" fill="${stroke}" font-family="JetBrains Mono, monospace">${esc(tag)}</text>
             <text x="14" y="44" font-size="14" font-weight="700" fill="#0f172a">${esc(title)}</text>
             <text x="14" y="64" font-size="11.2" fill="#475569">${esc(sub)}</text>
           </g>`,
          { o: op, y: (1 - op) * 8 }
        );
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Imago RL training pipeline">
        ${defs}
        ${box(12, "STAGE 1 · SHORT BINDING", "Imago-Short (150K · ~30 words)", "Establishes clean local attribute & spatial binding", "#fdf2f8", "#be185d", p1)}
        ${box(110, "STAGE 2 · SCENE EXPANSION", "Imago-Long (150K · ~200 words)", "Balanced scene-graph entities, attributes & relations", "#eff6ff", "#2563eb", p2)}
        ${box(208, "ONLINE RL · DIFFUSIONNFT", "G = 12 Rollouts · CFG = 1.0 · KL = 0", "PromptScore (Qwen3.5-9B) group-normalized advantage", "#f8fafc", "#334155", p3)}
        ${box(306, "MATURED MODELS", "Imago-4B (+8.7%) & Imago-6B (+5.0%)", "LoRA r = 256 · High-noise t ∈ [0.5, 1.0]", "#f3f6f5", "#1c4e42", p4)}
      </svg>`;
    }

    const stageCorpus = grp(
      `<g transform="translate(18 22)">
         <rect x="0" y="0" width="224" height="94" rx="12" fill="#fdf2f8" stroke="#f472b6" stroke-width="1.5"/>
         <text x="14" y="23" font-size="10" font-weight="700" fill="#be185d" font-family="JetBrains Mono, monospace">STAGE 1 · LOCAL BINDING</text>
         <text x="14" y="45" font-size="14" font-weight="700" fill="#0f172a">Imago-Short (150K)</text>
         <text x="14" y="64" font-size="11.2" fill="#475569">~30 words · Grounded Fine-T2I</text>
         <text x="14" y="81" font-size="10.5" fill="#64748b">500 / 300 steps · Fast attribution</text>
       </g>
       <path d="M130,118 L130,134" stroke="#2563eb" stroke-width="2" marker-end="url(#arr-blue)"/>
       <g transform="translate(18 138)">
         <rect x="0" y="0" width="224" height="94" rx="12" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.7"/>
         <text x="14" y="23" font-size="10" font-weight="700" fill="#1d4ed8" font-family="JetBrains Mono, monospace">STAGE 2 · SCENE EXPANSION</text>
         <text x="14" y="45" font-size="14" font-weight="700" fill="#0f172a">Imago-Long (150K)</text>
         <text x="14" y="64" font-size="11.2" fill="#334155">~200 words · Balanced scene-graph</text>
         <text x="14" y="81" font-size="10.5" fill="#475569">Midpoint EMA &amp; AdamW reset</text>
       </g>`,
      { o: p1, x: (1 - p1) * -10 }
    );

    const rolloutBox = grp(
      `<path d="M244,126 L278,126" stroke="#2563eb" stroke-width="2.2" marker-end="url(#arr-blue)"/>
       <g transform="translate(284 22)">
         <rect x="0" y="0" width="214" height="210" rx="13" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.6"/>
         <text x="15" y="25" font-size="10" font-weight="700" fill="#475569" font-family="JetBrains Mono, monospace">EXPLORATION ROLLOUT</text>
         <text x="15" y="47" font-size="14.2" font-weight="700" fill="#0f172a">Flow Policy π_θ</text>
         <rect x="15" y="60" width="184" height="38" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
         <text x="25" y="77" font-size="11.2" font-weight="650" fill="#1e293b">G = 12 Samples / Prompt</text>
         <text x="25" y="91" font-size="10.2" fill="#64748b">512×512 · LoRA r = 256</text>
         <rect x="15" y="108" width="184" height="40" rx="8" fill="#f0fdf4" stroke="#bbf7d0"/>
         <text x="25" y="125" font-size="11.2" font-weight="650" fill="#166534">CFG = 1.0 · Explicit KL = 0</text>
         <text x="25" y="140" font-size="10.2" fill="#15803d">Unconstrained exploration</text>
         <rect x="15" y="158" width="184" height="38" rx="8" fill="#eff6ff" stroke="#bfdbfe"/>
         <text x="25" y="175" font-size="11.2" font-weight="650" fill="#1e40af">High-Noise Window</text>
         <text x="25" y="189" font-size="10.2" fill="#1d4ed8">N_train = 2 in t ∈ [0.5, 1.0]</text>
       </g>`,
      { o: p2, y: (1 - p2) * 8 }
    );

    const rewardBox = grp(
      `<path d="M500,90 L534,90" stroke="#2563eb" stroke-width="2.2" marker-end="url(#arr-blue)"/>
       <path d="M534,166 L500,166" stroke="#2563eb" stroke-width="2.2" stroke-dasharray="4 3" marker-end="url(#arr-blue)"/>
       <g transform="translate(540 22)">
         <rect x="0" y="0" width="206" height="210" rx="13" fill="#eff6ff" stroke="#2563eb" stroke-width="1.8"/>
         <text x="15" y="25" font-size="10" font-weight="700" fill="#1d4ed8" font-family="JetBrains Mono, monospace">ZERO-SHOT REWARD</text>
         <text x="15" y="47" font-size="14.5" font-weight="700" fill="#1e3a8a">PromptScore</text>
         <text x="15" y="65" font-size="11" fill="#3b5998">Frozen Qwen3.5-9B rubric</text>
         <rect x="15" y="78" width="176" height="48" rx="8" fill="#ffffff" stroke="#bfdbfe"/>
         <text x="103" y="99" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a" font-family="Newsreader, Georgia, serif">r_PS(x, c) = s / 10</text>
         <text x="103" y="116" text-anchor="middle" font-size="10" fill="#64748b">Graded rubric s ∈ {1, ..., 10}</text>
         <rect x="15" y="138" width="176" height="56" rx="8" fill="#ffffff" stroke="#bfdbfe"/>
         <text x="25" y="157" font-size="11" font-weight="650" fill="#1e293b">DiffusionNFT Objective</text>
         <text x="25" y="173" font-size="10.2" fill="#475569">Group-normalized advantage</text>
         <text x="25" y="187" font-size="10.2" fill="#475569">Pos vs. Neg velocity targets</text>
       </g>`,
      { o: p3, y: (1 - p3) * 8 }
    );

    const outBox = grp(
      `<path d="M748,126 L780,126" stroke="#1c4e42" stroke-width="2.3" marker-end="url(#arr-teal)"/>
       <g transform="translate(786 22)">
         <rect x="0" y="0" width="166" height="210" rx="13" fill="#f3f6f5" stroke="#1c4e42" stroke-width="1.8"/>
         <text x="14" y="25" font-size="10" font-weight="700" fill="#1c4e42" font-family="JetBrains Mono, monospace">MATURED POLICIES</text>
         <rect x="14" y="40" width="138" height="74" rx="9" fill="#ffffff" stroke="#cbd5e1"/>
         <text x="24" y="60" font-size="13.5" font-weight="700" fill="#0f172a">Imago-4B</text>
         <text x="24" y="77" font-size="11" font-weight="700" fill="#15803d">+8.7% Comp. Gain</text>
         <text x="24" y="94" font-size="10" fill="#64748b">8×B200 · Pick 22.92</text>

         <rect x="14" y="124" width="138" height="74" rx="9" fill="#ffffff" stroke="#cbd5e1"/>
         <text x="24" y="144" font-size="13.5" font-weight="700" fill="#0f172a">Imago-6B</text>
         <text x="24" y="161" font-size="11" font-weight="700" fill="#15803d">+5.0% Comp. Gain</text>
         <text x="24" y="178" font-size="10" fill="#64748b">Beats 32B · Pick 23.08</text>
       </g>`,
      { o: p4, x: (1 - p4) * 10 }
    );

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Imago Stage 1 to Stage 2 DiffusionNFT RL pipeline">${defs}${stageCorpus}${rolloutBox}${rewardBox}${outBox}</svg>`;
  }

  /* ------------------------------------------------------------------------
     ANIMATION PLAYER CONTROLLER
     ------------------------------------------------------------------------ */
  function createPlayer(hostId, replayBtnId, duration, drawFn) {
    const host = document.getElementById(hostId);
    if (!host) return;
    let raf = null;
    let startTs = null;
    let played = false;
    let curT = reduceMotion ? duration : 0;

    const isMobile = () => host.clientWidth < 680;
    const render = (t) => {
      curT = t;
      host.innerHTML = drawFn(t, isMobile());
    };

    function play() {
      if (raf) cancelAnimationFrame(raf);
      if (reduceMotion) {
        render(duration);
        played = true;
        return;
      }
      startTs = null;
      const step = (ts) => {
        if (!startTs) startTs = ts;
        const elapsed = (ts - startTs) / 1000;
        if (elapsed >= duration) {
          render(duration);
          raf = null;
          played = true;
          return;
        }
        render(elapsed);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    render(reduceMotion ? duration : 0.01);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && !played) {
            played = true;
            play();
          }
        });
      },
      { threshold: 0.28 }
    );
    io.observe(host);

    const btn = document.getElementById(replayBtnId);
    if (btn) btn.addEventListener("click", () => play());

    let lastMobile = isMobile();
    new ResizeObserver(() => {
      const m = isMobile();
      if (m !== lastMobile) {
        lastMobile = m;
        render(played ? duration : curT);
      }
    }).observe(host);
  }

  window.ImagoAnim = {
    init() {
      createPlayer("teaser-anim", "btn-replay-teaser", 4.1, drawTeaserFrame);
      createPlayer("pipeline-anim", "btn-replay-pipeline", 2.6, drawPipelineFrame);
    },
  };
})();
