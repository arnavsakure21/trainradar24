/**
 * RailRadar API Service Layer
 * Interfaces with BFF proxy server and handles caching & fallback data.
 */

import { CONFIG } from './config.js';

class ApiService {
  constructor() {
    this.cache = new Map();
  }

  async fetchWithCache(url, ttlMs = 15000) {
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp < ttlMs)) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.warn(`[RailRadar API] Failed to fetch ${url}:`, err);
      if (cached) return cached.data; // Return stale if available
      throw err;
    }
  }

  // 1. Fetch live train coordinates and telemetry
  async getLiveTrains() {
    return this.fetchWithCache(`${CONFIG.API_BASE}/api/trains/live`, 3000);
  }

  // 2. Fetch full detail for a train (stops, schedule, route)
  async getTrainDetail(trainNumber) {
    return this.fetchWithCache(`${CONFIG.API_BASE}/api/trains/${trainNumber}`, 10000);
  }

  // 3. Fetch all railway stations
  async getStations() {
    return this.fetchWithCache(`${CONFIG.API_BASE}/api/stations`, 300000); // 5 min
  }

  // 4. Fetch live departures/arrivals board for a station
  async getStationBoard(stationCode, type = 'departures') {
    return this.fetchWithCache(`${CONFIG.API_BASE}/api/stations/${stationCode}/board?type=${type}`, 10000);
  }

  // 5. Fetch weather at specific latitude/longitude
  async getWeatherAtPoint(lat, lon) {
    return this.fetchWithCache(`${CONFIG.API_BASE}/api/weather/point?lat=${lat}&lon=${lon}`, 600000); // 10 min
  }

  // 6. Fetch elevation cross-section profile for a route
  async getElevationProfile(trainNumber) {
    return this.fetchWithCache(`${CONFIG.API_BASE}/api/elevation/profile?train=${trainNumber}`, 86400000); // 24h
  }

  // 7. Fetch operator fleet analytics
  async getOperatorStats() {
    return this.fetchWithCache(`${CONFIG.API_BASE}/api/operator/stats`, 5000);
  }
}

export const api = new ApiService();
