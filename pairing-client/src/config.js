/**
 * Configuration for Pairing Client
 * Auto-detects backend URL based on current host
 */

/**
 * Get backend URL based on current location
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
  // If pairing client is on pair.example.com, backend is on example.com
  if (hostname.startsWith('pair.')) {
    const mainDomain = hostname.substring(5); // Remove 'pair.' prefix
    return `${protocol}//${mainDomain}`;
  }
  
  // Otherwise use same domain (no port)
  return `${protocol}//${hostname}`;
}

// Log configuration on load
console.log('[Pairing Config] Backend URL:', getBackendUrl());
console.log('[Pairing Config] Current host:', window.location.hostname);

export default {
  backendUrl: getBackendUrl()
};
