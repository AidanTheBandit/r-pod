/**
 * Configuration Utility
 * Auto-detects backend and pairing URLs based on current host
 */

/**
 * Get backend URL based on current location
 * - Development (localhost, 127.0.0.1): Use explicit port 8000
 * - IP address (192.168.x.x, 10.x.x.x): Use same IP with port 8000
 * - Domain (production): Use same domain without port (assumes reverse proxy)
 */
export function getBackendUrl() {
  // Check environment variable first
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }

  // Auto-detect from current location
  const { hostname, protocol } = window.location;
  
  // Localhost or 127.0.0.1 - use explicit port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8000`;
  }
  
  // IP address pattern (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    return `${protocol}//${hostname}:8000`;
  }
  
  // Production domain - assume reverse proxy handles routing
  // No port needed, backend should be on same domain
  return `${protocol}//${hostname}`;
}

/**
 * Get pairing client URL
 * - Development: Use port 3000
 * - IP address: Use same IP with port 3000
 * - Domain: Use subdomain pair.{domain} or /pair path
 */
export function getPairingUrl() {
  // Check environment variable first
  const envUrl = import.meta.env.VITE_PAIRING_URL;
  if (envUrl) {
    return envUrl;
  }

  // Auto-detect from current location
  const { hostname, protocol } = window.location;
  
  // Localhost or 127.0.0.1 - use explicit port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3000`;
  }
  
  // IP address pattern
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    return `${protocol}//${hostname}:3000`;
  }
  
  // Production domain - try subdomain first
  // If domain is example.com, use pair.example.com
  return `${protocol}//pair.${hostname}`;
}

/**
 * Get server password from environment or localStorage
 */
export function getServerPassword() {
  // Try environment variable first
  const envPassword = import.meta.env.VITE_BACKEND_PASSWORD;
  if (envPassword && envPassword !== 'change-me-in-production') {
    return envPassword;
  }
  
  // Try localStorage (set via Settings)
  try {
    const savedConfig = localStorage.getItem('backend-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.password) {
        return config.password;
      }
    }
  } catch (e) {
    console.warn('Failed to load password from localStorage');
  }
  
  // Fallback to environment variable even if it's the default
  return envPassword || '';
}

/**
 * Get device ID from localStorage or generate new one
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem('r1_device_id');
  if (!deviceId) {
    deviceId = `r1-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('r1_device_id', deviceId);
    console.log('[Config] Generated new device ID:', deviceId);
  }
  return deviceId;
}

// Export configuration object
export const config = {
  backendUrl: getBackendUrl(),
  pairingUrl: getPairingUrl(),
  serverPassword: getServerPassword(),
  deviceId: getDeviceId()
};

// Log configuration on load (for debugging)
console.log('[Config] Auto-detected configuration:', {
  backendUrl: config.backendUrl,
  pairingUrl: config.pairingUrl,
  hasPassword: !!config.serverPassword,
  deviceId: config.deviceId,
  currentHost: window.location.hostname
});

export default config;
