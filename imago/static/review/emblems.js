/* Emblem candidates for review. Each: svg(u) returns the markup (u: unique id prefix) and play(svg) runs the load
   animation from scratch. Palette follows the page: blue #3b82f6 / #1f5fcf, amber, coral, green #3fb45a. */
(function () {
  "use strict";
  let n = 0;
  const U = () => `m${++n}`;
  const C = [];
  const SUN = (u, id = "s") => `<radialGradient id="${u}${id}" cx=".5" cy=".38" r=".62"><stop offset="0" stop-color="#ffd884"/><stop offset="1" stop-color="#ff8f5e"/></radialGradient>`;
  const around = (s, cx = 32, cy = 32) => `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;

  /* A: an arched window holding a sunrise */
  const ARCH = "M4 24A20 20 0 0 1 44 24V56.5A5.5 5.5 0 0 1 38.5 62H9.5A5.5 5.5 0 0 1 4 56.5Z";
  C.push({
    id: "A", name: "拱窗晨光", en: "Dawn arch", vb: "0 0 48 64", tall: true,
    idea: "<i>imago</i> 在拉丁语里就是“图像”。一扇罗马式拱窗，窗里是日出风景；载入时太阳从山后缓缓升起，对应副标题里的 maturing。",
    svg: (u) => `<defs><clipPath id="${u}c"><path d="${ARCH}"/></clipPath>
        <linearGradient id="${u}k" x1="0" y1="4" x2="0" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b8cffd"/><stop offset=".55" stop-color="#d9d3fb"/><stop offset=".86" stop-color="#ffd6bd"/><stop offset="1" stop-color="#ffe6d2"/></linearGradient>${SUN(u)}</defs>
      <g clip-path="url(#${u}c)"><rect width="48" height="64" fill="url(#${u}k)"/>
        <g class="sun"><circle cx="24" cy="41" r="15" fill="#ffd2a1" opacity=".45"/><circle cx="24" cy="41" r="9.5" fill="url(#${u}s)"/></g>
        <path d="M0 43C8 38 15 38.5 22 41.5C29 44.5 37 39.5 48 40.5V64H0Z" fill="#b5cafb"/>
        <path d="M0 48.5C9 44 18 45.5 26 48.5C33 51 40 47.5 48 46.5V64H0Z" fill="#7ea8f8"/>
        <path d="M0 54.5C11 49.5 20 51 29 54C36 56.5 42 55 48 52.5V64H0Z" fill="#3b82f6"/></g>`,
    play(svg) {
      d3.select(svg).select(".sun").interrupt().attr("transform", "translate(0 17)")
        .transition().delay(200).duration(2400).ease(d3.easeCubicOut).attr("transform", "translate(0 0)");
    },
  });

  /* B: a low-poly landscape composed of facets, in a round medallion */
  const P = {
    A0: [0, 0], A1: [20, 0], A2: [40, 0], A3: [64, 0],
    B0: [0, 16], B1: [14, 12], B2: [30, 17], B3: [44, 9], B4: [64, 15],
    C0: [0, 34], C1: [12, 27], C2: [22, 33], C3: [34, 23], C4: [46, 32], C5: [56, 26], C6: [64, 31],
    D0: [0, 44], D1: [14, 42], D2: [28, 45], D3: [42, 41], D4: [54, 44], D5: [64, 42],
    E0: [0, 64], E1: [16, 64], E2: [32, 64], E3: [48, 64], E4: [64, 64],
  };
  const FACETS = [
    ["A0 A1 B1", "#c7dbff"], ["A0 B1 B0", "#bcd3ff"], ["A1 A2 B2", "#d2e0ff"], ["A1 B2 B1", "#c5d8ff"], ["A2 A3 B3", "#e6dcfb"], ["A2 B3 B2", "#dcd9fd"], ["A3 B4 B3", "#efdcf4"],
    ["B0 B1 C1", "#d6e2ff"], ["B0 C1 C0", "#cddcff"], ["B1 B2 C2", "#dfe5ff"], ["B1 C2 C1", "#d3e0ff"], ["B2 C3 C2", "#e5e4fb"], ["B2 B3 C3", "#ffe4cc"],
    ["B3 C4 C3", "#ffdcbd"], ["B3 B4 C5", "#ffe3c9"], ["B3 C5 C4", "#ffd7b5"], ["B4 C6 C5", "#ffe8d6"],
    ["C0 C1 D1", "#79a8f8"], ["C0 D1 D0", "#5b93f5"], ["C1 C2 D1", "#4b89f5"], ["C2 D2 D1", "#3b82f6"], ["C2 C3 D2", "#86b0f9"], ["C3 D3 D2", "#3a7cee"],
    ["C3 C4 D3", "#2f6fe0"], ["C4 D4 D3", "#4a8af4"], ["C4 C5 D4", "#6c9ff8"], ["C5 C6 D5", "#3a7bea"], ["C5 D5 D4", "#4f8ef5"],
    ["D0 D1 E1", "#6fd394"], ["D0 E1 E0", "#5cc985"], ["D1 D2 E2", "#4cc47a"], ["D1 E2 E1", "#3fb45a"], ["D2 D3 E3", "#57c27f"], ["D2 E3 E2", "#3aa957"],
    ["D3 D4 E3", "#69cf8f"], ["D4 E4 E3", "#48bb72"], ["D4 D5 E4", "#5fcf8a"],
  ];
  const tri = ([t, c]) => `<path class="f" d="M${t.split(" ").map((k) => P[k].join(" ")).join("L")}Z" fill="${c}" stroke="${c}" stroke-width=".35"/>`;
  const polySun = (cx, cy, r, k = 12) => d3.range(k).map((i) => {
    const a = (i * 2 * Math.PI) / k, b = ((i + 1) * 2 * Math.PI) / k;
    return `<path class="f" d="M${cx} ${cy}L${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}L${(cx + r * Math.cos(b)).toFixed(2)} ${(cy + r * Math.sin(b)).toFixed(2)}Z" fill="${i % 2 ? "#ffb95c" : "#ffcb6e"}" stroke="${i % 2 ? "#ffb95c" : "#ffcb6e"}" stroke-width=".3"/>`;
  }).join("");
  C.push({
    id: "B", name: "多面体风景章", en: "Low-poly medallion", vb: "0 0 64 64",
    idea: "论文讲 compositional generation：一幅图由许多部分组合而成。圆形徽章里是一幅由三角面拼成的风景；载入时三角面一块块拼上。",
    svg: (u) => `<defs><clipPath id="${u}c"><circle cx="32" cy="32" r="29.5"/></clipPath></defs>
      <g clip-path="url(#${u}c)">${FACETS.slice(0, 17).map(tri).join("")}${polySun(44, 15.5, 6.9)}${FACETS.slice(17).map(tri).join("")}</g>
      <circle cx="32" cy="32" r="29.5" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.6"/>`,
    play(svg) {
      const fs = d3.select(svg).selectAll(".f").interrupt();
      const N = fs.size();
      fs.attr("opacity", 0).transition().delay((_, i) => 100 + ((i * 37) % N) * 40).duration(520).ease(d3.easeCubicOut).attr("opacity", 1);
    },
  });

  /* C: a viewfinder closing in on a glowing sun */
  C.push({
    id: "C", name: "取景对焦", en: "Viewfinder", vb: "0 0 64 64",
    idea: "相机取景框的四个角，中间是一颗暖色的“太阳”。载入时取景框收拢、太阳从模糊变清晰，像一张图被对焦、生成出来。",
    svg: (u) => `<defs><linearGradient id="${u}g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#7c5cf0"/></linearGradient>
        <radialGradient id="${u}o" cx=".4" cy=".36" r=".72"><stop offset="0" stop-color="#fff2c6"/><stop offset=".32" stop-color="#ffc56b"/><stop offset=".66" stop-color="#ff8d7e"/><stop offset="1" stop-color="#9b7cf7"/></radialGradient>
        <filter id="${u}b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="0"/></filter></defs>
      <g class="br" fill="none" stroke="url(#${u}g)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 19V11a5 5 0 0 1 5-5h8"/><path d="M45 6h8a5 5 0 0 1 5 5v8"/><path d="M6 45v8a5 5 0 0 0 5 5h8"/><path d="M58 45v8a5 5 0 0 1-5 5h-8"/></g>
      <g class="orb" filter="url(#${u}b)"><circle cx="32" cy="32" r="19.5" fill="#ffd9b0" opacity=".35"/><circle cx="32" cy="32" r="14" fill="url(#${u}o)"/></g>`,
    play(svg) {
      const S = d3.select(svg);
      S.select(".br").interrupt().attr("opacity", 0).attr("transform", around(1.3))
        .transition().delay(100).duration(1100).ease(d3.easeCubicOut).attr("opacity", 1).attr("transform", around(1));
      S.select(".orb").interrupt().attr("transform", around(0.72))
        .transition().delay(500).duration(1600).ease(d3.easeCubicInOut).attr("transform", around(1));
      S.select("feGaussianBlur").interrupt().attr("stdDeviation", 7)
        .transition().delay(500).duration(1600).ease(d3.easeCubicInOut).attr("stdDeviation", 0);
    },
  });

  /* D: an instant photo developing, with a spark */
  const STAR = (cx, cy, r) => `M${cx} ${cy - r}C${cx + r * 0.16} ${cy - r * 0.16} ${cx + r * 0.16} ${cy - r * 0.16} ${cx + r} ${cy}C${cx + r * 0.16} ${cy + r * 0.16} ${cx + r * 0.16} ${cy + r * 0.16} ${cx} ${cy + r}C${cx - r * 0.16} ${cy + r * 0.16} ${cx - r * 0.16} ${cy + r * 0.16} ${cx - r} ${cy}C${cx - r * 0.16} ${cy - r * 0.16} ${cx - r * 0.16} ${cy - r * 0.16} ${cx} ${cy - r}Z`;
  C.push({
    id: "D", name: "拍立得显影", en: "Developing photo", vb: "0 0 64 64",
    idea: "一张拍立得，加一颗代表“生成”的星芒。载入时照片像相纸显影一样从灰白慢慢显出颜色，正好对应“成熟”。",
    svg: (u) => `<defs><clipPath id="${u}c"><rect x="17.5" y="11" width="29" height="29" rx="1.6"/></clipPath>
        <linearGradient id="${u}k" x1="0" y1="11" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bcd2fd"/><stop offset=".62" stop-color="#e0d9fa"/><stop offset="1" stop-color="#ffdcc4"/></linearGradient>${SUN(u)}
        <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf5c"/><stop offset="1" stop-color="#ff7f6e"/></linearGradient>
        <filter id="${u}sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.8" flood-color="#1f3f8f" flood-opacity=".18"/></filter></defs>
      <g transform="rotate(-7 32 33)"><g filter="url(#${u}sh)"><rect x="13.5" y="7" width="37" height="46" rx="3" fill="#fff"/></g>
        <g clip-path="url(#${u}c)"><rect x="17" y="10" width="30" height="31" fill="url(#${u}k)"/>
          <circle cx="36" cy="27" r="8" fill="#ffd2a1" opacity=".45"/><circle cx="36" cy="27" r="5" fill="url(#${u}s)"/>
          <path d="M17 31C22 28 27 28.4 31 30.4C35 32.4 40 29.6 47 30V41H17Z" fill="#9dbcfa"/><path d="M17 35.5C23 32.6 29 33.4 34 35.2C39 37 43 35 47 34.4V41H17Z" fill="#3b82f6"/></g>
        <rect class="dev" x="17.5" y="11" width="29" height="29" rx="1.6" fill="#e6e9ee" opacity="0"/></g>
      <path class="sp" d="${STAR(52, 10.5, 7.5)}" fill="url(#${u}g)"/><path class="sp" d="${STAR(58.5, 19.5, 3.4)}" fill="#8fb4ff"/>`,
    play(svg) {
      const S = d3.select(svg);
      S.select(".dev").interrupt().attr("opacity", 1).transition().delay(300).duration(2600).ease(d3.easeCubicInOut).attr("opacity", 0);
      S.selectAll(".sp").interrupt().each(function (_, i) {
        const b = this.getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        d3.select(this).attr("transform", around(0, cx, cy)).transition().delay(2500 + i * 180).duration(600).ease(d3.easeBackOut.overshoot(2.2)).attr("transform", around(1, cx, cy));
      });
    },
  });

  /* E: an ink-wash landscape on a round fan, signed with a seal */
  const MTN = [
    "M0 40C7 36 11 29 15 26.5C18 24.8 20.5 28 23 31C26 34.4 28.4 33 31 29.6C34 25.6 37 21.6 40.4 21.8C43.6 22 46 27 49.4 30.8C53 34.6 57 35.6 64 35.4V64H0Z",
    "M0 46C6 43 10 38.4 14 36.4C17 35 19.6 37.6 22.4 40.4C25 43 27.4 42.4 30 39.4C32.6 36.6 35.2 33 38.4 33.2C41.6 33.4 44.6 38.2 48 41.6C52 45.6 57 47 64 46V64H0Z",
    "M0 54C7 50.4 12 45.2 17 44C21 43 24 46.4 27.2 49.2C30.4 52 34 51.2 37 48.2C40 45.2 43.4 42.2 47.2 43C51 43.8 55.6 48.6 64 51V64H0Z",
  ];
  C.push({
    id: "E", name: "水墨意象", en: "Ink-wash imago", vb: "0 0 64 64",
    idea: "“意象”正是 imago 常见的中文译法。团扇形的水墨山水：远山近山层层晕开，一轮红日，两只飞鸟，右下角一枚朱印（印文是字母 I）。载入时墨色由远及近在纸上洇开，最后盖章。",
    svg: (u) => `<defs><clipPath id="${u}c"><circle cx="31" cy="31" r="28.5"/></clipPath>
        <radialGradient id="${u}p" cx=".5" cy=".42" r=".65"><stop offset="0" stop-color="#fdfbf6"/><stop offset="1" stop-color="#f0e9da"/></radialGradient>
        ${[["#aabbd9", 21, 44, 0], ["#6f8ec4", 32, 54, 0], ["#2f5fae", 42, 62, 0.06]].map(([c, y0, y1, o], i) => `<linearGradient id="${u}m${i}" x1="0" y1="${y0}" x2="0" y2="${y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="${o}"/></linearGradient><filter id="${u}b${i}" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="0"/></filter>`).join("")}</defs>
      <circle cx="31" cy="31" r="28.5" fill="url(#${u}p)"/>
      <g clip-path="url(#${u}c)"><circle class="sun" cx="41.5" cy="17.5" r="5.8" fill="#e0533f"/>
        <path class="birds" d="M19.5 18.2q1.7-1.5 3.4 0q1.7-1.5 3.4 0M25.6 13.8q1.1-1 2.2 0q1.1-1 2.2 0" fill="none" stroke="#56698f" stroke-width=".95" stroke-linecap="round"/>
        ${MTN.map((d, i) => `<path class="m" data-i="${i}" d="${d}" fill="url(#${u}m${i})" filter="url(#${u}b${i})"/>`).join("")}</g>
      <circle cx="31" cy="31" r="28.5" fill="none" stroke="#d6cbb3" stroke-width="1.1"/>
      <g class="seal" transform="rotate(-5 53 53)"><rect x="47" y="47" width="12.5" height="12.5" rx="2" fill="#d94f4f"/><path d="M50.3 50.5h5.9M50.3 56h5.9M53.25 50.5V56" stroke="#fff" stroke-width="1.35" stroke-linecap="round"/></g>`,
    play(svg) {
      const S = d3.select(svg);
      S.selectAll(".m").interrupt().attr("opacity", 0).each(function () {
        const i = +this.dataset.i;
        d3.select(this).transition().delay(200 + i * 600).duration(1300).ease(d3.easeCubicOut).attr("opacity", 1);
      });
      S.selectAll("feGaussianBlur").interrupt().attr("stdDeviation", 3.2).each(function (_, i) {
        d3.select(this).transition().delay(200 + i * 600).duration(1300).ease(d3.easeCubicOut).attr("stdDeviation", 0);
      });
      S.selectAll(".sun, .birds").interrupt().attr("opacity", 0).transition().delay(1400).duration(900).attr("opacity", 1);
      S.select(".seal").interrupt().attr("opacity", 0).attr("transform", "rotate(-5 53 53) " + around(1.6, 53.25, 53.25))
        .transition().delay(2700).duration(380).ease(d3.easeCubicIn).attr("opacity", 1).attr("transform", "rotate(-5 53 53) " + around(1, 53.25, 53.25));
    },
  });

  /* F: four tiles that together form one picture */
  const TILE = [[2, 2, -7, -7, -9], [33.5, 2, 7, -7, 8], [2, 33.5, -7, 7, 7], [33.5, 33.5, 7, 7, -8]];
  C.push({
    id: "F", name: "四格成画", en: "Four tiles, one picture", vb: "0 0 64 64",
    idea: "四块图块拼成一幅完整的日落风景，太阳正好横跨四块：对应论文的 compositional generation（各部分组合成一个整体）。载入时四块从四周飞入、拼合。",
    svg: (u) => {
      const scene = `<rect width="64" height="64" fill="url(#${u}k)"/><circle cx="32" cy="31" r="17" fill="#ffd2a1" opacity=".45"/><circle cx="32" cy="31" r="10.5" fill="url(#${u}s)"/>
        <path d="M0 37C10 32 18 32.6 26 35.6C34 38.6 44 33.6 64 35V64H0Z" fill="#b5cafb"/><path d="M0 44C12 39.4 22 40.8 32 43.6C40 45.8 50 42.8 64 42.4V64H0Z" fill="#6c9ff7"/>
        <path d="M0 51.6C14 47.4 26 48.8 36 51.4C44 53.6 54 51.8 64 49.6V64H0Z" fill="#3b82f6"/>`;
      return `<defs><linearGradient id="${u}k" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b9d0fd"/><stop offset=".62" stop-color="#ddd6fb"/><stop offset="1" stop-color="#ffd9c0"/></linearGradient>${SUN(u)}
        ${TILE.map(([x, y], k) => `<clipPath id="${u}t${k}"><rect x="${x}" y="${y}" width="28.5" height="28.5" rx="6.5"/></clipPath>`).join("")}</defs>
        ${TILE.map((_, k) => `<g class="tile" data-k="${k}" clip-path="url(#${u}t${k})">${scene}</g>`).join("")}`;
    },
    play(svg) {
      d3.select(svg).selectAll(".tile").interrupt().each(function () {
        const [x, y, dx, dy, a] = TILE[+this.dataset.k], cx = x + 14.25, cy = y + 14.25;
        d3.select(this).attr("opacity", 0).attr("transform", `translate(${dx} ${dy}) rotate(${a} ${cx} ${cy})`)
          .transition().delay(150 + +this.dataset.k * 220).duration(1100).ease(d3.easeBackOut.overshoot(1.1))
          .attr("opacity", 1).attr("transform", `translate(0 0) rotate(0 ${cx} ${cy})`);
      });
    },
  });

  /* H: a sunrise whose rays count from 1 to 10, the PromptScore scale */
  const RAYS = d3.range(10).map((i) => {
    const th = Math.PI - ((i + 0.5) * Math.PI) / 10, r0 = 17.2, r1 = r0 + 3 + i * 0.95;
    return { x0: 32 + r0 * Math.cos(th), y0: 44 - r0 * Math.sin(th), x1: 32 + r1 * Math.cos(th), y1: 44 - r1 * Math.sin(th), c: d3.interpolateRgbBasis(["#8fb4ff", "#3b82f6", "#ffb347", "#ff7f5e"])(i / 9) };
  });
  C.push({
    id: "H", name: "日出刻度", en: "Sunrise score", vb: "0 0 64 64",
    idea: "地平线上升起的太阳，十道光芒由短到长、由冷到暖，正好是 PromptScore 的 1–10 分。载入时太阳升起，光芒从 1 数到 10，对应 RL 让分数一步步变高。",
    svg: (u) => `<defs><clipPath id="${u}c"><rect width="64" height="44.6"/></clipPath>${SUN(u)}</defs>
      <g clip-path="url(#${u}c)"><g class="sun"><circle cx="32" cy="44" r="12.6" fill="url(#${u}s)"/></g></g>
      <g stroke-width="3.3" stroke-linecap="round">${RAYS.map((r, i) => `<path class="ray" data-i="${i}" d="M${r.x0.toFixed(2)} ${r.y0.toFixed(2)}L${r.x1.toFixed(2)} ${r.y1.toFixed(2)}" stroke="${r.c}"/>`).join("")}</g>
      <path d="M5 48.4H59" stroke="#3b82f6" stroke-width="3.4" stroke-linecap="round"/><path d="M16 55H48M24 61H40" stroke="#a9c4fb" stroke-width="3" stroke-linecap="round"/>`,
    play(svg) {
      const S = d3.select(svg);
      S.select(".sun").interrupt().attr("transform", "translate(0 14)").transition().delay(150).duration(1500).ease(d3.easeCubicOut).attr("transform", "translate(0 0)");
      S.selectAll(".ray").interrupt().each(function () {
        const r = RAYS[+this.dataset.i];
        d3.select(this).attr("d", `M${r.x0} ${r.y0}L${r.x0} ${r.y0}`).attr("opacity", 0)
          .transition().delay(1100 + +this.dataset.i * 170).duration(380).ease(d3.easeCubicOut)
          .attr("opacity", 1).attr("d", `M${r.x0} ${r.y0}L${r.x1} ${r.y1}`);
      });
    },
  });

  /* I: the o of the title is a round window. Ring and counter are the glyph outlines of Libertinus Serif Semibold
     Italic "o" (font units, y up), so the window sits in the title exactly where the letter would. */
  const O_OUT = "M72 165C72 111 103 -10 246 -10C383 -10 517 121 517 279C517 351 480 444 342 444C162 444 72 285 72 165Z";
  const O_IN = "M198 173C198 260 226 402 323 402C379 402 393 333 393 272C393 208 368 32 271 32C248 32 198 50 198 173Z";
  C.push({
    id: "I", name: "圆窗字母 o", en: "Porthole o", vb: "72 -444 445 454", inline: true,
    idea: "不额外加图标：标题 <i>Imago</i> 末尾的 o 就是标志。它用的是标题字体里 o 的真实字形，字怀里是一幅风景。载入时 o 像写字一样被画出，太阳随后升起。favicon 用这个 o。",
    svg: (u) => `<defs><clipPath id="${u}c"><path d="${O_IN}" transform="scale(1 -1)"/></clipPath>
        <linearGradient id="${u}k" x1="0" y1="-402" x2="0" y2="-150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bcd2fd"/><stop offset=".72" stop-color="#e2dafa"/><stop offset="1" stop-color="#ffdcc4"/></linearGradient>${SUN(u)}
        <linearGradient id="${u}r" x1="72" y1="-444" x2="517" y2="10" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4b8ff7"/><stop offset="1" stop-color="#1f5fcf"/></linearGradient>
        <mask id="${u}w" maskUnits="userSpaceOnUse" x="40" y="-480" width="520" height="520"><ellipse class="pen" cx="294" cy="-217" rx="168" ry="176" fill="none" stroke="#fff" stroke-width="210" transform="rotate(-100 294 -217)"/></mask></defs>
      <g clip-path="url(#${u}c)"><rect x="190" y="-410" width="210" height="390" fill="url(#${u}k)"/>
        <g class="sun"><circle cx="322" cy="-196" r="60" fill="#ffd2a1" opacity=".45"/><circle cx="322" cy="-196" r="37" fill="url(#${u}s)"/></g>
        <path d="M190 -170C230 -190 262 -188 294 -176C326 -164 360 -184 400 -180V-20H190Z" fill="#b5cafb"/>
        <path d="M190 -128C236 -146 270 -140 304 -130C334 -121 366 -134 400 -136V-20H190Z" fill="#7ea8f8"/>
        <path d="M190 -84C240 -102 282 -96 316 -86C348 -77 376 -84 400 -94V-20H190Z" fill="#3b82f6"/></g>
      <g mask="url(#${u}w)"><path d="${O_OUT}${O_IN}" transform="scale(1 -1)" fill="url(#${u}r)"/></g>`,
    play(svg) {
      const pen = d3.select(svg).select(".pen"), L = pen.node().getTotalLength();
      pen.interrupt().attr("stroke-dasharray", L).attr("stroke-dashoffset", L)
        .transition().delay(150).duration(1300).ease(d3.easeCubicInOut).attr("stroke-dashoffset", 0);
      d3.select(svg).select(".sun").interrupt().attr("transform", "translate(0 90)")
        .transition().delay(1000).duration(1900).ease(d3.easeCubicOut).attr("transform", "translate(0 0)");
    },
  });

  /* J: a prompt's lines of text bend into a landscape */
  const TXT = [
    { s: "M13 17C19 17 25 17 31 17S31 17 31 17", e: "M13 17C19 17 25 17 31 17S31 17 31 17", c: "#a9b4c9" },
    { s: "M13 26.5C20 26.5 27 26.5 34 26.5S39 26.5 41 26.5", e: "M13 26.5C20 26.5 27 26.5 34 26.5S39 26.5 41 26.5", c: "#94a6cf" },
    { s: "M13 37C19 37 25 37 30 37S43 37 51 37", e: "M13 39C19 32.4 25 31.8 30 35.6S43 41.6 51 34.4", c: "#3b82f6" },
    { s: "M13 47.5C20 47.5 27 47.5 33 47.5S45 47.5 51 47.5", e: "M13 48.6C20 42.4 27 42.2 33 45.8S45 50.2 51 45.2", c: "#3fb45a" },
  ];
  C.push({
    id: "J", name: "文字成画", en: "Words into landscape", vb: "0 0 64 64",
    idea: "文生图的一句话：上面两行是 prompt 文字，下面两行弯成山丘，旁边升起太阳。载入时先“打字”，再让文字弯成风景。",
    svg: (u) => `<defs>${SUN(u)}<linearGradient id="${u}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eaf1ff"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#${u}t)" stroke="#d9e4fb" stroke-width="1.2"/>
      <g class="sun"><circle cx="47" cy="17.5" r="9.5" fill="#ffd2a1" opacity=".4"/><circle cx="47" cy="17.5" r="6" fill="url(#${u}s)"/></g>
      <g fill="none" stroke-width="4.2" stroke-linecap="round">${TXT.map((l, i) => `<path class="ln" data-i="${i}" d="${l.e}" stroke="${l.c}"/>`).join("")}</g>`,
    play(svg) {
      const S = d3.select(svg);
      S.selectAll(".ln").interrupt().each(function () {
        const i = +this.dataset.i, el = d3.select(this);
        el.attr("d", TXT[i].s);
        const len = this.getTotalLength();
        el.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
          .transition().delay(120 + i * 280).duration(520).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
          .transition().duration(0).attr("stroke-dasharray", null)
          .transition().delay(i > 1 ? 250 + (3 - i) * 150 : 0).duration(i > 1 ? 1200 : 0).ease(d3.easeCubicInOut).attrTween("d", () => d3.interpolateString(TXT[i].s, TXT[i].e));
      });
      S.select(".sun").interrupt().attr("opacity", 0).attr("transform", "translate(0 6)")
        .transition().delay(2300).duration(1000).ease(d3.easeCubicOut).attr("opacity", 1).attr("transform", "translate(0 0)");
    },
  });

  const ORDER = ["E", "F", "H", "B", "A", "I", "C", "D", "J"];
  C.sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));
  C.forEach((c, k) => { c.id = "ABCDEFGHI"[k]; });

  /* ------------------------------------------------------------------ gallery */
  const grid = document.getElementById("grid");
  const mk = (c) => `<svg viewBox="${c.vb}" aria-hidden="true">${c.svg(U())}</svg>`;
  C.forEach((c) => {
    const card = document.createElement("section");
    card.className = "card";
    const title = c.inline
      ? `<span class="nm">Imag</span><span class="o">${mk(c)}</span>:`
      : `<span class="mk${c.tall ? " tall" : ""}">${mk(c)}</span><span class="nm">Imago</span>:`;
    card.innerHTML = `<h2><span class="id">${c.id}</span>${c.name}<span class="en">${c.en}</span></h2>
      <p class="idea">${c.idea}</p>
      <div class="stage" title="点击重播">${mk(c)}<span class="rp">点击重播</span></div>
      <div class="hero"><div class="t">${title}</div><div class="s">Maturing Visual Generation with Reinforcement Learning</div></div>
      <div class="sizes">${[16, 24, 32, 48].map((s) => `<svg class="ic" viewBox="${c.vb}" height="${s}" width="${s * (+c.vb.split(" ")[2] / +c.vb.split(" ")[3])}">${c.svg(U())}</svg>`).join("")}
        <span class="tab"><svg viewBox="${c.vb}">${c.svg(U())}</svg><span><i>Imago</i>: Maturing Visual…</span></span></div>`;
    grid.appendChild(card);
    c.still && card.querySelectorAll(".sizes svg").forEach((s) => c.still(s));
    const anim = [card.querySelector(".stage svg"), card.querySelector(".hero svg")];
    const run = () => anim.forEach((s) => c.play(s));
    card.querySelector(".stage").addEventListener("click", run);
    new IntersectionObserver((es, ob) => es.forEach((e) => { if (e.isIntersecting) { run(); ob.disconnect(); } }), { threshold: 0.3 }).observe(card);
  });
})();
