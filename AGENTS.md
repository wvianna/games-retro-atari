# AGENTS.md — Atari Vault: Referência Técnica para Agentes de IA

> Este arquivo descreve o projeto em detalhe para que outro agente possa realizar intervenções cirúrgicas no código sem precisar explorar o repositório do zero.

---

## 1. Visão Geral

**Atari Vault** é um portal web que permite jogar mais de **2.106 jogos clássicos do Atari 2600** diretamente no navegador. A emulação roda 100% no cliente via **EmulatorJS** (WebAssembly, core `atari2600`), carregado dinamicamente via CDN. O servidor apenas cataloga e serve os arquivos `.bin`.

```
Usuário → Browser (Vite + TypeScript)
              ↓ /api/roms          (catálogo JSON)
              ↓ /api/roms/:id      (streaming do .bin)
         Express (Node.js ESM)
              ↓ lê arquivos
         ROMS/  (2.106 arquivos .bin)
```

---

## 2. Estrutura de Arquivos

```
games-retro-atari/
├── package.json                 # npm workspaces raiz
├── ROMS/                        # 2.106 arquivos .bin (ROM Hunter V18)
│
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js             # Express app + 3 rotas REST
│       └── romParser.js         # Parser de metadados dos nomes .bin
│
└── client/
    ├── index.html               # HTML único (SPA)
    ├── vite.config.ts           # Vite + Vitest config
    ├── playwright.config.ts     # E2E: dois webServers automáticos
    ├── tsconfig.json
    └── src/
        ├── main.ts              # Bootstrap: DOM refs, estado, eventos
        ├── style.css            # Tema CRT retro (CSS vars + animações)
        ├── components/
        │   ├── Emulator.ts      # Wrapper EmulatorJS (launch/teardown)
        │   ├── GameCard.ts      # Componente card de jogo (grid/lista)
        │   └── filters.ts       # Função pura applyFilters()
        └── services/
            ├── romApi.ts        # fetchCatalogue(), getRomUrl()
            └── saveState.ts     # IndexedDB: saveState(), loadState()
```

---

## 3. Tecnologias

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime server | Node.js ESM | 18+ |
| API | Express | 4.18.2 |
| CORS | cors | 2.8.5 |
| Build client | Vite | 5.2.11 |
| Linguagem client | TypeScript | 5.4.5 |
| Emulação | EmulatorJS CDN | stable |
| Core emulador | atari2600 (WebAssembly) | via CDN |
| CDN EmulatorJS | `https://cdn.emulatorjs.org/stable/data/` | — |
| Testes unitários | Vitest | 1.6.1 |
| Testes E2E | Playwright | 1.44.0 |
| Testes server | Jest + supertest | 29.7.0 / 6.3.4 |
| DOM test env | happy-dom | 14.7.1 |
| Concorrência dev | concurrently | 8.2.2 |

---

## 4. Comandos

```bash
# Instalar tudo (server + client)
npm install                        # na raiz

# Desenvolvimento (server :3001 + client :5173)
npm run dev

# Build de produção
npm run build                      # gera client/dist/

# Testes unitários (server Jest + client Vitest)
npm test

# Testes E2E (Playwright — sobe os dois servers automaticamente)
npm run test:e2e

# Apenas testes unitários do cliente
cd client && npx vitest run

# Apenas testes do servidor
cd /path/to/root && node --experimental-vm-modules node_modules/.bin/jest --rootDir server --runInBand
```

> **Atenção:** O jest está em `node_modules/.bin/jest` da **raiz** do workspace, não dentro de `server/node_modules/`. O script `server/package.json` usa `../../node_modules/.bin/jest`.

---

## 5. Portas e Proxy

| Serviço | Porta | URL |
|---|---|---|
| Frontend (Vite dev) | 5173 | http://localhost:5173 |
| API (Express) | 3001 | http://localhost:3001 |

O Vite proxeia `/api` → `http://localhost:3001` em dev (configurado em `client/vite.config.ts`).

---

## 6. API REST (server/src/index.js)

| Método | Rota | Resposta |
|---|---|---|
| `GET` | `/api/roms` | `{ count: number, roms: RomInfo[] }` |
| `GET` | `/api/roms/search?q=<termo>` | `RomInfo[]` — busca case-insensitive por título |
| `GET` | `/api/roms/:id` | Binary stream do `.bin`; `Content-Type: application/octet-stream` |

