import {
  TIERS, TIER_ORDER, MISS_EMOJI, ROUNDS, ANSWER_MS, PREVIEW_MS, MAX_DEPTH, QUIPS, LAYERS, CATEGORIES,
  PROMPTS, PROMPT_BY_ID, lookup, todayStr, dayNumber, addDays, EPOCH, msToNextDay, formatDate,
  dailyPrompts, randomPrompts, newSeed, scoreOf, depthOf, fmtNum, bandFor, answerSheet, norm,
} from "./core.js";
import * as store from "./store.js";
import { sfx, unlockAudio } from "./sound.js";
import { MASCOTS, spriteSVG } from "./sprites.js";
import { burst, floatText, countUp, toast, buzz, replay } from "./fx.js";
import { ACHIEVEMENTS, check as checkAchievements } from "./achievements.js";
import * as world from "./world.js";

const SITE = location.origin + location.pathname;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const app = $("#app");

// ---------------------------------------------------------------- ciclo de vida
let cleanups = [];
let localTimers = []; // timers da sub-tela atual (rodada, vez do jogador…)
const onCleanup = (fn) => cleanups.push(fn);
function clearLocal() { localTimers.forEach((id) => clearInterval(id)); localTimers = []; }
function clearScreen() { clearLocal(); cleanups.forEach((f) => f()); cleanups = []; }
function every(ms, fn) { const id = setInterval(fn, ms); localTimers.push(id); return id; }
function later(ms, fn) { const id = setTimeout(fn, ms); onCleanup(() => clearTimeout(id)); return id; }
function listen(target, ev, fn, opts) { target.addEventListener(ev, fn, opts); onCleanup(() => target.removeEventListener(ev, fn, opts)); }

// ---------------------------------------------------------------- mundo (fundo que desce)
const gauge = $("#gauge");
function showGauge(meters) {
  const f = Math.max(0, Math.min(1, meters / MAX_DEPTH));
  $("#gauge-fill").style.height = (f * 100).toFixed(2) + "%";
  $("#gauge-label").textContent = fmtNum(Math.round(meters)) + " m";
}
world.onDepth(showGauge);
function setDepth(meters, show = true) {
  const f = Math.max(0, Math.min(1, meters / MAX_DEPTH));
  world.camera(meters, { mode: show ? "game" : "home" });
  if (!show) world.syncTunnel([]);
  gauge.hidden = !show;
  $("#gauge-fill").style.height = (f * 100).toFixed(2) + "%";
  $("#gauge-label").textContent = fmtNum(meters) + " m";
}
function buildGauge() {
  $("#gauge-marks").innerHTML = LAYERS.filter((l) => l.m > 0).map((l) =>
    `<span style="top:${(l.m / MAX_DEPTH) * 100}%" title="${esc(l.label)}"></span>`).join("");
}
function layerToast(fromM, toM) {
  const crossed = LAYERS.filter((l) => l.m > fromM && l.m <= toM).pop();
  if (!crossed) return;
  const t = document.createElement("div");
  t.className = "layer-toast";
  t.innerHTML = `<b>── ${fmtNum(crossed.m)} m</b> ${esc(crossed.label)}`;
  document.body.append(t);
  setTimeout(() => t.remove(), 3600);
}

function applySettings() {
  const s = store.get().settings;
  document.documentElement.classList.toggle("contrast", s.contrast);
  document.documentElement.classList.toggle("low-power", s.lowPower);
  $("#btn-sound").textContent = s.sound ? "🔊" : "🔇";
  $("#btn-sound").setAttribute("aria-label", s.sound ? "Desligar som" : "Ligar som");
  $("#btn-mascot").innerHTML = spriteSVG(s.mascot, 2);
  $("#knob").innerHTML = spriteSVG(s.mascot, 2);
}

// ---------------------------------------------------------------- roteador
const routes = [
  [/^$/, home],
  [/^jogar$/, () => playDaily()],
  [/^arquivo$/, archiveList],
  [/^arquivo\/(\d{4}-\d{2}-\d{2})$/, (d) => playArchive(d)],
  [/^pacotes$/, packList],
  [/^pacote\/([a-z]+)$/, (c) => playPack(c)],
  [/^infinito$/, (q) => playUnlimited(q)],
  [/^resenha$/, party],
  [/^meu$/, myStats],
  [/^config$/, settingsPage],
  [/^faq$/, faq],
];
let screenToken = 0;
function route() {
  screenToken++;
  document.body.classList.remove("digging", "touring");
  clearScreen();
  closeMenu();
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const query = Object.fromEntries(new URLSearchParams(qs || ""));
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) { window.scrollTo(0, 0); fn(...m.slice(1), query); replay(app, "enter"); return; }
  }
  home();
}
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

