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

export const CATEGORIES = {
  geo:       { name: "Geografia",        emoji: "🗺️", desc: "Estados, rios, praias, bairros e cantos do mundo." },
  comida:    { name: "Comida & Bebida",  emoji: "🍲", desc: "Do pastel de feira à feijoada completa." },
  tv:        { name: "TV & Cinema",      emoji: "📺", desc: "Novelas, Chaves, Turma da Mônica e bordões." },
  musica:    { name: "Música",           emoji: "🎶", desc: "Sertanejo, MPB, rock, funk, rap e samba." },
  futebol:   { name: "Esportes",         emoji: "⚽", desc: "Times, estádios, tetra, penta e gíria de pelada." },
  lingua:    { name: "Língua & Gírias",  emoji: "🗣️", desc: "Bufunfa, borocoxô e palavras com til." },
  natureza:  { name: "Bichos & Natureza",emoji: "🦜", desc: "Fauna, flora, peixes e o mar." },
  ciencia:   { name: "Ciência & Corpo",  emoji: "🔬", desc: "Elementos, ossos, órgãos e astros." },
  cotidiano: { name: "Cotidiano BR",     emoji: "🏠", desc: "Casa de vó, padaria, praia e desculpas." },
  historia:  { name: "História & Folclore", emoji: "📜", desc: "Presidentes, heróis, mitos e escritores." },
};

const RAW = [];
const add = (cat, rows) => rows.forEach((r) => RAW.push([cat, ...r]));
add("geo", geo); add("comida", comida); add("tv", tv); add("musica", musica);
add("futebol", futebol); add("lingua", lingua); add("natureza", natureza);
add("ciencia", ciencia); add("cotidiano", cotidiano); add("historia", historia);
extra.forEach((r) => RAW.push(r));

export default RAW;
