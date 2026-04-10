// ═══════════════════════════════════════════════════════════════════════════
// CineGraph — Main Application
// Fetches data from the Express + Neo4j backend API
// ═══════════════════════════════════════════════════════════════════════════

// ─── State ────────────────────────────────────────────────────────────────────
let allMovies = [];
let allGenres = [];
let activeGenre = null;
let selectedMovie = null;

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const genreBar = document.getElementById('genreBar');
const movieGrid = document.getElementById('movieGrid');
const detailPanel = document.getElementById('detailPanel');
const detailLayout = document.getElementById('detailLayout');
const recSection = document.getElementById('recSection');
const detailClose = document.getElementById('detailClose');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const cypherBlock = document.getElementById('cypherBlock');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('connectionError');
const sectionLabel = document.getElementById('sectionLabel');

// ─── API Helper ───────────────────────────────────────────────────────────────
async function api(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderStars(rating) {
  const stars = Math.round(rating / 2);
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function showLoading() { loadingEl.classList.add('active'); }
function hideLoading() { loadingEl.classList.remove('active'); }
function showError() { errorEl.classList.add('active'); }

// ─── Initialize ───────────────────────────────────────────────────────────────
async function init() {
  showLoading();
  try {
    // Fetch genres and movies from Neo4j via our API
    const [genres, movies] = await Promise.all([
      api('/api/genres'),
      api('/api/movies')
    ]);

    allGenres = genres;
    allMovies = movies;

    hideLoading();
    buildGenreBar();
    renderGrid();
    GraphView.init();
    GraphView.draw(null, allMovies, allGenres);
  } catch (err) {
    hideLoading();
    showError();
    console.error('Failed to initialize:', err);
  }
}

// ─── Genre Bar ────────────────────────────────────────────────────────────────
function buildGenreBar() {
  genreBar.innerHTML = '';

  // "All Films" pill
  const allPill = document.createElement('button');
  allPill.className = 'genre-pill active';
  allPill.textContent = 'All Films';
  allPill.onclick = () => {
    activeGenre = null;
    updateGenrePills();
    renderGrid();
    updateDefaultCypher();
  };
  genreBar.appendChild(allPill);

  // Individual genre pills
  allGenres.forEach(g => {
    const pill = document.createElement('button');
    pill.className = 'genre-pill';
    pill.textContent = g.name;
    pill.onclick = () => {
      activeGenre = g.name;
      updateGenrePills();
      renderGrid();
      updateGenreCypher(g.name);
    };
    genreBar.appendChild(pill);
  });
}

function updateGenrePills() {
  const pills = document.querySelectorAll('.genre-pill');
  pills.forEach((p, i) => {
    if (i === 0) {
      p.classList.toggle('active', activeGenre === null);
    } else {
      p.classList.toggle('active', allGenres[i - 1]?.name === activeGenre);
    }
  });
}

// ─── Movie Grid ───────────────────────────────────────────────────────────────
function renderGrid() {
  const filtered = activeGenre
    ? allMovies.filter(m => m.genres.includes(activeGenre))
    : allMovies;

  movieGrid.innerHTML = filtered.map(m => `
    <div class="movie-card ${selectedMovie?.id === m.id ? 'selected' : ''}"
         onclick="selectMovie(${m.id})">
      <div class="movie-poster">
        ${m.emoji}
        <div class="movie-poster-year">${m.year}</div>
      </div>
      <div class="movie-body">
        <div class="movie-title">${m.title}</div>
        <div class="movie-genre">${m.genres.join(' · ')}</div>
        <div class="movie-rating">
          <span class="stars">${renderStars(m.rating)}</span>
          <span class="rating-num">${m.rating}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
async function selectMovie(id) {
  try {
    // Fetch full movie details and recommendations from Neo4j
    const [movie, recs] = await Promise.all([
      api(`/api/movies/${id}`),
      api(`/api/movies/${id}/recommendations`)
    ]);

    selectedMovie = movie;
    movie._recs = recs; // Attach for the graph view

    // Render detail layout
    detailLayout.innerHTML = `
      <div class="detail-poster">${movie.emoji}</div>
      <div>
        <h2 class="detail-title">${movie.title}</h2>
        <div class="detail-year">${movie.year}</div>
        <p class="detail-desc">${movie.description}</p>
        <div class="tag-group">
          ${movie.genres.map(g => `<span class="tag genre-tag">${g}</span>`).join('')}
        </div>
        <div style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Cast</div>
        <div class="actor-chips">
          ${movie.actors.map(a => `
            <div class="actor-chip">
              <div class="actor-chip-avatar">${a.initials}</div>
              ${a.name}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="detail-stats">
        <div class="stat-block">
          <span class="stat-val">${movie.rating}</span>
          <span class="stat-label">Rating</span>
        </div>
        <div class="stat-block">
          <span class="stat-val">${movie.year}</span>
          <span class="stat-label">Year</span>
        </div>
        <div class="stat-block">
          <span class="stat-val">${recs.length}</span>
          <span class="stat-label">Similar</span>
        </div>
      </div>
    `;

    // Render recommendations
    recSection.innerHTML = `
      <div class="rec-label">
        Recommended via Graph
        <span>MATCH (m)-[:HAS_GENRE|FEATURES*2]-(rec)</span>
      </div>
      <div class="rec-grid">
        ${recs.map(r => `
          <div class="rec-card" onclick="selectMovie(${r.id})">
            <div class="rec-card-emoji">${r.emoji}</div>
            <div class="rec-card-info">
              <div class="rec-card-title">${r.title}</div>
              <div class="rec-card-reason">${r.reason}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    updateMovieCypher(movie);
    detailPanel.classList.add('open');
    detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    renderGrid();
    GraphView.draw(movie, allMovies, allGenres);

  } catch (err) {
    console.error('Failed to load movie details:', err);
  }
}

// Close detail panel
detailClose.onclick = () => {
  detailPanel.classList.remove('open');
  selectedMovie = null;
  renderGrid();
  GraphView.draw(null, allMovies, allGenres);
  updateDefaultCypher();
};

// ─── Cypher Query Display ─────────────────────────────────────────────────────
function updateDefaultCypher() {
  cypherBlock.innerHTML = `
<span class="cy-keyword">MATCH</span> <span class="cy-node">(m:Movie)</span><br>
<span class="cy-keyword">OPTIONAL MATCH</span> <span class="cy-node">(m)</span><span class="cy-rel">-[:HAS_GENRE]-></span><span class="cy-node">(g:Genre)</span><br>
<span class="cy-keyword">RETURN</span> <span class="cy-prop">m.title</span>, <span class="cy-prop">m.year</span>, <span class="cy-prop">m.rating</span>, <span class="cy-prop">collect(g.name)</span> <span class="cy-keyword">AS</span> <span class="cy-val">genres</span><br>
<span class="cy-keyword">ORDER BY</span> <span class="cy-prop">m.rating</span> <span class="cy-keyword">DESC</span>
  `;
}

function updateGenreCypher(genre) {
  cypherBlock.innerHTML = `
<span class="cy-keyword">MATCH</span> <span class="cy-node">(m:Movie)</span><span class="cy-rel">-[:HAS_GENRE]-></span><span class="cy-node">(g:Genre {name: <span class="cy-val">"${genre}"</span>})</span><br>
<span class="cy-keyword">RETURN</span> <span class="cy-prop">m.title</span>, <span class="cy-prop">m.year</span>, <span class="cy-prop">m.rating</span><br>
<span class="cy-keyword">ORDER BY</span> <span class="cy-prop">m.rating</span> <span class="cy-keyword">DESC</span>
  `;
}

function updateMovieCypher(movie) {
  cypherBlock.innerHTML = `
<span class="cy-keyword">MATCH</span> <span class="cy-node">(m:Movie {title: <span class="cy-val">"${movie.title}"</span>})</span><br>
<span class="cy-keyword">MATCH</span> <span class="cy-node">(m)</span><span class="cy-rel">-[:HAS_GENRE]-></span><span class="cy-node">(g:Genre)</span><br>
<span class="cy-keyword">MATCH</span> <span class="cy-node">(m)</span><span class="cy-rel"><-[:FEATURES]-</span><span class="cy-node">(a:Actor)</span><br>
<span class="cy-keyword">MATCH</span> <span class="cy-node">(rec:Movie)</span><span class="cy-rel">-[:HAS_GENRE]-></span><span class="cy-node">(g)</span><br>
<span class="cy-keyword">WHERE</span> <span class="cy-prop">rec.title</span> <> <span class="cy-val">"${movie.title}"</span><br>
<span class="cy-keyword">RETURN</span> <span class="cy-prop">rec.title</span>, <span class="cy-prop">collect(g.name)</span> <span class="cy-keyword">AS</span> <span class="cy-val">shared_genres</span><br>
<span class="cy-keyword">ORDER BY</span> <span class="cy-prop">size(shared_genres)</span> <span class="cy-keyword">DESC LIMIT</span> <span class="cy-val">6</span>
  `;
}

// ─── Search (live, via API) ───────────────────────────────────────────────────
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();

  if (!q) {
    searchResults.classList.remove('open');
    return;
  }

  // Debounce API calls (300ms)
  searchTimeout = setTimeout(async () => {
    try {
      const hits = await api(`/api/search?q=${encodeURIComponent(q)}`);
      searchResults.innerHTML = hits.map(m => `
        <div class="search-item" onclick="searchSelect(${m.id})">
          <div class="search-item-poster">${m.emoji}</div>
          <div class="search-item-info">
            <div class="search-item-title">${m.title}</div>
            <div class="search-item-meta">${m.year} · ${m.genres.join(', ')}</div>
          </div>
        </div>
      `).join('') || '<div class="search-item" style="color:var(--muted);font-size:0.8rem;">No results found</div>';
      searchResults.classList.add('open');
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, 300);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.classList.remove('open');
});

function searchSelect(id) {
  searchResults.classList.remove('open');
  searchInput.value = '';
  selectMovie(id);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
