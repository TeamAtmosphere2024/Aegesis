/**
 * Aegesis Production-Ready API Service Layer
 * 
 * Centralized API wrapper for all backend communication with 
 * environment-driven base URL and robust error handling.
 */

const RAW_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://aegesis-backend-latest.onrender.com';
const BASE_URL = RAW_BASE.endsWith('/api/v1') ? RAW_BASE : `${RAW_BASE}/api/v1`;
const TIMEOUT_MS = 10000;

/**
 * Generic request helper with timeout and error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const defaultHeaders = {
    'Accept': 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle cold start (API return 503 or 504 during boot)
    if (response.status === 503 || response.status === 504) {
      throw new Error("Backend is starting up... please wait (cold start).");
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.detail || `API Error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. The server might be waking up.");
    }
    console.error(`[API ERROR] ${options.method || 'GET'} ${endpoint}:`, error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CORE API FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Health Check - Verify backend connectivity
 * GET /
 */
export const healthCheck = () => request('/');

/**
 * Get Predictions (Generic JSON POST)
 * POST /predict
 */
export const getPredictions = (data) => request('/predict', {
  method: 'POST',
  body: JSON.stringify(data),
});

/**
 * Upload Image (Multipart POST)
 * POST /upload
 */
export const uploadImage = async (imageUri) => {
  const formData = new FormData();
  
  // Expo-specific FormData file handling
  formData.append("file", {
    uri: imageUri,
    name: "upload.jpg",
    type: "image/jpeg",
  });

  return request('/upload', {
    method: 'POST',
    body: formData,
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// REPOSITORY SPECIFIC FUNCTIONS (MIGRATED FROM MVP)
// ──────────────────────────────────────────────────────────────────────────────

export const loginByPhone = async (phone) => {
  try {
    const riders = await request('/riders/');
    const rider = riders.find(r => r.phone === phone);
    if (rider) return { status: 'found', rider_id: rider.id, ...rider };
    return { status: 'not_found' };
  } catch (e) {
    return { status: 'not_found' };
  }
};

export const registerRider = (riderData) => request('/riders/', {
  method: 'POST',
  body: JSON.stringify(riderData),
});

export const fetchClosestHub = (lat, lon) => request(`/riders/closest-hub?lat=${lat}&lon=${lon}`);

export const fetchRiderProfile = (riderId) => request(`/riders/${riderId}`);

export const fetchPremium = (riderId) => request(`/premium/${riderId}?env_risk=0.5&soc_risk=0.3`);

export const fetchTriggers = () => request('/webhooks/events');

export const triggerWebhook = (type, payload) => request(`/webhooks/${type}`, {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const fetchSettlement = async (triggerType, riderId) => {
  const claims = await request(`/riders/${riderId}/claims`);
  return claims.length > 0 ? claims[0] : null;
};

export const fetchFraudReport = () => request('/fraud/report').catch(err => {
    // Fallback logic if fraud report is unavailable in backend yet
    console.warn("Fraud report endpoint failed, using local architecture data.");
    return null; 
});

export default {
  BASE_URL,
  healthCheck,
  getPredictions,
  uploadImage,
  loginByPhone,
  registerRider,
  fetchClosestHub,
  fetchRiderProfile,
  fetchPremium,
  fetchTriggers,
  triggerWebhook,
  fetchSettlement,
  fetchFraudReport,
};
