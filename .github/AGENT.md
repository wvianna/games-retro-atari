# AGENT.md — Guia rápido para o próximo agente

Objetivo: fornecer contexto acionável para um agente fazer mudanças cirúrgicas, executar e testar o projeto Atari Vault rapidamente.

**Resumo**
- **Arquitetura**: Frontend SPA (Vite + TypeScript) em `client/`, backend Express ESM em `server/`, ROMs binários em `ROMS/` e emulação cliente via EmulatorJS CDN.
- **Portas**: frontend dev `5173`, API `3001` (Vite proxya `/api` → `http://localhost:3001`).

**Quick Start**
- **Instalar dependências**: `npm install` (rodar na raiz — o monorepo usa workspaces).
- **Desenvolvimento**: `npm run dev` (inicia `server` + `client`).
- **Build (produção)**: `npm run build` (gera `client/dist/`).
- **Testes (unit + server)**: `npm test` (executa testes do servidor e cliente).
- **E2E**: `npm run test:e2e` (Playwright — sobe ambos os servers automaticamente).

Se precisar rodar só um workspace:
- **Server dev**: `npm run dev --workspace=server` ou `node --watch server/src/index.js`.
- **Client tests**: `cd client && npx vitest run` ou `npm run test --workspace=client`.
- **Nota (Jest)**: o Jest do servidor é referenciado na raiz; para rodar diretamente use `node --experimental-vm-modules node_modules/.bin/jest --rootDir server --runInBand`.

**API — pontos essenciais**
- `GET /api/roms` → `{ count: number, roms: RomInfo[] }`.
- `GET /api/roms/search?q=<termo>` → `RomInfo[]` (busca case-insensitive).
- `GET /api/roms/:id` → stream do `.bin` com `Content-Type: application/octet-stream`.
- **Segurança**: validação de caminho com `path.basename()`, extensão `.bin` obrigatória, CORS restrito em dev a `localhost:5173`.

**Modelo `RomInfo` (resumo)**
```
interface RomInfo {
  id: string;         // encodeURIComponent(filename)
  title: string;
  year: number|null;
  publisher: string;  // 'Unknown' quando não identificado
  region: 'NTSC'|'PAL'|'SECAM';
  isPrototype: boolean;
  isHack: boolean;
  filename: string;   // nome original com .bin
}
```

**Emulator / Integração**
- Emulação é 100% cliente via EmulatorJS (CDN). Globals setados antes do loader: `EJS_player`, `EJS_core`, `EJS_gameUrl`, `EJS_pathtodata`, `EJS_volume`, etc.
- Após init: `(window as any).EJS_emulator.gameManager` expõe `setVolume()`, `getSaveState()` (base64), `loadSaveState(data)`.
- Funções exportadas pelo wrapper: `launchEmulator(rom, container, volume?, muted?)` e `teardownEmulator(container)`.

**Save State (IndexedDB)**
- Banco: `AtariVault` (v1). Store: `saveStates`.
- Chave composta: `[romId, slot]` — UI atualmente expõe somente `slot 0`.
- Objeto salvo:
```
{ romId: string, slot: number, data: string /* base64 */, savedAt: number }
```

**IDs DOM úteis**
- `#game-grid`, `#spinner`, `#rom-count`, `#search-input`, `#filter-region`, `#filter-year`.
- `#emulator-overlay`, `#game-container`, `#btn-mute`, `#volume-slider`, `#btn-save`, `#btn-load`, `#btn-fullscreen`, `#btn-close`.

**Principais arquivos**
- [server/src/index.js](server/src/index.js) — API + streaming de ROMs.
- [server/src/romParser.js](server/src/romParser.js) — extração de metadados do filename.
- [client/src/main.ts](client/src/main.ts) — bootstrap, estado global, handlers.
- [client/src/components/Emulator.ts](client/src/components/Emulator.ts) — wrapper EmulatorJS.
- [client/src/components/GameCard.ts](client/src/components/GameCard.ts) — render de cards.
- [client/src/components/filters.ts](client/src/components/filters.ts) — lógica pura de filtros.
- [client/src/services/romApi.ts](client/src/services/romApi.ts) — fetchCatalogue(), getRomUrl().
- [client/src/services/saveState.ts](client/src/services/saveState.ts) — IndexedDB helpers.
- [AGENTS.md](AGENTS.md) — documentação técnica completa (arquivo mestre).

**Armadilhas Conhecidas (resumido)**
- **Jest na raiz**: rodar testes do servidor a partir da raiz ou usar o comando do `server/package.json` que referencia `../../node_modules/.bin/jest`.
- **Vitest vs E2E**: Vitest inclui apenas `tests/unit/**`; Playwright roda E2E separadamente.
- **EmulatorJS exige internet**: não há fallback local; verificar conectividade CDN.
- **EJS_emulator só após init**: sempre checar se está definido antes de chamar APIs.
- **ID da ROM**: é `encodeURIComponent(filename)`; o servidor decodifica com `decodeURIComponent`.
- **Save state chave composta**: `[romId, slot]` obrigatórios.

**Sugestões de próximas tarefas**
- Rodar a suíte de testes e corrigir falhas locais antes de PRs: `npm test` e `npm run test:e2e`.
- Implementar múltiplos slots de save state (backend + UI).
- Adicionar fallback/offline para o loader do EmulatorJS.
- Expor ordenação e filtros via query string na URL.

**Notas operacionais**
- Peça ao usuário/agent para confirmar se deseja que eu rode os testes ou abra um PR com mudanças específicas.

Última atualização: 2026-04-17