### Segurança do servidor
- Path traversal prevenido com `path.basename()` + validação de caminho resolvido
- Extensão `.bin` obrigatória (400 caso contrário)
- CORS restrito: `localhost:5173` em dev; `process.env.ALLOWED_ORIGIN` em prod
- Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`
- Variáveis de ambiente: `PORT` (default 3001), `ALLOWED_ORIGIN` (prod), `NODE_ENV`

---

## 7. Modelo de Dados

### `RomInfo` (TypeScript — client/src/services/romApi.ts)

```typescript
interface RomInfo {
  id:          string;   // encodeURIComponent(filename) — usado na URL /api/roms/:id
  title:       string;   // nome extraído do filename pelo romParser
  year:        number | null;
  publisher:   string;   // 'Unknown' quando não identificado
  region:      'NTSC' | 'PAL' | 'SECAM';  // default NTSC
  isPrototype: boolean;
  isHack:      boolean;
  filename:    string;   // nome original do arquivo com .bin
}
```

### Convenção de nome dos arquivos ROM
```
"River Raid (1982) (Activision, Carol Shaw) (AX-020) ~.bin"
 ↓
 title:       "River Raid"
 year:        1982
 publisher:   "Activision"
 region:      "NTSC"
 isPrototype: false
 isHack:      false
```
- `~` no final = NTSC oficial
- `(PAL)` / `(SECAM)` = região alternativa
- `(Prototype)` → `isPrototype: true`
- `(Hack)` ou `[Hack]` → `isHack: true`
- Datas no formato `MM-DD-YYYY` também são suportadas (ex: `07-13-1983`)

---

## 8. Estado Global do Cliente (client/src/main.ts)

### Variáveis de estado

```typescript
let allRoms: RomInfo[] = [];          // catálogo completo carregado da API
let currentRom: RomInfo | null = null; // ROM atualmente no emulador

// Persistidos em localStorage:
const LS_VOLUME = 'atari-vault:volume'; // número 0-100
const LS_MUTED  = 'atari-vault:muted';  // 'true' | 'false'
const LS_VIEW   = 'atari-vault:view';   // 'grid' | 'list'

let volume: number;   // 0-100, default 80
let muted: boolean;   // default false
let viewMode: 'grid' | 'list';  // default 'list'
```

### IDs de DOM relevantes

| ID | Tipo | Função |
|---|---|---|
| `#game-grid` | `<main>` | Container dos cards (recebe classes `game-grid` ou `game-list`) |
| `#spinner` | `<div>` | Loading inicial |
| `#rom-count` | `<span>` | Contador de ROMs visíveis |
| `#search-input` | `<input type="search">` | Busca com debounce 200ms |
| `#filter-region` | `<select>` | Filtro por região (NTSC/PAL/SECAM/All) |
| `#filter-year` | `<select>` | Filtro por era (4 opções de range) |
| `#filter-hide-hacks` | `<input type="checkbox">` | Esconde hacks |
| `#filter-hide-proto` | `<input type="checkbox">` | Esconde protótipos |
| `#btn-grid-view` | `<button>` | Ativa modo grade |
| `#btn-list-view` | `<button>` | Ativa modo lista |
| `#emulator-overlay` | `<div role="dialog">` | Overlay do emulador (classe `hidden` = fechado) |
| `#emulator-title` | `<span>` | Nome do jogo no overlay |
| `#game-container` | `<div>` | EmulatorJS monta aqui (`height: 600px`) |
| `#btn-mute` | `<button>` | Mute/unmute (ícone 🔊/🔇) |
| `#volume-slider` | `<input type="range" min="0" max="100">` | Controle de volume |
| `#volume-display` | `<span>` | Texto "80%" |
| `#btn-save` | `<button>` | Salva estado (F2) |
| `#btn-load` | `<button>` | Carrega estado (F4) |
| `#btn-fullscreen` | `<button>` | Tela cheia (F11) |
| `#btn-close` | `<button>` | Fecha overlay (Esc) |
| `#toast` | `<div role="status">` | Notificação temporária |

---

## 9. Componente Emulator.ts

