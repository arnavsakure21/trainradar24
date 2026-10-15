/**
 * RailRadar Floating Search Bar & Command Palette
 * Autocomplete for train numbers, names, stations, and codes.
 * Features fuzzy typo tolerance for Indian phonetic variations.
 */

function simplifyPhonetics(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/([bcdfghjklmnpqrstvwxyz])h+/g, '$1') // e.g. dh->d, bh->b, th->t, gh->g, kh->k
    .replace(/h+$/g, '')
    .replace(/(.)\1+/g, '$1') // collapse repeated letters
    .trim();
}

function bigramDice(s1, s2) {
  if (!s1 || !s2 || s1.length < 2 || s2.length < 2) return 0;
  const getBigrams = str => {
    const bg = new Set();
    for (let i = 0; i < str.length - 1; i++) bg.add(str.slice(i, i + 2));
    return bg;
  };
  const b1 = getBigrams(s1.toLowerCase());
  const b2 = getBigrams(s2.toLowerCase());
  let intersection = 0;
  b1.forEach(item => { if (b2.has(item)) intersection++; });
  return (2.0 * intersection) / (b1.size + b2.size);
}

function computeMatchScore(query, target) {
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 80;

  // Check word prefixes
  const words = t.split(/[\s\-()]+/);
  for (const w of words) {
    if (w.startsWith(q)) return 85;
  }

  // Phonetic simplification (handles Indian railway spelling variants like vidharhb / vidharbha / vidarbha)
  const sq = simplifyPhonetics(q);
  const st = simplifyPhonetics(t);
  if (st.includes(sq) || sq.includes(st)) return 75;
  for (const w of st.split(/[\s\-()]+/)) {
    if (w.startsWith(sq) || sq.startsWith(w)) return 70;
  }

  // Bigram Dice similarity
  for (const w of words) {
    const dice = bigramDice(q, w);
    if (dice >= 0.45) return Math.round(50 + dice * 30);
  }
  const fullDice = bigramDice(q, t);
  if (fullDice >= 0.4) return Math.round(40 + fullDice * 30);

  return 0;
}

export class SearchBar {
  constructor(inputWrapId, onSelect) {
    this.wrap = document.getElementById(inputWrapId);
    this.input = this.wrap?.querySelector('.search-command-input');
    this.dropdown = this.wrap?.querySelector('.search-results-dropdown');
    this.onSelect = onSelect;
    this.trains = [];
    this.stations = [];
    this.init();
  }

  setData(trains, stations) {
    this.trains = trains;
    this.stations = stations;
  }

  init() {
    if (!this.input || !this.dropdown) return;

    // Listen to input typing with debounce
    let timeout = null;
    this.input.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.performSearch(e.target.value.trim());
      }, 120);
    });

    // Keyboard shortcut (/ or Cmd/Ctrl+K)
    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement !== this.input) {
        e.preventDefault();
        this.input.focus();
        this.input.select();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!this.wrap.contains(e.target)) {
        this.close();
      }
    });

    // Open recent searches on focus
    this.input.addEventListener('focus', () => {
      if (this.input.value.trim() === '') {
        this.showRecentSearches();
      } else {
        this.performSearch(this.input.value.trim());
      }
    });
  }

  performSearch(query) {
    if (query.length < 2) {
      this.showRecentSearches();
      return;
    }

    // Score and match trains with fuzzy tolerance
    const scoredTrains = [];
    this.trains.forEach(t => {
      const scoreNum = computeMatchScore(query, t.trainNumber);
      const scoreName = computeMatchScore(query, t.trainName);
      const scoreOrig = computeMatchScore(query, t.origin.name);
      const scoreDest = computeMatchScore(query, t.destination.name);
      const maxScore = Math.max(scoreNum, scoreName, scoreOrig, scoreDest);
      if (maxScore > 0) {
        scoredTrains.push({ train: t, score: maxScore });
      }
    });
    scoredTrains.sort((a, b) => b.score - a.score);
    const matchedTrains = scoredTrains.slice(0, 5).map(item => item.train);

    // Score and match stations with fuzzy tolerance
    const scoredStations = [];
    this.stations.forEach(s => {
      const scoreCode = computeMatchScore(query, s.code);
      const scoreName = computeMatchScore(query, s.name);
      const scoreCity = computeMatchScore(query, s.city || '');
      const maxScore = Math.max(scoreCode, scoreName, scoreCity);
      if (maxScore > 0) {
        scoredStations.push({ station: s, score: maxScore });
      }
    });
    scoredStations.sort((a, b) => b.score - a.score);
    const matchedStations = scoredStations.slice(0, 5).map(item => item.station);

    if (matchedTrains.length === 0 && matchedStations.length === 0) {
      this.dropdown.innerHTML = `<div style="padding:16px; font-size:12px; color:var(--text-tertiary); text-align:center;">No results found for "${query}"</div>`;
      this.dropdown.classList.add('open');
      return;
    }

    let html = '';

    if (matchedTrains.length > 0) {
      html += `<div class="search-section-label">Trains</div>`;
      matchedTrains.forEach(t => {
        html += `
          <div class="search-result-item" data-type="train" data-id="${t.trainNumber}">
            <div>
              <div class="search-result-title">🚆 ${t.trainNumber} - ${t.trainName}</div>
              <div class="search-result-sub">${t.origin.name} → ${t.destination.name}</div>
            </div>
            <span class="badge ${t.status === 'ON_TIME' ? 'badge-ontime' : 'badge-delayed'}">
              ${t.status === 'ON_TIME' ? 'On Time' : `+${t.delayMinutes}m`}
            </span>
          </div>
        `;
      });
    }

    if (matchedStations.length > 0) {
      html += `<div class="search-section-label">Stations</div>`;
      matchedStations.forEach(s => {
        html += `
          <div class="search-result-item" data-type="station" data-id="${s.code}">
            <div>
              <div class="search-result-title">🏛️ ${s.name} (${s.code})</div>
              <div class="search-result-sub">${s.city || ''} • ${s.zone || 'Indian Railways'}</div>
            </div>
            <span class="badge badge-brand">${s.platforms || 8} Pf</span>
          </div>
        `;
      });
    }

    this.dropdown.innerHTML = html;
    this.dropdown.classList.add('open');
    this.attachItemListeners();
  }

  showRecentSearches() {
    // Show quick suggestions
    const popular = this.trains.slice(0, 5);
    let html = `<div class="search-section-label">Popular Express Services</div>`;
    popular.forEach(t => {
      html += `
        <div class="search-result-item" data-type="train" data-id="${t.trainNumber}">
          <div>
            <div class="search-result-title">🚆 ${t.trainNumber} - ${t.trainName}</div>
            <div class="search-result-sub">${t.origin.name} → ${t.destination.name}</div>
          </div>
          <span class="badge badge-brand">${t.type.replace('_', ' ')}</span>
        </div>
      `;
    });

    this.dropdown.innerHTML = html;
    this.dropdown.classList.add('open');
    this.attachItemListeners();
  }

  attachItemListeners() {
    this.dropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        const id = item.getAttribute('data-id');
        this.close();
        if (this.onSelect) {
          this.onSelect(type, id);
        }
      });
    });
  }

  close() {
    if (this.dropdown) {
      this.dropdown.classList.remove('open');
    }
  }
}
