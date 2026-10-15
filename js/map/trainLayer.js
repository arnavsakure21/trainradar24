/**
 * RailRadar Train Layer
 * Renders real-time animated train markers with directional locomotive icons,
 * heading rotation, speed badges, and click interactions.
 */

export class TrainLayer {
  constructor(mapController, onTrainSelect) {
    this.mapController = mapController;
    this.onTrainSelect = onTrainSelect;
    this.markers = new Map(); // trainNumber -> MapLibre Marker instance
    this.visible = true;
    this.selectedTrainNumber = null;
  }

  updateTrains(trains) {
    if (!this.visible || !this.mapController.map) return;

    trains.forEach(train => {
      const trainNum = train.trainNumber;
      const lngLat = [train.lng, train.lat];

      if (this.markers.has(trainNum)) {
        // Update existing marker position smoothly
        const marker = this.markers.get(trainNum);
        marker.setLngLat(lngLat);

        // Update bearing rotation on inner SVG
        const iconSvg = marker.getElement().querySelector('.train-marker-icon-svg');
        if (iconSvg) {
          iconSvg.style.transform = `rotate(${train.bearing}deg)`;
        }
      } else {
        // Create new train marker
        const el = this.createTrainMarkerElement(train);
        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat(lngLat)
          .addTo(this.mapController.map);

        this.markers.set(trainNum, marker);
      }
    });

    // Clean up markers that are no longer in active feed
    const activeNumbers = new Set(trains.map(t => t.trainNumber));
    this.markers.forEach((marker, trainNum) => {
      if (!activeNumbers.has(trainNum)) {
        marker.remove();
        this.markers.delete(trainNum);
      }
    });
  }

  createTrainMarkerElement(train) {
    const el = document.createElement('div');
    el.className = `train-marker-wrap status-${train.status}`;
    el.setAttribute('data-train-number', train.trainNumber);

    el.innerHTML = `
      <div class="train-marker-body">
        <svg class="train-marker-icon-svg" viewBox="0 0 24 24" style="transform: rotate(${train.bearing}deg);">
          <!-- Sleek Locomotive Front Vector -->
          <path d="M12 2C8 2 6 4 6 8v9c0 1.5 1 2 2 2h8c1 2 2 1.5 2 2V8c0-4-2-6-6-6zm-3 4h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
        </svg>
      </div>
      <div class="train-marker-tag">${train.trainNumber}</div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectedTrainNumber = train.trainNumber;
      if (this.onTrainSelect) {
        this.onTrainSelect(train);
      }
    });

    return el;
  }

  setVisible(visible) {
    this.visible = visible;
    this.markers.forEach(marker => {
      const el = marker.getElement();
      el.style.display = visible ? 'flex' : 'none';
    });
  }
}
