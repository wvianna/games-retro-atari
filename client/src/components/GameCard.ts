import type { RomInfo } from '../services/romApi.js';

export interface GameCardOptions {
  rom: RomInfo;
  onPlay: (rom: RomInfo) => void;
  viewMode?: 'grid' | 'list';
}

export function createGameCard({ rom, onPlay, viewMode = 'grid' }: GameCardOptions): HTMLElement {
  const card = document.createElement('article');
  card.className = 'game-card' + (viewMode === 'list' ? ' game-card--list' : '');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Play ${rom.title}`);

  // Cover area — pixel-art title display (no external image needed)
  const cover = document.createElement('div');
  cover.className = 'card-cover';
  cover.textContent = rom.title.toUpperCase();

  // Title
  const title = document.createElement('div');
  title.className = 'card-title';
  title.title = rom.title;
  title.textContent = rom.title;

  // Meta badges
  const meta = document.createElement('div');
  meta.className = 'card-meta';

  if (rom.year) {
    const y = badge('badge-year', String(rom.year));
    meta.appendChild(y);
  }
  if (rom.publisher && rom.publisher !== 'Unknown') {
    const p = badge('badge-pub', truncate(rom.publisher, 20));
    meta.appendChild(p);
  }
  if (rom.region !== 'NTSC') {
    meta.appendChild(badge('badge-pal', rom.region));
  }
  if (rom.isPrototype) {
    meta.appendChild(badge('badge-proto', 'PROTO'));
  }
  if (rom.isHack) {
    meta.appendChild(badge('badge-hack', 'HACK'));
  }

  // Play button
  const btn = document.createElement('button');
  btn.className = 'card-play-btn';
  btn.textContent = '▶ PLAY';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onPlay(rom);
  });

  card.addEventListener('click', () => onPlay(rom));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay(rom); }
  });

  card.append(cover, title, meta, btn);
  return card;
}

function badge(cls: string, text: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = `badge ${cls}`;
  el.textContent = text;
  return el;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
