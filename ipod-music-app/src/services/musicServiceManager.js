import { SpotifyService } from './spotifyService'
import { useServiceStore } from '../store/serviceStore'

/**
 * Music Service Factory
 * Creates and manages service instances
 */
class MusicServiceManager {
  constructor() {
    this.services = {}
  }
  
  /**
   * Initialize a service
   */
  initService(serviceName, config) {
    switch (serviceName) {
      case 'spotify':
        this.services.spotify = new SpotifyService(config)
        break
      
      case 'appleMusic':
        // TODO: Implement Apple Music service
        console.warn('Apple Music service not yet implemented')
        break
      
      case 'youtubeMusic':
        // TODO: Implement YouTube Music service
        console.warn('YouTube Music service not yet implemented')
        break
      
      case 'jellyfin':
        // TODO: Implement Jellyfin service
        console.warn('Jellyfin service not yet implemented')
        break
      
      case 'navidrome':
        // TODO: Implement Navidrome service
        console.warn('Navidrome service not yet implemented')
        break
      
      case 'subsonic':
        // TODO: Implement Subsonic service
        console.warn('Subsonic service not yet implemented')
        break
      
      default:
        throw new Error(`Unknown service: ${serviceName}`)
    }
    
    return this.services[serviceName]
  }
  
  /**
   * Get service instance
   */
  getService(serviceName) {
    return this.services[serviceName]
  }
  
  /**
   * Initialize all enabled services from store
   */
  initAllServices() {
    const { services } = useServiceStore.getState()
    
    Object.entries(services).forEach(([name, config]) => {
      if (config.enabled) {
        try {
          this.initService(name, config)
          console.log(`Initialized ${name} service`)
        } catch (error) {
          console.error(`Failed to initialize ${name}:`, error)
        }
      }
    })
  }
  
  /**
   * Aggregate data from all enabled services
   */
  async aggregateData(method, ...args) {
    const results = []
    
    for (const [name, service] of Object.entries(this.services)) {
      try {
        const data = await service[method](...args)
        results.push(...data)
      } catch (error) {
        console.error(`Error fetching from ${name}:`, error)
      }
    }
    
    return results
  }
  
  /**
   * Get all playlists from all services
   */
  async getAllPlaylists() {
    return this.aggregateData('getPlaylists')
  }
  
  /**
   * Get all albums from all services
   */
  async getAllAlbums() {
    return this.aggregateData('getAlbums')
  }
  
  /**
   * Get all artists from all services
   */
  async getAllArtists() {
    return this.aggregateData('getArtists')
  }
  
  /**
   * Get all tracks from all services
   */
  async getAllTracks() {
    return this.aggregateData('getTracks')
  }
  
  /**
   * Search across all services
   */
  async searchAll(query, type = 'track') {
    return this.aggregateData('search', query, type)
  }
}

// Export singleton instance
export const musicServiceManager = new MusicServiceManager()

// Initialize services on app start
if (typeof window !== 'undefined') {
  musicServiceManager.initAllServices()
}
