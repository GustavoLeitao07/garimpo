# ⛏️ Garimpo · o garimpo diário

**7 perguntas por dia, iguais pra todo o Brasil. Resposta óbvia é cascalho. Resposta rara vale ouro.**

Um jogo de "resposta rara" em português: você tem 30 segundos pra citar algo que
se encaixe na pergunta. Quanto menos gente pensaria na sua resposta, mais fundo o
tatu cava. São 700 pontos possíveis por dia, e 700 pontos = pré-sal.

🎮 **Jogar:** https://gustavoleitao07.github.io/garimpo/

## Níveis

| | Nível | Pontos |
|---|---|---|
| 🪨 | Cascalho: a resposta que todo mundo dá | 10 |
| 🤡 | Manjado: parece esperta, mas todo mundo pensou | 15 |
| 🔷 | Quartzo: sólida | 30 |
| 💚 | Esmeralda: incomum de verdade | 60 |
| 💎 | Diamante: obscuridade raiz | 85 |
| 🌟 | Pepita de Ouro: a joia escolhida a dedo | 100 |

## Modos e recursos

- **Garimpo diário**: mesmas 7 perguntas pra todos, viram à meia-noite de Brasília; sequência de dias 🔥
- **Arquivo**: jogue os dias anteriores
- **Infinito ∞**: quantas escavações quiser + **desafio por link** (seu amigo joga as mesmas perguntas vendo seu placar)
- **Pacotes temáticos**: 13 temas (Geografia, Mundo, Comida & Bebida, TV & Cinema, Cultura Pop, Música, Esportes, Games & Tech, Língua & Gírias, Bichos & Natureza, Ciência & Corpo, Cotidiano BR, História & Folclore)
- **Resenha 🎉**: multiplayer local pra 2–8 pessoas no mesmo celular, com respostas secretas e a regra "resposta repetida zera"
- Autocorreção tolerante (acentos, plural, "rio …", erros de 1–2 letras) com confirmação
- Revelação do garimpo completo de cada pergunta no final, com a sua resposta destacada
- **Escada de raridade** mostrando onde sua resposta caiu e lista das tentativas recusadas
- **Escavação animada**: ao acertar, aparecem as linhas de profundidade de cada nível e o tatu cava até a sua, com a câmera seguindo, poeira, sons e o túnel ficando marcado
- **Subsolo vivo**: raízes, minhocas, ossos, vasos marajoaras, conchas e fósseis, aquífero, carvão, ferro, cristais, cavernas com morcegos e cogumelos brilhantes, fóssil de dinossauro, rubis, diamantes, lava, sal do pré-sal, petróleo e um baú no fundo
- **Rever a escavação**: passeio pela mina inteira na tela de resultado, com cada resposta marcada no túnel
- **Animações**: pontos flutuam, placar conta, resultado revelado em sequência, cartão pulsa nos últimos 5 s
- **Sugerir respostas**: as tentativas recusadas viram uma sugestão no GitHub com um toque
- **21 conquistas** (Achei ouro!, Lapidador, Fugiu do óbvio, Gatilho rápido, Pré-sal…)
- **Instalável no celular (PWA)** e funciona offline; vibração ao acertar/errar
- Botão "mandar no zap" e imagem de prévia para links no WhatsApp
- Compartilhamento com grade de emojis
- **Meu Garimpo**: estatísticas, distribuição de níveis, últimos 14 dias
- **Mascotes** pixel-art destraváveis por sequência (Tatu, Capivara, Arara, Onça, Tatu de Ouro)
- Som 8-bit sintetizado (WebAudio), alto contraste, modo econômico, exportar/importar progresso
- Sem servidor, sem conta e sem rastreamento

## Banco de perguntas

**204 perguntas e mais de 24.000 respostas classificadas**, em 13 categorias, em `js/data/*.js`.
Os arquivos `mais-*.js` são **suplementos**: acrescentam respostas a perguntas existentes
(chave = texto exato da pergunta) sem mexer na classificação original.
O diário roda em ciclos de 28 dias sem repetir pergunta. Formato:

```js
["Cite um estado brasileiro",
  "São Paulo/SP|Rio de Janeiro/RJ|...", // cascalho
  "Acre/AC",                            // manjado
  "Paraná/PR|...",                      // quartzo
  "Pará/PA|...",                        // esmeralda
  "Tocantins/TO|...",                   // diamante
  "Amapá/AP"],                          // pepita
```

Respostas são separadas por `|` e apelidos aceitos por `/`. Depois de editar, rode:

```bash
node tools/clean-data.mjs
```

Ele remove duplicatas (a pepita e os níveis mais raros têm prioridade) e reformata os arquivos.
Arquivos `extra*.js` têm a categoria como primeiro campo. Ao criar um arquivo novo de dados,
importe-o em `js/data/index.js` e adicione-o à lista `CORE` do `sw.js` (cache offline).

> ⚠️ O sorteio diário depende da lista completa de perguntas. Adicionar perguntas
> muda os sorteios dos dias **futuros e passados** (arquivo).

## Rodar localmente

É só HTML/CSS/JS puro, sem build:

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000.

## Estrutura

```
index.html          página única
css/style.css       visual pixel-art e estratos de terra
js/core.js          níveis, normalização, busca fuzzy, datas, sorteio determinístico
js/app.js           rotas, telas, motor da escavação, Resenha, desafio
js/store.js         persistência (localStorage)
js/sound.js         efeitos 8-bit (WebAudio)
js/sprites.js       mascotes pixel-art
js/world.js         mundo: camadas, câmera, túnel, escavação animada
js/deco.js          elementos do subsolo em pixel art
js/fx.js            partículas, textos flutuantes, contadores, toasts, vibração
js/achievements.js  conquistas
sw.js, manifest.webmanifest   PWA (instalável/offline)
tools/make-assets.mjs         gera ícones e og.png com Playwright
js/data/            banco de perguntas
docs/analise-krillion.md   engenharia reversa que inspirou o design
```

## Créditos

Inspirado no gênero de jogos de "resposta rara" (Pointless, Krillion). Veja a
[análise de engenharia reversa](docs/analise-krillion.md), feita com o
[REA](https://github.com/morluto/rea). Todo o conteúdo, o tema e o código são originais.
