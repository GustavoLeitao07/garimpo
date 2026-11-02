// Persistência local (localStorage), sempre protegida por try/catch.
import { addDays, todayStr, TIER_ORDER } from "./core.js";

const KEY = "garimpo:v1";
const DEFAULTS = {
  settings: { sound: true, contrast: false, lowPower: false, clearRejected: false, confirmCorrections: true, vibrate: true, mascot: "tatu", name: "" },
  daily: {},      // data -> {score, tiers, results}
  archive: {},    // data -> {score, tiers, results}
  packs: {},      // cat -> {plays, best, seen: []}
  unlimited: { plays: 0, best: 0, seen: [] },
  runs: {},       // partidas em andamento
  party: { names: [] },
  seenHowTo: false,
};

let state;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state = { ...structuredClone(DEFAULTS), ...parsed, settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) } };
  } catch { state = structuredClone(DEFAULTS); }
  return state;
}
export const get = () => state ?? load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* modo privado etc. */ } }
export function update(fn) { fn(get()); save(); }
export function reset() { state = structuredClone(DEFAULTS); save(); }

export function streaks() {
  const days = Object.keys(get().daily).sort();
  const set = new Set(days);
  let current = 0;
  let d = todayStr();
  if (!set.has(d)) d = addDays(d, -1);
  while (set.has(d)) { current++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  for (const day of days) { run = prev && addDays(prev, 1) === day ? run + 1 : 1; best = Math.max(best, run); prev = day; }
  return { current, best };
}

export function stats() {
  const s = get();
  const games = Object.values(s.daily);
  const all = [...games, ...Object.values(s.archive)];
  const dist = Object.fromEntries([...TIER_ORDER, "miss"].map((t) => [t, 0]));
  for (const g of all) for (const t of g.tiers) dist[t ?? "miss"]++;
  const scores = games.map((g) => g.score);
  return {
    played: games.length,
    archivePlayed: Object.keys(s.archive).length,
    avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    best: scores.length ? Math.max(...scores) : 0,
    gems: dist.pepita,
    dist,
    current: streaks().current,
    bestStreak: streaks().best,
  };
}
