// Mascotes em pixel art desenhados a partir de grades de caracteres.
const OUTLINE = "#2a1a10";

const TATU = [
  "..........kkk...",
  ".........kyyyk..",
  "..kkkkk.kyyyyylk",
  ".kBbBbBkkkkkkkk.",
  "kBbBbBbBkhhhhk..",
  "kBbBbBbBkhhehhk.",
  "kBbBbBbBkhhhhhnk",
  "kbbbbbbbbkhhhkk.",
  "tkkkkkkkkkkkk...",
  "..kh.kh..kh.kh..",
  "..kk.kk..kk.kk..",
];
const CAPIVARA = [
  "..........kk....",
  "...kkkkkkkkbbk..",
  "..kbbbbbbbbbbbk.",
  ".kbbbbbbbbbbbbek",
  ".kbbBbbbbbbbbbbk",
  ".kbbbbbbBbbbbbnk",
  ".kbbbbbbbbbbbbk.",
  "..kbbbbbbbbbbk..",
  "..kbk.kbk.kbk...",
  "..kk..kk..kk....",
];
const ONCA = [
  "............kk..",
  "...........kyyk.",
  "k.........kyyyyk",
  "ky.kkkkkkkkysyek",
  ".kykyysyysyyyyyk",
  "..kyyyyyyyysyynk",
  "..kysyyysyyyyyk.",
  "..kyyyyyyyyyyk..",
  "..kyk.kyk.kyk...",
  "..kk..kk..kk....",
];
const ARARA = [
  "....kkkk....",
  "...krrrrk...",
  "..krrwerk...",
  "..krrwwkkk..",
  "..krrrrkgk..",
  "..krrrrrkk..",
  ".kyyrrrrk...",
  ".kbyyrrrk...",
  ".kbbyyrrk...",
  ".kbbbyrrk...",
  "..kbbbrk....",
  "...kbbrk....",
  "....krrk....",
  "....krrk....",
  ".....krk....",
];

export const MASCOTS = [
  { id: "tatu", name: "Tatu Garimpeiro", unlock: 0, grid: TATU, pal: { k: OUTLINE, y: "#ffcc33", l: "#fff7b0", B: "#7d5a40", b: "#a7805f", h: "#d7b08a", e: "#111", n: "#5a3a2a", t: OUTLINE }, sound: "tuc tuc!" },
  { id: "capivara", name: "Capivara Zen", unlock: 3, grid: CAPIVARA, pal: { k: OUTLINE, b: "#9b6b43", B: "#87593a", e: "#111", n: "#3b2614" }, sound: "…" },
  { id: "arara", name: "Arara Fofoqueira", unlock: 7, grid: ARARA, pal: { k: OUTLINE, r: "#e53935", w: "#fff", e: "#111", g: "#ddd", y: "#ffd23f", b: "#1e6fd9" }, sound: "rrraa!" },
  { id: "onca", name: "Onça Raiz", unlock: 14, grid: ONCA, pal: { k: OUTLINE, y: "#e8a33a", s: "#3b2614", e: "#111", n: "#5a2a1a" }, sound: "grrr!" },
  { id: "tatu-ouro", name: "Tatu de Ouro", unlock: 30, grid: TATU, pal: { k: "#5a3a00", y: "#fff2a8", l: "#ffffff", B: "#c99a00", b: "#ffd23f", h: "#ffe58a", e: "#2a1a00", n: "#8a5a00", t: "#5a3a00" }, sound: "pling!" },
];

export function spriteSVG(id, px = 4, cls = "") {
  const m = MASCOTS.find((x) => x.id === id) ?? MASCOTS[0];
  const w = Math.max(...m.grid.map((r) => r.length)), h = m.grid.length;
  let rects = "";
  m.grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === "." || !m.pal[c]) { x++; continue; }
      let len = 1; while (row[x + len] === c) len++;
      rects += `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${m.pal[c]}"/>`;
      x += len;
    }
  });
  return `<svg class="sprite ${cls}" viewBox="0 0 ${w} ${h}" width="${w * px}" height="${h * px}" shape-rendering="crispEdges" role="img" aria-label="${m.name}">${rects}</svg>`;
}
