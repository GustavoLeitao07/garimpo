// Núcleo do jogo: níveis, normalização, busca de respostas, datas e sorteio.
import RAW, { CATEGORIES } from "./data/index.js";

export { CATEGORIES };

export const TIER_ORDER = ["cascalho", "manjado", "quartzo", "esmeralda", "diamante", "pepita"];
export const TIERS = {
  cascalho:  { name: "Cascalho",       score: 10,  emoji: "🪨", blurb: "A resposta que todo mundo dá." },
  manjado:   { name: "Manjado",        score: 15,  emoji: "🤡", blurb: "Parece esperto… mas a galera toda pensou nisso." },
  quartzo:   { name: "Quartzo",        score: 30,  emoji: "🔷", blurb: "Sólido. Garimpada honesta." },
  esmeralda: { name: "Esmeralda",      score: 60,  emoji: "💚", blurb: "Incomum de verdade. Olho bom." },
  diamante:  { name: "Diamante",       score: 85,  emoji: "💎", blurb: "Obscuridade raiz. Pouca gente chega aqui." },
  pepita:    { name: "Pepita de Ouro", score: 100, emoji: "🌟", blurb: "A joia escolhida a dedo. Fundo da mina." },
};
export const MISS_EMOJI = "⬛";
export const ROUNDS = 7;
export const ANSWER_MS = 30000;
export const PREVIEW_MS = 1600;
export const METERS_PER_POINT = 10;
export const MAX_DEPTH = ROUNDS * 100 * METERS_PER_POINT; // 7.000 m

export const QUIPS = {
  cascalho: ["Cascalho puro. Tá na superfície.", "Isso aí até o porteiro respondeu.", "A pá nem sujou.", "Óbvio, mas conta.", "Primeira coisa que vem na cabeça, né?"],
  manjado: ["Ahá! O clássico \"obscuro\" que todo mundo chuta.", "Achou que era esperto? A galera também.", "O falso raro. Clássico.", "Escolha de quem quer parecer diferente."],
  quartzo: ["Bom veio. Seguimos cavando.", "Resposta respeitável.", "Nada mal, nada mal.", "Sólido como rocha."],
  esmeralda: ["Agora sim! Brilhou.", "Isso aí é garimpo de verdade.", "Pouca gente chegou aqui.", "Olha o verde brilhando!"],
  diamante: ["DIAMANTE. Que mente.", "Isso é conhecimento de outra camada.", "Quase ninguém pensa nisso.", "Respeita o garimpeiro!"],
  pepita: ["PEPITA DE OURO! Era essa a joia!", "Você achou a pepita. Lenda.", "Bateu no fundo da mina. Absurdo.", "Ouro puro. Tira print."],
  miss: ["Nada no peneirão.", "A pá voltou vazia.", "Passou o tempo. Bora pra próxima.", "Nenhum brilho dessa vez."],
};

export const BANDS = [
  { min: 0,   tier: "cascalho",  title: "Cascalho",       text: "Ainda tem muita terra pra cavar. Amanhã tem mais." },
  { min: 141, tier: "quartzo",   title: "Quartzo",        text: "Escavação honesta. O tatu tá orgulhoso." },
  { min: 261, tier: "esmeralda", title: "Esmeralda",      text: "Você enxerga o que pouca gente vê." },
  { min: 381, tier: "diamante",  title: "Diamante",       text: "Mente de garimpeiro raiz. Seriamente fundo." },
  { min: 500, tier: "pepita",    title: "Pepita de Ouro", text: "Lenda da mina. Isso foi absurdo." },
];
export const bandFor = (score) => [...BANDS].reverse().find((b) => score >= b.min) ?? BANDS[0];

// Marcos de profundidade (em metros) mostrados no poço.
export const LAYERS = [
  { m: 0,    label: "superfície · sol de rachar" },
  { m: 40,   label: "raízes da mangueira do quintal" },
  { m: 120,  label: "lençol freático: tem água aqui" },
  { m: 300,  label: "rocha firme. o tatu tá suando" },
  { m: 600,  label: "o Aquífero Guarani passa por essas bandas" },
  { m: 1000, label: "1 km! nenhuma minhoca chegou aqui" },
  { m: 1800, label: "calor de forno. pior que Cuiabá em outubro" },
  { m: 2600, label: "silêncio total. só você e a pedra" },
  { m: 3500, label: "a mina mais funda do mundo passa dos 4 km" },
  { m: 4500, label: "camadas que ninguém nunca pisou" },
  { m: 5300, label: "começa o sal: a camada pré-sal" },
  { m: 6200, label: "petróleo do pré-sal. ouro preto" },
  { m: 7000, label: "fundo do garimpo · escavação perfeita" },
];

// ---------- normalização e busca ----------
const ARTICLES = new Set(["o", "a", "os", "as", "um", "uma", "the"]);
const FILLERS = new Set(["rio", "praia", "dia", "de", "do", "da", "dos", "das", "o", "a", "os", "as", "mc", "dj",
  "banda", "time", "planeta", "lua", "estrela", "constelacao", "ilha", "ilhas", "pais", "estado", "cidade",
  "capital", "sr", "senhor", "senhora", "dona", "seu", "deus", "deusa", "santo", "santa", "pastel", "pizza", "sabor"]);

