/**
 * RailRadar Map Controller
 * Initializes MapLibre GL, integrates MapTiler vector tiles & 3D terrain,
 * and manages camera animations and layer states.
 */

import { CONFIG } from '../config.js';

export class MapController {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.currentStyle = 'datavizDark';
    this.is3DPitched = false;
    this.activeLayers = {
      trains: true,
      stations: true,
      weather: false
    };
    this.onMapReadyCallbacks = [];
  }

  init() {
    // Initialise MapLibre GL map instance
    this.map = new maplibregl.Map({
      container: this.containerId,
      style: CONFIG.MAP_STYLES[this.currentStyle],
      center: CONFIG.DEFAULT_CENTER,
      zoom: CONFIG.DEFAULT_ZOOM,
      minZoom: CONFIG.MIN_ZOOM,
      maxZoom: CONFIG.MAX_ZOOM,
      pitch: 0,
      bearing: 0,
      antialias: true
    });

    // Navigation Controls
    this.map.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: false, // We use custom bottom-right controls
      visualizePitch: true
    }), 'bottom-right');

    this.map.on('load', () => {
      console.log('🗺️ MapLibre map loaded with MapTiler style.');
      this.setupTerrainAndSources();
      this.onMapReadyCallbacks.forEach(cb => cb(this.map));
    });

    return this;
  }

  onReady(callback) {
    if (this.map && this.map.loaded()) {
      callback(this.map);
    } else {
      this.onMapReadyCallbacks.push(callback);
    }
  }

  setupTerrainAndSources() {
    // Add active route polyline layer source
    if (!this.map.getSource('active-route')) {
      this.map.addSource('active-route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Glow backdrop layer
      this.map.addLayer({
        id: 'active-route-glow',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00F2FE',
          'line-width': 8,
          'line-opacity': 0.35,
          'line-blur': 4
        }
      });

      // Core crisp line
      this.map.addLayer({
        id: 'active-route-line',
        type: 'line',
        source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#4FACFE',
          'line-width': 3,
          'line-opacity': 0.95
        }
      });
    }
  }

  // Draw or clear highlighted train route on map
  displayRoute(coords) {
    if (!this.map || !this.map.getSource('active-route')) return;

    if (!coords || coords.length === 0) {
      this.map.getSource('active-route').setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    // Convert [lat, lon] to GeoJSON [lng, lat]
    const geojsonCoords = coords.map(c => [c[1], c[0]]);

    this.map.getSource('active-route').setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: geojsonCoords
        }
      }]
    });

    // Fit map bounds to show route
    const bounds = geojsonCoords.reduce((b, coord) => b.extend(coord), new maplibregl.LngLatBounds(geojsonCoords[0], geojsonCoords[0]));
    this.map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 1200 });
  }

  clearRoute() {
    this.displayRoute([]);
  }

  // Switch Map Style
  setStyle(styleKey) {
    if (!CONFIG.MAP_STYLES[styleKey] || this.currentStyle === styleKey) return;
    this.currentStyle = styleKey;
    this.map.setStyle(CONFIG.MAP_STYLES[styleKey]);
    this.map.once('style.load', () => {
      this.setupTerrainAndSources();
    });
  }

  // Toggle 3D Terrain Pitch
  toggle3DPitch() {
    this.is3DPitched = !this.is3DPitched;
    this.map.easeTo({
      pitch: this.is3DPitched ? 55 : 0,
      bearing: this.is3DPitched ? 20 : 0,
      duration: 1000
    });
    return this.is3DPitched;
  }

  // Fly camera to a specific coordinate
  flyTo(lng, lat, zoom = 12) {
    this.map.flyTo({
      center: [lng, lat],
      zoom: zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true
    });
  }

  // Reset to default network overview
  resetView() {
    this.map.flyTo({
      center: CONFIG.DEFAULT_CENTER,
      zoom: CONFIG.DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      duration: 1200
    });
  }
}