// ---------------------------------------------------------------- menu
function openMenu() { $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden", "false"); }
function closeMenu() { $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden", "true"); }

// ---------------------------------------------------------------- HOME
function home() {
  setDepth(0, false);
  const today = todayStr();
  const n = dayNumber(today);
  const done = store.get().daily[today];
  const inProgress = store.get().runs["daily:" + today];
  const { current } = store.streaks();
  const s = store.get().settings;
  app.innerHTML = `
  <section class="home">
    <h1 class="logo" aria-label="Garimpo">${"GARIMPO".split("").map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</h1>
    <p class="tagline">o garimpo diário</p>
    <p class="sub">7 perguntas · 30 segundos cada · resposta rara vale ouro</p>
    <div class="mascot-stage">${spriteSVG(s.mascot, 6, "bob")}<span class="speech">${esc(MASCOTS.find((m) => m.id === s.mascot)?.sound ?? "")}</span></div>
    ${done ? `
      <div class="done-box">
        <p>Garimpo #${n} concluído: <b>${done.score} pts</b> · ${fmtNum(depthOf(done.score))} m</p>
        <p class="emoji-row">${done.tiers.map((t) => (t ? TIERS[t].emoji : MISS_EMOJI)).join("")}</p>
        <a class="btn" href="#/jogar">ver resultado</a>
        <p class="countdown">próximo garimpo em <b id="cd">--:--:--</b></p>
      </div>` : `
      <a class="btn btn-big" href="#/jogar" id="begin">▼ ${inProgress ? "CONTINUAR ESCAVAÇÃO" : "COMEÇAR A CAVAR"} ▼</a>`}
    <div class="today card">
      <div class="today-head"><b>GARIMPO #${n}</b><span>${formatDate(today)}</span>${current ? `<span class="streak">🔥 ${current} ${current === 1 ? "dia" : "dias"}</span>` : ""}</div>
      ${done ? "" : `<div class="today-cats">${dailyPrompts(today).map((p, i) => `<span class="cat-pill" style="--cc:${CATEGORIES[p.cat].color};--i:${i}">${CATEGORIES[p.cat].emoji} ${esc(CATEGORIES[p.cat].name)}</span>`).join("")}</div>`}
      ${homeStats()}
    </div>
    <details class="howto" ${store.get().seenHowTo ? "" : "open"}>
      <summary>▸ como jogar</summary>
      <ul>
        <li>7 perguntas por dia. as mesmas pra todo o Brasil.</li>
        <li>30 segundos pra citar <b>uma</b> coisa que se encaixe.</li>
        <li>resposta óbvia é <b>cascalho</b>. resposta rara é <b>ouro</b>.</li>
        <li>aquela que parece esperta? é <b>manjada</b>, todo mundo pensou nela.</li>
        <li>cada pergunta esconde uma <b>pepita</b> 🌟 escolhida a dedo.</li>
        <li>cada ponto cava 10 metros. 700 pontos = pré-sal.</li>
        <li>uma escavação por dia. sem segunda chance.</li>
      </ul>
      <div class="tier-legend">${TIER_ORDER.map((t) => `<span class="chip tier-${t}">${TIERS[t].emoji} ${TIERS[t].name} <b>${TIERS[t].score}</b></span>`).join("")}</div>
    </details>
    <nav class="modes">
      <a href="#/resenha" class="mode"><b>🎉 Resenha</b><small>multiplayer no mesmo celular</small></a>
      <a href="#/infinito" class="mode"><b>∞ Infinito</b><small>cava quanto quiser + desafio</small></a>
      <a href="#/pacotes" class="mode"><b>🧰 Pacotes</b><small>temas: futebol, novela, comida…</small></a>
      <a href="#/arquivo" class="mode"><b>⟲ Arquivo</b><small>garimpos dos dias anteriores</small></a>
    </nav>
  </section>`;
  $(".howto").addEventListener("toggle", () => store.update((st) => { st.seenHowTo = true; }));
  if (done) startCountdown();
}
function homeStats() {
  const s = store.stats();
  if (!s.played) return `<p class="today-hint">7 categorias diferentes hoje. Quanto mais raro, mais fundo.</p>`;
  return `<div class="today-stats"><span><b>${s.best}</b> recorde</span><span><b>${s.avg}</b> média</span><span><b>${s.gems}</b> pepitas 🌟</span><span><b>${s.bestStreak}</b> maior sequência</span></div>`;
}
function startCountdown() {
  const tick = () => {
    const ms = msToNextDay();
    if (ms <= 0) { route(); return; }
    const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    const el = $("#cd"); if (el) el.textContent = [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
  };
  tick(); every(1000, tick);
}

// ---------------------------------------------------------------- MOTOR DA ESCAVAÇÃO (solo)
/**
 * cfg: { key, title, prompts, onFinish(result), resultExtras(result) -> html, share(result) -> string, banner }
 */
function dive(cfg) {
  const st = store.get();
  let run = st.runs[cfg.key];
  if (!run || run.ids.join() !== cfg.prompts.map((p) => p.id).join()) {
    run = { ids: cfg.prompts.map((p) => p.id), i: 0, phase: "intro", results: [], endsAt: null, previewEndsAt: null };
  }
  const prompts = run.ids.map((id) => PROMPT_BY_ID.get(id)).filter(Boolean);
  const total = prompts.length;
  const persist = () => store.update((s) => { s.runs[cfg.key] = run; });
  let busy = false;
  let lastTick = -1;
  let shownScore = null; // placar antes da última resposta (para animar a contagem)
  const myScreen = screenToken;

  const scoreSoFar = () => run.results.reduce((a, r) => a + r.score, 0);

  function render() {
    clearLocal();
    const score = scoreSoFar();
    setDepth(depthOf(score), true);
    world.syncTunnel(run.results);
    if (run.phase === "intro") return renderIntro();
    if (run.phase === "done") return finish();
    const p = prompts[run.i];
    const res = run.results[run.i];
    app.innerHTML = `
    <section class="dive">
      <header class="hud">
        <span class="hud-title">${esc(cfg.title)}</span>
        <span class="pips">${prompts.map((_, k) => {
          const r = run.results[k];
          return `<i class="pip ${k === run.i ? "now" : ""} ${r ? "tier-" + (r.tier ?? "miss") : ""} ${r && k === run.i && run.phase === "feedback" ? "pop" : ""}">${r ? (r.tier ? TIERS[r.tier].emoji : MISS_EMOJI) : k + 1}</i>`;
        }).join("")}</span>
        <span class="hud-score"><b id="hud-score">${shownScore ?? score}</b> pts <small>📍 ${fmtNum(depthOf(score))} m</small></span>
      </header>
      ${cfg.banner ? `<div class="banner">${cfg.banner}</div>` : ""}
      <article class="card prompt-card" style="--cc:${CATEGORIES[p.cat].color}">
        <div class="card-top"><span class="chip cat">${CATEGORIES[p.cat].emoji} ${CATEGORIES[p.cat].name}</span><span class="round">pergunta ${run.i + 1}/${total} · ${fmtNum(p.entries.length)} respostas no veio</span></div>
        <h2 class="prompt ${run.phase === "preview" ? "reveal" : ""}">${esc(p.text)}</h2>
        ${run.phase === "feedback" ? feedbackHTML(res, p) : answerHTML()}
      </article>
    </section>`;
    if (shownScore != null && shownScore !== score) countUp($("#hud-score"), shownScore, score);
    shownScore = null;
    if (run.phase === "feedback") {
      const nextBtn = $("#next");
      nextBtn.addEventListener("click", next);
      nextBtn.focus();
    } else {
      bindAnswer(p);
    }
  }

  function renderIntro() {
    app.innerHTML = `
    <section class="dive intro">
      <article class="card">
        <h2>${esc(cfg.title)}</h2>
        ${cfg.banner ? `<div class="banner">${cfg.banner}</div>` : ""}
        <p>${total} perguntas. ${ANSWER_MS / 1000} segundos cada. Dá pra tentar várias respostas dentro do tempo: só vale a primeira que <b>existir no garimpo</b>.</p>
        <p class="muted">Dica: pense na resposta que <i>ninguém</i> daria — mas que ainda seja certa.</p>
        <button class="btn btn-big" id="go">▼ DESCER A PÁ ▼</button>
      </article>
    </section>`;
    $("#go").addEventListener("click", () => { unlockAudio(); sfx.dig(); startRound(); });
    $("#go").focus();
  }

  function answerHTML() {
    return `
      <div class="timer"><div class="timer-bar" id="bar"></div><span id="secs"></span></div>
      <form id="ans" autocomplete="off">
        <input id="inp" name="a" maxlength="80" placeholder="${run.phase === "preview" ? "prepara a pá…" : "sua resposta"}" ${run.phase === "preview" ? "disabled" : ""}
          autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="Sua resposta">
        <button class="btn" id="send" ${run.phase === "preview" ? "disabled" : ""}>⛏ cavar</button>
      </form>
      <p class="msg" id="msg" aria-live="polite"></p>
      <div class="tried" id="tried">${(run.tried || []).map((t) => `<span class="tried-chip">${esc(t)}</span>`).join("")}</div>
      <button class="link-btn" id="skip" type="button">pular (vale 0)</button>`;
  }

  function feedbackHTML(r, p) {
    const t = r.tier;
    return `
      <div class="feedback ${t ? "tier-" + t : "tier-miss"}">
        <div class="fb-emoji">${t ? TIERS[t].emoji : MISS_EMOJI}</div>
        <div class="fb-body">
          <div class="fb-tier">${t ? TIERS[t].name : "Nada"} <b>+${r.score}</b></div>
          <div class="fb-depth">${r.score ? `⛏ +${fmtNum(r.score * 10)} m · agora a ${fmtNum(depthOf(scoreSoFar()))} m` : `a pá bateu na pedra · ${fmtNum(depthOf(scoreSoFar()))} m`}</div>
          ${r.answer ? `<div class="fb-ans">“${esc(r.answer)}”</div>` : ""}
          <div class="fb-quip">${esc(r.quip)}</div>
          ${t !== "pepita" && p.gem ? `<div class="fb-gem muted">a pepita fica pra revelação no final 🤫</div>` : ""}
        </div>
      </div>
      ${ladderHTML(t)}
      <button class="btn btn-big" id="next">${run.i + 1 >= total ? "VER O TESOURO ▶" : "CAVAR MAIS FUNDO ▼"}</button>`;
  }

  function startRound() {
    const now = Date.now();
    run.phase = "preview";
    run.tried = [];
    run.previewEndsAt = now + PREVIEW_MS;
    run.endsAt = run.previewEndsAt + ANSWER_MS;
    persist();
    render();
  }

  function bindAnswer(p) {
    const inp = $("#inp"), form = $("#ans"), msg = $("#msg"), bar = $("#bar"), secs = $("#secs"), card = $(".prompt-card");
    let pendingCorrection = null;
    const setMsg = (html, cls = "") => { msg.className = "msg " + cls; msg.innerHTML = html; };

    function loop() {
      const now = Date.now();
      if (run.phase === "preview") {
        if (now >= run.previewEndsAt) {
          run.phase = "answering"; persist();
          inp.disabled = false; $("#send").disabled = false; inp.placeholder = "sua resposta"; inp.focus();
        } else { secs.textContent = "…"; bar.style.width = "100%"; return; }
      }
      const left = Math.max(0, run.endsAt - now);
      bar.style.width = (left / ANSWER_MS) * 100 + "%";
      bar.classList.toggle("hurry", left < 8000);
      card.classList.toggle("hurry", left > 0 && left < 5000);
      const sLeft = Math.ceil(left / 1000);
      secs.textContent = sLeft + "s";
      if (left < 5000 && sLeft !== lastTick) { lastTick = sLeft; sfx.tick(); }
      if (left <= 0) timeUp();
    }
    every(100, loop); loop();
    if (run.phase === "answering") inp.focus();

    inp.addEventListener("input", () => { if (pendingCorrection && norm(inp.value) !== norm(pendingCorrection.name)) pendingCorrection = null; });
    form.addEventListener("submit", (e) => { e.preventDefault(); submit(inp.value); });
    $("#skip").addEventListener("click", () => { if (run.phase === "answering") record(p, null, null); });

    function submit(text, final = false) {
      if (busy || run.phase !== "answering") return;
      const raw = text.trim();
      if (!raw) return;
      const hit = lookup(p, raw);
      const settings = store.get().settings;
      if (hit && (hit.exact || final || !settings.confirmCorrections || (pendingCorrection && pendingCorrection === hit.entry))) {
        record(p, raw, hit.entry);
        return;
      }
      if (hit && !hit.exact) {
        pendingCorrection = hit.entry;
        inp.value = hit.entry.name;
        sfx.correction();
        setMsg(`autocorreção: “${esc(raw)}” → <b>${esc(hit.entry.name)}</b>. aperte cavar de novo pra confirmar.`, "warn");
        inp.focus(); inp.select();
        return;
      }
      if (final) return;
      sfx.reject();
      buzz([30, 40, 30]);
      setMsg(`“${esc(raw)}”: nenhum brilho nesse veio. tenta outra!`, "bad");
      replay(card, "shake");
      burst(inp, { colors: ["#5a4148", "#3a2a2a", "#8a7a68"], count: 8, spread: 50 });
      if (!(run.tried ||= []).includes(raw)) {
        run.tried.push(raw); persist();
        $("#tried").insertAdjacentHTML("beforeend", `<span class="tried-chip new">${esc(raw)}</span>`);
      }
      if (settings.clearRejected) inp.value = "";
      inp.focus(); inp.select();
    }

    function timeUp() {
      if (run.phase !== "answering") return;
      const draft = inp.value.trim();
      const hit = draft ? lookup(p, draft) : null;
      record(p, draft || null, hit ? hit.entry : null);
    }
  }

  async function record(p, raw, entry) {
    if (busy) return;
    busy = true;
    clearLocal(); // para o relógio desta rodada
    const before = scoreSoFar();
    const tier = entry ? entry.tier : null;
    run.results[run.i] = {
      promptId: p.id, text: p.text, raw, answer: entry ? entry.name : raw, tier,
      score: scoreOf(tier), quip: pick(QUIPS[tier ?? "miss"]), left: Math.max(0, run.endsAt - Date.now()), tried: [...(run.tried || [])],
    };
    run.phase = "feedback";
    persist();
    document.activeElement?.blur?.();
    document.body.classList.add("digging");
    const from = depthOf(before), to = depthOf(scoreSoFar());
    if (tier) {
      let n = 0;
      await world.dig({
        from, to, tier, answer: entry.name,
        onTick: () => { if (n++ % 3 === 0) sfx.scrape(); },
        onPass: (t) => sfx.pass(TIER_ORDER.indexOf(t)),
        onLand: (el) => {
          sfx.tier(tier);
          buzz(tier === "pepita" ? [30, 50, 30, 50, 90] : 25);
          const rare = ["esmeralda", "diamante", "pepita"].includes(tier);
          burst(el, { colors: rare ? ["#ffd23f", "#fff7b0", "#b9f2ff", "#39d98a"] : ["#7a4a2a", "#a3502a", "#c9a27e"], count: rare ? 26 : 14, sparkle: rare, spread: rare ? 130 : 80 });
          floatText(el, "+" + scoreOf(tier));
          if (tier === "pepita") confetti();
        },
      });
    } else {
      sfx.miss(); buzz([60]);
      await world.clang(from);
    }
    document.body.classList.remove("digging");
    busy = false;
    shownScore = before;
    if (myScreen !== screenToken) return; // saiu da tela no meio da escavação
    render();
    if (tier) replay($("#knob"), "dig");
  }

  function next() {
    sfx.dig();
    if (run.i + 1 >= total) { run.phase = "done"; persist(); finish(); return; }
    run.i++;
    startRound();
  }

  function finish() {
    const score = scoreSoFar();
    const result = { score, tiers: run.results.map((r) => r.tier), results: run.results };
    store.update((s) => { delete s.runs[cfg.key]; });
    cfg.onFinish?.(result);
    sfx.done();
    showResults(cfg, result, { fresh: true });
    checkAchievements({ mode: cfg.mode, result, wonChallenge: cfg.wonChallenge?.(result) });
  }

  // Se a página foi recarregada no meio da rodada e o tempo acabou, conta como perdida.
  if ((run.phase === "answering" || run.phase === "preview") && Date.now() > run.endsAt) {
    const p = prompts[run.i];
    run.results[run.i] = { promptId: p.id, text: p.text, raw: null, answer: null, tier: null, score: 0, quip: "Saiu do garimpo e o tempo correu." };
    run.phase = "feedback";
  }
  persist();
  render();
  listen(document, "visibilitychange", () => { if (!document.hidden && $("#inp")) $("#inp").focus(); });
}

function profileHTML(results) {
  return `<div class="profile" aria-label="perfil da escavação">${results.map((r, i) =>
    `<span class="seg tier-${r.tier ?? "miss"}" style="flex:${Math.max(r.score || 0, 6)};--i:${i}" title="${esc(r.text)}: ${r.tier ? TIERS[r.tier].name : "nada"} (+${r.score})"><i>${r.tier ? TIERS[r.tier].emoji : MISS_EMOJI}</i></span>`).join("")}</div>
    <p class="profile-cap">perfil da escavação · cada faixa é uma resposta</p>`;
}
const REPO_ISSUES = "https://github.com/GustavoLeitao07/garimpo/issues/new";
function suggestHTML(results) {
  const withTries = results.filter((r) => r.tried && r.tried.length);
  if (!withTries.length) return "";
  const body = "Respostas recusadas que eu acho que deviam valer:\n\n" + withTries.map((r) => `**${r.text}**\n` + r.tried.map((t) => `- ${t}`).join("\n")).join("\n\n");
  const url = `${REPO_ISSUES}?title=${encodeURIComponent("Sugestão de respostas pro garimpo")}&body=${encodeURIComponent(body)}`;
  return `<article class="card suggest">
    <h3>🤔 recusadas que você acha que valiam?</h3>
    ${withTries.map((r) => `<p><b>${esc(r.text)}</b><br>${r.tried.map((t) => `<span class="tried-chip">${esc(t)}</span>`).join(" ")}</p>`).join("")}
    <a class="btn ghost" target="_blank" rel="noopener" href="${url}">sugerir pro garimpo ↗</a>
    <p class="muted small">Abre uma sugestão no GitHub do jogo. As boas entram na próxima atualização.</p>
  </article>`;
}

function ladderHTML(tier) {
  return `<div class="ladder" aria-label="escada de raridade">${TIER_ORDER.map((t) =>
    `<span class="rung tier-${t} ${t === tier ? "hit" : ""}" title="${TIERS[t].name} · ${TIERS[t].score}"><i>${TIERS[t].emoji}</i><small>${TIERS[t].score}</small></span>`).join("")}</div>`;
}

// ---------------------------------------------------------------- RESULTADOS
function showResults(cfg, result, { replay: again = false, fresh = false } = {}) {
  const { score, results } = result;
  const band = bandFor(score);
  const max = results.length * 100;
  setDepth(depthOf(score), true);
  const share = cfg.share ? cfg.share(result) : null;
  world.syncTunnel(results);
  app.innerHTML = `
  <section class="results">
    <article class="card result-head tier-${band.tier}">
      <p class="muted">${esc(cfg.title)}${again ? " · já concluído" : ""}</p>
      <div class="big-score"><b id="big-score">${fresh ? 0 : score}</b><small>/${max} pts</small></div>
      <p class="depth">⛏️ ${fmtNum(depthOf(score))} metros de profundidade</p>
      <h2>${TIERS[band.tier].emoji} ${band.title}</h2>
      <p>${esc(band.text)}</p>
      ${profileHTML(results)}
      <p class="emoji-row ${fresh ? "stagger" : ""}">${result.tiers.map((t, i) => `<span style="--i:${i}">${t ? TIERS[t].emoji : MISS_EMOJI}</span>`).join("")}</p>
      ${share ? `<div class="row center"><button class="btn" id="share">copiar resultado 📋</button><a class="btn zap" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(share)}">mandar no zap 💬</a></div>` : ""}
      <div class="row center"><button class="btn ghost" id="tour">🎥 rever a escavação</button></div>
      ${cfg.resultExtras ? cfg.resultExtras(result) : ""}
    </article>
    <h3 class="section-title">o que tinha em cada veio</h3>
    <ol class="res-list ${fresh ? "stagger" : ""}">
      ${results.map((r, idx) => {
        const p = PROMPT_BY_ID.get(r.promptId);
        return `<li class="card res-row tier-${r.tier ?? "miss"}" style="--i:${idx}">
          <div class="res-emoji">${r.tier ? TIERS[r.tier].emoji : MISS_EMOJI}</div>
          <div class="res-body">
            <div class="res-q">${esc(r.text)}</div>
            <div class="res-a">${r.answer ? `“${esc(r.answer)}”` : "<i>sem resposta</i>"} · ${r.tier ? TIERS[r.tier].name : "nada"} <b>+${r.score}</b></div>
            ${p?.gem ? `<div class="res-gem">🌟 a pepita era: <b>${esc(p.gem.name)}</b></div>` : ""}
            ${p ? `<details class="sheet"><summary>ver o garimpo completo (${p.entries.length} respostas)</summary>
              ${answerSheet(p, Infinity).map((row) => `<div class="sheet-row tier-${row.tier}"><span class="chip tier-${row.tier}">${TIERS[row.tier].emoji} ${TIERS[row.tier].name} · ${row.total}</span> ${row.sample.map((n) => n === r.answer && r.tier === row.tier ? `<mark>${esc(n)}</mark>` : esc(n)).join(", ")}</div>`).join("")}
            </details>` : ""}
          </div>
        </li>`;
      }).join("")}
    </ol>
    ${suggestHTML(results)}
    <div class="row center"><a class="btn ghost" href="#/">◀ início</a> <a class="btn" href="#/infinito">∞ jogar infinito</a></div>
  </section>`;
  if (share) {
    $("#share").addEventListener("click", async () => {
      const ok = await copyText(share);
      toast(ok ? "copiado! cola no grupo da família 😎" : "não deu pra copiar 😕");
    });
  }
  $("#tour").addEventListener("click", async () => {
    sfx.dig();
    await world.tour(depthOf(score));
  });
  if (fresh) {
    later(250, () => countUp($("#big-score"), 0, score, 1400));
    if (score >= 381) later(1500, confetti);
  }
  if ($("#cd")) startCountdown();
  bindExtras?.();
  bindExtras = null;
}
let bindExtras = null;

async function copyText(text) {
  try {
    if (navigator.share && matchMedia("(pointer:coarse)").matches) { await navigator.share({ text }); return true; }
  } catch { /* cancelado */ }
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
const emojiRow = (tiers) => tiers.map((t) => (t ? TIERS[t].emoji : MISS_EMOJI)).join("");

// ---------------------------------------------------------------- MODOS
function playDaily() {
  const today = todayStr();
  const n = dayNumber(today);
  const title = `GARIMPO #${n}`;
  const share = (r) => `Garimpo #${n} ⛏️\n${emojiRow(r.tiers)}\n${r.score} pts · ${fmtNum(depthOf(r.score))} m\n${SITE}`;
  const extras = () => `<p class="countdown">próximo garimpo em <b id="cd">--:--:--</b></p>`;
  const done = store.get().daily[today];
  if (done) return showResults({ title, share, resultExtras: extras }, done, { replay: true });
  dive({
    key: "daily:" + today, mode: "daily", title, prompts: dailyPrompts(today), share, resultExtras: extras,
    onFinish: (r) => store.update((s) => { s.daily[today] = r; }),
  });
}

function archiveList() {
  setDepth(0, false);
  const today = todayStr();
  const st = store.get();
  const days = [];
  for (let d = addDays(today, -1); d >= EPOCH; d = addDays(d, -1)) days.push(d);
  app.innerHTML = `
  <section class="page">
    <h2>⟲ Arquivo</h2>
    <p class="muted">Garimpos dos dias anteriores. Não contam pra sequência, mas contam pra coleção.</p>
    <ul class="list">
      ${days.map((d) => {
        const r = st.daily[d] || st.archive[d];
        return `<li><a class="list-item" href="#/arquivo/${d}">
          <span><b>#${dayNumber(d)}</b> · ${formatDate(d)}</span>
          <span>${r ? `<span class="emoji-row sm">${emojiRow(r.tiers)}</span> <b>${r.score}</b>` : `<span class="chip">jogar ▶</span>`}</span>
        </a></li>`;
      }).join("") || "<li class='muted'>Ainda não há dias anteriores.</li>"}
    </ul>
  </section>`;
}

function playArchive(date) {
  if (date >= todayStr() || date < EPOCH) return go("#/arquivo");
  const n = dayNumber(date);
  const title = `GARIMPO #${n} ⟲ ${formatDate(date)}`;
  const share = (r) => `Garimpo ⟲ #${n} ⛏️\n${emojiRow(r.tiers)}\n${r.score} pts\n${SITE}`;
  const prev = store.get().daily[date] || store.get().archive[date];
  if (prev) return showResults({ title, share }, prev, { replay: true });
  dive({
    key: "archive:" + date, mode: "archive", title, prompts: dailyPrompts(date), share,
    onFinish: (r) => store.update((s) => { s.archive[date] = r; }),
  });
}

function packList() {
  setDepth(0, false);
  const st = store.get();
  app.innerHTML = `
  <section class="page">
    <h2>🧰 Pacotes temáticos</h2>
    <p class="muted">Escavações de 7 perguntas de um tema só. Perguntas que você ainda não viu aparecem primeiro.</p>
    <div class="grid">
      ${Object.entries(CATEGORIES).map(([id, c]) => {
        const count = PROMPTS.filter((p) => p.cat === id).length;
        const prog = st.packs[id];
        return `<a class="card pack" href="#/pacote/${id}" style="--cc:${c.color}">
          <div class="pack-emoji">${c.emoji}</div>
          <b>${c.name}</b>
          <small>${esc(c.desc)}</small>
          <small class="muted">${count} perguntas${prog ? ` · ${prog.plays}x · recorde ${prog.best}` : ""}</small>
        </a>`;
      }).join("")}
    </div>
  </section>`;
}

function playPack(cat) {
  if (!CATEGORIES[cat]) return go("#/pacotes");
  const c = CATEGORIES[cat];
  const key = "pack:" + cat;
  const existing = store.get().runs[key];
  const seen = new Set(store.get().packs[cat]?.seen || []);
  const prompts = existing ? existing.ids.map((id) => PROMPT_BY_ID.get(id)).filter(Boolean) : randomPrompts(newSeed(), ROUNDS, cat, seen);
  dive({
    key, mode: "pack", title: `${c.emoji} ${c.name.toUpperCase()}`, prompts,
    share: (r) => `Garimpo · ${c.name} ${c.emoji}\n${emojiRow(r.tiers)}\n${r.score} pts\n${SITE}`,
    resultExtras: () => `<div class="row center"><a class="btn" href="#/pacote/${cat}" id="again">cavar de novo ↻</a></div>`,
    onFinish: (r) => store.update((s) => {
      const pk = (s.packs[cat] ??= { plays: 0, best: 0, seen: [] });
      pk.plays++; pk.best = Math.max(pk.best, r.score);
      pk.seen = [...new Set([...pk.seen, ...r.results.map((x) => x.promptId)])];
    }),
  });
  bindExtras = () => $("#again")?.addEventListener("click", (e) => { e.preventDefault(); route(); });
}

function playUnlimited(query = {}) {
  const st = store.get();
  const existing = st.runs.unlimited;
  const seed = query.s || existing?.seed || newSeed();
  const vs = query.n && query.p ? { name: query.n.slice(0, 24), score: Number(query.p) || 0 } : existing?.vs || null;
  const avoid = query.s ? new Set() : new Set(st.unlimited.seen);
  const prompts = randomPrompts("inf-" + seed, ROUNDS, null, avoid);
  if (existing && existing.seed !== seed) store.update((s) => { delete s.runs.unlimited; });
  const banner = vs ? `⚔️ <b>${esc(vs.name)}</b> fez <b>${vs.score} pts</b> nesse garimpo. Consegue cavar mais fundo?` : "";
  dive({
    key: "unlimited", mode: "unlimited", title: `∞ INFINITO · ${seed}`, prompts, banner,
    wonChallenge: (r) => !!vs && r.score > vs.score,
    share: (r) => `Garimpo ∞ ${seed} ⛏️\n${emojiRow(r.tiers)}\n${r.score} pts\n${SITE}#/infinito?s=${seed}`,
    resultExtras: (r) => `
      ${vs ? `<p class="vs">${r.score > vs.score ? "🏆 Você cavou mais fundo que" : r.score === vs.score ? "🤝 Empate com" : "😅 Não foi dessa vez contra"} <b>${esc(vs.name)}</b> (${vs.score} pts)</p>` : ""}
      <div class="row center">
        <button class="btn" id="challenge">⚔️ desafiar alguém</button>
        <a class="btn ghost" href="#/infinito" id="again">nova escavação ↻</a>
      </div>
      <p class="msg" id="ch-msg" aria-live="polite"></p>`,
    onFinish: (r) => store.update((s) => {
      s.unlimited.plays++; s.unlimited.best = Math.max(s.unlimited.best, r.score);
      s.unlimited.seen = [...new Set([...s.unlimited.seen, ...r.results.map((x) => x.promptId)])].slice(-60);
    }),
  });
  // guarda seed e desafio junto da partida
  store.update((s) => { if (s.runs.unlimited) { s.runs.unlimited.seed = seed; s.runs.unlimited.vs = vs; } });
  bindExtras = () => {
    $("#again")?.addEventListener("click", (e) => { e.preventDefault(); store.update((s) => { delete s.runs.unlimited; }); location.hash = "#/infinito"; if (location.hash === "#/infinito") route(); });
    $("#challenge")?.addEventListener("click", async () => {
      let name = store.get().settings.name;
      if (!name) {
        name = (prompt("Seu nome pro desafio:") || "").trim().slice(0, 24);
        if (name) store.update((s) => { s.settings.name = name; });
      }
      const sc = Number($(".big-score b").textContent);
      const link = `${SITE}#/infinito?s=${seed}&n=${encodeURIComponent(name || "Alguém")}&p=${sc}`;
      const ok = await copyText(`⚔️ Fiz ${sc} pts no Garimpo. Duvido você cavar mais fundo:\n${link}`);
      if (ok) toast("link do desafio copiado! ⚔️"); else $("#ch-msg").textContent = link;
    });
  };
}

// ---------------------------------------------------------------- RESENHA (multiplayer local)
let P = null; // estado da resenha em memória
function party() {
  setDepth(0, false);
  if (!P) return partySetup();
  partyRender();
}
function partySetup() {
  const names = store.get().party.names.length ? store.get().party.names : ["", ""];
  app.innerHTML = `
  <section class="page">
    <h2>🎉 Resenha</h2>
    <p>Multiplayer no mesmo celular: cada um responde escondido e passa adiante. No fim de cada rodada, todo mundo vê o que cada um cavou.</p>
    <p class="muted"><b>Regra da resenha:</b> se duas pessoas derem a mesma resposta, <b>ninguém pontua</b> com ela. Quanto mais raro, melhor!</p>
    <form id="setup" class="card form">
      <label>Jogadores (2 a 8)</label>
      <div id="names">${names.map((n, i) => nameInput(n, i)).join("")}</div>
      <button type="button" class="link-btn" id="add">+ adicionar jogador</button>
      <label>Rodadas
        <select name="rounds"><option>3</option><option selected>5</option><option>7</option><option>10</option></select></label>
      <label>Tempo por resposta
        <select name="time"><option value="20">20 s</option><option value="30" selected>30 s</option><option value="45">45 s</option></select></label>
      <label>Tema
        <select name="cat"><option value="">Tudo misturado</option>${Object.entries(CATEGORIES).map(([id, c]) => `<option value="${id}">${c.emoji} ${c.name}</option>`).join("")}</select></label>
      <label class="toggle"><input type="checkbox" name="dupe" checked> Resposta repetida zera</label>
      <button class="btn btn-big">▼ COMEÇAR A RESENHA ▼</button>
      <p class="msg bad" id="err"></p>
    </form>
  </section>`;
  $("#add").addEventListener("click", () => {
    const box = $("#names");
    if (box.children.length >= 8) return;
    box.insertAdjacentHTML("beforeend", nameInput("", box.children.length));
    box.lastElementChild.querySelector("input").focus();
  });
  $("#names").addEventListener("click", (e) => { if (e.target.matches(".rm") && $("#names").children.length > 2) e.target.parentElement.remove(); });
  $("#setup").addEventListener("submit", (e) => {
    e.preventDefault();
    unlockAudio();
    const f = new FormData(e.target);
    const players = $$("#names input").map((i) => i.value.trim()).filter(Boolean);
    if (players.length < 2) { $("#err").textContent = "Precisa de pelo menos 2 jogadores."; return; }
    if (new Set(players.map(norm)).size !== players.length) { $("#err").textContent = "Nomes repetidos confundem a resenha 😅"; return; }
    store.update((s) => { s.party.names = players; });
    const rounds = Number(f.get("rounds"));
    P = {
      players: players.map((name) => ({ name, score: 0 })),
      prompts: randomPrompts(newSeed(), rounds, f.get("cat") || null),
      time: Number(f.get("time")) * 1000,
      dupe: f.get("dupe") === "on",
      r: 0, turn: 0, phase: "intro", answers: [],
    };
    sfx.dig();
    partyRender();
  });
}
const nameInput = (v, i) => `<div class="name-row"><input maxlength="16" placeholder="Jogador ${i + 1}" value="${esc(v)}" aria-label="Nome do jogador ${i + 1}"><button type="button" class="rm" aria-label="remover">×</button></div>`;

function partyRender() {
  clearLocal();
  const p = P.prompts[P.r];
  const pl = P.players[P.turn];
  const head = `<header class="hud"><span class="hud-title">🎉 RESENHA</span><span>rodada ${P.r + 1}/${P.prompts.length}</span></header>`;
  if (P.phase === "intro") {
    app.innerHTML = `<section class="dive">${head}
      <article class="card prompt-card" style="--cc:${CATEGORIES[p.cat].color}">
        <div class="card-top"><span class="chip cat">${CATEGORIES[p.cat].emoji} ${CATEGORIES[p.cat].name}</span></div>
        <h2 class="prompt">${esc(p.text)}</h2>
        <p class="muted">Todo mundo leu? Cada um vai responder escondido, na vez.</p>
        <button class="btn btn-big" id="ok">bora ▶</button>
      </article></section>`;
    $("#ok").addEventListener("click", () => { P.phase = "handoff"; partyRender(); });
    $("#ok").focus();
  } else if (P.phase === "handoff") {
    app.innerHTML = `<section class="dive">${head}
      <article class="card center handoff">
        <p class="muted">passa o celular pra</p>
        <h2 class="who">${esc(pl.name)}</h2>
        <p>👀 os outros não podem olhar!</p>
        <button class="btn btn-big" id="me">sou eu, bora!</button>
      </article></section>`;
    $("#me").addEventListener("click", () => { P.phase = "answer"; P.endsAt = Date.now() + P.time; partyRender(); });
  } else if (P.phase === "answer") {
    app.innerHTML = `<section class="dive">${head}
      <article class="card prompt-card">
        <div class="card-top"><span class="chip">vez de ${esc(pl.name)}</span></div>
        <h2 class="prompt">${esc(p.text)}</h2>
        <div class="timer"><div class="timer-bar" id="bar"></div><span id="secs"></span></div>
        <form id="ans" autocomplete="off">
          <input id="inp" type="password" maxlength="80" placeholder="resposta secreta" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Resposta secreta">
          <button class="btn">cavar</button>
        </form>
        <label class="toggle small"><input type="checkbox" id="peek"> mostrar o que estou digitando</label>
        <p class="msg" id="msg" aria-live="polite"></p>
      </article></section>`;
    const inp = $("#inp");
    inp.focus();
    $("#peek").addEventListener("change", (e) => { inp.type = e.target.checked ? "text" : "password"; inp.focus(); });
    let done = false;
    const finishTurn = (raw, entry) => {
      if (done) return; done = true;
      P.answers[P.turn] = { raw, entry };
      if (entry) sfx.dig(); else sfx.miss();
      P.phase = "stored"; partyRender();
    };
    const tick = () => {
      const left = Math.max(0, P.endsAt - Date.now());
      $("#bar").style.width = (left / P.time) * 100 + "%";
      $("#bar").classList.toggle("hurry", left < 6000);
      $("#secs").textContent = Math.ceil(left / 1000) + "s";
      if (left <= 0) { const v = inp.value.trim(); const h = v ? lookup(p, v) : null; finishTurn(v || null, h?.entry ?? null); }
    };
    every(100, tick); tick();
    $("#ans").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = inp.value.trim(); if (!v) return;
      const h = lookup(p, v);
      if (h) return finishTurn(v, h.entry);
      sfx.reject();
      $("#msg").className = "msg bad";
      $("#msg").textContent = "não achei isso no garimpo. tenta outra!";
      inp.select();
    });
  } else if (P.phase === "stored") {
    const last = P.turn + 1 >= P.players.length;
    app.innerHTML = `<section class="dive">${head}
      <article class="card center handoff">
        <h2>🤫 resposta guardada</h2>
        <p>${last ? "todo mundo respondeu!" : `agora é a vez de <b>${esc(P.players[P.turn + 1].name)}</b>`}</p>
        <button class="btn btn-big" id="nx">${last ? "REVELAR ▶" : "passar adiante ▶"}</button>
      </article></section>`;
    $("#nx").addEventListener("click", () => {
      if (last) { partyScore(); P.phase = "reveal"; sfx.done(); }
      else { P.turn++; P.phase = "handoff"; }
      partyRender();
    });
  } else if (P.phase === "reveal") {
    const lastRound = P.r + 1 >= P.prompts.length;
    app.innerHTML = `<section class="dive">${head}
      <article class="card">
        <h2 class="prompt sm">${esc(p.text)}</h2>
        <ul class="reveal">${P.players.map((pl, i) => {
          const a = P.answers[i];
          return `<li class="tier-${a.entry ? a.entry.tier : "miss"} ${a.dup ? "dup" : ""}">
            <b>${esc(pl.name)}</b>
            <span>${a.entry ? `${TIERS[a.entry.tier].emoji} ${esc(a.entry.name)}` : `${MISS_EMOJI} <i>nada</i>`}${a.dup ? " <em>repetiu!</em>" : ""}</span>
            <b>+${a.pts}</b></li>`;
        }).join("")}</ul>
        ${p.gem ? `<p class="res-gem">🌟 a pepita era: <b>${esc(p.gem.name)}</b></p>` : ""}
        <h3>placar</h3>
        ${scoreboard()}
        <button class="btn btn-big" id="nx">${lastRound ? "VER O PÓDIO 🏆" : "PRÓXIMA RODADA ▼"}</button>
      </article></section>`;
    $("#nx").addEventListener("click", () => {
      if (lastRound) { P.phase = "end"; }
      else { P.r++; P.turn = 0; P.answers = []; P.phase = "intro"; }
      partyRender();
    });
  } else if (P.phase === "end") {
    const ranking = [...P.players].sort((a, b) => b.score - a.score);
    const medals = ["🥇", "🥈", "🥉"];
    app.innerHTML = `<section class="dive">${head}
      <article class="card center">
        <h2>🏆 Pódio da resenha</h2>
        <ol class="podium">${ranking.map((pl, i) => `<li><span>${medals[i] ?? i + 1 + "º"}</span> <b>${esc(pl.name)}</b> <span>${pl.score} pts</span></li>`).join("")}</ol>
        <p>${esc(ranking[0].name)} é o garimpeiro mais raiz da roda!</p>
        <div class="row center"><button class="btn" id="again">revanche ↻</button><button class="btn" id="new">novos jogadores</button></div>
      </article></section>`;
    confetti();
    checkAchievements({ mode: "party" });
    $("#again").addEventListener("click", () => {
      P = { ...P, players: P.players.map((x) => ({ ...x, score: 0 })), prompts: randomPrompts(newSeed(), P.prompts.length), r: 0, turn: 0, answers: [], phase: "intro" };
      partyRender();
    });
    $("#new").addEventListener("click", () => { P = null; partySetup(); });
  }
}
function partyScore() {
  const counts = new Map();
  P.answers.forEach((a) => { if (a.entry) counts.set(a.entry, (counts.get(a.entry) || 0) + 1); });
  P.answers.forEach((a, i) => {
    a.dup = !!(a.entry && P.dupe && counts.get(a.entry) > 1);
    a.pts = a.entry && !a.dup ? scoreOf(a.entry.tier) : 0;
    P.players[i].score += a.pts;
  });
}
function scoreboard() {
  const rk = [...P.players].sort((a, b) => b.score - a.score);
  return `<ol class="board">${rk.map((pl) => `<li><span>${esc(pl.name)}</span><b>${pl.score}</b></li>`).join("")}</ol>`;
}

