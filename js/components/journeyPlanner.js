/**
 * RailRadar Journey Planner Screen
 * Origin-Destination trip search with timetable options, swap buttons, and map previews.
 */

import { toast } from './toastManager.js';
import { soundEffects } from './soundEffects.js';
import { formatDateTime, overnightOffset } from '../utils/timeFormat.js';

export class JourneyPlanner {
  constructor(containerId, onTrackTrain) {
    this.container = document.getElementById(containerId);
    this.onTrackTrain = onTrackTrain;
    this.trains = [];
    this.stations = [];
    this.activeFilter = 'all'; // 'all' | 'direct' | 'highspeed'
    this.fromCode = 'NDLS';
    this.toCode = 'BSB';
    // Default travel date = today (local), stored as YYYY-MM-DD
    const now = new Date();
    this.travelDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    this.init();
  }

  setData(trains, stations) {
    this.trains = trains;
    this.stations = stations;
    if (this.stations.length >= 2) {
      this.fromCode = this.stations[0].code;
      this.toCode = this.stations[1].code;
    }
    this.render();
  }

  init() {
    if (!this.container) return;
  }

  findMatchingTrains(fromCode, toCode) {
    // 1. Direct route matching
    const directMatches = [];

    this.trains.forEach(t => {
      const stops = t.stops || [];
      const fromIdx = stops.findIndex(s => s.stationCode === fromCode);
      const toIdx = stops.findIndex(s => s.stationCode === toCode);

      // Matches if origin/destination match or both stations exist on route in order
      const isOriginMatch = t.origin.code === fromCode && t.destination.code === toCode;
      const isStopSequenceMatch = fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;

      if (isOriginMatch || isStopSequenceMatch) {
        const fromStop = stops[fromIdx] || { scheduledDeparture: t.origin.departure || '06:00' };
        const toStop = stops[toIdx] || { scheduledArrival: t.destination.arrival || '14:00' };

        directMatches.push({
          train: t,
          isDirect: true,
          fromTime: fromStop.scheduledDeparture || t.origin.departure || '06:00',
          toTime: toStop.scheduledArrival || t.destination.arrival || '14:00',
          stopsBetween: Math.max(0, toIdx - fromIdx - 1),
          reliability: t.status === 'ON_TIME' ? 96 : 82
        });
      }
    });

    if (directMatches.length > 0) {
      return directMatches;
    }

    // 2. Fallback: Show express trains passing through or departing from origin
    const departingFromOrigin = this.trains.filter(t => {
      return t.origin.code === fromCode || (t.stops && t.stops.some(s => s.stationCode === fromCode));
    });

    if (departingFromOrigin.length > 0) {
      return departingFromOrigin.map(t => ({
        train: t,
        isDirect: false,
        transferVia: 'Connect via Junction',
        fromTime: t.origin.departure || '07:30',
        toTime: t.destination.arrival || '16:00',
        stopsBetween: (t.stopsCount || 5) - 2,
        reliability: 89
      }));
    }

    // 3. General network high-speed recommendations
    return this.trains.slice(0, 4).map(t => ({
      train: t,
      isDirect: false,
      transferVia: 'Express Network Service',
      fromTime: t.origin.departure || '06:00',
      toTime: t.destination.arrival || '14:00',
      stopsBetween: (t.stopsCount || 4) - 2,
      reliability: 92
    }));
  }

