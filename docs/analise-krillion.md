# Análise de engenharia reversa: krillion.io

Este documento registra **como** o Krillion foi analisado com o
[REA (Reverse Engineer Anything)](https://github.com/morluto/rea) e **o que** foi
descoberto. Essa análise serviu de base para o design do Garimpo. O Garimpo não é
uma cópia: ele reaproveita as mecânicas do gênero, mas tem identidade, textos,
tema e perguntas próprios.

> Tudo foi feito de forma **passiva**: só leitura do que o próprio site entrega ao
> navegador. Nenhuma resposta foi enviada para a API do Krillion e nada foi
> burlado.

---

## 1. Processo

| Passo | Ferramenta | O que foi feito |
|---|---|---|
| 1 | `git clone morluto/rea` | Li o README, a skill `reverse-engineer-anything` e `docs/browser-observation.md` para achar o fluxo de análise de **sites** (CDP). |
| 2 | `curl` | Baixei o HTML inicial e os cabeçalhos. Achei Vercel, Next.js com prerender (`x-nextjs-prerender`) e os metadados (OG/Twitter). O HTML quase não tem conteúdo, porque a renderização acontece no cliente. |
| 3 | Chromium headless + `--remote-debugging-port=9222` | Abri o site num navegador real controlável via Chrome DevTools Protocol. |
| 4 | `rea list-browser-targets` | Descobri o *target* da página `https://krillion.io/`. |
| 5 | `rea inspect-web-page --include-accessibility-text --include-storage-keys --include-script-sources` | Capturei DOM, árvore de acessibilidade (todo o texto visível), recursos, chaves de `localStorage` e o código-fonte dos scripts. |
| 6 | `rea analyze-web-bundle` | Fiz a análise estática dos 14 bundles: React + Next.js (Turbopack), mas os endpoints são montados por *template strings* e não aparecem no inventário automático. |
| 7 | `rea export-web-scripts` | Exportei os scripts capturados e verificados (com manifesto SHA-256) para analisar à mão. |
| 8 | `grep` nos bundles | Mapeei a API (`/api/...`), a tabela de níveis (`TIERS`), as faixas de pontuação, o fuso horário, os mascotes e a lógica de envio de respostas. |
| 9 | `rea capture-web-screenshot` | Capturei a tela para entender a direção visual. |
| 10 | `curl /api/today` e `/faq` | Confirmei o formato das perguntas do dia e li o FAQ, que explica a curadoria e a raridade. |

---

## 2. Arquitetura observada

- **Hospedagem:** Vercel com cache na borda (`x-vercel-cache: HIT`).
- **Front-end:** Next.js (App Router, Turbopack) + React. Fonte pixel `VT323`, tema oceano.
- **Estado local:** `localStorage` com `krillion:game:v1`, `krillion:player:v1` e `mv_session`.
  Preferências ficam em chaves como `krillion-contrast`, `krillion-low-power`,
  `krillion-answer-corrections`, `krillion-clear-rejected-entry` e `krillion-character`.
- **Analytics/ads:** Google Tag Manager e um módulo de privacidade de anúncios.

### API (descoberta nos bundles)

| Endpoint | Uso inferido |
|---|---|
| `GET /api/today` | As 7 perguntas do dia: `{date, dayNumber, resetsAt, prompts:[{id,text}]}` |
| `POST /api/submit` | `{date, promptId, answer, previewCorrection, playerId}` → `{accepted, tier, score, answer, quip}` ou `{correction}` |
| `POST /api/today/complete` | Fecha o dia |
| `GET /api/reveal?date=` | Gabarito (só depois de jogar) |
| `GET /api/answer-popularity?date=` | Popularidade das respostas |
| `POST /api/unlimited` | Modo infinito |
| `/api/packs/{sports,movies,lexicon,geography}`, `/api/packs/:id/unlock`, `/api/unlock`, `/api/restore` | Pacotes temáticos (pagos) |
| `/api/party/rooms`, `/api/party/:id/join`, `/act`, `/stream`, `/api/party/token`, `/activity` | Multiplayer "Puffer Party": salas, ações e *stream* em tempo real (eventos `snap`, `patch`, `ping/pong`, `ack`) |
| `/api/account/progress`, `/api/account/purchases` | Conta Google, sincronização |
| `/api/suggest`, `/api/feedback`, `/api/announcements/*` | Sugestões, feedback e avisos |

**Conclusão importante:** a validação e a raridade das respostas ficam **no servidor**.
O cliente só recebe o nível de volta. O FAQ confirma que a raridade é **curada**
(datasets, base de familiaridade de palavras, LLM e revisão manual), e não calculada a
partir dos jogadores. Isso permitiu fazer o Garimpo 100% estático, com o garimpo
curado embutido no próprio site.

---

## 3. Mecânicas do jogo

- **7 perguntas por dia**, iguais para todos; o dia vira à meia-noite de Nova York (`America/New_York`). Época: 16/07/2026.
- **25 s por pergunta**, com uma fase curta de leitura antes. Dá para tentar várias respostas; uma resposta inexistente é recusada ("no echo. try again").
- **Autocorreção** por aliases, com prévia opcional da correção.
- **Níveis**:

| Nível | Pontos | Emoji |
|---|---|---|
| Plankton | 10 | 🫧 |
| Too Clever | 15 | 🤡 |
| Schooler | 30 | 🐟 |
| Rare | 60 | 🦑 |
| Deep Cut | 85 | 🏮 |
| One in a Krillion | 100 | 🌟 |

- **Máximo de 700 pontos/dia**; cada ponto equivale a 10 m de profundidade, com marcos reais do oceano.
- **Faixas finais:** 0–150, 151–250, 251–350, 351–449 e 450+.
- **Compartilhamento:** texto com a grade de emojis (`⬛` para erro).
- **Modos:** Diário, Arquivo, Infinito, Pacotes temáticos e Puffer Party (online).
- **Progressão:** sequência de dias e mascotes destraváveis por sequência (0, 5, 14, 30 e 45 dias), com versões douradas.
- **Configurações:** som, contraste/daltonismo, modo econômico, limpar resposta recusada, autocorreção e mascote.

---

## 4. O que o Garimpo fez diferente

| Krillion | Garimpo |
|---|---|
| Oceano, krill, mergulho | Mineração brasileira, tatu garimpeiro, escavação até o pré-sal |
| Inglês, cultura dos EUA | PT-BR, cultura brasileira (novela, Chaves, folclore, futebol, gírias) |
| Backend Next.js + API | 100% estático (GitHub Pages), dados curados no cliente |
| 25 s | 30 s (digitar com acento leva mais tempo) |
| Party online (salas) | **Resenha** local no mesmo celular + regra "repetiu, zerou" |
| — | **Desafio por link** no modo Infinito (mesma semente, placar do amigo na tela) |
| Pacotes pagos | Todos os pacotes grátis |
| Conta Google | Exportar/importar progresso por código |

### Limitações conhecidas
- As respostas ficam no código do cliente: dá para "colar" lendo o JS. Para um ranking competitivo, a validação teria que ir para um backend (Supabase, por exemplo).
- A raridade é curada à mão (intuição + conhecimento), não medida. Um próximo passo seria registrar as respostas dos jogadores (anonimamente) e recalibrar os níveis.