// ---------------------------------------------------------------- MEU GARIMPO
function myStats() {
  setDepth(0, false);
  const s = store.stats();
  const st = store.get();
  const maxDist = Math.max(1, ...Object.values(s.dist));
  const last = [];
  for (let i = 13; i >= 0; i--) { const d = addDays(todayStr(), -i); last.push([d, st.daily[d]]); }
  app.innerHTML = `
  <section class="page">
    <h2>⛏️ Meu Garimpo</h2>
    <div class="stats">
      <div class="stat"><b>${s.played}</b><small>garimpos diários</small></div>
      <div class="stat"><b>${s.current}</b><small>sequência atual</small></div>
      <div class="stat"><b>${s.bestStreak}</b><small>maior sequência</small></div>
      <div class="stat"><b>${s.avg}</b><small>média de pontos</small></div>
      <div class="stat"><b>${s.best}</b><small>recorde</small></div>
      <div class="stat"><b>${s.gems}</b><small>pepitas achadas 🌟</small></div>
    </div>
    <h3>últimos 14 dias</h3>
    <div class="spark">${last.map(([d, r]) => `<div class="spark-col" title="${formatDate(d)}: ${r ? r.score + " pts" : "não jogou"}"><i style="height:${r ? Math.max(4, (r.score / 700) * 100) : 0}%"></i><small>${d.slice(8)}</small></div>`).join("")}</div>
    <h3>o que você mais acha (diário + arquivo)</h3>
    <div class="dist">${[...TIER_ORDER.slice().reverse(), "miss"].map((t) => `
      <div class="dist-row"><span>${t === "miss" ? MISS_EMOJI + " Nada" : TIERS[t].emoji + " " + TIERS[t].name}</span>
      <div class="dist-bar tier-${t}"><i style="width:${(s.dist[t] / maxDist) * 100}%"></i></div><b>${s.dist[t]}</b></div>`).join("")}</div>
    <h3>conquistas (${Object.keys(st.achievements || {}).length}/${ACHIEVEMENTS.length})</h3>
    <div class="achvs">${ACHIEVEMENTS.map((a) => {
      const when = st.achievements?.[a.id];
      return `<div class="achv ${when ? "on" : ""}"><span class="achv-emoji">${when ? a.emoji : "🔒"}</span><span><b>${esc(a.name)}</b><small>${esc(a.desc)}${when ? ` · ${formatDate(when)}` : ""}</small></span></div>`;
    }).join("")}</div>
    <h3>coleção de mascotes</h3>
    ${mascotGrid(s.bestStreak)}
    <p class="muted">Mascotes destravam com a sua maior sequência de dias seguidos.</p>
    <p class="muted">Infinito: ${st.unlimited.plays} escavações · recorde ${st.unlimited.best}. Arquivo: ${s.archivePlayed} dias.</p>
  </section>`;
  bindMascots();
}
function mascotGrid(bestStreak) {
  const cur = store.get().settings.mascot;
  return `<div class="mascots">${MASCOTS.map((m) => {
    const ok = bestStreak >= m.unlock;
    return `<button class="mascot ${cur === m.id ? "sel" : ""}" data-m="${m.id}" ${ok ? "" : "disabled"} aria-pressed="${cur === m.id}">
      ${spriteSVG(m.id, 4, ok ? "" : "locked")}<b>${ok ? esc(m.name) : "???"}</b><small>${ok ? (cur === m.id ? "usando" : "usar") : `🔒 ${m.unlock} dias seguidos`}</small></button>`;
  }).join("")}</div>`;
}
function bindMascots() {
  $$(".mascot[data-m]").forEach((b) => b.addEventListener("click", () => {
    store.update((s) => { s.settings.mascot = b.dataset.m; });
    applySettings(); sfx.click(); route();
  }));
}

