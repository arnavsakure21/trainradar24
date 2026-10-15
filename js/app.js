/**
 * RailRadar Master Application Controller
 * Orchestrates map engine, layers, search, drawers, live polling, and navigation.
 */

import { api } from './api.js';
import { MapController } from './map/mapController.js';
import { TrainLayer } from './map/trainLayer.js';
import { StationLayer } from './map/stationLayer.js';
import { WeatherLayer } from './map/weatherLayer.js';
import { SearchBar } from './components/searchBar.js';
import { TrainDetailDrawer } from './components/trainDetailDrawer.js';
import { StationDetailDrawer } from './components/stationDetailDrawer.js';
import { JourneyPlanner } from './components/journeyPlanner.js';
import { OperatorDashboard } from './components/operatorDashboard.js';
import { favourites } from './components/favouritesManager.js';
import { toast } from './components/toastManager.js';
import { AlertManager } from './components/alertManager.js';
import { soundEffects } from './components/soundEffects.js';

class RailRadarApp {
  constructor() {
    this.trains = [];
    this.stations = [];
    this.currentView = 'map'; // 'map' | 'journey' | 'favourites' | 'dashboard'
    this.pollTimer = null;
    this.alertManager = null;
  }

  async start() {
    console.log('Launching RailRadar Application Engine...');

    // 1. Initialise Map Controller
    this.mapController = new MapController('map').init();

    // 2. Initialise Drawers
    this.trainDrawer = new TrainDetailDrawer('train-detail-drawer', this.mapController);
    this.stationDrawer = new StationDetailDrawer('station-detail-drawer', this.mapController, (train) => {
      this.stationDrawer.close();
      this.openTrain(train.trainNumber);
    });

    // 3. Initialise Map Layers
    this.trainLayer = new TrainLayer(this.mapController, (train) => {
      this.openTrain(train.trainNumber);
    });

    this.stationLayer = new StationLayer(this.mapController, (station) => {
      this.openStation(station);
    });

    this.weatherLayer = new WeatherLayer(this.mapController);

    // 4. Initialise Search & Navigation Screens
    this.searchBar = new SearchBar('search-command-container', (type, id) => {
      if (type === 'train') {
        this.openTrain(id);
      } else if (type === 'station') {
        const matched = this.stations.find(s => s.code === id);
        if (matched) this.openStation(matched);
      }
    });

    this.journeyPlanner = new JourneyPlanner('journey-planner-screen', (trainNum) => {
      this.switchView('map');
      this.openTrain(trainNum);
    });

    this.operatorDashboard = new OperatorDashboard('operator-dashboard-screen', (trainNum) => {
      this.switchView('map');
      this.openTrain(trainNum);
    });

    // 5. Initialise Alert & Notification Engine
    this.alertManager = new AlertManager((trainNum) => {
      this.switchView('map');
      this.openTrain(trainNum);
    });

    // 6. Setup UI Event Handlers & Layer Menu
    this.bindUIEvents();

    // 6. Fetch initial data and start live telemetry loops
    this.mapController.onReady(async () => {
      await this.loadInitialData();
      this.startLiveTelemetry();
      this.checkUrlParams();
    });
  }

  async loadInitialData() {
    try {
      // Fetch stations
      this.stations = await api.getStations();
      this.stationLayer.loadStations(this.stations);

      // Fetch live trains
      const liveData = await api.getLiveTrains();
      this.trains = liveData.trains;
      this.trainLayer.updateTrains(this.trains);

      // Pass data to components
      this.searchBar.setData(this.trains, this.stations);
      this.journeyPlanner.setData(this.trains, this.stations);
      this.operatorDashboard.setData(this.trains);

      // Pre-cache weather markers for station layer
      this.weatherLayer.loadWeatherForStations(this.stations);

      // Check for delay alerts on initial load
      if (this.alertManager) {
        this.alertManager.checkTrains(this.trains);
      }

      // Update UI counts
      this.updateStatusBadge();
    } catch (err) {
      console.error('Initial data load error:', err);
      toast.show('Operating in offline telemetry mode');
    }
  }

