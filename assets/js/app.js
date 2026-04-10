/* ─── app.js — Atari 2600 Browser Logic ───────────────────────────────────── */

const PAGE_SIZE = 60;

// Cover art backgrounds per genre (CSS gradient)
const GENRE_BG = {
  Action:      'linear-gradient(135deg,#1a0010,#400020)',
  Shooter:     'linear-gradient(135deg,#001a20,#004050)',
  Arcade:      'linear-gradient(135deg,#1a1000,#402000)',
  Adventure:   'linear-gradient(135deg,#001a10,#004030)',
  Sports:      'linear-gradient(135deg,#0a0020,#250050)',
  Racing:      'linear-gradient(135deg,#1a0d00,#502000)',
  Strategy:    'linear-gradient(135deg,#00101a,#003040)',
  Platformer:  'linear-gradient(135deg,#001a10,#004030)',
  Puzzle:      'linear-gradient(135deg,#1a0d00,#502000)',
  Educational: 'linear-gradient(135deg,#0a0020,#250050)',
  Simulation:  'linear-gradient(135deg,#00101a,#003040)',
};

// Emoji icons per genre
const GENRE_ICON = {
  Action:     '⚔️', Shooter:   '🚀', Arcade:    '🕹️',
  Adventure:  '🗺️', Sports:    '⚽', Racing:    '🏎️',
  Strategy:   '♟️', Platformer:'🦘', Puzzle:    '🧩',
  Educational:'📚', Simulation:'✈️',
};

// ─── State ─────────────────────────────────────────────────────────────────
let state = {
  query:   '',
  genre:   'All',
  region:  'All',
  alpha:   '',
  yearMin: 0,
  yearMax: 9999,
  page:    1,
  view:    'grid',   // 'grid' | 'list'
  filtered: [],
};

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildAlphaFilter();
  populateGenres();
  populateRegions();
  populateYears();
  applyFilters();
  bindEvents();

  // Restore view preference
  const savedView = localStorage.getItem('atari-view') || 'grid';
  setView(savedView, false);

  // Update total count badge
  const el = document.getElementById('total-count');
  if (el) el.textContent = GAMES.length.toLocaleString();
});

// ─── Build alphabet filter ──────────────────────────────────────────────────
function buildAlphaFilter() {
  const container = document.getElementById('alpha-filter');
  if (!container) return;
  const letters = ['#', ...Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))];
  letters.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'alpha-btn';
    btn.textContent = l;
    btn.dataset.letter = l;
    btn.addEventListener('click', () => {
      const active = btn.classList.contains('active');
      document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
      if (!active) { btn.classList.add('active'); state.alpha = l; }
      else { state.alpha = ''; }
      state.page = 1;
      applyFilters();
    });
    container.appendChild(btn);
  });
}

// ─── Populate selects ───────────────────────────────────────────────────────
function populateGenres() {
  const genres = ['All', ...Array.from(new Set(GAMES.map(g => g.genre))).sort()];
  const sel = document.getElementById('genre-filter');
  if (!sel) return;
  genres.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    sel.appendChild(o);
  });
}

function populateRegions() {
  const regions = ['All', ...Array.from(new Set(GAMES.map(g => g.region || 'NTSC'))).sort()];
  const sel = document.getElementById('region-filter');
  if (!sel) return;
  regions.forEach(r => {
    const o = document.createElement('option');
    o.value = r; o.textContent = r;
    sel.appendChild(o);
  });
}

function populateYears() {
  const years = GAMES.map(g => g.year).filter(Boolean);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  const sel = document.getElementById('year-filter');
  if (!sel) return;
  const allOpt = document.createElement('option');
  allOpt.value = 'All'; allOpt.textContent = 'All Years';
  sel.appendChild(allOpt);
  for (let y = maxY; y >= minY; y--) {
    if (!years.includes(y)) continue;
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    sel.appendChild(o);
  }
}

