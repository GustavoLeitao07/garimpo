// Limpa e normaliza os arquivos de dados: remove entradas de rascunho
// (terminadas em "? " ou marcadas "dup"), remove duplicatas por pergunta
// (a pepita tem prioridade; depois o nível mais raro vence) e reescreve o arquivo.
// Uso: node tools/clean-data.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "data");
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim();

let removed = 0, dups = 0;
function cleanTier(str) {
  return str.split("|").filter((item) => {
    if (/\?\s+$/.test(item) || /\sdup\s*$/.test(item) || item.trim() === "") { removed++; return false; }
    return true;
  }).map((s) => s.trim());
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "index.js" && !f.startsWith("mais-"))) {
  const mod = await import(pathToFileURL(path.join(dir, file)).href + "?" + Date.now());
  const hasCat = file.startsWith("extra");
  const out = mod.default.map((row) => {
    const head = hasCat ? row.slice(0, 2) : row.slice(0, 1);
    const tiers = (hasCat ? row.slice(2) : row.slice(1)).map(cleanTier);
    if (tiers.length === 5) {
      // faltou um nível: divide o "esmeralda" ao meio (a segunda metade é mais rara)
      const t = tiers[3], h = Math.ceil(t.length / 2);
      tiers.splice(3, 1, t.slice(0, h), t.slice(h));
    }
    if (tiers.length !== 6) throw new Error(`${file}: "${head.at(-1)}" tem ${tiers.length} níveis`);
    // ordem de prioridade: pepita (5), diamante (4), esmeralda (3), quartzo (2), manjado (1), cascalho (0)
    const seen = new Set();
    const order = [5, 4, 3, 2, 1, 0];
    const kept = tiers.map(() => []);
    for (const t of order) {
      for (const item of tiers[t]) {
        const aliases = item.split("/").map((a) => a.trim()).filter(Boolean);
        const fresh = aliases.filter((a) => !seen.has(norm(a)));
        if (fresh.length === 0) { dups++; continue; }
        fresh.forEach((a) => seen.add(norm(a)));
        kept[t].push(fresh.join("/"));
      }
    }
    for (const t of [0, 1, 2, 3, 4, 5]) tiers[t] = kept[t];
    return [...head, ...tiers.map((t) => t.join("|"))];
  });
  const header = hasCat
    ? "// Perguntas extras: [categoria, pergunta, cascalho, manjado, quartzo, esmeralda, diamante, pepita]\n"
    : "// [pergunta, cascalho, manjado, quartzo, esmeralda, diamante, pepita]\n// Respostas separadas por \"|\"; apelidos aceitos separados por \"/\".\n";
  const body = out.map((row) => "  [\n" + row.map((c) => "    " + JSON.stringify(c)).join(",\n") + "],").join("\n\n");
  writeFileSync(path.join(dir, file), header + "export default [\n" + body + "\n];\n");
}
console.log(`removidas ${removed} entradas de rascunho, ${dups} duplicatas`);