  render() {
    if (!this.container) return;

    const fromSt = this.stations.find(s => s.code === this.fromCode) || this.stations[0] || { code: 'NDLS', name: 'New Delhi' };
    const toSt = this.stations.find(s => s.code === this.toCode) || this.stations[1] || { code: 'BSB', name: 'Varanasi Jn' };

    let results = this.findMatchingTrains(fromSt.code, toSt.code);

    if (this.activeFilter === 'direct') {
      results = results.filter(r => r.isDirect);
    } else if (this.activeFilter === 'highspeed') {
      results = results.filter(r => r.train.type === 'VANDE_BHARAT' || r.train.type === 'RAJDHANI' || (r.train.speed && r.train.speed >= 115));
    }

    this.container.innerHTML = `
      <div style="max-width:960px; margin:0 auto; display:flex; flex-direction:column; gap:var(--space-xl); padding-bottom:var(--space-2xl);">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <div style="display:flex; align-items:center; gap:var(--space-sm);">
              <h1 style="font-size:26px; font-weight:800; letter-spacing:-0.5px; background:var(--brand-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
                Journey Planner & Route Finder
              </h1>
              <span class="badge badge-brand">TIMETABLE ENGINE</span>
            </div>
            <p style="color:var(--text-secondary); font-size:14px; margin-top:4px;">
              Search real-time schedules, track connections, and verify punctuality indices across Indian Railways.
            </p>
          </div>
          <button id="btn-close-journey" class="icon-action-btn" style="width:36px; height:36px; border:1px solid var(--border-light);" title="Return to Map">
            ✕
          </button>
        </div>

        <!-- Search Card -->
        <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-light); border-radius:var(--radius-lg); padding:var(--space-xl); box-shadow:var(--shadow-lg); box-sizing:border-box; overflow:hidden;">
          <!-- Responsive flex row; wraps to column on narrow screens via journey-search-row class -->
          <div class="journey-search-row">
            <!-- From Station -->
            <div class="journey-field journey-field-station">
              <label class="journey-field-label">Origin Station</label>
              <select id="journey-from" class="journey-select">
                ${this.stations.map(s => `<option value="${s.code}" ${s.code === fromSt.code ? 'selected' : ''}>${s.name} (${s.code})</option>`).join('')}
              </select>
            </div>

            <!-- Swap Button -->
            <button id="btn-swap-stations" class="icon-action-btn journey-swap-btn" title="Swap origin &amp; destination">⇅</button>

            <!-- To Station -->
            <div class="journey-field journey-field-station">
              <label class="journey-field-label">Destination Station</label>
              <select id="journey-to" class="journey-select">
                ${this.stations.map(s => `<option value="${s.code}" ${s.code === toSt.code ? 'selected' : ''}>${s.name} (${s.code})</option>`).join('')}
              </select>
            </div>

            <!-- Date -->
            <div class="journey-field journey-field-date">
              <label class="journey-field-label">Date of Travel</label>
              <input id="journey-date" type="date" value="${this.travelDate}" class="journey-date-input" />
            </div>

            <!-- Search Action -->
            <button id="btn-search-journeys" class="journey-search-btn">
              <span>🔍</span>
              <span>Search</span>
            </button>
          </div>
        </div>

        <!-- Available Trains Results -->
        <div style="display:flex; flex-direction:column; gap:var(--space-md);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="font-size:16px; font-weight:700; color:var(--text-primary);">
                Available Services: ${fromSt.code} → ${toSt.code} (${results.length} Options)
              </h2>
            </div>
            <div style="display:flex; gap:var(--space-xs);" id="journey-filter-chips">
              <span class="badge ${this.activeFilter === 'all' ? 'badge-brand' : ''}" data-filter="all" style="cursor:pointer; ${this.activeFilter !== 'all' ? 'background-color:rgba(255,255,255,0.06);' : ''}">All Services</span>
              <span class="badge ${this.activeFilter === 'direct' ? 'badge-brand' : ''}" data-filter="direct" style="cursor:pointer; ${this.activeFilter !== 'direct' ? 'background-color:rgba(255,255,255,0.06);' : ''}">Direct Only</span>
              <span class="badge ${this.activeFilter === 'highspeed' ? 'badge-brand' : ''}" data-filter="highspeed" style="cursor:pointer; ${this.activeFilter !== 'highspeed' ? 'background-color:rgba(255,255,255,0.06);' : ''}">High Speed Only</span>
            </div>
          </div>

          <div id="journey-results-list" style="display:flex; flex-direction:column; gap:var(--space-md);">
            ${results.length === 0 ? `
              <div style="background-color:var(--bg-surface-elevated); border:1px dashed var(--border-subtle); border-radius:var(--radius-md); padding:36px; text-align:center; color:var(--text-tertiary);">
                No direct trains matched the selected filter. Try selecting <strong>"All Services"</strong> or swapping station junctions.
              </div>
            ` : results.map(item => {
              const t = item.train;
              return `
                <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-lg); display:flex; justify-content:space-between; align-items:center; transition:border-color var(--transition-fast);" onmouseover="this.style.borderColor='var(--brand-cyan)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; align-items:center; gap:var(--space-sm);">
                      <span style="font-weight:700; font-size:16px; font-family:var(--font-mono); color:var(--brand-cyan);">${t.trainNumber}</span>
                      <span style="font-weight:600; font-size:15px; color:var(--text-primary);">${t.trainName}</span>
                      <span class="badge ${item.isDirect ? 'badge-brand' : ''}" style="${!item.isDirect ? 'background:rgba(255,255,255,0.08);' : ''}">
                        ${item.isDirect ? 'DIRECT ROUTE' : (item.transferVia || 'CONNECTING')}
                      </span>
                      <span class="badge ${t.status === 'ON_TIME' ? 'badge-ontime' : 'badge-delayed'}">${t.status === 'ON_TIME' ? '● On-time' : `● +${t.delayMinutes}m`}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:var(--space-lg); color:var(--text-secondary); font-size:13px; flex-wrap:wrap;">
                      <span style="display:flex; flex-direction:column; gap:2px;">
                        <strong style="color:var(--text-primary); white-space:nowrap;">${formatDateTime(item.fromTime, this.travelDate, 0)}</strong>
                        <span style="font-size:12px; color:var(--text-tertiary);">Departs · ${fromSt.name}</span>
                      </span>
                      <span style="color:var(--text-tertiary);">➔</span>
                      <span style="display:flex; flex-direction:column; gap:2px;">
                        <strong style="color:var(--text-primary); white-space:nowrap;">${formatDateTime(item.toTime, this.travelDate, overnightOffset(item.fromTime, item.toTime))}</strong>
                        <span style="font-size:12px; color:var(--text-tertiary);">Arrives · ${toSt.name}</span>
                      </span>
                      <span style="color:var(--text-tertiary);">•</span>
                      <span>Speed: <strong>${t.speed || 110} km/h</strong></span>
                      <span style="color:var(--text-tertiary);">•</span>
                      <span>Punctuality Index: <strong style="color:var(--status-ontime);">${item.reliability}%</strong></span>
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:var(--space-md);">
                    <button class="btn-track-journey" data-train-number="${t.trainNumber}" style="background-color:rgba(0, 242, 254, 0.12); border:1px solid rgba(0, 242, 254, 0.3); color:var(--brand-cyan); padding:8px 16px; border-radius:var(--radius-sm); font-weight:700; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                      <span>Track on Map</span>
                      <span>🎯</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Attach listeners
    this.container.querySelector('#btn-close-journey')?.addEventListener('click', () => {
      this.close();
    });

