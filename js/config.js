/**
 * RailRadar Client Configuration
 * API keys for server-side proxying live in Railway environment variables.
 * Only the MapTiler key is needed client-side (map tiles render in the browser).
 */

export const CONFIG = {
  // MapTiler key is required client-side for map tile rendering.
  // Restrict this key to your domain on https://cloud.maptiler.com/account/keys/
  MAPTILER_KEY: "zlLUsroefJmBOeATThpf",

  // Backend API base URL — points to the Railway-hosted Python server.
  // After Railway deployment, replace this with your actual Railway URL.
  // e.g. "https://trainradar24-backend.up.railway.app"
  API_BASE: "https://trainradar24-qb15.onrender.com",

  // MapTiler Map Styles
  MAP_STYLES: {
    datavizDark: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=zlLUsroefJmBOeATThpf`,
    outdoor3D: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=zlLUsroefJmBOeATThpf`,
    streetsDark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=zlLUsroefJmBOeATThpf`,
    satelliteHybrid: `https://api.maptiler.com/maps/hybrid/style.json?key=zlLUsroefJmBOeATThpf`
  },

  // Map Default Initial Center (Indian Rail Network Centroid)
  DEFAULT_CENTER: [78.9629, 21.5937], // [lng, lat] for MapLibre
  DEFAULT_ZOOM: 5.2,
  MIN_ZOOM: 4,
  MAX_ZOOM: 18,

  // Live Refresh Poll Intervals (ms)
  TRAIN_POLL_INTERVAL: 4000,
  WEATHER_POLL_INTERVAL: 600000
};

