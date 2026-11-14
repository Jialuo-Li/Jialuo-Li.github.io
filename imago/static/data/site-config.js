/**
 * ============================================================================
 * IMAGO PROJECT WEBSITE — SITE CONFIGURATION (SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * Edit this file to update paper title, authors, resource links (arXiv, Code,
 * Models, Datasets), navigation sections, or visibility toggles at any time.
 * No HTML or rendering JS changes are required for routine updates.
 */
window.SITE_CONFIG = {
  meta: {
    shortName: "Imago",
    title: "Imago: Maturing Visual Generation with Reinforcement Learning",
    subtitle: "A principled study of reward signals, scene-graph corpus design, and short-to-long curriculum scheduling for online RL in visual generation.",
    venueBadge: "Technical Report · 2026",
    affiliation: "SHI Lab, Georgia Institute of Technology",
    lastUpdated: "2026",
  },

  authors: [
    { name: "Jialuo Li", url: "https://jialuo-li.github.io/", affil: "1" },
    { name: "Chieh-Yun Chen", url: "https://scholar.google.com/citations?user=GyMuDGAAAAAJ&hl=zh-TW", affil: "1" },
    { name: "Jiannan Huang", url: "https://rbrq03.github.io/", affil: "1" },
    { name: "Min Shi", url: "https://openreview.net/profile?id=~Min_Shi2", affil: "1" },
    { name: "Fengzhe Zhou", url: "https://github.com/Leymore", affil: "1" },
    { name: "Humphrey Shi", url: "https://www.humphreyshi.com/", affil: "1" },
  ],

  affiliations: [
    { id: "1", name: "Georgia Tech" },
  ],

  // Resource pills rendered in the Hero header. Set `soon: true` for upcoming releases,
  // or update `url` directly once public links are finalized.
  links: [
    { id: "paper", label: "Paper (Preprint)", icon: "paper", url: "#citation", primary: true },
    { id: "code", label: "Training Code", icon: "code", url: "https://github.com/Jialuo-Li", primary: false },
    { id: "eval", label: "Eval Suite (ImgEval)", icon: "code", url: "https://github.com/Jialuo-Li/ImgEval", primary: false },
    { id: "data", label: "Imago-Short & Long", icon: "data", url: "https://huggingface.co/Jialuo21", primary: false },
    { id: "models", label: "Imago-4B & 6B", icon: "hf", url: "#imago", primary: false },
    { id: "bibtex", label: "BibTeX", icon: "bib", url: "#citation", primary: false },
  ],

  // Navigation bar & sticky left-rail Table of Contents.
  // Adding a new object here automatically wires scroll-spy & jump links!
  nav: [
    { id: "top", num: "", label: "Overview" },
    { id: "evaluation", num: "§3", label: "Evaluation" },
    { id: "reward", num: "§4", label: "Rewards" },
    { id: "corpus", num: "§5", label: "Corpus" },
    { id: "imago", num: "§6", label: "Imago" },
    { id: "gallery", num: "§6.3", label: "Gallery" },
    { id: "faq", num: "FAQ", label: "BibTeX" },
  ],

  // Optional custom modules hook: append entries here to auto-mount new sections
  // without touching core JS when future paper revisions add ablations!
  customModules: [],

  bibtex: `@article{li2026imago,
  title   = {Imago: Maturing Visual Generation with Reinforcement Learning},
  author  = {Li, Jialuo and Chen, Chieh-Yun and Huang, Jiannan and Shi, Min and Zhou, Fengzhe and Shi, Humphrey},
  journal = {arXiv preprint},
  year    = {2026}
}`,
};
