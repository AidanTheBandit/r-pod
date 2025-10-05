import axios from 'axios'
import Cookies from 'js-cookie'

// Configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const BACKEND_PASSWORD = import.meta.env.VITE_BACKEND_PASSWORD || 'music-aggregator-2025'

// Generate session ID once per session
const getSessionId = () => {
  let sessionId = Cookies.get('music-session-id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    Cookies.set('music-session-id', sessionId, { expires: 7 }) // 7 days
  }
  return sessionId
}

// Create axios instance with default config
const client = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'x-server-password': BACKEND_PASSWORD,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
})

// Add request interceptor for session ID
client.interceptors.request.use((config) => {
  if (config.params) {
    config.params.sessionId = getSessionId()
  } else {
    config.params = { sessionId: getSessionId() }
  }
  return config
})

// Add response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - check backend password')
    } else if (error.response?.status === 500) {
      console.error('Backend server error:', error.response.data)
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to backend server - check if it\'s running')
    }
    return Promise.reject(error)
  }
)

export const backendAPI = {
  // Service connection
  async connectService(service, credentials) {
    const response = await client.post('/api/services/connect', {
      service,
      credentials
    })
    return response.data
  },

  // Data fetching
  async getTracks() {
    const response = await client.get('/api/tracks')
    return response.data.tracks || []
  },

  async getAlbums() {
    const response = await client.get('/api/albums')
    return response.data.albums || []
  },

  async getPlaylists() {
    const response = await client.get('/api/playlists')
    return response.data.playlists || []
  },

  async getArtists() {
    const response = await client.get('/api/artists')
    return response.data.artists || []
  },

  async search(query, type = 'track') {
    const response = await client.get('/api/search', {
      params: { q: query, type }
    })
    return response.data.results || []
  },

  // Health check
  async healthCheck() {
    const response = await client.get('/health')
    return response.data
  }
}

export default backendAPI