  startLiveTelemetry() {
    this.pollTimer = setInterval(async () => {
      try {
        const liveData = await api.getLiveTrains();
        this.trains = liveData.trains;
        this.trainLayer.updateTrains(this.trains);
        this.searchBar.setData(this.trains, this.stations);
        this.operatorDashboard.setData(this.trains);
        this.updateStatusBadge();

        // Check for delay alerts on live update
        if (this.alertManager) {
          this.alertManager.checkTrains(this.trains);
        }
      } catch (e) {
        // Silently retry
      }
    }, 4000);
  }

  updateStatusBadge() {
    const pill = document.querySelector('.top-status-pill span');
    if (pill) {
      pill.textContent = `${this.trains.length} Trains Monitored`;
    }

    const favBadge = document.getElementById('fav-count-badge');
    if (favBadge) {
      const count = favourites.getFavouritesCount();
      favBadge.textContent = count;
      favBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  async openTrain(trainNumber) {
    let train = this.trains.find(t => t.trainNumber === trainNumber);
    if (!train || !train.stops) {
      try {
        const fetched = await api.getTrainDetail(trainNumber);
        if (fetched && fetched.trainNumber) {
          train = fetched;
          if (!this.trains.some(t => t.trainNumber === fetched.trainNumber)) {
            this.trains.push(fetched);
            this.trainLayer.updateTrains(this.trains);
            this.searchBar.setData(this.trains, this.stations);
            this.updateStatusBadge();
          }
        }
      } catch (e) {
        if (!train) train = { trainNumber };
      }
    }
    this.stationDrawer.close();
    await this.trainDrawer.open(train);
  }

  async openStation(station) {
    this.trainDrawer.close();
    await this.stationDrawer.open(station);
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update sidebar navigation icons
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Close all full-page overlays first
    document.querySelectorAll('.full-screen-view').forEach(view => {
      view.classList.remove('active');
    });

    if (viewName === 'map') {
      // Nothing else needed, map is visible
    } else if (viewName === 'journey') {
      this.journeyPlanner.open();
    } else if (viewName === 'favourites') {
      this.openFavouritesView();
    } else if (viewName === 'dashboard') {
      this.operatorDashboard.open();
    }
  }

  openFavouritesView() {
    const view = document.getElementById('favourites-screen');
    if (!view) return;

    const saved = favourites.favourites;
    const activeAlerts = (saved.alertHistory || []).filter(item => item.trainNumber !== 'TEST' && item.type !== 'TEST_SIGNAL');
    const permStatus = this.alertManager ? this.alertManager.getPermissionStatus() : 'default';

    const getPermBadge = (status) => {
      if (status === 'granted') {
        return '<span class="badge badge-ontime" style="font-size:11px;">● Active & Permitted</span>';
      } else if (status === 'denied') {
        return '<span class="badge badge-delayed" style="font-size:11px;">● Blocked in Browser</span>';
      }
      return '<span class="badge badge-brand" style="font-size:11px;">● Permission Required</span>';
    };

    view.innerHTML = `
      <div style="max-width:880px; margin:0 auto; display:flex; flex-direction:column; gap:var(--space-xl); padding-bottom:var(--space-2xl);">
        <!-- View Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <div style="display:flex; align-items:center; gap:var(--space-sm);">
              <h1 style="font-size:26px; font-weight:800; background:var(--brand-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
                Saved Favourites & Alert Monitor
              </h1>
              <span class="badge badge-brand">LIVE RADAR</span>
            </div>
            <p style="color:var(--text-secondary); font-size:14px; margin-top:4px;">
              Manage your pinned express trains, home stations, acoustic chimes, and browser push notifications.
            </p>
          </div>
          <button id="btn-close-favs" class="icon-action-btn" style="width:36px; height:36px; border:1px solid var(--border-light);" title="Return to Map">
            ✕
          </button>
        </div>

        <!-- Alert Preferences & Sound Center -->
        <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-light); border-radius:var(--radius-lg); padding:var(--space-xl); box-shadow:var(--shadow-lg); display:flex; flex-direction:column; gap:var(--space-lg);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:var(--space-md); flex-wrap:wrap; gap:var(--space-sm);">
            <div>
              <div style="font-size:17px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
                <span>Audio & Push Notification Controls</span>
              </div>
              <div style="font-size:13px; color:var(--text-secondary); margin-top:3px;">
                Real-time acoustic and desktop alerts triggered when your pinned trains experience delays
              </div>
            </div>
            <button id="btn-test-alert" style="background:linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(79, 172, 254, 0.25)); border:1px solid var(--brand-cyan); color:var(--brand-cyan); padding:9px 18px; border-radius:var(--radius-sm); font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all var(--transition-fast); box-shadow:0 0 12px rgba(0, 242, 254, 0.15);">
              <span>Test Chime & Alert</span>
            </button>
          </div>

          <!-- Uniform Controls Stack -->
          <div style="display:flex; flex-direction:column; gap:var(--space-sm);">
            <!-- Row 1: Acoustic Station Chimes -->
            <div style="background-color:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px 24px; display:flex; justify-content:space-between; align-items:center; min-height:76px; gap:var(--space-lg); transition:border-color var(--transition-fast);" onmouseover="this.style.borderColor='rgba(0, 242, 254, 0.35)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
              <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-weight:700; font-size:14px; color:var(--text-primary);">Acoustic Station Chimes</span>
                  <span class="badge ${saved.soundEnabled !== false ? 'badge-ontime' : 'badge-delayed'}" style="font-size:11px; padding:3px 10px; font-weight:600;">
                    ${saved.soundEnabled !== false ? '● Sound Enabled' : '● Muted'}
                  </span>
                </div>
                <div style="font-size:12px; color:var(--text-secondary); line-height:1.4;">
                  Harmonic synthesized train announcement and delay alert chimes via Web Audio
                </div>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-end; min-width:120px;">
                <label class="switch-toggle" title="Toggle Acoustic Chimes">
                  <input type="checkbox" id="toggle-sound-effects" ${saved.soundEnabled !== false ? 'checked' : ''}>
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>

            <!-- Row 2: Desktop Push Notifications -->
            <div style="background-color:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px 24px; display:flex; justify-content:space-between; align-items:center; min-height:76px; gap:var(--space-lg); transition:border-color var(--transition-fast);" onmouseover="this.style.borderColor='rgba(0, 242, 254, 0.35)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
              <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-weight:700; font-size:14px; color:var(--text-primary);">Browser Push Notifications</span>
                  ${getPermBadge(permStatus)}
                </div>
                <div style="font-size:12px; color:var(--text-secondary); line-height:1.4;">
                  Native background desktop notifications when pinned trains experience delays
                </div>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-end; min-width:120px;">
                ${permStatus !== 'granted' ? `
                  <button id="btn-request-push-perm" style="background-color:rgba(0, 242, 254, 0.12); border:1px solid var(--brand-cyan); color:var(--brand-cyan); padding:8px 16px; border-radius:var(--radius-sm); font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all var(--transition-fast);">
                    Grant Permission ➔
                  </button>
                ` : `
                  <label class="switch-toggle" title="Toggle Push Notifications">
                    <input type="checkbox" id="toggle-push-notifications" ${saved.notificationsEnabled !== false ? 'checked' : ''}>
                    <span class="switch-slider"></span>
                  </label>
                `}
              </div>
            </div>

            <!-- Row 3: Delay Alert Sensitivity Threshold -->
            <div style="background-color:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px 24px; display:flex; justify-content:space-between; align-items:center; min-height:76px; gap:var(--space-lg); transition:border-color var(--transition-fast);" onmouseover="this.style.borderColor='rgba(0, 242, 254, 0.35)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
              <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-weight:700; font-size:14px; color:var(--text-primary);">Delay Alert Sensitivity Threshold</span>
                  <span class="badge badge-brand" style="font-size:11px; padding:3px 10px; font-weight:600;">
                    Trigger: ${saved.delayThreshold} mins
                  </span>
                </div>
                <div style="font-size:12px; color:var(--text-secondary); line-height:1.4;">
                  Dispatches an audio chime and notification when a pinned train exceeds this delay
                </div>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-end; min-width:120px;">
                <select id="select-delay-threshold" style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:8px 14px; color:var(--text-primary); font-weight:600; font-size:13px; cursor:pointer; min-width:200px;">
                  <option value="5" ${saved.delayThreshold === 5 ? 'selected' : ''}>5 Minutes (High Sensitivity)</option>
                  <option value="10" ${saved.delayThreshold === 10 ? 'selected' : ''}>10 Minutes (Standard)</option>
                  <option value="15" ${saved.delayThreshold === 15 ? 'selected' : ''}>15 Minutes (Express Corridors)</option>
                  <option value="30" ${saved.delayThreshold === 30 ? 'selected' : ''}>30 Minutes (Major Delays Only)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Saved Trains Section -->
        <div style="display:flex; flex-direction:column; gap:var(--space-md);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:16px; font-weight:700;">Pinned Trains (${saved.trains.length})</h2>
            <span style="font-size:12px; color:var(--text-tertiary);">Continuously monitored for delays</span>
          </div>

          ${saved.trains.length === 0 ? `
            <div style="background-color:var(--bg-surface-elevated); border:1px dashed var(--border-subtle); border-radius:var(--radius-md); padding:32px; text-align:center; color:var(--text-tertiary);">
              <div style="font-weight:600; color:var(--text-secondary); margin-bottom:4px;">No trains pinned yet</div>
              <div style="font-size:12px;">Search for any express train (e.g. 22436, Rajdhani) or click a marker on the map and use the save button to monitor it.</div>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(380px, 1fr)); gap:var(--space-sm);">
              ${saved.trains.map(t => {
                const liveTrain = this.trains.find(lt => lt.trainNumber === t.trainNumber);
                const delayMin = liveTrain ? liveTrain.delayMinutes : 0;
                const statusBadge = delayMin === 0
                  ? '<span class="badge badge-ontime">● On Time</span>'
                  : `<span class="badge badge-delayed">● +${delayMin}m Delayed</span>`;

                return `
                  <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-md); display:flex; justify-content:space-between; align-items:center; transition:border-color var(--transition-fast);" onmouseover="this.style.borderColor='var(--brand-cyan)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:700; color:var(--brand-cyan); font-family:var(--font-mono);">${t.trainNumber}</span>
                        <span style="font-weight:600; font-size:14px; color:var(--text-primary);">${t.trainName}</span>
                      </div>
                      <div style="font-size:12px; color:var(--text-secondary);">${t.origin.name} → ${t.destination.name}</div>
                      <div style="margin-top:2px;">${statusBadge}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <button class="btn-track-fav-train" data-train-number="${t.trainNumber}" style="background-color:rgba(0, 242, 254, 0.12); border:1px solid rgba(0, 242, 254, 0.3); color:var(--brand-cyan); padding:6px 14px; border-radius:var(--radius-xs); font-size:12px; font-weight:700; cursor:pointer;">
                        Track
                      </button>
                      <button class="btn-remove-fav-train icon-action-btn" data-train-number="${t.trainNumber}" title="Unpin Train" style="width:30px; height:30px; font-size:12px;">
                        ✕
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Saved Stations Section -->
        <div style="display:flex; flex-direction:column; gap:var(--space-md);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:16px; font-weight:700;">Pinned Stations (${saved.stations.length})</h2>
            <span style="font-size:12px; color:var(--text-tertiary);">Quick access to departure/arrival boards</span>
          </div>

          ${saved.stations.length === 0 ? `
            <div style="background-color:var(--bg-surface-elevated); border:1px dashed var(--border-subtle); border-radius:var(--radius-md); padding:32px; text-align:center; color:var(--text-tertiary);">
              <div style="font-weight:600; color:var(--text-secondary); margin-bottom:4px;">No stations pinned yet</div>
              <div style="font-size:12px;">Search for any major junction (e.g. NDLS, HWH) or click on the map and use the save button to pin it.</div>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(380px, 1fr)); gap:var(--space-sm);">
              ${saved.stations.map(s => `
                <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-md); display:flex; justify-content:space-between; align-items:center; transition:border-color var(--transition-fast);" onmouseover="this.style.borderColor='var(--brand-cyan)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
                  <div>
                    <div style="font-weight:700; color:var(--text-primary);">${s.name} <span style="font-family:var(--font-mono); color:var(--brand-cyan);">(${s.code})</span></div>
                    <div style="font-size:12px; color:var(--text-secondary);">${s.city || 'Regional Hub'}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <button class="btn-track-fav-station" data-station-code="${s.code}" style="background-color:rgba(0, 242, 254, 0.12); border:1px solid rgba(0, 242, 254, 0.3); color:var(--brand-cyan); padding:6px 14px; border-radius:var(--radius-xs); font-size:12px; font-weight:700; cursor:pointer;">
                      View Board
                    </button>
                    <button class="btn-remove-fav-station icon-action-btn" data-station-code="${s.code}" title="Unpin Station" style="width:30px; height:30px; font-size:12px;">
                      ✕
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Alert Audit History Log -->
        <div style="display:flex; flex-direction:column; gap:var(--space-md);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="font-size:16px; font-weight:700;">Recent Alert Activity Log</h2>
              <div style="font-size:12px; color:var(--text-secondary);">Live event history of delay warnings and recovery alerts for your pinned trains</div>
            </div>
            ${activeAlerts.length > 0 ? `
              <button id="btn-clear-alert-history" style="background:transparent; border:1px solid var(--border-subtle); color:var(--text-secondary); padding:4px 10px; border-radius:var(--radius-xs); font-size:11px; cursor:pointer;">
                Clear History
              </button>
            ` : ''}
          </div>

          ${activeAlerts.length === 0 ? `
            <div style="background-color:var(--bg-surface-elevated); border:1px dashed var(--border-subtle); border-radius:var(--radius-md); padding:24px; text-align:center; color:var(--text-tertiary); font-size:13px;">
              No delay alerts recorded yet. Pin any train above to monitor its delay threshold in real time.
            </div>
          ` : `
            <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); overflow:hidden;">
              <table class="departure-board-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Train Number & Name</th>
                    <th>Status</th>
                    <th>Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeAlerts.slice(0, 10).map(item => `
                    <tr>
                      <td style="font-family:var(--font-mono); font-size:12px; color:var(--text-tertiary);">
                        ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td>
                        <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-cyan);">${item.trainNumber}</span>
                        <span style="font-size:12px; color:var(--text-secondary); margin-left:6px;">${item.trainName}</span>
                      </td>
                      <td>
                        <span class="badge ${item.type === 'DELAY_WARNING' ? 'badge-delayed' : 'badge-ontime'}">
                          ${item.type === 'DELAY_WARNING' ? '● DELAY' : '● ON TIME'}
                        </span>
                      </td>
                      <td style="font-size:12px; color:var(--text-secondary);">${item.message}</td>
                      <td>
                        <button class="btn-track-fav-train" data-train-number="${item.trainNumber}" style="background-color:rgba(0, 242, 254, 0.1); border:1px solid rgba(0, 242, 254, 0.3); color:var(--brand-cyan); padding:4px 10px; border-radius:var(--radius-xs); font-size:11px; font-weight:600; cursor:pointer;">
                          Track
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    view.classList.add('active');

    // Attach listeners
    view.querySelector('#btn-close-favs')?.addEventListener('click', () => {
      view.classList.remove('active');
      this.switchView('map');
    });

    view.querySelector('#btn-test-alert')?.addEventListener('click', async () => {
      if (this.alertManager) {
        await this.alertManager.testAlert();
        setTimeout(() => this.openFavouritesView(), 800);
      }
    });

    view.querySelector('#toggle-sound-effects')?.addEventListener('change', (e) => {
      favourites.favourites.soundEnabled = e.target.checked;
      favourites.save();
      soundEffects.setEnabled(e.target.checked);
      if (e.target.checked) {
        soundEffects.playStationChime();
        toast.show('Acoustic chimes enabled');
      } else {
        toast.show('Acoustic chimes muted');
      }
    });

    view.querySelector('#toggle-push-notifications')?.addEventListener('change', (e) => {
      favourites.favourites.notificationsEnabled = e.target.checked;
      favourites.save();
      toast.show(e.target.checked ? 'Push notifications active' : 'Push notifications paused');
    });

    view.querySelector('#btn-request-push-perm')?.addEventListener('click', async () => {
      if (this.alertManager) {
        await this.alertManager.requestNotificationPermission();
        this.openFavouritesView();
      }
    });

    view.querySelector('#select-delay-threshold')?.addEventListener('change', (e) => {
      favourites.favourites.delayThreshold = parseInt(e.target.value);
      favourites.save();
      soundEffects.playClick();
      toast.show(`Delay alert threshold set to ${e.target.value} mins`);
    });

    view.querySelector('#btn-clear-alert-history')?.addEventListener('click', () => {
      favourites.clearAlertHistory();
      toast.show('Alert history cleared');
      this.openFavouritesView();
    });

    view.querySelectorAll('.btn-track-fav-train').forEach(btn => {
      btn.addEventListener('click', () => {
        const trainNum = btn.getAttribute('data-train-number');
        view.classList.remove('active');
        this.switchView('map');
        this.openTrain(trainNum);
      });
    });

    view.querySelectorAll('.btn-remove-fav-train').forEach(btn => {
      btn.addEventListener('click', () => {
        const trainNum = btn.getAttribute('data-train-number');
        const train = favourites.favourites.trains.find(t => t.trainNumber === trainNum);
        if (train) {
          favourites.toggleTrain(train);
          this.updateStatusBadge();
          this.openFavouritesView();
        }
      });
    });

    view.querySelectorAll('.btn-track-fav-station').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-station-code');
        const station = this.stations.find(s => s.code === code);
        view.classList.remove('active');
        this.switchView('map');
        if (station) this.openStation(station);
      });
    });

    view.querySelectorAll('.btn-remove-fav-station').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-station-code');
        const station = favourites.favourites.stations.find(s => s.code === code);
        if (station) {
          favourites.toggleStation(station);
          this.updateStatusBadge();
          this.openFavouritesView();
        }
      });
    });
  }

  bindUIEvents() {
    // Sidebar view buttons
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });

    // Layer Control Toggle & Popover
    const layerBtn = document.getElementById('btn-layer-controls');
    const layerMenu = document.getElementById('layer-menu-popover');

    layerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      layerMenu?.classList.toggle('open');
      layerBtn.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!layerMenu?.contains(e.target) && e.target !== layerBtn) {
        layerMenu?.classList.remove('open');
        layerBtn?.classList.remove('active');
      }
    });

    // Map Style switchers
    document.querySelectorAll('.style-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.style-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const styleKey = chip.getAttribute('data-style');
        this.mapController.setStyle(styleKey);
      });
    });

    // Layer Switches
    const trainToggle = document.getElementById('toggle-train-layer');
    trainToggle?.addEventListener('change', (e) => {
      this.trainLayer.setVisible(e.target.checked);
    });

    const stationToggle = document.getElementById('toggle-station-layer');
    stationToggle?.addEventListener('change', (e) => {
      this.stationLayer.setVisible(e.target.checked);
    });

    const weatherToggle = document.getElementById('toggle-weather-layer');
    weatherToggle?.addEventListener('change', (e) => {
      this.weatherLayer.setVisible(e.target.checked);
    });

    // 3D Terrain Pitch Toggle
    const pitch3DBtn = document.getElementById('btn-toggle-3d');
    pitch3DBtn?.addEventListener('click', () => {
      const is3D = this.mapController.toggle3DPitch();
      pitch3DBtn.classList.toggle('active', is3D);
      toast.show(is3D ? '3D Topographic Terrain View' : '2D Top-Down View');
    });

    // Map Bottom Right Controls
    document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => {
      this.mapController.map.zoomIn();
    });

    document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => {
      this.mapController.map.zoomOut();
    });

    document.getElementById('btn-map-reset')?.addEventListener('click', () => {
      this.mapController.resetView();
      toast.show('Resetting map view');
    });

    // Listen for favourites updates from anywhere in the app
    window.addEventListener('railradar:favourites-changed', () => {
      this.updateStatusBadge();
      if (this.alertManager) {
        this.alertManager.checkTrains(this.trains);
      }
    });
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const trainParam = params.get('train');
    const stationParam = params.get('station');

    if (trainParam) {
      this.openTrain(trainParam);
    } else if (stationParam) {
      const st = this.stations.find(s => s.code === stationParam.toUpperCase());
      if (st) this.openStation(st);
    }
  }
}

// Initialise application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new RailRadarApp();
  app.start();
  window.railradar = app; // Expose for debugging/inspection
});
