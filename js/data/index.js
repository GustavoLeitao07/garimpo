import geo from "./geo.js";
import comida from "./comida.js";
import tv from "./tv.js";
import musica from "./musica.js";
import futebol from "./futebol.js";
import lingua from "./lingua.js";
import natureza from "./natureza.js";
import ciencia from "./ciencia.js";
import cotidiano from "./cotidiano.js";
import historia from "./historia.js";
import extra from "./extra.js";
import extra2 from "./extra2.js";
import extra3 from "./extra3.js";
import extra4 from "./extra4.js";
import extra5 from "./extra5.js";
import maisPop from "./mais-pop.js";
import maisMusica from "./mais-musica.js";
import maisMisc from "./mais-misc.js";
import maisBr from "./mais-br.js";
import tech from "./tech.js";
import pop from "./pop.js";
import mundo from "./mundo.js";

export const CATEGORIES = {
  geo:       { name: "Geografia",        emoji: "🗺️", color: "#4fb0f5", desc: "Estados, rios, praias, bairros e cantos do mundo." },
  comida:    { name: "Comida & Bebida",  emoji: "🍲", color: "#ff9f43", desc: "Do pastel de feira à feijoada completa." },
  tv:        { name: "TV & Cinema",      emoji: "📺", color: "#ff6b8b", desc: "Novelas, Chaves, Turma da Mônica e bordões." },
  musica:    { name: "Música",           emoji: "🎶", color: "#b48cff", desc: "Sertanejo, MPB, rock, funk, rap e samba." },
  futebol:   { name: "Esportes",         emoji: "⚽", color: "#39d98a", desc: "Times, estádios, tetra, penta e gíria de pelada." },
  lingua:    { name: "Língua & Gírias",  emoji: "🗣️", color: "#ffd23f", desc: "Bufunfa, borocoxô e palavras com til." },
  natureza:  { name: "Bichos & Natureza",emoji: "🦜", color: "#7fdc5a", desc: "Fauna, flora, peixes e o mar." },
  ciencia:   { name: "Ciência & Corpo",  emoji: "🔬", color: "#5ec8ff", desc: "Elementos, ossos, órgãos e astros." },
  cotidiano: { name: "Cotidiano BR",     emoji: "🏠", color: "#f08a5d", desc: "Casa de vó, padaria, praia e desculpas." },
  historia:  { name: "História & Folclore", emoji: "📜", color: "#d4a373", desc: "Presidentes, heróis, mitos e escritores." },
  tech:      { name: "Games & Tech",     emoji: "🎮", color: "#00e0c6", desc: "Consoles, Pokémon, linguagens e memes." },
  pop:       { name: "Cultura Pop",      emoji: "🍿", color: "#ff5fd2", desc: "Heróis, vilões, séries, animes e Disney." },
  mundo:     { name: "Mundo",            emoji: "🌍", color: "#8fa8ff", desc: "Países, idiomas, moedas, ilhas e monumentos." },
};

const RAW = [];
const add = (cat, rows) => rows.forEach((r) => RAW.push([cat, ...r]));
add("geo", geo); add("comida", comida); add("tv", tv); add("musica", musica);
add("futebol", futebol); add("lingua", lingua); add("natureza", natureza);
add("ciencia", ciencia); add("cotidiano", cotidiano); add("historia", historia);
add("tech", tech); add("pop", pop); add("mundo", mundo);
extra.forEach((r) => RAW.push(r));
extra2.forEach((r) => RAW.push(r));
extra3.forEach((r) => RAW.push(r));
extra4.forEach((r) => RAW.push(r));
extra5.forEach((r) => RAW.push(r));

// Suplementos: respostas extras anexadas às perguntas existentes.
// Itens marcados como rascunho ("… ?" ou "… dup") são descartados.
const clean = (str) => (str || "").split("|")
  .filter((x) => x.trim() && !/\?\s+$/.test(x) && !/\sdup\s*$/.test(x))
  .map((x) => x.trim()).join("|");
export const SUPPLEMENT_MISSES = [];
for (const sup of [maisPop, maisMusica, maisMisc, maisBr]) {
  for (const [text, tiers] of Object.entries(sup)) {
    const row = RAW.find((r) => r[1] === text);
    if (!row) { SUPPLEMENT_MISSES.push(text); continue; }
    tiers.forEach((str, i) => {
      const extra = clean(str);
      if (extra) row[2 + i] = row[2 + i] ? row[2 + i] + "|" + extra : extra;
    });
  }
}

export default RAW;
