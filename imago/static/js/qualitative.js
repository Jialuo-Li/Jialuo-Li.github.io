/* ==========================================================================
   QUALITATIVE STUDIOS & BEFORE/AFTER VISUAL INTERACTIVES
   --------------------------------------------------------------------------
   - #studio-reward-hack : §3.1 Fig. 4 Reward Hacking Filmstrip + Split Slider
   - #studio-prompt      : §4.1 Fig. 7 Scene-Graph Primitive Highlighter
   - #studio-comp        : §5.2 Fig. 10 Compositional Sliders + Diagnostic Boxes
   - #studio-appeal      : §5.2 Fig. 11 & 12 4B / 6B Artistic Appeal Gallery
   ========================================================================== */
(function () {
  "use strict";

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  /* Shared Before/After Pointer Drag Wire-up */
  function bindSliders(root) {
    root.querySelectorAll(".ba-slider").forEach((slider) => {
      if (slider.dataset.bound) return;
      slider.dataset.bound = "1";
      let dragging = false;

      const setPct = (clientX) => {
        const rect = slider.getBoundingClientRect();
        const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
        slider.style.setProperty("--pos", `${pct.toFixed(2)}%`);
      };

      slider.addEventListener("pointerdown", (ev) => {
        if (ev.target.closest("button")) return;
        dragging = true;
        slider.setPointerCapture(ev.pointerId);
        setPct(ev.clientX);
      });
      slider.addEventListener("pointermove", (ev) => {
        if (dragging) setPct(ev.clientX);
      });
      const stop = () => {
        dragging = false;
      };
      slider.addEventListener("pointerup", stop);
      slider.addEventListener("pointercancel", stop);
    });
  }

  /* Global Lightbox */
  let lbEl = null;
  function openLightbox(item, baseLabel, oursLabel) {
    if (!lbEl) {
      lbEl = document.createElement("div");
      lbEl.className = "lightbox";
      document.body.appendChild(lbEl);
      lbEl.addEventListener("click", (ev) => {
        if (ev.target === lbEl || ev.target.closest(".lb-close")) {
          lbEl.classList.remove("open");
        }
      });
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && lbEl.classList.contains("open")) lbEl.classList.remove("open");
      });
    }
    lbEl.innerHTML = `
      <div class="lb-card">
        <div class="lb-head">
          <div>
            <strong style="font-size:15px">${esc(item.title)}</strong>
            <span style="font-size:12px;color:#64748b;margin-left:8px">${esc(item.tag || item.aspect || "")} · Side-by-Side Inspection</span>
          </div>
          <button type="button" class="lb-close">✕ Close</button>
        </div>
        <div class="lb-pair">
          <div class="lb-col">
            <img src="${item.baseImg || item.base}" alt="${esc(baseLabel)}"/>
            <div class="lb-col-tag">${esc(baseLabel)} (Base Model)</div>
          </div>
          <div class="lb-col">
            <img src="${item.oursImg || item.ours || item.imagoImg}" alt="${esc(oursLabel)}"/>
            <div class="lb-col-tag" style="color:#1d4ed8">${esc(oursLabel)} (Ours ★)</div>
          </div>
        </div>
        ${
          item.noteHtml || item.prompt
            ? `<div style="font-size:13px;color:#334155;line-height:1.55;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
                ${item.noteHtml || `<b>Details:</b> ${esc(item.prompt)}`}
              </div>`
            : ""
        }
      </div>
    `;
    lbEl.classList.add("open");
  }

  /* ========================================================================
     1. REWARD HACKING & FAILURE MODES STUDIO (§4.1, Fig. 4)
     ======================================================================== */
  function mountRewardHacking() {
    const host = document.getElementById("studio-reward-hack");
    if (!host || !window.PAPER_DATA) return;
    const cases = window.PAPER_DATA.qualitative.rewardHacking;

    let caseIdx = 0;
    let compareIdx = 2; // default compare HPSv3 against PromptScore
    let viewMode = "filmstrip"; // "filmstrip" | "slider"

    function render() {
      const cur = cases[caseIdx];
      const cols = cur.items || [];
      const promptCol = cols[4] || cols[cols.length - 1];
      const cmpCol = cols[compareIdx] || cols[0];

      const cardsHtml = cols
        .map(
          (col, idx) => `
          <div class="hack-card ${col.ours ? "ours" : ""}" data-cidx="${idx}" style="cursor:pointer;${
            viewMode === "slider" && idx === compareIdx ? "outline:2px solid #dc2626" : ""
          }">
            <img src="${col.img}" alt="${esc(col.label)}" loading="lazy"/>
            <div class="hack-card-body">
              <div class="hack-card-name">${esc(col.label)}${
            col.warn ? ' <span style="color:#dc2626;font-size:11px">⚠</span>' : ""
          }</div>
              <div class="hack-card-tag">${esc(col.note || "")}</div>
            </div>
          </div>`
        )
        .join("");

      const sliderHtml =
        viewMode === "slider"
          ? `<div style="margin-top:14px;display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:18px;align-items:center" class="hack-slider-wrap">
              <div class="ba-slider" style="aspect-ratio:1/1;--pos:50%">
                <img class="ba-after" src="${promptCol.img}" alt="PromptScore"/>
                <div class="ba-before-clip"><img src="${cmpCol.img}" alt="${esc(cmpCol.label)}"/></div>
                <div class="ba-divider"><div class="ba-handle"><svg viewBox="0 0 20 20" fill="none"><path d="M7 5L3 10L7 15M13 5L17 10L13 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
                <span class="ba-tag left">${esc(cmpCol.label)}</span>
                <span class="ba-tag right">PromptScore ★</span>
              </div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
                <div style="font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Select Baseline Reward to Compare vs. PromptScore</div>
                <div class="seg-group" style="margin-bottom:14px">
                  ${cols
                    .slice(0, 4)
                    .map(
                      (c, i) =>
                        `<button type="button" class="seg-btn ${compareIdx === i ? "active" : ""}" data-cmp="${i}">${esc(
                          c.label
                        )}</button>`
                    )
                    .join("")}
                </div>
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px">${esc(cmpCol.label)}</div>
                <p style="margin:0 0 10px;font-size:13.5px;color:#b91c1c;font-weight:500;line-height:1.5">${esc(
                  cmpCol.note || ""
                )}</p>
                <p style="margin:0;font-size:13px;color:#475569;line-height:1.55">
                  Drag the split curtain to compare directly against <b>PromptScore</b> under identical prompt, random seed, and DiffusionNFT rollout budget.
                </p>
              </div>
            </div>`
          : "";

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div class="seg-group">
            ${cases
              .map(
                (c, i) =>
                  `<button type="button" class="seg-btn ${caseIdx === i ? "active" : ""}" data-case="${i}">${esc(
                    c.model
                  )} · ${i === 0 ? "Fox Portrait" : "Cyberpunk Street"}</button>`
              )
              .join("")}
          </div>
          <div class="seg-group">
            <button type="button" class="seg-btn ${viewMode === "filmstrip" ? "active" : ""}" data-vm="filmstrip">5-Reward Filmstrip</button>
            <button type="button" class="seg-btn ${viewMode === "slider" ? "active" : ""}" data-vm="slider">Interactive Drag Slider</button>
          </div>
        </div>
        <div style="font-size:13px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;margin-bottom:12px;line-height:1.5">
          <b>Prompt:</b> “${esc(cur.prompt)}”
        </div>
        <div class="hack-strip">${cardsHtml}</div>
        ${sliderHtml}
      `;

      bindSliders(host);

      host.querySelectorAll("[data-case]").forEach((b) =>
        b.addEventListener("click", () => {
          caseIdx = +b.dataset.case;
          render();
        })
      );
      host.querySelectorAll("[data-vm]").forEach((b) =>
        b.addEventListener("click", () => {
          viewMode = b.dataset.vm;
          render();
        })
      );
      host.querySelectorAll("[data-cmp]").forEach((b) =>
        b.addEventListener("click", () => {
          compareIdx = +b.dataset.cmp;
          render();
        })
      );
      host.querySelectorAll(".hack-card").forEach((card) =>
        card.addEventListener("click", () => {
          const idx = +card.dataset.cidx;
          if (idx < 4) {
            compareIdx = idx;
            viewMode = "slider";
            render();
          }
        })
      );
    }

    render();
  }

  /* ========================================================================
     2. SCENE-GRAPH PROMPT STUDIO (§5.1, Fig. 7)
     ======================================================================== */
  function mountPromptStudio() {
    const host = document.getElementById("studio-prompt");
    if (!host || !window.PAPER_DATA) return;
    const variants = Array.isArray(window.PAPER_DATA.promptStudio)
      ? window.PAPER_DATA.promptStudio
      : window.PAPER_DATA.promptStudio.variants;

    let activeKey = "balanced";
    let hlFilter = "all"; // "all" | "entity" | "attribute" | "relation"

    const CLS_MAP = {
      entity: "hl-ent",
      attribute: "hl-attr",
      relation: "hl-rel",
    };

    function renderSegments(v) {
      return (v.segments || [])
        .map((seg) => {
          if (!seg.k || (hlFilter !== "all" && hlFilter !== seg.k)) {
            return esc(seg.t);
          }
          return `<span class="${CLS_MAP[seg.k] || ""}">${esc(seg.t)}</span>`;
        })
        .join("");
    }

    function render() {
      const cur = variants.find((v) => v.key === activeKey) || variants[1];

      const tabs = variants
        .map(
          (v) =>
            `<button type="button" class="seg-btn ${v.key === activeKey ? "active" : ""}" data-pk="${v.key}">${esc(
              v.title
            )}${v.recommended ? " ★" : ""}</button>`
        )
        .join("");

      const densityBars = [
        ["Entities (Distinct Objects)", cur.density.entity, "#2563eb", "#dbeafe"],
        ["Attributes (Intrinsic Modifiers)", cur.density.attribute, "#16a34a", "#dcfce7"],
        ["Relations (Spatial / Action)", cur.density.relation, "#d97706", "#fef3c7"],
      ]
        .map(
          ([label, val, col, bg]) => `
          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:650;margin-bottom:3px">
              <span>${label}</span>
              <span style="font-family:var(--font-mono);color:${col}">${val}%</span>
            </div>
            <div style="height:8px;background:${bg};border-radius:99px;overflow:hidden">
              <div style="width:${val}%;height:100%;background:${col};border-radius:99px;transition:width .25s ease"></div>
            </div>
          </div>`
        )
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div class="seg-group">${tabs}</div>
          <div class="seg-group">
            <button type="button" class="seg-btn ${hlFilter === "all" ? "active" : ""}" data-hl="all">All Primitives</button>
            <button type="button" class="seg-btn ${hlFilter === "entity" ? "active" : ""}" data-hl="entity">Entities</button>
            <button type="button" class="seg-btn ${hlFilter === "attribute" ? "active" : ""}" data-hl="attribute">Attributes</button>
            <button type="button" class="seg-btn ${hlFilter === "relation" ? "active" : ""}" data-hl="relation">Relations</button>
          </div>
        </div>

        <div class="studio-layout">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
              <span style="font-size:14px;font-weight:700;color:#0f172a">${esc(cur.title)}</span>
              <span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:99px;background:${cur.bg};color:${cur.accent}">${esc(
                cur.badge
              )}</span>
            </div>
            <div class="prompt-box">${renderSegments(cur)}</div>
            <div style="margin-top:10px;font-size:12.8px;color:#334155;background:#f8fafc;border-left:3px solid ${
              cur.accent
            };padding:8px 12px;border-radius:0 8px 8px 0">
              ${esc(cur.takeaway)}
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:11.8px">
              <span><span class="hl-ent">Blue</span> = Entity</span>
              <span><span class="hl-attr">Green</span> = Attribute</span>
              <span><span class="hl-rel">Amber</span> = Spatial / Action Relation</span>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:8px">Scene-Graph Primitive Balance</div>
              ${densityBars}
            </div>
            <div class="sample-tile" style="max-width:260px;margin:0 auto;width:100%">
              <img src="${cur.img}" alt="${esc(cur.title)} Reference Generation" loading="lazy"/>
              <div class="sample-tile-cap">${esc(cur.title)} · Nano-Banana Visual Reference</div>
            </div>
          </div>
        </div>
      `;

      host.querySelectorAll("[data-pk]").forEach((b) =>
        b.addEventListener("click", () => {
          activeKey = b.dataset.pk;
          render();
        })
      );
      host.querySelectorAll("[data-hl]").forEach((b) =>
        b.addEventListener("click", () => {
          hlFilter = b.dataset.hl;
          render();
        })
      );
    }

    render();
  }

  /* ========================================================================
     3. COMPOSITIONAL BEFORE/AFTER STUDIO (§6.3, Fig. 10)
     ======================================================================== */
  function mountCompositionalStudio() {
    const host = document.getElementById("studio-comp");
    if (!host || !window.PAPER_DATA) return;
    const cases = window.PAPER_DATA.qualitative.compositional;

    let selId = cases[0].id;
    let showBoxes = true;

    function renderBoxes(boxes, color) {
      if (!showBoxes || !boxes || !boxes.length) return "";
      return boxes
        .map(
          (b) =>
            `<div class="diag-box" style="left:${Number(b.x).toFixed(1)}%;top:${Number(b.y).toFixed(
              1
            )}%;width:${Number(b.w).toFixed(1)}%;height:${Number(b.h).toFixed(1)}%;border-color:${color}"></div>`
        )
        .join("");
    }

    function render() {
      const cur = cases.find((c) => c.id === selId) || cases[0];

      const pills = cases
        .map(
          (c) =>
            `<button type="button" class="seg-btn ${c.id === selId ? "active" : ""}" data-cid="${c.id}">
              ${esc(c.regime)} · ${c.oursName.includes("4B") ? "4B" : "6B"}
            </button>`
        )
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div class="seg-group">${pills}</div>
          <div style="display:flex;gap:8px">
            <button type="button" class="replay-btn" id="btn-comp-boxes">${
              showBoxes ? "Hide Diagnostic Boxes" : "Show Diagnostic Boxes"
            }</button>
            <button type="button" class="replay-btn" id="btn-comp-side">⤢ Side-by-Side Zoom</button>
          </div>
        </div>

        <div class="comp-showcase">
          <div class="ba-slider" style="aspect-ratio:1/1;--pos:50%">
            <img class="ba-after" src="${cur.oursImg}" alt="${esc(cur.oursName)}"/>
            ${renderBoxes(cur.oursBoxes, "#22c55e")}
            <div class="ba-before-clip">
              <img src="${cur.baseImg}" alt="${esc(cur.baseName)}"/>
              ${renderBoxes(cur.baseBoxes, "#ef4444")}
            </div>
            <div class="ba-divider"><div class="ba-handle"><svg viewBox="0 0 20 20" fill="none"><path d="M7 5L3 10L7 15M13 5L17 10L13 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
            <span class="ba-tag left">${esc(cur.baseName)}</span>
            <span class="ba-tag right">${esc(cur.oursName)} ★</span>
          </div>

          <div class="comp-meta">
            <div style="margin-bottom:10px">
              <span class="regime-badge regime-${cur.regime}">${esc(cur.regime)} Regime</span>
              <span style="font-size:12px;color:#64748b;margin-left:8px">${esc(cur.source)} · <b>${esc(cur.pairLabel)}</b></span>
            </div>
            <h4 style="margin:0 0 10px;font-family:var(--font-serif);font-size:20px;color:#0f172a">Prompt Excerpt &amp; Highlighted Constraints</h4>
            <div style="font-size:13.8px;line-height:1.68;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:14px">
              “${cur.promptHtml}”
            </div>
            <div style="font-size:13.2px;color:#133930;background:#f3f6f5;border-left:3.5px solid #1c4e42;padding:10px 14px;border-radius:0 8px 8px 0;line-height:1.55">
              <b>What changes:</b> ${esc(cur.fixSummary)}
            </div>
          </div>
        </div>
      `;

      bindSliders(host);

      host.querySelectorAll("[data-cid]").forEach((b) =>
        b.addEventListener("click", () => {
          selId = b.dataset.cid;
          render();
        })
      );
      host.querySelector("#btn-comp-boxes").addEventListener("click", () => {
        showBoxes = !showBoxes;
        render();
      });
      host.querySelector("#btn-comp-side").addEventListener("click", () => {
        openLightbox(
          {
            title: `${cur.pairLabel} (${cur.source})`,
            tag: `${cur.regime} Regime`,
            baseImg: cur.baseImg,
            oursImg: cur.oursImg,
            noteHtml: `<b>Prompt Excerpt:</b> “${cur.promptHtml}”<br/><span style="color:#133930"><b>Resolution:</b> ${esc(
              cur.fixSummary
            )}</span>`,
          },
          cur.baseName,
          cur.oursName
        );
      });
    }

    render();
  }

  /* ========================================================================
     4. VISUAL APPEAL MULTI-ASPECT GALLERY (§6.3, Fig. 11 & Fig. 12)
     ======================================================================== */
  function mountAppealGallery() {
    const host = document.getElementById("studio-appeal");
    if (!host || !window.PAPER_DATA) return;
    const Q = window.PAPER_DATA.qualitative.appeal;
    let modelTab = "6b"; // default show Imago-6B first, instant switch to Imago-4B

    function render() {
      const grp = Q[modelTab];
      const items = grp.items || [];
      const baseLabel = modelTab === "4b" ? "FLUX.2-4B" : "Z-Image";
      const oursLabel = grp.oursLabel;

      const cards = items
        .map(
          (it, idx) => `
          <div class="appeal-card">
            <div class="ba-slider" style="aspect-ratio:${it.aspect};--pos:48%">
              <img class="ba-after" src="${it.ours}" alt="${esc(oursLabel)} ${esc(it.title)}" loading="lazy"/>
              <div class="ba-before-clip">
                <img src="${it.base}" alt="${esc(baseLabel)} ${esc(it.title)}" loading="lazy"/>
              </div>
              <div class="ba-divider"><div class="ba-handle"><svg viewBox="0 0 20 20" fill="none"><path d="M7 5L3 10L7 15M13 5L17 10L13 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
              <span class="ba-tag left">${esc(baseLabel)}</span>
              <span class="ba-tag right">${esc(oursLabel)} ★</span>
            </div>
            <div class="appeal-card-info">
              <div class="appeal-card-head">
                <span class="appeal-card-title">${esc(it.title)}</span>
                <button type="button" class="expand-btn" data-zoom="${idx}">⤢ Side-by-Side</button>
              </div>
              <p class="appeal-card-prompt" style="margin:0;color:#64748b;font-size:12px">${esc(it.tag)} · DrawBench PickScore: <b>${esc(
            grp.pickGain
          )}</b></p>
            </div>
          </div>`
        )
        .join("");

      host.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">
          <div class="seg-group">
            <button type="button" class="seg-btn ${modelTab === "6b" ? "active" : ""}" data-mt="6b">Fig. 12 · Imago-6B vs. Z-Image (${esc(
              Q["6b"].pickGain
            )})</button>
            <button type="button" class="seg-btn ${modelTab === "4b" ? "active" : ""}" data-mt="4b">Fig. 11 · Imago-4B vs. FLUX.2-4B (${esc(
              Q["4b"].pickGain
            )})</button>
          </div>
          <span style="font-size:12.5px;color:#64748b">Drag any image divider left/right, or click <b>⤢ Side-by-Side</b> for full-resolution comparison</span>
        </div>
        <div class="appeal-grid">${cards}</div>
      `;

      bindSliders(host);

      host.querySelectorAll("[data-mt]").forEach((b) =>
        b.addEventListener("click", () => {
          modelTab = b.dataset.mt;
          render();
        })
      );
      host.querySelectorAll("[data-zoom]").forEach((b) =>
        b.addEventListener("click", () => {
          const it = items[+b.dataset.zoom];
          openLightbox(
            {
              title: it.title,
              tag: `${it.tag} · ${grp.pickGain}`,
              base: it.base,
              ours: it.ours,
              prompt: `${grp.baseLabel} vs. ${grp.oursLabel} at native multi-aspect resolution.`,
            },
            grp.baseLabel,
            grp.oursLabel
          );
        })
      );
    }

    render();
  }

  window.ImagoQualitative = {
    init() {
      mountRewardHacking();
      mountPromptStudio();
      mountCompositionalStudio();
      mountAppealGallery();
    },
  };
})();
