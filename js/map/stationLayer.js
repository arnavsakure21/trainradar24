/**
 * RailRadar Station Layer
 * Renders major railway junction markers on the map.
 */

export class StationLayer {
  constructor(mapController, onStationSelect) {
    this.mapController = mapController;
    this.onStationSelect = onStationSelect;
    this.markers = [];
    this.visible = true;
  }

  loadStations(stations) {
    if (!this.mapController.map) return;

    this.clear();

    stations.forEach(st => {
      const el = document.createElement('div');
      el.className = 'station-marker-wrap';
      el.setAttribute('data-station-code', st.code);
      el.innerHTML = `
        <div class="station-marker-dot"></div>
        <div class="station-marker-label">${st.code}</div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onStationSelect) {
          this.onStationSelect(st);
        }
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([st.lon, st.lat])
        .addTo(this.mapController.map);

      this.markers.push(marker);
    });
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