// ─── Filter & render ────────────────────────────────────────────────────────
function applyFilters() {
  const q = state.query.toLowerCase().trim();

  state.filtered = GAMES.filter(g => {
    if (q && !g.title.toLowerCase().includes(q) && !g.developer.toLowerCase().includes(q)) return false;
    if (state.genre !== 'All' && g.genre !== state.genre) return false;
    if (state.region !== 'All' && (g.region || 'NTSC') !== state.region) return false;
    if (state.alpha) {
      const first = g.title[0].toUpperCase();
      if (state.alpha === '#') { if (!/\d/.test(first)) return false; }
      else if (first !== state.alpha) return false;
    }
    if (state.yearMin && g.year < state.yearMin) return false;
    if (state.yearMax && g.year > state.yearMax) return false;
    return true;
  });

  renderResults();
}

function renderResults() {
  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.page > pages) state.page = 1;

  const start = (state.page - 1) * PAGE_SIZE;
  const pageGames = state.filtered.slice(start, start + PAGE_SIZE);

  // Update counter
  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.innerHTML = `<span>${total.toLocaleString()}</span> jogos encontrados`;
  }

  const container = document.getElementById('game-container');
  if (!container) return;

  if (pageGames.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🕹️</div>
        <h3>Nenhum jogo encontrado</h3>
        <p>Tente outro filtro ou termo de busca.</p>
      </div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  if (state.view === 'list') {
    container.className = 'game-list';
    container.innerHTML = pageGames.map(g => renderListCard(g)).join('');
  } else {
    container.className = 'game-grid';
    container.innerHTML = pageGames.map(g => renderGridCard(g)).join('');
  }

  renderPagination(pages);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Card templates ─────────────────────────────────────────────────────────
function renderGridCard(g) {
  const bg    = GENRE_BG[g.genre]  || GENRE_BG.Action;
  const icon  = GENRE_ICON[g.genre]|| '🕹️';
  const tag   = genreTag(g.genre);
  const badge = badgeHTML(g);
  return `
    <div class="game-card" onclick="openGame(${g.id})" title="${esc(g.title)}">
      <div class="game-cover" style="background:${bg}">
        <span>${icon}</span>
        <div class="play-overlay">▶</div>
        ${badge}
      </div>
      <div class="game-info">
        <div class="game-title">${esc(g.title)}</div>
        <div class="game-meta">
          <span>${g.year}</span>
          <span class="game-genre-tag ${tag}">${g.genre}</span>
        </div>
      </div>
    </div>`;
}

function renderListCard(g) {
  const bg   = GENRE_BG[g.genre] || GENRE_BG.Action;
  const icon = GENRE_ICON[g.genre]|| '🕹️';
  const tag  = genreTag(g.genre);
  const badge = badgeHTML(g);
  return `
    <div class="game-card" onclick="openGame(${g.id})">
      <div class="game-cover" style="background:${bg};font-size:22px;width:60px;min-width:60px;height:45px;border-radius:4px;aspect-ratio:unset;position:relative;">
        ${icon}
        ${badge}
      </div>
      <div class="game-info" style="flex:1;padding:0;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div class="game-title" style="flex:1;min-width:120px;">${esc(g.title)}</div>
        <div class="game-meta" style="gap:16px;">
          <span>${esc(g.developer)}</span>
          <span>${g.year}</span>
          <span class="game-genre-tag ${tag}">${g.genre}</span>
          <span style="color:var(--text-muted)">${g.players}P</span>
        </div>
      </div>
      <button class="play-btn-list" onclick="event.stopPropagation();openGame(${g.id})">▶ Jogar</button>
    </div>`;
}

function badgeHTML(g) {
  if (g.homebrew)  return '<span style="position:absolute;top:4px;right:4px;background:#00ff8866;color:#fff;font-size:8px;padding:2px 4px;border-radius:3px;font-weight:700;">HOMEBREW</span>';
  if (g.prototype) return '<span style="position:absolute;top:4px;right:4px;background:#ff330066;color:#fff;font-size:8px;padding:2px 4px;border-radius:3px;font-weight:700;">PROTO</span>';
  return '';
}

function genreTag(genre) {
  const map = {
    Action:'action', Shooter:'shooter', Arcade:'arcade', Adventure:'adventure',
    Sports:'sports', Racing:'racing', Strategy:'strategy', Platformer:'platformer',
    Puzzle:'puzzle', Educational:'educational', Simulation:'simulation',
  };
  return 'tag-' + (map[genre] || 'action');
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Pagination ─────────────────────────────────────────────────────────────
function renderPagination(pages) {
  const el = document.getElementById('pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }

  const cur = state.page;
  let html = '';

  html += `<button class="page-btn" ${cur===1?'disabled':''} onclick="goPage(${cur-1})">‹</button>`;

  const range = pageRange(cur, pages);
  let last = 0;
  range.forEach(p => {
    if (p - last > 1) html += `<span class="page-info">…</span>`;
    html += `<button class="page-btn${p===cur?' active':''}" onclick="goPage(${p})">${p}</button>`;
    last = p;
  });

  html += `<button class="page-btn" ${cur===pages?'disabled':''} onclick="goPage(${cur+1})">›</button>`;
  html += `<span class="page-info">${cur} / ${pages}</span>`;

  el.innerHTML = html;
}

function pageRange(cur, total) {
  const delta = 2;
  const range = new Set([1, total]);
  for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) range.add(i);
  return Array.from(range).sort((a,b) => a-b);
}

function goPage(p) {
  state.page = p;
  renderResults();
}

// ─── Event binding ──────────────────────────────────────────────────────────
function bindEvents() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.query = e.target.value;
      state.page = 1;
      applyFilters();
    });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { state.query = e.target.value; state.page = 1; applyFilters(); }
    });
  }

  const genreSel = document.getElementById('genre-filter');
  if (genreSel) genreSel.addEventListener('change', e => { state.genre = e.target.value; state.page = 1; applyFilters(); });

  const regionSel = document.getElementById('region-filter');
  if (regionSel) regionSel.addEventListener('change', e => { state.region = e.target.value; state.page = 1; applyFilters(); });

  const yearSel = document.getElementById('year-filter');
  if (yearSel) yearSel.addEventListener('change', e => {
    const v = e.target.value;
    state.yearMin = v === 'All' ? 0 : parseInt(v);
    state.yearMax = v === 'All' ? 9999 : parseInt(v);
    state.page = 1;
    applyFilters();
  });

  document.getElementById('btn-grid')?.addEventListener('click', () => setView('grid'));
  document.getElementById('btn-list')?.addEventListener('click', () => setView('list'));
  document.getElementById('btn-clear')?.addEventListener('click', clearFilters);
}

function setView(view, save = true) {
  state.view = view;
  if (save) localStorage.setItem('atari-view', view);
  document.getElementById('btn-grid')?.classList.toggle('active', view === 'grid');
  document.getElementById('btn-list')?.classList.toggle('active', view === 'list');
  renderResults();
}

function clearFilters() {
  state.query = ''; state.genre = 'All'; state.region = 'All';
  state.alpha = ''; state.yearMin = 0; state.yearMax = 9999; state.page = 1;
  document.getElementById('search-input').value = '';
  document.getElementById('genre-filter').value = 'All';
  document.getElementById('region-filter').value = 'All';
  document.getElementById('year-filter').value = 'All';
  document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
  applyFilters();
}

// ─── Navigate to player ─────────────────────────────────────────────────────
function openGame(id) {
  const game = GAMES.find(g => g.id === id);
  if (!game) return;
  const params = new URLSearchParams({ id });
  window.location.href = `play.html?${params}`;
}