    this.container.querySelector('#btn-swap-stations')?.addEventListener('click', () => {
      soundEffects.playClick();
      const temp = this.fromCode;
      this.fromCode = this.toCode;
      this.toCode = temp;
      this.render();
      toast.show('Swapped origin and destination', '⇅');
    });

    this.container.querySelector('#btn-search-journeys')?.addEventListener('click', () => {
      soundEffects.playClick();
      const fromEl = this.container.querySelector('#journey-from');
      const toEl   = this.container.querySelector('#journey-to');
      const dateEl = this.container.querySelector('#journey-date');
      if (fromEl) this.fromCode   = fromEl.value;
      if (toEl)   this.toCode    = toEl.value;
      if (dateEl && dateEl.value) this.travelDate = dateEl.value;
      this.render();
      toast.show('Routes refreshed', '🔍');
    });

    this.container.querySelectorAll('#journey-filter-chips [data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        soundEffects.playClick();
        this.activeFilter = chip.getAttribute('data-filter');
        this.render();
      });
    });

    this.container.querySelectorAll('.btn-track-journey').forEach(btn => {
      btn.addEventListener('click', () => {
        const trainNum = btn.getAttribute('data-train-number');
        this.close();
        if (this.onTrackTrain) {
          this.onTrackTrain(trainNum);
        }
      });
    });
  }

  open() {
    this.container.classList.add('active');
    this.render();
  }

  close() {
    this.container.classList.remove('active');
  }
}
