/**
 * RailRadar Station Detail Drawer
 * Animated split-flap inspired live departure and arrival boards,
 * platform tracking, and station facility amenities.
 */

import { api } from '../api.js';
import { favourites } from './favouritesManager.js';

export class StationDetailDrawer {
  constructor(containerId, mapController, onTrainSelect) {
    this.container = document.getElementById(containerId);
    this.mapController = mapController;
    this.onTrainSelect = onTrainSelect;
    this.currentStation = null;
    this.boardType = 'departures';
    this.init();
  }

  init() {
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      if (e.target.closest('#btn-close-station-drawer')) {
        this.close();
      }

      // Board toggle (Departures / Arrivals)
      const typeBtn = e.target.closest('.station-board-toggle-btn');
      if (typeBtn) {
        this.boardType = typeBtn.getAttribute('data-type');
        this.render();
      }

      // Favorite toggle
      if (e.target.closest('#btn-fav-station')) {
        if (this.currentStation) {
          const isSaved = favourites.toggleStation(this.currentStation);
          const starBtn = this.container.querySelector('#btn-fav-station');
          if (starBtn) {
            starBtn.classList.toggle('starred', isSaved);
          }
        }
      }

      // Click train row in board
      const trainRow = e.target.closest('.departure-board-row');
      if (trainRow) {
        const trainNum = trainRow.getAttribute('data-train-number');
        if (this.onTrainSelect && trainNum) {
          this.onTrainSelect({ trainNumber: trainNum });
        }
      }
    });
  }

  async open(station) {
    this.currentStation = station;
    this.container.classList.add('open');
    this.mapController.flyTo(station.lon, station.lat, 13);
    await this.render();
  }

  close() {
    this.container.classList.remove('open');
    this.currentStation = null;
  }

  async render() {
    if (!this.currentStation) return;

    const st = this.currentStation;
    const isSaved = favourites.isStationSaved(st.code);

    this.container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title-group">
          <div class="drawer-title">
            <span>${st.name}</span>
            <span style="font-family:var(--font-mono); font-size:14px; color:var(--brand-cyan);">(${st.code})</span>
          </div>
          <div class="drawer-subtitle">${st.zone || 'Indian Railways'} • ${st.city || ''} • ${st.platforms || 10} Platforms</div>
        </div>
        <div class="drawer-actions">
          <button id="btn-fav-station" class="icon-action-btn ${isSaved ? 'starred' : ''}" title="Save to favourites">⭐</button>
          <button id="btn-close-station-drawer" class="icon-action-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="drawer-content">
        <!-- Live Board Controls -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:6px;">
            <button class="station-board-toggle-btn badge ${this.boardType === 'departures' ? 'badge-brand' : ''}" data-type="departures" style="cursor:pointer; border:1px solid var(--border-light);">
              Departures
            </button>
            <button class="station-board-toggle-btn badge ${this.boardType === 'arrivals' ? 'badge-brand' : ''}" data-type="arrivals" style="cursor:pointer; border:1px solid var(--border-light);">
              Arrivals
            </button>
          </div>
          <span style="font-size:11px; color:var(--text-tertiary);">Auto-refreshing</span>
        </div>

        <!-- Departure Board Table -->
        <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); overflow:hidden;">
          <table class="departure-board-table">
            <thead>
              <tr>
                <th>Train</th>
                <th>Destination</th>
                <th>Pf</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="station-board-rows">
              <tr>
                <td colspan="5" style="text-align:center; color:var(--text-tertiary); padding:20px;">Fetching live board...</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Station Amenities / Facilities -->
        <div style="display:flex; flex-direction:column; gap:var(--space-xs);">
          <span style="font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase;">Station Amenities</span>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${(st.facilities || ['WIFI', 'ACCESSIBLE', 'FOOD', 'ATM', 'PARKING']).map(f => `
              <span class="badge" style="background-color:rgba(255,255,255,0.06); color:var(--text-secondary);">
                ${this.facilityIcon(f)} ${f}
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Fetch and populate live board
    try {
      const boardData = await api.getStationBoard(st.code, this.boardType);
      const rowsEl = this.container.querySelector('#station-board-rows');
      if (!rowsEl) return;

      if (!boardData.board || boardData.board.length === 0) {
        rowsEl.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-tertiary);">No scheduled ${this.boardType} at this time.</td></tr>`;
        return;
      }

      rowsEl.innerHTML = boardData.board.map(row => `
        <tr class="departure-board-row" data-train-number="${row.trainNumber}">
          <td>
            <div style="font-weight:600; color:var(--text-primary); font-family:var(--font-mono);">${row.trainNumber}</div>
            <div style="font-size:11px; color:var(--text-secondary);">${row.trainName}</div>
          </td>
          <td>${row.destination}</td>
          <td><span class="timeline-platform-badge">Pf ${row.platform}</span></td>
          <td style="font-family:var(--font-mono);">${row.scheduledTime || '--:--'}</td>
          <td>
            <span class="badge ${row.delayMinutes === 0 ? 'badge-ontime' : 'badge-delayed'}">
              ${row.delayMinutes === 0 ? 'On Time' : `+${row.delayMinutes}m`}
            </span>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.warn(e);
    }
  }

  facilityIcon(f) {
    // Return empty string — facility name in the badge is sufficient
    return '';
  }
}
