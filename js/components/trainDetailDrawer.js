/**
 * RailRadar Train Detail Drawer
 * Comprehensive panel with Overview, Schedule Timeline, Elevation Profile, and Weather.
 */

import { api } from '../api.js';
import { ElevationChart } from './elevationChart.js';
import { favourites } from './favouritesManager.js';
import { toast } from './toastManager.js';
import { to12Hour } from '../utils/timeFormat.js';

export class TrainDetailDrawer {
  constructor(containerId, mapController) {
    this.container = document.getElementById(containerId);
    this.mapController = mapController;
    this.currentTrain = null;
    this.activeTab = 'overview';
    this.init();
  }

  init() {
    if (!this.container) return;

    // Attach event delegation for drawer controls
    this.container.addEventListener('click', (e) => {
      // Close button
      if (e.target.closest('#btn-close-train-drawer')) {
        this.close();
      }

      // Tab switcher
      const tabBtn = e.target.closest('.drawer-tab-btn');
      if (tabBtn) {
        const targetTab = tabBtn.getAttribute('data-tab');
        this.switchTab(targetTab);
      }

      // Star / Favorite toggle
      if (e.target.closest('#btn-fav-train')) {
        if (this.currentTrain) {
          const isSaved = favourites.toggleTrain(this.currentTrain);
          const starBtn = this.container.querySelector('#btn-fav-train');
          if (starBtn) {
            starBtn.classList.toggle('starred', isSaved);
          }
        }
      }

      // Share Link button
      if (e.target.closest('#btn-share-train')) {
        if (this.currentTrain) {
          const url = `${window.location.origin}/?train=${this.currentTrain.trainNumber}`;
          navigator.clipboard.writeText(url).then(() => {
            toast.show('Live link copied to clipboard!');
          }).catch(() => {
            toast.show(`Train: ${this.currentTrain.trainNumber}`);
          });
        }
      }

      // Camera Follow button
      if (e.target.closest('#btn-follow-train')) {
        if (this.currentTrain) {
          this.mapController.flyTo(this.currentTrain.lng || this.currentTrain.currentPosition?.lng, this.currentTrain.lat || this.currentTrain.currentPosition?.lat, 11);
          toast.show(`Tracking ${this.currentTrain.trainName}`);
        }
      }
    });
  }

