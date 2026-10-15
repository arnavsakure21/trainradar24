/**
 * RailRadar Favourites & Notification Manager
 * Manages starred trains, saved stations, custom delay thresholds,
 * audio settings, and alert audit logs.
 */

import { toast } from './toastManager.js';
import { soundEffects } from './soundEffects.js';

export class FavouritesManager {
  constructor() {
    this.storageKey = 'railradar_favourites_v1';
    this.favourites = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        const rawHistory = parsed.alertHistory || [];
        const cleanHistory = rawHistory.filter(item => item.trainNumber !== 'TEST' && item.type !== 'TEST_SIGNAL');
        return {
          trains: parsed.trains || [],
          stations: parsed.stations || [],
          delayThreshold: parsed.delayThreshold ?? 10,
          soundEnabled: parsed.soundEnabled ?? true,
          notificationsEnabled: parsed.notificationsEnabled ?? true,
          alertHistory: cleanHistory
        };
      }
    } catch (e) {
      console.warn('Failed to parse favourites from localStorage', e);
    }

    return {
      trains: [],
      stations: [],
      delayThreshold: 10,
      soundEnabled: true,
      notificationsEnabled: true,
      alertHistory: []
    };
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.favourites));
      window.dispatchEvent(new CustomEvent('railradar:favourites-changed'));
    } catch (e) {
      console.warn('Failed to save favourites to localStorage', e);
    }
  }

  isTrainSaved(trainNumber) {
    return this.favourites.trains.some(t => t.trainNumber === trainNumber);
  }

  toggleTrain(train) {
    soundEffects.playClick();
    if (this.isTrainSaved(train.trainNumber)) {
      this.favourites.trains = this.favourites.trains.filter(t => t.trainNumber !== train.trainNumber);
      this.save();
      toast.show(`Removed ${train.trainName} from favourites`);
      return false;
    } else {
      this.favourites.trains.push({
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        origin: train.origin,
        destination: train.destination,
        savedAt: new Date().toISOString()
      });
      this.save();
      toast.show(`Saved ${train.trainName} to favourites`);
      return true;
    }
  }

  isStationSaved(stationCode) {
    return this.favourites.stations.some(s => s.code === stationCode);
  }

  toggleStation(station) {
    soundEffects.playClick();
    if (this.isStationSaved(station.code)) {
      this.favourites.stations = this.favourites.stations.filter(s => s.code !== station.code);
      this.save();
      toast.show(`Removed ${station.name} (${station.code}) from favourites`);
      return false;
    } else {
      this.favourites.stations.push({
        code: station.code,
        name: station.name,
        city: station.city,
        savedAt: new Date().toISOString()
      });
      this.save();
      toast.show(`Saved ${station.name} to favourites`);
      return true;
    }
  }

  getFavouritesCount() {
    return this.favourites.trains.length + this.favourites.stations.length;
  }

  addAlertHistory(alertItem) {
    if (!this.favourites.alertHistory) {
      this.favourites.alertHistory = [];
    }
    this.favourites.alertHistory.unshift({
      id: 'ALT-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      ...alertItem
    });
    // Keep max 25 recent items
    if (this.favourites.alertHistory.length > 25) {
      this.favourites.alertHistory = this.favourites.alertHistory.slice(0, 25);
    }
    this.save();
  }

  clearAlertHistory() {
    this.favourites.alertHistory = [];
    this.save();
  }
}

export const favourites = new FavouritesManager();

