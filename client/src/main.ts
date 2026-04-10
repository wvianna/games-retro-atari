import './style.css';
import { fetchCatalogue, type RomInfo } from './services/romApi.js';
import { saveState, loadState } from './services/saveState.js';
import { createGameCard } from './components/GameCard.js';
import { applyFilters, type FilterState } from './components/filters.js';
import { launchEmulator, teardownEmulator } from './components/Emulator.js';

// ── DOM refs ────────────────────────────────────────────────────────────────
const grid        = document.getElementById('game-grid')!;
const spinner     = document.getElementById('spinner')!;
const romCount    = document.getElementById('rom-count')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const filterRegion = document.getElementById('filter-region') as HTMLSelectElement;
const filterYear   = document.getElementById('filter-year') as HTMLSelectElement;
const filterHacks  = document.getElementById('filter-hide-hacks') as HTMLInputElement;
const filterProtos = document.getElementById('filter-hide-proto') as HTMLInputElement;

const overlay         = document.getElementById('emulator-overlay')!;
const emuTitle        = document.getElementById('emulator-title')!;
const gameContainer   = document.getElementById('game-container')!;
const btnClose        = document.getElementById('btn-close')!;
const btnSave         = document.getElementById('btn-save')!;
const btnLoad         = document.getElementById('btn-load')!;
const btnFullscreen   = document.getElementById('btn-fullscreen')!;
const toast           = document.getElementById('toast')!;
const btnMute         = document.getElementById('btn-mute') as HTMLButtonElement;
const volumeSlider    = document.getElementById('volume-slider') as HTMLInputElement;
const volumeDisplay   = document.getElementById('volume-display')!;
const btnGridView     = document.getElementById('btn-grid-view') as HTMLButtonElement;
const btnListView     = document.getElementById('btn-list-view') as HTMLButtonElement;

// ── State ────────────────────────────────────────────────────────────────────
let allRoms: RomInfo[] = [];
let currentRom: RomInfo | null = null;

// ── Audio & view state (persisted in localStorage) ───────────────────────────
const LS_VOLUME = 'atari-vault:volume';
const LS_MUTED  = 'atari-vault:muted';
const LS_VIEW   = 'atari-vault:view';

let volume: number = Number(localStorage.getItem(LS_VOLUME) ?? 80);
let muted: boolean  = localStorage.getItem(LS_MUTED) === 'true';
let viewMode: 'grid' | 'list' = (localStorage.getItem(LS_VIEW) as 'grid' | 'list') ?? 'list';

function applyVolumeUI() {
  volumeSlider.value = String(volume);
  volumeDisplay.textContent = `${volume}%`;
  btnMute.textContent = muted ? '🔇' : '🔊';
  btnMute.title = muted ? 'Unmute' : 'Mute';
}

