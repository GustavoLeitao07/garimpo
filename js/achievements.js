// Conquistas: destravadas a partir do histórico salvo e da partida que acabou de terminar.
import * as store from "./store.js";
import { toast } from "./fx.js";
import { sfx } from "./sound.js";

const count = (tiers, t) => tiers.filter((x) => (x ?? "miss") === t).length;

export const ACHIEVEMENTS = [
  { id: "primeira-pa", emoji: "⛏️", name: "Primeira pá", desc: "Termine sua primeira escavação.", test: (c) => !!c.result },
  { id: "ouro", emoji: "🌟", name: "Achei ouro!", desc: "Encontre sua primeira pepita.", test: (c) => c.s.gems >= 1 },
  { id: "veio-de-ouro", emoji: "🪙", name: "Veio de ouro", desc: "Duas pepitas na mesma escavação.", test: (c) => c.result && count(c.result.tiers, "pepita") >= 2 },
  { id: "garimpeiro", emoji: "💰", name: "Garimpeiro de respeito", desc: "Junte 10 pepitas no total.", test: (c) => c.s.gems >= 10 },
  { id: "lapidador", emoji: "💎", name: "Lapidador", desc: "Três diamantes na mesma escavação.", test: (c) => c.result && count(c.result.tiers, "diamante") >= 3 },
  { id: "fugiu-obvio", emoji: "🙅", name: "Fugiu do óbvio", desc: "Uma escavação completa sem cascalho, manjado ou buraco.", test: (c) => c.result && c.result.tiers.length >= 7 && c.result.tiers.every((t) => t && t !== "cascalho" && t !== "manjado") },
  { id: "palhaco", emoji: "🤡", name: "Palhaço do garimpo", desc: "Três respostas manjadas na mesma escavação.", test: (c) => c.result && count(c.result.tiers, "manjado") >= 3 },
  { id: "sem-buraco", emoji: "🧱", name: "Sem buraco", desc: "Acerte as 7 perguntas de uma escavação.", test: (c) => c.result && c.result.tiers.length >= 7 && c.result.tiers.every(Boolean) },
  { id: "km", emoji: "🕳️", name: "Um quilômetro", desc: "Faça 100 pontos ou mais.", test: (c) => c.result && c.result.score >= 100 },
  { id: "aquifero", emoji: "💧", name: "Aquífero", desc: "Faça 300 pontos ou mais.", test: (c) => c.result && c.result.score >= 300 },
  { id: "pre-sal", emoji: "🛢️", name: "Pré-sal", desc: "Faça 500 pontos ou mais.", test: (c) => c.result && c.result.score >= 500 },
  { id: "gatilho", emoji: "⚡", name: "Gatilho rápido", desc: "Acerte uma resposta em menos de 3 segundos.", test: (c) => c.result?.results?.some((r) => r.tier && r.left > 27000) },
  { id: "sufoco", emoji: "😰", name: "No sufoco", desc: "Acerte com menos de 2 segundos no relógio.", test: (c) => c.result?.results?.some((r) => r.tier && r.left != null && r.left < 2000) },
  { id: "seq-3", emoji: "🔥", name: "Pegando o jeito", desc: "3 dias seguidos de garimpo.", test: (c) => c.s.bestStreak >= 3 },
  { id: "seq-7", emoji: "📅", name: "Semana de garimpo", desc: "7 dias seguidos.", test: (c) => c.s.bestStreak >= 7 },
  { id: "seq-30", emoji: "🏔️", name: "Garimpeiro raiz", desc: "30 dias seguidos.", test: (c) => c.s.bestStreak >= 30 },
  { id: "arquivista", emoji: "🗄️", name: "Arquivista", desc: "Jogue 10 dias do arquivo.", test: (c) => c.s.archivePlayed >= 10 },
  { id: "turista", emoji: "🧳", name: "Turista", desc: "Jogue 5 pacotes temáticos diferentes.", test: (c) => Object.keys(c.st.packs).length >= 5 },
  { id: "infinito-10", emoji: "♾️", name: "Não para nunca", desc: "10 escavações no modo Infinito.", test: (c) => c.st.unlimited.plays >= 10 },
  { id: "desafiante", emoji: "⚔️", name: "Desafio aceito", desc: "Vença um desafio de um amigo.", test: (c) => c.wonChallenge },
  { id: "resenha", emoji: "🎉", name: "Resenheiro", desc: "Termine uma partida de Resenha.", test: (c) => c.mode === "party" },
];

/** Verifica e anuncia conquistas novas. ctx: { mode, result, wonChallenge } */
export function check(ctx = {}) {
  const st = store.get();
  st.achievements ??= {};
  const c = { ...ctx, st, s: store.stats() };
  const fresh = ACHIEVEMENTS.filter((a) => !st.achievements[a.id] && safe(a, c));
  if (!fresh.length) return [];
  store.update((s) => { s.achievements ??= {}; fresh.forEach((a) => { s.achievements[a.id] = new Date().toISOString().slice(0, 10); }); });
  // No máximo 2 avisos individuais; o resto vira um aviso agrupado.
  const solo = fresh.length > 2 ? fresh.slice(0, 1) : fresh;
  const rest = fresh.length > 2 ? fresh.slice(1) : [];
  solo.forEach((a, i) => setTimeout(() => {
    toast(`<span class="toast-emoji">${a.emoji}</span><span><small>conquista desbloqueada</small><b>${a.name}</b></span>`, { ms: 3200, kind: "achv" });
    sfx.tier("esmeralda");
  }, 2000 + i * 1500));
  if (rest.length) setTimeout(() => {
    toast(`<span class="toast-emoji">🏅</span><span><small>+${rest.length} conquistas</small><b>${rest.map((a) => a.emoji).join(" ")}</b></span>`, { ms: 3600, kind: "achv" });
    sfx.tier("diamante");
  }, 3500);
  return fresh;
}
function safe(a, c) { try { return !!a.test(c); } catch { return false; } }
