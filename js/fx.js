// Pequenos efeitos visuais e táteis. Tudo respeita o "modo econômico".
import { get } from "./store.js";

const calm = () => get().settings.lowPower || matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Explosão de pedrinhas/brilhos saindo de um elemento. */
export function burst(el, { colors = ["#7a4a2a", "#a3502a", "#5a4148"], count = 14, spread = 90, sparkle = false } = {}) {
  if (!el || calm()) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    p.className = "particle" + (sparkle ? " sparkle" : "");
    const ang = Math.random() * Math.PI * 2;
    const dist = spread * (0.4 + Math.random() * 0.8);
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist - 30 + "px");
    p.style.setProperty("--rot", Math.random() * 360 + "deg");
    p.style.background = colors[i % colors.length];
    const size = 4 + Math.random() * 6;
    p.style.width = p.style.height = size + "px";
    document.body.append(p);
    setTimeout(() => p.remove(), 900);
  }
}

/** Texto que sobe e some (ex.: "+60"). */
export function floatText(el, text, color = "#ffd23f") {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement("span");
  f.className = "float-text";
  f.textContent = text;
  f.style.left = r.left + r.width / 2 + "px";
  f.style.top = r.top + "px";
  f.style.color = color;
  document.body.append(f);
  setTimeout(() => f.remove(), 1300);
}

/** Conta de um número até outro dentro de um elemento. */
export function countUp(el, from, to, ms = 900) {
  if (!el) return;
  if (calm() || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let toastBox;
/** Aviso flutuante no topo da tela. */
export function toast(html, { ms = 2600, kind = "" } = {}) {
  if (!toastBox) { toastBox = document.createElement("div"); toastBox.className = "toasts"; toastBox.setAttribute("aria-live", "polite"); document.body.append(toastBox); }
  const t = document.createElement("div");
  t.className = "toast " + kind;
  t.innerHTML = html;
  toastBox.append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, ms);
}

/** Vibração curta no celular (se permitido nas configurações). */
export function buzz(pattern = 20) {
  try { if (get().settings.vibrate && navigator.vibrate) navigator.vibrate(pattern); } catch { /* sem suporte */ }
}

/** Reinicia uma animação CSS num elemento. */
export function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
