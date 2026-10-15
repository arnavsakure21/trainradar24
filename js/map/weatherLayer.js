/**
 * RailRadar Weather Map Layer
 * Displays live weather badges and temperatures over major railway hubs.
 */

import { api } from '../api.js';

export class WeatherLayer {
  constructor(mapController) {
    this.mapController = mapController;
    this.markers = [];
    this.visible = false;
  }

  async loadWeatherForStations(stations) {
    if (!this.mapController.map) return;
    this.clear();

    // Pick top key hubs to avoid clutter
    const keyHubs = stations.slice(0, 8);

    for (const hub of keyHubs) {
      try {
        const weather = await api.getWeatherAtPoint(hub.lat, hub.lon);
        const el = document.createElement('div');
        el.className = 'weather-marker-wrap';
        el.innerHTML = `
          <img class="weather-marker-icon" src="https://openweathermap.org/img/wn/${weather.icon}.png" alt="${weather.condition}" />
          <span>${weather.tempC}°C</span>
        `;

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom'
        })
          .setLngLat([hub.lon, hub.lat])
          .addTo(this.mapController.map);

        this.markers.push(marker);
      } catch (e) {
        // Continue quietly
      }
    }
    this.setVisible(this.visible);
  }

  clear() {
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }

  setVisible(visible) {
    this.visible = visible;
    this.markers.forEach(m => {
      m.getElement().style.display = visible ? 'flex' : 'none';
    });
  }
}
