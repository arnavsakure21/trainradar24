/**
 * RailRadar Floating Search Bar & Command Palette
 * Autocomplete for train numbers, names, stations, and codes.
 */

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
      }, 150);
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

    const q = query.toLowerCase();

    // Match trains
    const matchedTrains = this.trains.filter(t =>
      t.trainNumber.toLowerCase().includes(q) ||
      t.trainName.toLowerCase().includes(q) ||
      t.origin.name.toLowerCase().includes(q) ||
      t.destination.name.toLowerCase().includes(q)
    ).slice(0, 5);

    // Match stations
    const matchedStations = this.stations.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.city && s.city.toLowerCase().includes(q))
    ).slice(0, 5);

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
    const popular = this.trains.slice(0, 4);
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
