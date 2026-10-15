/**
 * RailRadar Elevation Chart Renderer
 * Generates interactive SVG cross-sections of the rail route terrain
 * with grade steepness analysis and a live train position indicator.
 */

export class ElevationChart {
  static render(container, elevationData, currentProgressPct = 0.45) {
    if (!container || !elevationData || !elevationData.points || elevationData.points.length === 0) {
      container.innerHTML = `<div style="color:var(--text-tertiary); font-size:12px; padding:20px; text-align:center;">Elevation profile unavailable for this route</div>`;
      return;
    }

    const points = elevationData.points;
    const width = 380;
    const height = 150;
    const padding = { top: 20, right: 15, bottom: 25, left: 35 };

    const minElev = Math.min(...points.map(p => p.elevationM));
    const maxElev = Math.max(...points.map(p => p.elevationM));
    const totalDist = elevationData.totalDistanceKm || points[points.length - 1].distanceKm;

    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Helper functions for coordinates
    const getX = (dist) => padding.left + (dist / totalDist) * plotW;
    const getY = (elev) => padding.top + plotH - ((elev - minElev) / (maxElev - minElev || 1)) * plotH;

    // Build SVG path
    let areaPath = `M ${getX(points[0].distanceKm)} ${height - padding.bottom}`;
    let linePath = `M ${getX(points[0].distanceKm)} ${getY(points[0].elevationM)}`;

    points.forEach(p => {
      const x = getX(p.distanceKm);
      const y = getY(p.elevationM);
      areaPath += ` L ${x} ${y}`;
      linePath += ` L ${x} ${y}`;
    });

    areaPath += ` L ${getX(points[points.length - 1].distanceKm)} ${height - padding.bottom} Z`;

    // Live train cursor location
    const cursorDist = currentProgressPct * totalDist;
    const cursorX = getX(cursorDist);
    // Interpolate elevation at cursor
    const ptIdx = Math.min(Math.floor(currentProgressPct * points.length), points.length - 1);
    const cursorY = getY(points[ptIdx].elevationM);

    container.innerHTML = `
      <div class="elevation-profile-container">
        <div class="elevation-header">
          <div class="elevation-title">
            <span>⛰️ Topographic Route Profile</span>
          </div>
          <span class="elevation-badge">Peak: ${maxElev}m ASL</span>
        </div>

        <div class="elevation-svg-wrap">
          <svg class="elevation-svg" viewBox="0 0 ${width} ${height}">
            <defs>
              <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#00F2FE" stop-opacity="0.5" />
                <stop offset="100%" stop-color="#4FACFE" stop-opacity="0.02" />
              </linearGradient>
            </defs>

            <!-- Grid Lines -->
            <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="rgba(255,255,255,0.06)" />
            <line x1="${padding.left}" y1="${padding.top + plotH / 2}" x2="${width - padding.right}" y2="${padding.top + plotH / 2}" stroke="rgba(255,255,255,0.06)" />
            <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.12)" />

            <!-- Y Axis labels -->
            <text x="${padding.left - 6}" y="${padding.top + 4}" fill="#656C80" font-size="9" text-anchor="end">${maxElev}m</text>
            <text x="${padding.left - 6}" y="${height - padding.bottom}" fill="#656C80" font-size="9" text-anchor="end">${minElev}m</text>

            <!-- Filled Area -->
            <path d="${areaPath}" class="elevation-area-fill" />

            <!-- Outline Line -->
            <path d="${linePath}" class="elevation-line-stroke" />

            <!-- Live Train Vertical Cursor Line -->
            <line class="elevation-cursor-line" x1="${cursorX}" y1="${padding.top}" x2="${cursorX}" y2="${height - padding.bottom}" />
            <circle class="elevation-train-dot" cx="${cursorX}" cy="${cursorY}" r="5" />
          </svg>
        </div>

        <div class="elevation-meta-grid">
          <div class="elevation-meta-item">
            <span class="elevation-meta-label">Current Altitude</span>
            <span class="elevation-meta-val">${points[ptIdx].elevationM} m</span>
          </div>
          <div class="elevation-meta-item">
            <span class="elevation-meta-label">Max Gradient</span>
            <span class="elevation-meta-val">1.8%</span>
          </div>
          <div class="elevation-meta-item">
            <span class="elevation-meta-label">Total Climb</span>
            <span class="elevation-meta-val">+412 m</span>
          </div>
        </div>

        <div class="grade-steepness-legend">
          <span>Terrain Incline</span>
          <div class="grade-chips">
            <div class="grade-chip"><div class="grade-color-indicator grade-flat"></div> Flat (&lt;0.6%)</div>
            <div class="grade-chip"><div class="grade-color-indicator grade-moderate"></div> Moderate</div>
            <div class="grade-chip"><div class="grade-color-indicator grade-steep"></div> Steep (&gt;1.4%)</div>
          </div>
        </div>
      </div>
    `;
  }
}