```typescript
// Globals EmulatorJS configurados antes de injetar o script:
window.EJS_player       = '#game';
window.EJS_core         = 'atari2600';
window.EJS_gameUrl      = '/api/roms/<id>';
window.EJS_pathtodata   = 'https://cdn.emulatorjs.org/stable/data/';
window.EJS_startOnLoaded = true;
window.EJS_language     = 'en-US';
window.EJS_volume       = volume / 100;    // 0.0 – 1.0
window.EJS_muted        = muted;
window.EJS_width       = 1600;
window.EJS_height      = 1200;
window.EJS_Buttons      = { saveState: false, loadState: false };

// Após init, EmulatorJS expõe:
(window as any).EJS_emulator.gameManager.setVolume(0..1)
(window as any).EJS_emulator.gameManager.getSaveState()   // → string base64
(window as any).EJS_emulator.gameManager.loadSaveState(data)
```

**Assinatura das funções exportadas:**
```typescript
launchEmulator(rom: RomInfo, container: HTMLElement, volume?: number, muted?: boolean): void
teardownEmulator(container: HTMLElement): void
```

---

## 10. Save State (IndexedDB)

- Banco: `AtariVault` (versão 1)
- Store: `saveStates`
- Chave composta: `[romId, slot]`
- Apenas slot `0` está exposto na UI atual
- Estrutura do objeto armazenado:
  ```typescript
  { romId: string, slot: number, data: string /* base64 */, savedAt: number }
  ```

---

## 11. CSS — Design System

Arquivo: `client/src/style.css`

### Variáveis CSS

```css
--bg:         #0a0a0f   /* fundo principal */
--surface:    #12121a   /* cards e containers */
--surface2:   #1a1a26   /* header do emulador */
--border:     #2a2a3d   /* bordas */
--accent:     #00e5ff   /* ciano (fósforo) */
--accent2:    #ff6600   /* âmbar */
--text:       #c8c8e0
--text-dim:   #6868a0
--danger:     #ff3355
--success:    #00ff88
--font-pixel: 'Press Start 2P', monospace
--font-mono:  'Share Tech Mono', monospace
```

### Classes principais

| Classe | Descrição |
|---|---|
| `.game-grid` | Grade responsiva (`grid`, `minmax(220px, 1fr)`) |
| `.game-list` | Lista vertical (`flex`, `flex-direction: column`) |
| `.game-card` | Card individual (modo grade) |
| `.game-card--list` | Modificador: card horizontal compacto |
| `.emulator-overlay` | Overlay fixo (fullscreen); `.hidden` = `display:none` |
| `.emulator-container` | Container interno do overlay (`min(860px, 96vw)`) |
| `.audio-controls` | Flex row: btn-mute + slider + display |
| `.view-toggle` | Container dos botões grade/lista |
| `.view-btn` | Botão de alternância de visualização |
| `.view-btn--active` | Estado ativo (borda + cor accent) |
| `.controls-guide` | Painel de atalhos de teclado no overlay |
| `.controls-section` | Seção dentro do guide (Joystick / Shortcuts) |
| `kbd` | Tecla estilizada como keycap retro |
| `.toast` | Notificação flutuante (`position: fixed`, bottom) |
| `.badge-year/.badge-pub/.badge-pal/.badge-proto/.badge-hack` | Badges nos cards |

---

## 12. Testes

### Cobertura atual

| Suite | Arquivo | Testes | Ferramenta |
|---|---|---|---|
| Filtros | `client/tests/unit/filters.test.ts` | 9 | Vitest |
| GameCard | `client/tests/unit/GameCard.test.ts` | 13 | Vitest |
| Emulator | `client/tests/unit/Emulator.test.ts` | 9 | Vitest |
| API | `server/tests/api.test.js` | 9 | Jest |
| romParser | `server/tests/romParser.test.js` | 10 | Jest |
| E2E | `client/tests/e2e/emulator.spec.ts` | 15 | Playwright |

**Total: 65 testes**

### Configuração Vitest (`client/vite.config.ts`)
```typescript
test: {
  environment: 'happy-dom',
  globals: true,
  include: ['tests/unit/**/*.test.ts'],  // E2E excluído deliberadamente
}
```

### Configuração Playwright (`client/playwright.config.ts`)
- Browsers: Chrome + Firefox
- Timeout: 30s por teste, 1 retry
- Sobe servidor `:3001` e frontend `:5173` automaticamente via `webServer`
- Screenshots e vídeo salvo apenas em falha

---

## 13. Funcionalidades Implementadas

