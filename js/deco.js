// Elementos em pixel art que aparecem no subsolo, camada por camada.
const K = "#2a1a10";
export const DECO = {
  raiz:     { grid: ["..k...", ".k.k..", ".k..k.", "k...k.", "k....k", ".k...k", "..k..k", "..k...", "...k..", "...k.."], pal: { k: "#4a2f1a" }, px: 4 },
  minhoca:  { grid: [".pp....pp.", "p..p..p..p", "....pp...e"], pal: { p: "#e88a9a", e: K }, px: 4, cls: "wiggle" },
  osso:     { grid: ["ww.....ww", "wwwwwwwww", "ww.....ww"], pal: { w: "#efe6d2" }, px: 4 },
  pedra:    { grid: ["..ggg..", ".gGggg.", "gGgggdg", "ggggddg", ".ggddg."], pal: { g: "#8a8078", G: "#b5aca2", d: "#5e5650" }, px: 5 },
  pedra2:   { grid: [".ggg.", "gGggd", "ggddd", ".gdd."], pal: { g: "#6e6660", G: "#9a918a", d: "#463f3a" }, px: 5 },
  moeda:    { grid: [".yyy.", "yYyyy", "yyKyy", "yyyyy", ".yyy."], pal: { y: "#e8b830", Y: "#fff2a8", K: "#a07810" }, px: 3, cls: "glint" },
  vaso:     { grid: ["..ooo..", ".o...o.", "ooooooo", "oxoxoxo", "ooooooo", ".oxxxo.", ".ooooo.", "..ooo.."], pal: { o: "#c9773a", x: "#4a2412" }, px: 4 },
  concha:   { grid: ["..bbb..", ".b...b.", "b..bb.b", "b.b..bb", "b.b.b.b", ".b...b.", "..bbb.."], pal: { b: "#d8c8a8" }, px: 4 },
  peixe:    { grid: ["....w.w.w..", "w..wwwwwww.", "wwwwwwwwwk.", "w..wwwwwww.", "....w.w.w.."], pal: { w: "#e6dcc6", k: "#5a4a3a" }, px: 4 },
  dino:     { grid: ["...wwwwww...", "..wwwwwwwww.", ".ww.kwwwwwww", "wwwwwwwwwwww", "wwwkwkwkwkww", ".w.w.w.w.w..", "..wwwwwwww.."], pal: { w: "#e9dfc8", k: "#3a2a1a" }, px: 5 },
  agua:     { grid: ["..bbbbbb..", ".bBbbbbbb.", "bBbbbbbbbb", ".bbbbbbbb.", "..bbbbbb.."], pal: { b: "#3f8fd8", B: "#bfe6ff" }, px: 5, cls: "drip" },
  quartzo:  { grid: ["..c..", ".cCc.", ".cCc.", "ccCcc", "cCCCc", "cCCcc", "ccccc"], pal: { c: "#cfe8ff", C: "#ffffff" }, px: 4, cls: "glint" },
  ametista: { grid: ["..c..", ".cCc.", ".cCc.", "ccCcc", "cCCCc", "cCCcc", "ccccc"], pal: { c: "#9d6bd8", C: "#e3c8ff" }, px: 4, cls: "glint" },
  esmeralda:{ grid: [".ccc.", "cCCcc", "cCccc", "ccccc", ".ccc."], pal: { c: "#22b573", C: "#b8ffd9" }, px: 4, cls: "glint" },
  rubi:     { grid: [".ccc.", "cCCcc", "cCccc", "ccccc", ".ccc."], pal: { c: "#e0314f", C: "#ffc2cc" }, px: 4, cls: "glint" },
  diamante: { grid: [".ddd.", "dDDDd", ".dDd.", "..d.."], pal: { d: "#9feaff", D: "#ffffff" }, px: 5, cls: "glint" },
  ouro:     { grid: [".yyy..", "yYyyyy", "yyyyYy", ".yyyy."], pal: { y: "#ffcc33", Y: "#fff7b0" }, px: 5, cls: "glint" },
  carvao:   { grid: [".kkk..", "kKkkkk", "kkkkKk", ".kkkk."], pal: { k: "#1c1a1e", K: "#55525c" }, px: 5 },
  ferro:    { grid: ["..ggg..", ".grggg.", "ggggrgg", "grggggg", ".ggrgg."], pal: { g: "#6a5e58", r: "#b0502c" }, px: 5 },
  morcego:  { grid: ["k.......k", "kk.krk.kk", "kkkkkkkkk", ".k..k..k.", "....k...."], pal: { k: "#15101c", r: "#ff4a4a" }, px: 4, cls: "flap" },
  cogumelo: { grid: [".cccc.", "cCcccc", "cccCcc", "..ww..", "..ww.."], pal: { c: "#3fe0d0", C: "#c8fff8", w: "#e8e0d0" }, px: 4, cls: "glow" },
  estalactite: { grid: ["ggggg", "gGggg", ".ggg.", ".gGg.", "..g..", "..g.."], pal: { g: "#5e5560", G: "#8a8090" }, px: 5 },
  lava:     { grid: ["..oooo..", ".oOOoooo", "oOyyOooo", "ooOOoooo", ".oooooo."], pal: { o: "#e8501c", O: "#ff8c2a", y: "#ffd23f" }, px: 5, cls: "glow" },
  sal:      { grid: ["ssss", "sSss", "ssss", "sssd"], pal: { s: "#f4f0e6", S: "#ffffff", d: "#cfc6b4" }, px: 4 },
  petroleo: { grid: ["..k..", ".kkk.", "kkKkk", "kKkkk", "kkkkk", ".kkk."], pal: { k: "#0a0608", K: "#4a4a5a" }, px: 4, cls: "drip" },
  bau:      { grid: [".kkkkkkkk.", "kbbbbbbbbk", "kbbbbbbbbk", "kkkkyykkkk", "kbbbyybbbk", "kbbbbbbbbk", "kbbbbbbbbk", "kkkkkkkkkk"], pal: { k: "#3a2010", b: "#8a5a2a", y: "#ffd23f" }, px: 6, cls: "glint" },
  arvore:   { grid: ["..gggg..", ".gGgggg.", "gggGgggg", "gGggggGg", ".gggggg.", "...tt...", "...tt...", "...tt..."], pal: { g: "#3f9b3a", G: "#6fcf5a", t: "#6b4423" }, px: 6 },
  placa:    { grid: ["wwwwwwwwww", "wkkkkkkkkw", "wwwwwwwwww", "....tt....", "....tt...."], pal: { w: "#b07a3a", k: "#5a3a1a", t: "#6b4423" }, px: 4 },
  capim:    { grid: ["g.g.g", ".ggg.", "ggggg"], pal: { g: "#4ea83f" }, px: 4 },
};

const cache = new Map();
export function decoSVG(type) {
  if (cache.has(type)) return cache.get(type);
  const d = DECO[type];
  const w = Math.max(...d.grid.map((r) => r.length)), h = d.grid.length;
  let rects = "";
  d.grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === "." || !d.pal[c]) { x++; continue; }
      let len = 1; while (row[x + len] === c) len++;
      rects += `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${d.pal[c]}"/>`;
      x += len;
    }
  });
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w * d.px}" height="${h * d.px}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  cache.set(type, svg);
  return svg;
}