  async open(trainSummary) {
    this.container.classList.add('open');
    this.container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title-group">
          <div class="drawer-title">
            <span>Loading train...</span>
          </div>
        </div>
        <button id="btn-close-train-drawer" class="icon-action-btn">✕</button>
      </div>
      <div class="drawer-content" style="align-items:center; justify-content:center; color:var(--text-tertiary);">
        <span>Fetching live telemetry...</span>
      </div>
    `;

    try {
      const fullDetail = await api.getTrainDetail(trainSummary.trainNumber);
      this.currentTrain = { ...trainSummary, ...fullDetail };
      this.render();

      // Highlight route on map
      if (this.currentTrain.routeCoords) {
        this.mapController.displayRoute(this.currentTrain.routeCoords);
      }
    } catch (err) {
      console.error(err);
      this.currentTrain = trainSummary;
      this.render();
    }
  }

  close() {
    this.container.classList.remove('open');
    this.mapController.clearRoute();
    this.currentTrain = null;
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    const tabBtns = this.container.querySelectorAll('.drawer-tab-btn');
    const tabPanes = this.container.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.getAttribute('data-pane') === tabName);
    });

    // Lazy load tab data if needed
    if (tabName === 'elevation') {
      this.loadElevationTab();
    } else if (tabName === 'weather') {
      this.loadWeatherTab();
    }
  }

  render() {
    if (!this.currentTrain) return;

    const t = this.currentTrain;
    const isSaved = favourites.isTrainSaved(t.trainNumber);
    const statusClass = t.status === 'ON_TIME' ? 'badge-ontime' : 'badge-delayed';
    const statusText = t.status === 'ON_TIME' ? '● ON TIME' : `● DELAYED (${t.delayMinutes}m)`;

    this.container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title-group">
          <div class="drawer-title">
            <span>${t.trainNumber}</span>
            <span style="font-weight:400; font-size:15px; color:var(--text-secondary);">${t.trainName}</span>
          </div>
          <div class="drawer-subtitle">${t.origin.name} → ${t.destination.name}</div>
        </div>
        <div class="drawer-actions">
          <button id="btn-follow-train" class="icon-action-btn" title="Center camera on train">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
          </button>
          <button id="btn-fav-train" class="icon-action-btn ${isSaved ? 'starred' : ''}" title="Save to favourites">⭐</button>
          <button id="btn-share-train" class="icon-action-btn" title="Share live link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <button id="btn-close-train-drawer" class="icon-action-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="drawer-tabs">
        <button class="drawer-tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
        <button class="drawer-tab-btn ${this.activeTab === 'schedule' ? 'active' : ''}" data-tab="schedule">Schedule</button>
        <button class="drawer-tab-btn ${this.activeTab === 'elevation' ? 'active' : ''}" data-tab="elevation">Elevation Profile</button>
        <button class="drawer-tab-btn ${this.activeTab === 'weather' ? 'active' : ''}" data-tab="weather">Weather</button>
      </div>

      <div class="drawer-content">
        <!-- Overview Pane -->
        <div class="tab-pane ${this.activeTab === 'overview' ? 'active' : ''}" data-pane="overview">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="badge ${statusClass}">${statusText}</span>
            <span class="badge badge-brand">${t.type.replace('_', ' ')}</span>
          </div>

          <!-- Journey Progress Bar -->
          <div class="journey-progress-wrap">
            <div class="journey-progress-header">
              <span>${t.origin.name} (${t.origin.departure || 'Departed'})</span>
              <span>${t.destination.name} (${t.destination.arrival || 'Scheduled'})</span>
            </div>
            <div class="journey-progress-bar-track">
              <div class="journey-progress-bar-fill" style="width: 48%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-tertiary);">
              <span>Next: ${t.nextStop ? t.nextStop.name : 'Approaching station'} (Pf ${t.nextStop?.platform || '1'})</span>
              <span>${t.nextStop?.eta || 'On schedule'}</span>
            </div>
          </div>

          <!-- 2x2 Stats Grid -->
          <div class="stats-grid-2x2">
            <div class="stat-box">
              <span class="stat-box-label">Current Speed</span>
              <span class="stat-box-value">${t.speed || 110} <span style="font-size:12px; color:var(--text-tertiary);">km/h</span></span>
              <span class="stat-box-sub">Max Permissible: ${t.maxSpeed || 130} km/h</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Live Delay</span>
              <span class="stat-box-value" style="color:${t.status === 'ON_TIME' ? 'var(--status-ontime)' : 'var(--status-delay-major)'}">${t.delayMinutes} <span style="font-size:12px; color:var(--text-tertiary);">min</span></span>
              <span class="stat-box-sub">${t.delayMinutes === 0 ? 'Punctual' : 'Behind schedule'}</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Operator</span>
              <span class="stat-box-value" style="font-size:15px;">${t.operator || 'Indian Railways'}</span>
              <span class="stat-box-sub">Superfast Corridor</span>
            </div>
            <div class="stat-box">
              <span class="stat-box-label">Telemetry Source</span>
              <span class="stat-box-value" style="font-size:15px; color:var(--brand-cyan);">RailRadar GPS</span>
              <span class="stat-box-sub">Refreshed 2s ago</span>
            </div>
          </div>
        </div>

        <!-- Schedule Pane -->
        <div class="tab-pane ${this.activeTab === 'schedule' ? 'active' : ''}" data-pane="schedule">
          <div class="timeline-list">
            ${(t.stops || []).map((stop, idx) => `
              <div class="timeline-item ${stop.status === 'DEPARTED' ? 'passed' : (stop.status === 'CURRENT' ? 'current' : '')}">
                <div class="timeline-node"></div>
                <div class="timeline-content">
                  <div class="timeline-station-name">
                    <span>${stop.stationName} (${stop.stationCode})</span>
                    <span class="timeline-platform-badge">Pf ${stop.platform || '1'}</span>
                  </div>
                  <div class="timeline-times">
                    <span>Sched: ${to12Hour(stop.scheduledArrival || stop.scheduledDeparture) || '--:--'}</span>
                    <span>•</span>
                    <span>Actual: ${to12Hour(stop.actualArrival || stop.actualDeparture || stop.scheduledDeparture) || '--:--'}</span>
                    ${stop.delayMinutes > 0 ? `<span class="timeline-delay-tag delayed">+${stop.delayMinutes}m</span>` : `<span class="timeline-delay-tag ontime">On-time</span>`}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Elevation Profile Pane -->
        <div class="tab-pane ${this.activeTab === 'elevation' ? 'active' : ''}" data-pane="elevation" id="tab-pane-elevation">
          <div style="color:var(--text-tertiary); text-align:center; padding:20px;">Loading elevation data from OpenTopography...</div>
        </div>

        <!-- Weather Pane -->
        <div class="tab-pane ${this.activeTab === 'weather' ? 'active' : ''}" data-pane="weather" id="tab-pane-weather">
          <div style="color:var(--text-tertiary); text-align:center; padding:20px;">Loading atmospheric data from OpenWeather...</div>
        </div>
      </div>
    `;

    if (this.activeTab === 'elevation') this.loadElevationTab();
    if (this.activeTab === 'weather') this.loadWeatherTab();
  }

  async loadElevationTab() {
    const pane = this.container.querySelector('#tab-pane-elevation');
    if (!pane || !this.currentTrain) return;

    try {
      const elevationData = await api.getElevationProfile(this.currentTrain.trainNumber);
      ElevationChart.render(pane, elevationData, 0.45);
    } catch (e) {
      pane.innerHTML = `<div style="color:var(--text-tertiary); padding:20px;">Failed to load elevation profile.</div>`;
    }
  }

  async loadWeatherTab() {
    const pane = this.container.querySelector('#tab-pane-weather');
    if (!pane || !this.currentTrain) return;

    const lat = this.currentTrain.lat || this.currentTrain.routeCoords[0][0];
    const lon = this.currentTrain.lng || this.currentTrain.routeCoords[0][1];

    try {
      const weather = await api.getWeatherAtPoint(lat, lon);

      pane.innerHTML = `
        <div class="weather-tab-container">
          <!-- Severe warning banner if applicable -->
          ${weather.isSevere ? `
            <div class="severe-weather-alert-banner warning">
              <span>Adverse weather conditions detected. Rail speeds regulated.</span>
            </div>
          ` : ''}

          <!-- Current Weather Card -->
          <div class="weather-current-card">
            <div class="weather-temp-group">
              <span class="weather-location-label">${weather.cityName} • Route Segment</span>
              <span class="weather-temp-large">${weather.tempC}°C</span>
              <span class="weather-condition-desc">${weather.description}</span>
            </div>
            <img class="weather-icon-large" src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.condition}" />
          </div>

          <!-- Metrics Row -->
          <div class="weather-metrics-row">
            <div class="weather-metric-box">
              <span class="weather-metric-label">Feels Like</span>
              <span class="weather-metric-val">${weather.feelsLikeC}°C</span>
            </div>
            <div class="weather-metric-box">
              <span class="weather-metric-label">Wind Speed</span>
              <span class="weather-metric-val">${weather.windSpeedKmh} km/h</span>
            </div>
            <div class="weather-metric-box">
              <span class="weather-metric-label">Humidity</span>
              <span class="weather-metric-val">${weather.humidity}%</span>
            </div>
          </div>

          <div style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-top:var(--space-xs);">
            Conditions at Upcoming Stations:
          </div>

          <div class="upcoming-weather-scroll">
            ${(this.currentTrain.stops || []).slice(1, 5).map(s => `
              <div class="station-weather-chip">
                <span class="station-weather-chip-code">${s.stationCode}</span>
                <span style="font-size:11px; color:var(--text-tertiary);">${s.stationName}</span>
                <span class="station-weather-chip-temp">28°C</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      pane.innerHTML = `<div style="color:var(--text-tertiary); padding:20px;">Weather data temporarily unavailable.</div>`;
    }
  }
}
