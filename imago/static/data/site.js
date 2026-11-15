/* Page settings that are not paper data: authors, links and the BibTeX entry.
   Every link is a button; while its url is empty the button shows "coming soon". Fill in the url when it is public.
   icon: paper, arxiv, github, hf or quote (static/js/icons.js). */
window.SITE = {
  authors: [
    { name: "Jialuo Li", url: "https://jialuo-li.github.io/" },
    { name: "Chieh-Yun Chen", url: "https://scholar.google.com/citations?user=GyMuDGAAAAAJ" },
    { name: "Jiannan Huang", url: "https://rbrq03.github.io/" },
    { name: "Min Shi", url: "https://openreview.net/profile?id=~Min_Shi2" },
    { name: "Fengzhe Zhou", url: "https://github.com/Leymore" },
    { name: "Humphrey Shi", url: "https://www.humphreyshi.com/" },
  ],
  affiliation: "Georgia Tech",
  links: [
    { label: "Paper", icon: "paper", url: "", primary: true },
    { label: "arXiv", icon: "arxiv", url: "" },
    { label: "Code", icon: "github", url: "" },
    { label: "Models", icon: "hf", url: "" },
    { label: "Data", icon: "hf", url: "" },
    { label: "BibTeX", icon: "quote", url: "#citation" },
  ],
  bibtex: `@article{li2026imago,
  title   = {Imago: Maturing Visual Generation with Reinforcement Learning},
  author  = {Li, Jialuo and Chen, Chieh-Yun and Huang, Jiannan and
             Shi, Min and Zhou, Fengzhe and Shi, Humphrey},
  journal = {arXiv preprint},
  year    = {2026}
}`,
};