function applyViewUI() {
  if (viewMode === 'list') {
    grid.classList.remove('game-grid');
    grid.classList.add('game-list');
    btnListView.classList.add('view-btn--active');
    btnListView.setAttribute('aria-pressed', 'true');
    btnGridView.classList.remove('view-btn--active');
    btnGridView.setAttribute('aria-pressed', 'false');
  } else {
    grid.classList.add('game-grid');
    grid.classList.remove('game-list');
    btnGridView.classList.add('view-btn--active');
    btnGridView.setAttribute('aria-pressed', 'true');
    btnListView.classList.remove('view-btn--active');
    btnListView.setAttribute('aria-pressed', 'false');
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  applyVolumeUI();
  applyViewUI();
  try {
    allRoms = await fetchCatalogue();
    renderGrid(allRoms);
    romCount.textContent = String(allRoms.length);
  } catch (err) {
    console.error(err);
    spinner.innerHTML = `<div class="empty-state">⚠ Failed to load catalogue.<br>Is the server running?</div>`;
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderGrid(roms: RomInfo[]) {
  grid.innerHTML = '';
  romCount.textContent = String(roms.length);

  if (roms.length === 0) {
    grid.innerHTML = `<div class="empty-state">NO GAMES FOUND<br><br>Try a different search.</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const rom of roms) {
    fragment.appendChild(createGameCard({ rom, onPlay: openEmulator, viewMode }));
  }
  grid.appendChild(fragment);
}

// ── Filter pipeline ───────────────────────────────────────────────────────────
function buildFilterState(): FilterState {
  return {
    query:      searchInput.value,
    region:     filterRegion.value,
    yearRange:  filterYear.value,
    hideHacks:  filterHacks.checked,
    hideProtos: filterProtos.checked,
  };
}

function onFilterChange() {
  const filtered = applyFilters(allRoms, buildFilterState());
  renderGrid(filtered);
}

// Debounce the search to avoid thrashing the DOM on every keystroke
let debounceTimer = 0;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(onFilterChange, 200);
});
filterRegion.addEventListener('change', onFilterChange);
filterYear.addEventListener('change', onFilterChange);
filterHacks.addEventListener('change', onFilterChange);
filterProtos.addEventListener('change', onFilterChange);

// ── Emulator lifecycle ────────────────────────────────────────────────────────
function openEmulator(rom: RomInfo) {
  currentRom = rom;
  emuTitle.textContent = rom.title.toUpperCase();
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  launchEmulator(rom, gameContainer, volume, muted);
}

function closeEmulator() {
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  teardownEmulator(gameContainer);
  currentRom = null;
}

btnClose.addEventListener('click', closeEmulator);

// Close on overlay background click (not on the container itself)
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeEmulator();
});

btnFullscreen.addEventListener('click', () => {
  gameContainer.requestFullscreen?.();
});

// ── Audio controls ────────────────────────────────────────────────────────────
volumeSlider.addEventListener('input', () => {
  volume = Number(volumeSlider.value);
  volumeDisplay.textContent = `${volume}%`;
  localStorage.setItem(LS_VOLUME, String(volume));
  // Live update if emulator is already running
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ejs = (window as any).EJS_emulator;
  if (ejs && !muted) ejs.gameManager?.setVolume?.(volume / 100);
});

btnMute.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem(LS_MUTED, String(muted));
  applyVolumeUI();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ejs = (window as any).EJS_emulator;
  if (ejs) ejs.gameManager?.setVolume?.(muted ? 0 : volume / 100);
});

// ── View toggle ───────────────────────────────────────────────────────────────
btnGridView.addEventListener('click', () => {
  viewMode = 'grid';
  localStorage.setItem(LS_VIEW, 'grid');
  applyViewUI();
  renderGrid(currentFilteredRoms());
});

btnListView.addEventListener('click', () => {
  viewMode = 'list';
  localStorage.setItem(LS_VIEW, 'list');
  applyViewUI();
  renderGrid(currentFilteredRoms());
});

function currentFilteredRoms(): RomInfo[] {
  return applyFilters(allRoms, buildFilterState());
}

// ── Save / Load state via IndexedDB ──────────────────────────────────────────
btnSave.addEventListener('click', async () => {
  if (!currentRom) return;
  // EmulatorJS exposes EJS_emulator on window after init
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ejs = (window as any).EJS_emulator;
  if (!ejs) { showToast('Emulator not ready yet'); return; }
  try {
    const data: string = ejs.gameManager.getSaveState();
    await saveState(currentRom.id, 0, data);
    showToast('✓ State saved');
  } catch (e) {
    console.error(e);
    showToast('Save failed');
  }
});

btnLoad.addEventListener('click', async () => {
  if (!currentRom) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ejs = (window as any).EJS_emulator;
  if (!ejs) { showToast('Emulator not ready yet'); return; }
  try {
    const data = await loadState(currentRom.id, 0);
    if (!data) { showToast('No saved state found'); return; }
    ejs.gameManager.loadSaveState(data);
    showToast('✓ State loaded');
  } catch (e) {
    console.error(e);
    showToast('Load failed');
  }
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
    closeEmulator();
  }
  if (e.key === 'F2')  { e.preventDefault(); btnSave.click(); }
  if (e.key === 'F4')  { e.preventDefault(); btnLoad.click(); }
  if (e.key === 'F11') { e.preventDefault(); btnFullscreen.click(); }
});

// ── Toast helper ──────────────────────────────────────────────────────────────
let toastTimer = 0;
function showToast(msg: string, durationMs = 2500) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add('hidden'), durationMs);
}

// ── Start ─────────────────────────────────────────────────────────────────────
boot();
