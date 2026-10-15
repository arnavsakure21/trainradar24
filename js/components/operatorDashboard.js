/**
 * RailRadar Operator Dashboard (SaaS B2B Fleet Management)
 * KPI cards, fleet monitoring table, live incident logs, and CSV export.
 */

import { api } from '../api.js';
import { toast } from './toastManager.js';

export class OperatorDashboard {
  constructor(containerId, onTrackTrain) {
    this.container = document.getElementById(containerId);
    this.onTrackTrain = onTrackTrain;
    this.trains = [];
    this.stats = null;
    this.init();
  }

  setData(trains) {
    this.trains = trains;
  }

  init() {
    if (!this.container) return;
  }

  async open() {
    this.container.classList.add('active');
    try {
      this.stats = await api.getOperatorStats();
      this.render();
    } catch (e) {
      console.warn(e);
      this.render();
    }
  }

  close() {
    this.container.classList.remove('active');
  }

  render() {
    const s = this.stats || {
      activeTrains: this.trains.length || 7,
      onTimeRate: 85.7,
      avgDelayMinutes: 5.6,
      severeWeatherAlerts: 1,
      activeIncidents: []
    };

    this.container.innerHTML = `
      <div style="max-width:1180px; margin:0 auto; display:flex; flex-direction:column; gap:var(--space-xl);">
        <!-- Dashboard Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <div style="display:flex; align-items:center; gap:var(--space-sm);">
              <h1 style="font-size:26px; font-weight:800; letter-spacing:-0.5px; background:var(--brand-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
                Network Operations Control Center
              </h1>
              <span class="badge badge-brand">OPERATOR CONSOLE</span>
            </div>
            <p style="color:var(--text-secondary); font-size:14px; margin-top:4px;">
              Live division dispatch, punctuality indices, and track block telemetry.
            </p>
          </div>

          <div style="display:flex; gap:var(--space-sm);">
            <button id="btn-export-csv" style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-light); color:var(--text-primary); padding:8px 16px; border-radius:var(--radius-sm); font-weight:600; font-size:13px; cursor:pointer;">
              Export Fleet CSV
            </button>
            <button id="btn-close-dashboard" class="icon-action-btn" style="width:36px; height:36px; border:1px solid var(--border-light);" title="Return to Map">
              ✕
            </button>
          </div>
        </div>

        <!-- 4 KPI Metrics Row -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--space-md);">
          <div class="stat-box">
            <span class="stat-box-label">Active Monitored Trains</span>
            <span class="stat-box-value">${s.activeTrains}</span>
            <span class="stat-box-sub" style="color:var(--status-ontime);">● 100% telemetry online</span>
          </div>
          <div class="stat-box">
            <span class="stat-box-label">Network Punctuality</span>
            <span class="stat-box-value" style="color:var(--status-ontime);">${s.onTimeRate}%</span>
            <span class="stat-box-sub">+1.4% vs. monthly average</span>
          </div>
          <div class="stat-box">
            <span class="stat-box-label">Average Route Delay</span>
            <span class="stat-box-value">${s.avgDelayMinutes} <span style="font-size:12px; color:var(--text-tertiary);">min</span></span>
            <span class="stat-box-sub">Within tolerance buffer</span>
          </div>
          <div class="stat-box">
            <span class="stat-box-label">Severe Weather Warnings</span>
            <span class="stat-box-value" style="color:var(--status-delay-minor);">${s.severeWeatherAlerts}</span>
            <span class="stat-box-sub">Nagpur-Itarsi Monsoon Alert</span>
          </div>
        </div>

        <!-- Main Split: Fleet Table + Incident Log -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:var(--space-lg);">
          <!-- Fleet Table -->
          <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-md); display:flex; flex-direction:column; gap:var(--space-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h2 style="font-size:15px; font-weight:700;">Live Fleet Status</h2>
              <span style="font-size:11px; color:var(--text-tertiary); font-family:var(--font-mono);">GPS Auto-syncing</span>
            </div>

            <table class="departure-board-table">
              <thead>
                <tr>
                  <th>Train Number & Name</th>
                  <th>Route</th>
                  <th>Speed</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${this.trains.map(t => `
                  <tr>
                    <td>
                      <div style="font-weight:700; font-family:var(--font-mono); color:var(--brand-cyan);">${t.trainNumber}</div>
                      <div style="font-size:11px; color:var(--text-secondary);">${t.trainName}</div>
                    </td>
                    <td style="font-size:12px; color:var(--text-secondary);">${t.origin.name} → ${t.destination.name}</td>
                    <td style="font-family:var(--font-mono); font-size:13px;">${t.speed} km/h</td>
                    <td>
                      <span class="badge ${t.status === 'ON_TIME' ? 'badge-ontime' : 'badge-delayed'}">
                        ${t.status === 'ON_TIME' ? 'On-time' : `+${t.delayMinutes}m`}
                      </span>
                    </td>
                    <td>
                      <button class="btn-track-fleet" data-train-number="${t.trainNumber}" style="background-color:rgba(0, 242, 254, 0.1); border:1px solid rgba(0, 242, 254, 0.3); color:var(--brand-cyan); padding:4px 10px; border-radius:var(--radius-xs); font-size:11px; font-weight:600; cursor:pointer;">
                        Track
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Live Incidents Feed -->
          <div style="background-color:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--space-md); display:flex; flex-direction:column; gap:var(--space-md);">
            <h2 style="font-size:15px; font-weight:700;">Active Incidents & Alerts</h2>
            <div style="display:flex; flex-direction:column; gap:var(--space-sm);">
              ${(s.activeIncidents || []).map(inc => `
                <div style="background-color:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:10px 12px; display:flex; flex-direction:column; gap:4px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; font-weight:700; font-family:var(--font-mono); color:var(--text-tertiary);">${inc.id}</span>
                    <span class="badge ${inc.severity === 'CRITICAL' ? 'badge-delayed' : 'badge-brand'}">${inc.severity}</span>
                  </div>
                  <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${inc.title}</div>
                  <div style="font-size:12px; color:var(--text-secondary);">${inc.section}</div>
                  <div style="font-size:11px; color:var(--brand-cyan); margin-top:2px;">${inc.impact}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach listeners
    this.container.querySelector('#btn-close-dashboard')?.addEventListener('click', () => {
      this.close();
    });

    this.container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      this.exportCSV();
    });

    this.container.querySelectorAll('.btn-track-fleet').forEach(btn => {
      btn.addEventListener('click', () => {
        const trainNum = btn.getAttribute('data-train-number');
        this.close();
        if (this.onTrackTrain) {
          this.onTrackTrain(trainNum);
        }
      });
    });
  }

  exportCSV() {
    let csv = 'TrainNumber,TrainName,Origin,Destination,Speed_kmh,Status,DelayMinutes\n';
    this.trains.forEach(t => {
      csv += `"${t.trainNumber}","${t.trainName}","${t.origin.name}","${t.destination.name}",${t.speed},"${t.status}",${t.delayMinutes}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RailRadar_Fleet_Status_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show('Fleet CSV exported successfully');
  }
}
