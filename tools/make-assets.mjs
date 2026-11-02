// Gera ícones do PWA e a imagem de compartilhamento (og.png) a partir do sprite do tatu.
// Uso: node tools/make-assets.mjs   (requer Playwright instalado globalmente)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { spriteSVG } = await import(path.join(root, "js/sprites.js"));

const icon = (size, pad) => `<html><body style="margin:0;width:${size}px;height:${size}px;background:#3a2414;display:grid;place-items:center;overflow:hidden">
  <div style="position:absolute;bottom:0;left:0;right:0;height:${size * 0.3}px;background:#7a3b22"></div>
  <div style="position:absolute;bottom:${size * 0.3}px;left:0;right:0;height:${size * 0.04}px;background:#4ea83f"></div>
  <div style="position:relative">${spriteSVG("tatu", Math.floor((size - pad * 2) / 16))}</div></body></html>`;

const og = `<html><head><link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@700&display=swap" rel="stylesheet"></head>
<body style="margin:0;width:1200px;height:630px;overflow:hidden;font-family:'Pixelify Sans',monospace;background:linear-gradient(180deg,#4fb0f5 0%,#9ad6ff 38%,#ffe0a6 52%,#4ea83f 53%,#2f7a2c 55%,#6b3f22 56%,#a3502a 78%,#5a4148 100%);position:relative">
  <div style="position:absolute;top:40px;right:90px;width:90px;height:90px;background:#fff2a8;box-shadow:0 0 60px #fff2a8"></div>
  <div style="position:absolute;top:70px;left:0;right:0;text-align:center;font-size:150px;color:#ffd23f;letter-spacing:10px;text-shadow:6px 6px 0 #7a3b00,12px 12px 0 #000">GARIMPO</div>
  <div style="position:absolute;top:262px;left:0;right:0;text-align:center;font-size:40px;color:#2a1600;letter-spacing:8px">o garimpo diário</div>
  <div style="position:absolute;top:350px;left:170px">${spriteSVG("tatu", 12)}</div>
  <div style="position:absolute;top:380px;left:420px;right:60px;background:rgba(28,18,14,.92);border:5px solid #000;padding:24px 30px;color:#f6eedf;font-size:40px;line-height:1.3;box-shadow:8px 8px 0 #0008">
    7 perguntas por dia.<br>resposta óbvia é <span style="color:#c9c0b8">cascalho</span>.<br>resposta rara vale <span style="color:#ffd23f">ouro</span> 🌟</div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size, pad] of [["icon-192.png", 192, 24], ["icon-512.png", 512, 60], ["apple-touch-icon.png", 180, 20], ["maskable-512.png", 512, 110]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(icon(size, pad));
  await p.screenshot({ path: path.join(root, "icons", name) });
}
await p.setViewportSize({ width: 1200, height: 630 });
await p.setContent(og, { waitUntil: "networkidle" });
await p.screenshot({ path: path.join(root, "og.png") });
await b.close();
console.log("assets gerados");