// ---------------------------------------------------------------- CONFIG
function settingsPage() {
  setDepth(0, false);
  const s = store.get().settings;
  const tog = (k, label, help) => `<label class="toggle"><input type="checkbox" data-k="${k}" ${s[k] ? "checked" : ""}><span><b>${label}</b><small>${help}</small></span></label>`;
  app.innerHTML = `
  <section class="page">
    <h2>⚙ Configurações</h2>
    <div class="card form">
      ${tog("sound", "Som", "Efeitos sonoros 8-bit.")}
      ${tog("vibrate", "Vibração", "Vibra o celular ao acertar, errar e achar pepita.")}
      ${tog("confirmCorrections", "Confirmar autocorreção", "Quando você erra uma letra, mostra a correção antes de aceitar.")}
      ${tog("clearRejected", "Limpar resposta recusada", "Apaga o campo quando a resposta não existe no garimpo.")}
      ${tog("contrast", "Alto contraste / daltonismo", "Cores mais fortes e níveis identificados por texto e borda.")}
      ${tog("lowPower", "Modo econômico", "Sem animações. Bom pra celular fraco ou pra quem enjoa.")}
      <label>Seu nome (pros desafios)<input id="name" maxlength="24" value="${esc(s.name)}" placeholder="ex.: Gustavo"></label>
    </div>
    <h3 id="mascote">Mascote</h3>
    ${mascotGrid(store.streaks().best)}
    <h3>Dados</h3>
    <p class="muted">Tudo fica salvo só neste navegador (localStorage). Nada vai pra servidor.</p>
    <div class="row"><button class="btn" id="export">exportar progresso</button><button class="btn" id="import">importar</button><button class="btn danger" id="reset">apagar tudo</button></div>
    <p class="msg" id="dmsg"></p>
  </section>`;
  $$("input[data-k]").forEach((i) => i.addEventListener("change", () => { store.update((st) => { st.settings[i.dataset.k] = i.checked; }); applySettings(); sfx.click(); }));
  $("#name").addEventListener("change", (e) => store.update((st) => { st.settings.name = e.target.value.trim(); }));
  bindMascots();
  $("#export").addEventListener("click", async () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(store.get()))));
    const ok = await copyText(code);
    if (ok) toast("código copiado! cole em \"importar\" no outro aparelho."); else $("#dmsg").textContent = code;
  });
  $("#import").addEventListener("click", () => {
    const code = prompt("Cole o código exportado:");
    if (!code) return;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      localStorage.setItem("garimpo:v1", JSON.stringify(data));
      location.reload();
    } catch { $("#dmsg").textContent = "código inválido 😕"; }
  });
  $("#reset").addEventListener("click", () => {
    if (confirm("Apagar todo o progresso, sequências e mascotes? Não dá pra desfazer.")) { store.reset(); applySettings(); route(); }
  });
}

