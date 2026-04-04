/**
 * Background Location Service (Stub)
 * 
 * This is a placeholder for the continuous GPS tracking service.
 * In production, this will use expo-location for foreground/background GPS.
 * 
 * Integration steps for production:
 * 1. npm install expo-location
 * 2. Add location permissions to app.json
 * 3. Implement TaskManager for background tracking
 * 4. POST encrypted lat/lng to /api/v1/rider/gps endpoint
 */

// Mock coordinates — Koramangala, Bengaluru (Zepto Hub area)
const MOCK_LOCATION = {
  latitude: 12.9352,
  longitude: 77.6245,
  accuracy: 10,
  timestamp: Date.now(),
};

let isTracking = false;

/**
 * Start continuous GPS tracking
 * Production: expo-location foreground + background task
 */
export async function startTracking() {
  console.log('[BackgroundLocation] GPS tracking started (mock)');
  isTracking = true;
  return true;
}

/**
 * Stop GPS tracking
 */
export async function stopTracking() {
  console.log('[BackgroundLocation] GPS tracking stopped (mock)');
  isTracking = false;
  return true;
}

/**
 * Get last known GPS coordinates
 * @returns {{ latitude: number, longitude: number, accuracy: number, timestamp: number }}
 */
export function getLastKnownLocation() {
  return {
    ...MOCK_LOCATION,
    timestamp: Date.now(),
  };
}

/**
 * Check if tracking is active
 */
export function isTrackingActive() {
  return isTracking;
}

export default {
  startTracking,
  stopTracking,
  getLastKnownLocation,
  isTrackingActive,
};
