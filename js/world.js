// O mundo do Garimpo: céu, camadas da terra, elementos do subsolo, túnel e câmera.
// Mecânica inspirada no gênero: ao acertar, aparecem linhas com a profundidade de cada
// nível e o tatu cava até a linha da sua resposta, com a câmera seguindo.
import { TIERS, TIER_ORDER, LAYERS, MAX_DEPTH, METERS_PER_POINT, fmtNum, rng } from "./core.js";
import { DECO, decoSVG } from "./deco.js";
import { spriteSVG } from "./sprites.js";
import { get as getStore } from "./store.js";
import { burst } from "./fx.js";

export const SCALE = 1.25;           // pixels por metro
export const SKY = 620;              // altura do céu em px
const BOTTOM = 420;                  // espaço abaixo de 7.000 m
const WORLD_H = SKY + MAX_DEPTH * SCALE + BOTTOM;
const y = (m) => SKY + m * SCALE;    // metro -> px no mundo

// Faixas de cor por profundidade (metros).
const BANDS = [
  [0, "#4ea83f"], [6, "#2f7a2c"], [10, "#5a3a22"], [45, "#6b4226"],
  [60, "#8e4526"], [380, "#a3502a"], [420, "#b96a32"], [900, "#9a6038"],
  [1000, "#6d5c56"], [1750, "#55494f"], [1850, "#3f3542"], [2550, "#342a3c"],
  [2650, "#211a2a"], [3450, "#1c1624"], [3550, "#3a2a2a"], [4450, "#302226"],
  [4550, "#1e1a24"], [5250, "#171420"], [5320, "#d9d4c7"], [5800, "#efe9dc"], [6150, "#c8bfae"],
  [6220, "#140d12"], [6900, "#0a0608"], [7000, "#2a1c02"],
];

// O que aparece em cada faixa: [de, até, [[tipo, quantidade], ...]]
const ZONES = [
  [4, 45, [["raiz", 12], ["minhoca", 4], ["pedra2", 4], ["osso", 2], ["moeda", 1]]],
  [45, 400, [["pedra", 10], ["minhoca", 5], ["vaso", 2], ["osso", 3], ["concha", 3], ["moeda", 2], ["pedra2", 6]]],
  [400, 1000, [["concha", 5], ["peixe", 3], ["pedra", 8], ["agua", 7], ["quartzo", 4]]],
  [1000, 1800, [["pedra2", 8], ["carvao", 7], ["ferro", 7], ["quartzo", 5], ["ametista", 4], ["agua", 3]]],
  [1800, 2600, [["ametista", 6], ["esmeralda", 5], ["ouro", 4], ["dino", 2], ["pedra2", 6], ["carvao", 4]]],
  [2600, 3500, [["morcego", 9], ["estalactite", 12], ["cogumelo", 9], ["ouro", 5], ["dino", 2]]],
  [3500, 4500, [["rubi", 6], ["diamante", 4], ["ouro", 7], ["lava", 5], ["pedra2", 5]]],
  [4500, 5300, [["lava", 9], ["diamante", 6], ["rubi", 4], ["pedra2", 4]]],
  [5320, 6150, [["sal", 26], ["quartzo", 4]]],
  [6220, 6950, [["petroleo", 22], ["ouro", 3]]],
];