// ---------------------------------------------------------------- FAQ
function faq() {
  setDepth(0, false);
  const total = PROMPTS.reduce((a, p) => a + p.entries.length, 0);
  const qa = [
    ["como funciona a pontuação?", `Cada pergunta tem um \"garimpo\": uma lista de respostas aceitas, cada uma classificada pela raridade. ${TIER_ORDER.map((t) => `${TIERS[t].emoji} <b>${TIERS[t].name}</b> vale ${TIERS[t].score}`).join(", ")}. O máximo por dia é 700.`],
    ["o que é \"Manjado\"?", "É a resposta que parece obscura, mas que todo mundo que quer parecer esperto dá. Tipo dizer \"Acre\" quando pedem um estado."],
    ["o que é a pepita?", "Em toda pergunta tem uma resposta escolhida a dedo como a joia do dia. Nem sempre é a mais rara de todas: é a mais gostosa de acertar."],
    ["por que minha resposta não foi aceita?", "Porque ela não está no garimpo daquela pergunta. Os garimpos são curados à mão e às vezes falta coisa. Dentro dos 30 segundos você pode tentar quantas respostas quiser."],
    ["a autocorreção mudou minha resposta!", "Erros de 1 ou 2 letras são corrigidos para a resposta mais próxima. Com \"Confirmar autocorreção\" ligado (padrão), você vê a correção antes de aceitar."],
    ["as perguntas são iguais pra todo mundo?", "Sim. O garimpo diário é sorteado a partir da data (horário de Brasília) e muda à meia-noite."],
    ["como funciona a Resenha?", "É o modo festa: 2 a 8 pessoas no mesmo celular. Cada um responde escondido e, se duas pessoas derem a mesma resposta, ninguém pontua com ela."],
    ["e o desafio?", "No modo Infinito, termine uma escavação e toque em \"desafiar alguém\". O link leva seu amigo pras mesmas 7 perguntas com o seu placar na tela."],
    ["dá pra instalar no celular?", "Dá! No Android/Chrome, abra o menu ☰ e toque em \"instalar no celular\" (ou em \"Adicionar à tela inicial\" no menu do navegador). No iPhone, toque em Compartilhar → \"Adicionar à Tela de Início\". Depois de instalado, funciona até sem internet."],
    ["o que são as conquistas?", "São medalhas por feitos especiais: achar duas pepitas no mesmo dia, responder em menos de 3 segundos, fazer 500 pontos, manter a sequência… Veja todas em \"Meu garimpo\"."],
    ["meus dados vão pra algum lugar?", "Não. Tudo fica no seu navegador. Dá pra exportar/importar o progresso nas configurações."],
    ["quantas perguntas existem?", `Hoje são ${PROMPTS.length} perguntas e ${fmtNum(total)} respostas aceitas, em ${Object.keys(CATEGORIES).length} categorias.`],
    ["de onde veio a ideia?", "Garimpo é um jogo do gênero de \"resposta rara\" (como Pointless e Krillion), feito do zero em português, com temas e cultura brasileira."],
  ];
  app.innerHTML = `<section class="page"><h2>❓ Perguntas frequentes</h2>
    ${qa.map(([q, a]) => `<details class="card faq"><summary>${esc(q)}</summary><p>${a}</p></details>`).join("")}
    <div class="row center"><a class="btn" href="#/">◀ voltar pro garimpo</a></div></section>`;
}

// ---------------------------------------------------------------- confete
function confetti() {
  if (store.get().settings.lowPower) return;
  const box = document.createElement("div");
  box.className = "confetti";
  const bits = ["🌟", "✨", "💎", "🪙", "⭐"];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span");
    s.textContent = pick(bits);
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    s.style.fontSize = 14 + Math.random() * 18 + "px";
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3200);
}

// ---------------------------------------------------------------- init
$("#btn-menu").addEventListener("click", openMenu);
$("#drawer").addEventListener("click", (e) => { if (e.target.id === "drawer" || e.target.closest("a,.close")) closeMenu(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
$("#btn-sound").addEventListener("click", () => { store.update((s) => { s.settings.sound = !s.settings.sound; }); applySettings(); unlockAudio(); sfx.click(); });
$("#btn-mascot").addEventListener("click", () => go("#/meu"));
window.addEventListener("hashchange", route);
world.initWorld($("#world"));
buildGauge();
applySettings();
route();
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; $("#install").hidden = false; });
$("#install").addEventListener("click", async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice.catch(() => null);
  installEvt = null; $("#install").hidden = true;
});
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* offline indisponível */ });
}
