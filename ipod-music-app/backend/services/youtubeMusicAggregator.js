import YTMusic from 'ytmusic-api'

export class YouTubeMusicAggregator {
  constructor(credentials) {
    this.credentials = credentials
    this.ytm = null
    this.isAuthenticated = false
    this.selectedProfile = credentials.profile || null // Allow profile selection
  }

  async authenticate() {
    if (this.isAuthenticated && this.ytm) {
      return true
    }

    try {
      this.ytm = new YTMusic()

      // Try cookie authentication first (most reliable)
      if (this.credentials.cookie) {
        // The library expects cookie as a string
        await this.ytm.initialize(this.credentials.cookie)
        this.isAuthenticated = true
        return true
      }

      return false
    } catch (error) {
      console.error('YouTube Music authentication failed:', error.message)
      this.isAuthenticated = false
      return false
    }
  }

  async getTracks() {
    // YouTube Music API doesn't provide direct library access
    // Return recommendations as a fallback for tracks
    console.log('YouTube Music: Getting recommendations for tracks view')
    return await this.getRecommendations()
  }

  async getAlbums() {
    // YouTube Music API doesn't provide direct library access
    // Return popular albums as a fallback
    if (!await this.authenticate()) return []

    try {
      console.log('YouTube Music: Getting popular albums')
      const popularAlbums = await this.ytm.searchAlbums('popular music')
      return popularAlbums.slice(0, 20).map(album => ({
        id: `ytm:${album.albumId || album.id}`,
        title: album.title,
        artist: album.artists?.[0]?.name || 'Unknown Artist',
        year: album.year,
        coverArt: album.thumbnails?.[0]?.url,
        trackCount: album.trackCount || 0,
        service: 'youtubeMusic'
      }))
    } catch (error) {
      console.error('Failed to get popular albums:', error.message)
      return []
    }
  }

  async getPlaylists() {
    // YouTube Music API doesn't provide direct library access
    // Return popular playlists as a fallback
    if (!await this.authenticate()) return []

    try {
      console.log('YouTube Music: Getting popular playlists')
      const popularPlaylists = await this.ytm.searchPlaylists('popular music')
      return popularPlaylists.slice(0, 20).map(playlist => ({
        id: `ytm:${playlist.playlistId}`,
        title: playlist.title,
        description: playlist.description,
        trackCount: playlist.trackCount || 0,
        coverArt: playlist.thumbnails?.[0]?.url,
        service: 'youtubeMusic'
      }))
    } catch (error) {
      console.error('Failed to get popular playlists:', error.message)
      return []
    }
  }

  async getArtists() {
    // YouTube Music API doesn't provide direct library access
    // Return popular artists as a fallback
    if (!await this.authenticate()) return []

    try {
      console.log('YouTube Music: Getting popular artists')
      const popularArtists = await this.ytm.searchArtists('popular artists')
      return popularArtists.slice(0, 20).map(artist => ({
        id: `ytm:${artist.channelId || artist.id}`,
        name: artist.name,
        image: artist.thumbnails?.[0]?.url,
        service: 'youtubeMusic'
      }))
    } catch (error) {
      console.error('Failed to get popular artists:', error.message)
      return []
    }
  }

  async search(query) {
    if (!await this.authenticate()) return []

    try {
      const results = await this.ytm.searchSongs(query)
      const tracks = []

      if (results && Array.isArray(results)) {
        tracks.push(...results.map(track => ({
          id: `ytm:${track.videoId}`,
          title: track.title,
          artist: track.artists?.[0]?.name || 'Unknown Artist',
          album: track.album?.name || 'Unknown Album',
          duration: track.duration,
          albumArt: track.thumbnails?.[0]?.url,
          streamUrl: `https://music.youtube.com/watch?v=${track.videoId}`,
          service: 'youtubeMusic'
        })))
      }

      return tracks
    } catch (error) {
      console.error('YouTube Music search failed:', error.message)
      return []
    }
  }

  // Get available profiles/accounts
  async getProfiles() {
    if (!await this.authenticate()) return []

    try {
      // For now, return basic profile options
      // In a full implementation, you might query available accounts
      return [
        {
          id: '0',
          name: 'Primary Account',
          email: 'user@gmail.com' // Would come from authentication
        },
        {
          id: '1',
          name: 'Secondary Account',
          email: 'user2@gmail.com'
        }
      ]
    } catch (error) {
      console.error('Failed to get YouTube Music profiles:', error.message)
      return []
    }
  }

  // Get personalized recommendations
  async getRecommendations() {
    if (!await this.authenticate()) return []

    try {
      const homeSections = await this.ytm.getHomeSections()
      const recommendations = []

      if (homeSections && Array.isArray(homeSections)) {
        homeSections.forEach(section => {
          if (section.contents && Array.isArray(section.contents)) {
            section.contents.forEach(item => {
              if (item.videoId) {
                recommendations.push({
                  id: `ytm:${item.videoId}`,
                  title: item.name || item.title,
                  artist: item.artist?.name || item.artists?.[0]?.name || 'Unknown Artist',
                  album: item.album?.name || 'Unknown Album',
                  duration: item.duration || item.lengthMs,
                  albumArt: item.thumbnails?.[0]?.url || item.thumbnail?.url,
                  streamUrl: `https://music.youtube.com/watch?v=${item.videoId}`,
                  service: 'youtubeMusic'
                })
              }
            })
          }
        })
      }

      console.log(`YouTube Music: Found ${recommendations.length} recommendations`)
      return recommendations
    } catch (error) {
      console.error('Failed to get YouTube Music recommendations:', error.message)
      return []
    }
  }
}