const DIG_MS = { cascalho: 1700, manjado: 1800, quartzo: 2100, esmeralda: 2600, diamante: 3100, pepita: 3500 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const calm = () => getStore().settings.lowPower || matchMedia("(prefers-reduced-motion: reduce)").matches;

let root, strata, tunnel, markers, lines, digger, camY = 0, mode = "home", depthNow = 0;
let depthListener = () => {};
/** Registra quem quer saber a profundidade mostrada (ex.: o medidor lateral). */
export function onDepth(fn) { depthListener = fn; }

export function initWorld(el) {
  root = el;
  const stops = BANDS.map(([m, c]) => `${c} ${y(m)}px`).join(",");
  const rand = rng("garimpo-mina-v1");
  let decos = "";
  for (const [from, to, items] of ZONES) {
    for (const [type, n] of items) {
      for (let i = 0; i < n; i++) {
        let x = 3 + rand() * 94;
        if (x > 40 && x < 60) x = rand() < 0.5 ? 6 + rand() * 30 : 62 + rand() * 32; // deixa o túnel livre
        const m = from + rand() * (to - from);
        const top = type === "raiz" ? y(from) - 8 : type === "estalactite" ? y(m) : y(m);
        const flip = rand() < 0.5 ? " flip" : "";
        decos += `<i class="deco ${DECO[type].cls || ""}${flip}" style="left:${x.toFixed(2)}%;top:${top.toFixed(0)}px;--d:${(rand() * 3).toFixed(2)}s">${decoSVG(type)}</i>`;
      }
    }
  }
  const labels = LAYERS.filter((l) => l.m > 0).map((l) =>
    `<div class="wlabel" style="top:${y(l.m)}px"><b>── ${fmtNum(l.m)} m</b> ${l.label}</div>`).join("");
  root.innerHTML = `
    <div class="strata" style="height:${WORLD_H}px">
      <div class="sky" style="height:${SKY}px"><div class="sun"></div><div class="clouds"></div><div class="clouds c2"></div></div>
      <div class="ground" style="top:${SKY - 8}px;height:${WORLD_H - SKY + 8}px;background:linear-gradient(180deg,${stops.replaceAll(/(\d+(\.\d+)?)px/g, (_, n) => (Number(n) - SKY + 8) + "px")})"></div>
      <div class="grain" style="top:${SKY + 10}px;height:${WORLD_H - SKY}px"></div>
      <i class="deco surface" style="left:12%;top:${SKY - 48}px">${decoSVG("arvore")}</i>
      <i class="deco surface" style="left:78%;top:${SKY - 42}px">${decoSVG("arvore")}</i>
      <i class="deco surface" style="left:60%;top:${SKY - 20}px">${decoSVG("placa")}</i>
      ${[8, 30, 36, 68, 88, 94].map((x) => `<i class="deco surface" style="left:${x}%;top:${SKY - 12}px">${decoSVG("capim")}</i>`).join("")}
      ${decos}
      <i class="deco glint treasure" style="left:calc(50% + 40px);top:${y(6960)}px">${decoSVG("bau")}</i>
      ${labels}
      <div class="tunnel" style="top:${SKY}px;height:0"></div>
      <div class="markers"></div>
      <div class="tierlines"></div>
    </div>`;
  strata = root.querySelector(".strata");
  tunnel = root.querySelector(".tunnel");
  markers = root.querySelector(".markers");
  lines = root.querySelector(".tierlines");
  digger = document.createElement("div");
  digger.id = "digger";
  digger.hidden = true;
  digger.innerHTML = `<div class="dig-chip"></div><div class="dig-body"></div><div class="dig-odo"></div><div class="dig-skip">toque pra pular</div>`;
  document.body.append(digger);
  addEventListener("resize", () => camera(depthNow, { mode, instant: true }));
}

function anchor() { return innerHeight * (mode === "home" ? 0.74 : 0.42); }
function place(d) {
  const max = WORLD_H - innerHeight;
  camY = Math.max(0, Math.min(max, y(d) - anchor()));
  strata.style.transform = `translate3d(0,${-camY}px,0)`;
  depthListener(d);
}

/** Move a câmera para uma profundidade. mode: "home" (superfície em destaque) ou "game". */
export function camera(d, { mode: m = mode, instant = false } = {}) {
  if (!strata) return;
  mode = m; depthNow = d;
  strata.classList.toggle("glide", !instant && !calm());
  place(d);
}

/** Desenha o túnel e os marcadores da escavação atual. */
export function syncTunnel(results = []) {
  if (!tunnel) return;
  let d = 0; let html = "";
  results.forEach((r, i) => {
    if (!r) return;
    d += (r.score || 0) * METERS_PER_POINT;
    if (r.tier) html += marker(d, r, i);
  });
  tunnel.style.height = d * SCALE + "px";
  markers.innerHTML = html;
}
function marker(d, r, i) {
  const left = i % 2 === 0;
  return `<div class="wmarker ${left ? "l" : "r"} tier-${r.tier}" style="top:${y(d)}px"><span>${TIERS[r.tier].emoji} ${escapeHTML(r.answer || "")}</span></div>`;
}
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function showDigger(text, d) {
  digger.hidden = false;
  digger.className = "";
  digger.querySelector(".dig-chip").textContent = text ? `“${text}”` : "";
  digger.querySelector(".dig-chip").hidden = !text;
  digger.querySelector(".dig-body").innerHTML = spriteSVG(getStore().settings.mascot, 4);
  digger.querySelector(".dig-odo").textContent = fmtNum(Math.round(d)) + " m";
  digger.style.top = anchor() + "px";
}

/**
 * Animação principal: o tatu cava de `from` até `to` metros.
 * Retorna uma Promise resolvida depois do pouso. Toque/tecla pula.
 */
export function dig({ from, to, tier, answer, onPass = () => {}, onTick = () => {}, onLand = () => {} }) {
  return new Promise((resolve) => {
    mode = "game";
    const fast = calm();
    const dur = fast ? 1 : DIG_MS[tier] || 2000;
    strata.classList.remove("glide");
    showDigger(answer, from);
    digger.classList.add("digging", "tier-" + tier);
    // linhas de cada nível, com entrada escalonada
    lines.innerHTML = TIER_ORDER.map((t, i) => {
      const d = from + TIERS[t].score * METERS_PER_POINT;
      return `<div class="tierline tier-${t}" data-t="${t}" data-d="${d}" style="top:${y(d)}px;--i:${i}"><span class="tag">${TIERS[t].emoji} ${TIERS[t].name.toUpperCase()} · ${TIERS[t].score}</span></div>`;
    }).join("");
    const lineEls = [...lines.children];
    const t0 = performance.now() + (fast ? 0 : 450); // deixa as linhas aparecerem
    let last = 0, done = false, raf;
    const finish = () => {
      if (done) return; done = true;
      cancelAnimationFrame(raf);
      removeEventListener("pointerdown", skip); removeEventListener("keydown", skip);
      depthNow = to; place(to);
      tunnel.style.height = to * SCALE + "px";
      digger.querySelector(".dig-odo").textContent = fmtNum(to) + " m";
      lineEls.forEach((el) => { if (el.dataset.t === tier) el.classList.add("hit"); else if (Number(el.dataset.d) <= to) el.classList.add("passed"); });
      digger.classList.remove("digging"); digger.classList.add("landed");
      onLand(digger.querySelector(".dig-body"));
      setTimeout(() => {
        digger.hidden = true;
        lines.innerHTML = "";
        resolve();
      }, fast ? 250 : 900);
    };
    const skip = (e) => { if (e.type === "keydown" && !["Enter", " ", "Escape"].includes(e.key)) return; finish(); };
    setTimeout(() => { addEventListener("pointerdown", skip); addEventListener("keydown", skip); }, 150);
    const step = (now) => {
      if (done) return;
      const k = Math.max(0, Math.min(1, (now - t0) / dur));
      const d = from + (to - from) * ease(k);
      depthNow = d; place(d);
      tunnel.style.height = d * SCALE + "px";
      digger.querySelector(".dig-odo").textContent = fmtNum(Math.round(d)) + " m";
      for (const el of lineEls) {
        if (!el.classList.contains("passed") && d >= Number(el.dataset.d) - 0.5 && el.dataset.t !== tier) {
          el.classList.add("passed"); onPass(el.dataset.t);
          burst(el.querySelector(".tag"), { count: 6, spread: 40, colors: ["#fff7b0", "#ffd23f"] });
        }
      }
      if (now - last > 90 && k > 0 && k < 1) { last = now; onTick(); burst(digger.querySelector(".dig-body"), { count: 3, spread: 46 }); }
      if (k >= 1) return finish();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
}

/** Erro: a pá bate na pedra. */
export function clang(at) {
  return new Promise((resolve) => {
    mode = "game"; place(at);
    showDigger("", at);
    digger.classList.add("clang");
    burst(digger.querySelector(".dig-body"), { count: 12, spread: 50, colors: ["#8a8078", "#b5aca2", "#fff7b0"] });
    setTimeout(() => { digger.hidden = true; resolve(); }, calm() ? 200 : 1000);
  });
}

/** Passeio pela escavação inteira (tela de resultados). */
export function tour(to) {
  return new Promise((resolve) => {
    mode = "game";
    strata.classList.remove("glide");
    document.body.classList.add("touring");
    const dur = calm() ? 1 : Math.min(7000, 2200 + to * 0.7);
    const t0 = performance.now();
    let raf, done = false;
    const end = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      removeEventListener("pointerdown", end);
      document.body.classList.remove("touring");
      place(to); resolve();
    };
    setTimeout(() => addEventListener("pointerdown", end), 200);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      place(to * ease(k));
      if (k >= 1) return setTimeout(end, 900);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
}

export const worldHeight = () => WORLD_H;