| Funcionalidade | Status | Localização |
|---|---|---|
| Catálogo de 2.106 ROMs | ✅ | server/src/index.js + client/services/romApi.ts |
| Busca por título (debounce 200ms) | ✅ | main.ts + filters.ts |
| Filtro por região (NTSC/PAL/SECAM) | ✅ | filters.ts |
| Filtro por era (4 ranges de ano) | ✅ | filters.ts |
| Ocultar hacks | ✅ | filters.ts |
| Ocultar protótipos | ✅ | filters.ts |
| Visualização em lista (padrão) | ✅ | main.ts + GameCard.ts + style.css |
| Visualização em grade | ✅ | main.ts + GameCard.ts + style.css |
| Persistência de view mode | ✅ | localStorage `atari-vault:view` |
| Lançar emulador (EmulatorJS) | ✅ | Emulator.ts |
| Resolução 1600×1200 | ✅ | Emulator.ts (EJS_width/height) + CSS |
| Controle de volume (slider 0–100) | ✅ | main.ts + index.html |
| Botão mute/unmute | ✅ | main.ts + index.html |
| Persistência de volume e mute | ✅ | localStorage |
| Live update de volume | ✅ | EJS_emulator.gameManager.setVolume() |
| Save state por ROM (slot 0) | ✅ | saveState.ts (IndexedDB) |
| Load state | ✅ | saveState.ts |
| Painel de controles com `<kbd>` | ✅ | index.html + style.css |
| Atalhos de teclado (F2/F4/F11/Esc) | ✅ | main.ts |
| Tela cheia | ✅ | main.ts |
| Efeito CRT scanlines | ✅ | style.css (`body::after`) |
| Animação de flicker no logo | ✅ | style.css |
| Toast de notificação | ✅ | main.ts |
| Responsive (mobile) | ✅ | style.css `@media (max-width: 600px)` |

---

## 14. Funcionalidades NÃO implementadas (backlog)

| Funcionalidade | Observação |
|---|---|
| Múltiplos slots de save state | Só o slot 0 está exposto na UI |
| Mapeamento customizado de controles | EmulatorJS suporta, não exposto |
| Suporte a Gamepad API | EmulatorJS tem suporte nativo, mas não testado |
| Screenshots/gravação de vídeo | Não implementado |
| Contas de usuário / cloud saves | Não implementado |
| Cheat codes | Não implementado |
| Imagens de capa dos jogos (boxart) | Cards usam texto pixelado como placeholder |
| Busca via query string na URL | Filtros são client-side apenas |
| Ordenação da lista | Não há controle de ordenação |

---

## 15. Armadilhas Conhecidas

1. **`jest` está na raiz, não em `server/`** — O `server/package.json` usa `../../node_modules/.bin/jest`. Rodar `npm test` dentro de `server/` diretamente sem `npm install` na raiz vai falhar.

2. **E2E vs Vitest** — O Playwright spec (`tests/e2e/`) não deve ser incluído no Vitest. O `include: ['tests/unit/**/*.test.ts']` em `vite.config.ts` resolve isso. Não remova esse filtro.

3. **EmulatorJS é CDN-only** — O script `loader.js` é injetado dinamicamente no `<body>`. Em ambiente offline (sem internet), os jogos não carregam. Não há fallback local.

4. **EJS_emulator disponível apenas após init** — `window.EJS_emulator` é `undefined` até o EmulatorJS terminar de carregar o core. Sempre fazer check `if (ejs)` antes de chamar métodos.

5. **`id` da ROM é `encodeURIComponent(filename)`** — Para fazer a URL de streaming, usar `getRomUrl(rom.id)` que aplica `encodeURIComponent` adicional: `/api/roms/${encodeURIComponent(id)}`. O servidor decodifica com `decodeURIComponent`.

6. **Save state usa `[romId, slot]` como chave composta** — Ambos os campos são obrigatórios na chamada.

7. **`applyViewUI()` deve ser chamado antes de `renderGrid()`** — A função altera as classes CSS do `#game-grid`; se chamada depois, os cards já renderizados não recebem o modificador `game-card--list`.

8. **Formato de data MM-DD-YYYY em ROMs antigas** — `romParser.js` suporta `07-13-1983` como token de data. O regex para isso foi adicionado — não remover.

---

## 16. Variáveis de Ambiente

| Variável | Contexto | Default | Descrição |
|---|---|---|---|
| `PORT` | server | `3001` | Porta do Express |
| `ALLOWED_ORIGIN` | server prod | `''` | Origem CORS em produção |
| `NODE_ENV` | server | `development` | Controla CORS permitido |