export function norm(s) {
  let t = String(s ?? "").toLowerCase().replace(/&/g, " e ")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const words = t.split(" ");
  while (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join(" ");
}
function stripFillers(k) {
  const w = k.split(" ");
  while (w.length > 1 && FILLERS.has(w[0])) w.shift();
  return w.join(" ");
}

function hash(str) { // FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function buildPrompt(row) {
  const [cat, text, ...tierStrs] = row;
  const entries = [];
  const index = new Map();
  const loose = new Map();
  tierStrs.forEach((str, ti) => {
    if (!str) return;
    for (const item of str.split("|")) {
      const aliases = item.split("/").map((a) => a.trim()).filter(Boolean);
      if (!aliases.length) continue;
      const entry = { name: aliases[0], tier: TIER_ORDER[ti] };
      entries.push(entry);
      for (const a of aliases) {
        const k = norm(a);
        if (!k) continue;
        if (!index.has(k)) index.set(k, entry);
        const nk = k.replace(/ /g, "");
        if (!loose.has(nk)) loose.set(nk, entry);
        const sk = stripFillers(k);
        if (!loose.has(sk)) loose.set(sk, entry);
        if (k.endsWith("s") && !loose.has(k.slice(0, -1))) loose.set(k.slice(0, -1), entry);
        if (!loose.has(k + "s")) loose.set(k + "s", entry);
      }
    }
  });
  const id = cat + "-" + hash(text).toString(36);
  return { id, cat, text, entries, index, loose, gem: entries.find((e) => e.tier === "pepita") };
}

export const PROMPTS = RAW.map(buildPrompt);
export const PROMPT_BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));

// Distância de Damerau-Levenshtein (versão OSA) com corte antecipado.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1), prev = new Array(b.length + 1), cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i; let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) { prev2[j] = prev[j]; prev[j] = cur[j]; }
  }
  return prev[b.length];
}

/** Procura uma resposta. Retorna {entry, exact} ou null. */
export function lookup(prompt, raw) {
  const k = norm(raw);
  if (!k) return null;
  const direct = prompt.index.get(k) || prompt.loose.get(k) || prompt.loose.get(k.replace(/ /g, "")) || prompt.loose.get(stripFillers(k));
  if (direct) return { entry: direct, exact: true };
  const q = stripFillers(k);
  const max = q.length < 5 ? 0 : q.length < 9 ? 1 : 2;
  if (max === 0) return null;
  let best = null, bestD = max + 1;
  for (const [key, entry] of prompt.index) {
    const d = Math.min(distance(q, key, max), distance(q, stripFillers(key), max));
    if (d < bestD) { bestD = d; best = entry; if (d === 1 && max === 1) break; }
  }
  return best ? { entry: best, exact: false } : null;
}

// ---------- datas (horário de Brasília) ----------
export const TZ = "America/Sao_Paulo";
export const EPOCH = "2026-10-01";
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
export const todayStr = (d = new Date()) => fmt.format(d);
const parts = (s) => s.split("-").map(Number);
export function addDays(s, n) { const [y, m, d] = parts(s); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
export function dayNumber(s) {
  const [a, b, c] = parts(EPOCH), [x, y, z] = parts(s);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 864e5) + 1;
}
export function msToNextDay(now = new Date()) {
  // Brasil sem horário de verão: meia-noite local = 03:00 UTC.
  const [y, m, d] = parts(addDays(todayStr(now), 1));
  return Date.UTC(y, m - 1, d, 3) - now.getTime();
}
export function formatDate(s) {
  const [y, m, d] = parts(s);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

// ---------- sorteio determinístico ----------
export function rng(seedStr) {
  let a = hash(String(seedStr));
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const SORTED = [...PROMPTS].sort((a, b) => (a.id < b.id ? -1 : 1));
function cycleOrder(c) {
  const rand = rng("garimpo-ciclo-" + c);
  const groups = {};
  for (const p of SORTED) (groups[p.cat] ??= []).push(p);
  const cats = shuffle(Object.keys(groups), rand);
  const lists = cats.map((k) => shuffle(groups[k], rand));
  const out = [];
  while (lists.some((l) => l.length)) for (const l of lists) if (l.length) out.push(l.shift());
  return out;
}
const cycleCache = new Map();
/** As 7 perguntas de um dia — iguais para todo mundo. */
export function dailyPrompts(dateStr) {
  const n = dayNumber(dateStr) - 1;
  const perCycle = Math.floor(SORTED.length / ROUNDS);
  const c = Math.floor(n / perCycle), s = n % perCycle;
  if (!cycleCache.has(c)) cycleCache.set(c, cycleOrder(c));
  return cycleCache.get(c).slice(s * ROUNDS, s * ROUNDS + ROUNDS);
}
export function randomPrompts(seed, count = ROUNDS, cat = null, avoid = new Set()) {
  const rand = rng(seed);
  const pool = PROMPTS.filter((p) => !cat || p.cat === cat);
  const fresh = shuffle(pool.filter((p) => !avoid.has(p.id)), rand);
  const used = shuffle(pool.filter((p) => avoid.has(p.id)), rand);
  return [...fresh, ...used].slice(0, count);
}
export const newSeed = () => Math.random().toString(36).slice(2, 8);

export const scoreOf = (tier) => (tier ? TIERS[tier].score : 0);
export const depthOf = (score) => score * METERS_PER_POINT;
export const fmtNum = (n) => n.toLocaleString("pt-BR");

/** Amostra de respostas por nível para a tela de revelação. */
export function answerSheet(prompt, perTier = 6) {
  return TIER_ORDER.slice().reverse().map((t) => {
    const all = prompt.entries.filter((e) => e.tier === t);
    return { tier: t, total: all.length, sample: all.slice(0, perTier).map((e) => e.name) };
  }).filter((r) => r.total);
}
