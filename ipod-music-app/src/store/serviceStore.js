import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import Cookies from 'js-cookie'

/**
 * Cookie Storage for Zustand
 * Stores auth data in cookies for security
 */
const cookieStorage = {
  getItem: (name) => {
    const value = Cookies.get(name)
    return value ? JSON.parse(value) : null
  },
  setItem: (name, value) => {
    Cookies.set(name, JSON.stringify(value), { expires: 365, secure: true, sameSite: 'strict' })
  },
  removeItem: (name) => {
    Cookies.remove(name)
  },
}

/**
 * Service Configuration Store
 * Manages music service connections, OAuth tokens, and backend server settings
 */
export const useServiceStore = create(
  persist(
    (set, get) => ({
      // Backend server configuration
      backendServerUrl: null,
      backendServerPassword: null,
      useBackendServer: false,
      
      // Service configurations
      services: {
        spotify: {
          enabled: false,
          clientId: null,
          clientSecret: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        },
        appleMusic: {
          enabled: false,
          developerToken: null,
          musicUserToken: null,
          expiresAt: null,
        },
        youtubeMusic: {
          enabled: false,
          clientId: null,
          clientSecret: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        },
        jellyfin: {
          enabled: false,
          serverUrl: null,
          userId: null,
          accessToken: null,
        },
        navidrome: {
          enabled: false,
          serverUrl: null,
          username: null,
          password: null,
        },
        subsonic: {
          enabled: false,
          serverUrl: null,
          username: null,
          password: null,
        },
      },
      
      // Set backend server configuration
      setBackendServer: (url, password, useBackend) => {
        set({
          backendServerUrl: url,
          backendServerPassword: password,
          useBackendServer: useBackend,
        })
      },
      
      // Update service configuration
      updateService: (serviceName, config) => {
        const { services } = get()
        set({
          services: {
            ...services,
            [serviceName]: {
              ...services[serviceName],
              ...config,
            },
          },
        })
      },
      
      // Enable/disable service
      toggleService: (serviceName, enabled) => {
        const { services } = get()
        set({
          services: {
            ...services,
            [serviceName]: {
              ...services[serviceName],
              enabled,
            },
          },
        })
      },
      
      // Clear service configuration
      clearService: (serviceName) => {
        const { services } = get()
        set({
          services: {
            ...services,
            [serviceName]: {
              enabled: false,
              clientId: null,
              clientSecret: null,
              accessToken: null,
              refreshToken: null,
              expiresAt: null,
              serverUrl: null,
              username: null,
              password: null,
              userId: null,
              developerToken: null,
              musicUserToken: null,
            },
          },
        })
      },
      
      // Get enabled services
      getEnabledServices: () => {
        const { services } = get()
        return Object.entries(services)
          .filter(([_, config]) => config.enabled)
          .map(([name]) => name)
      },
      
      // Check if any service is configured
      hasConfiguredServices: () => {
        return get().getEnabledServices().length > 0
      },
    }),
    {
      name: 'music-service-config',
      storage: createJSONStorage(() => cookieStorage),
    }
  )
)
