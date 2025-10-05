/**
 * Base Music Service Interface
 * All music services must implement this interface
 */

export class BaseMusicService {
  constructor(config) {
    this.config = config
    this.isAuthenticated = false
  }
  
  // Authentication
  async authenticate() {
    throw new Error('authenticate() must be implemented')
  }
  
  async refreshAuth() {
    throw new Error('refreshAuth() must be implemented')
  }
  
  async logout() {
    throw new Error('logout() must be implemented')
  }
  
  // Library
  async getPlaylists() {
    throw new Error('getPlaylists() must be implemented')
  }
  
  async getAlbums() {
    throw new Error('getAlbums() must be implemented')
  }
  
  async getArtists() {
    throw new Error('getArtists() must be implemented')
  }
  
  async getTracks() {
    throw new Error('getTracks() must be implemented')
  }
  
  // Search
  async search(query, type = 'all') {
    throw new Error('search() must be implemented')
  }
  
  // Playback
  async getStreamUrl(trackId) {
    throw new Error('getStreamUrl() must be implemented')
  }
  
  // Details
  async getPlaylist(id) {
    throw new Error('getPlaylist() must be implemented')
  }
  
  async getAlbum(id) {
    throw new Error('getAlbum() must be implemented')
  }
  
  async getArtist(id) {
    throw new Error('getArtist() must be implemented')
  }
  
  async getTrack(id) {
    throw new Error('getTrack() must be implemented')
  }
}

/**
 * Normalized data models
 */

export class Track {
  constructor(data) {
    this.id = data.id
    this.title = data.title || data.name
    this.artist = data.artist
    this.album = data.album
    this.duration = data.duration // in seconds
    this.albumArt = data.albumArt || data.coverArt
    this.streamUrl = data.streamUrl
    this.serviceId = data.serviceId
    this.originalData = data
  }
}

export class Album {
  constructor(data) {
    this.id = data.id
    this.title = data.title || data.name
    this.artist = data.artist
    this.year = data.year
    this.coverArt = data.coverArt || data.albumArt
    this.trackCount = data.trackCount
    this.serviceId = data.serviceId
    this.originalData = data
  }
}

export class Artist {
  constructor(data) {
    this.id = data.id
    this.name = data.name
    this.image = data.image
    this.albumCount = data.albumCount
    this.trackCount = data.trackCount
    this.serviceId = data.serviceId
    this.originalData = data
  }
}

export class Playlist {
  constructor(data) {
    this.id = data.id
    this.title = data.title || data.name
    this.description = data.description
    this.trackCount = data.trackCount
    this.coverArt = data.coverArt
    this.serviceId = data.serviceId
    this.originalData = data
  }
}
