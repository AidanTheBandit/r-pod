import YTMusic from 'ytmusic-api'

export class YouTubeMusicAggregator {
  constructor(credentials) {
    console.log('[YTM] Constructor called with credentials:', {
      hasCookie: !!credentials?.cookie,
      cookieLength: credentials?.cookie?.length,
      profile: credentials?.profile
    })
    
    this.credentials = credentials
    this.ytm = null
    this.isAuthenticated = false
    this.selectedProfile = credentials.profile || '0'
  }

  async authenticate() {
    console.log('[YTM] Authenticate called. Current state:', {
      isAuthenticated: this.isAuthenticated,
      hasYtm: !!this.ytm
    })

    if (this.isAuthenticated && this.ytm) {
      console.log('[YTM] Already authenticated, skipping')
      return true
    }

    try {
      console.log('[YTM] Creating new YTMusic instance')
      this.ytm = new YTMusic()

      if (!this.credentials.cookie) {
        console.error('[YTM] ERROR: No cookie provided!')
        return false
      }

      console.log('[YTM] Initializing with cookie:', {
        cookiePreview: this.credentials.cookie.substring(0, 50) + '...',
        cookieLength: this.credentials.cookie.length,
        profile: this.selectedProfile
      })

      await this.ytm.initialize(
        this.credentials.cookie, 
        this.selectedProfile
      )
      
      // Log available methods after initialization
      console.log('[YTM] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.ytm)).filter(m => m !== 'constructor'))
      
      this.isAuthenticated = true
      console.log('[YTM] ✓ Authentication successful')
      return true

    } catch (error) {
      console.error('[YTM] ✗ Authentication failed:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      this.isAuthenticated = false
      return false
    }
  }

  async getTracks() {
    console.log('[YTM] getTracks() called')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getTracks: Authentication failed')
      return []
    }

    console.log('[YTM] getTracks: Falling back to search-based recommendations')
    
    try {
      // ytmusic-api doesn't have getLibrarySongs, use search for popular tracks
      const queries = ['popular songs 2025', 'top hits', 'trending music']
      const allTracks = []
      
      for (const query of queries) {
        try {
          console.log(`[YTM] Searching for: ${query}`)
          const results = await this.ytm.searchSongs(query)
          
          if (results && Array.isArray(results)) {
            console.log(`[YTM] Found ${results.length} results for "${query}"`)
            allTracks.push(...results.slice(0, 10)) // Take top 10 from each query
          }
        } catch (searchError) {
          console.error(`[YTM] Search error for "${query}":`, searchError.message)
        }
      }
      
      console.log(`[YTM] Total tracks collected: ${allTracks.length}`)
      
      const mappedTracks = allTracks.map((song, index) => {
        try {
          return {
            id: `ytm:${song.videoId}`,
            title: song.title,
            artist: song.artists?.[0]?.name || 'Unknown Artist',
            album: song.album?.name || 'Unknown Album',
            duration: song.duration,
            albumArt: song.thumbnails?.[0]?.url,
            streamUrl: `/api/stream/youtube/${song.videoId}`,
            service: 'youtubeMusic'
          }
        } catch (mapError) {
          console.error(`[YTM] Error mapping song at index ${index}:`, mapError.message)
          return null
        }
      }).filter(Boolean)

      console.log(`[YTM] ✓ Mapped ${mappedTracks.length} tracks successfully`)
      return mappedTracks

    } catch (error) {
      console.error('[YTM] getTracks error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async getAlbums() {
    console.log('[YTM] getAlbums() called')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getAlbums: Authentication failed')
      return []
    }

    try {
      console.log('[YTM] Searching for popular albums...')
      const albums = await this.ytm.searchAlbums('popular albums 2025')
      
      console.log('[YTM] searchAlbums response:', {
        type: typeof albums,
        isArray: Array.isArray(albums),
        length: albums?.length,
        sample: albums?.[0] ? {
          title: albums[0].title,
          browseId: albums[0].browseId
        } : null
      })
      
      if (!albums || !Array.isArray(albums) || albums.length === 0) {
        console.warn('[YTM] No albums found')
        return []
      }
      
      const mappedAlbums = albums.slice(0, 20).map(album => ({
        id: `ytm:${album.browseId || album.playlistId}`,
        title: album.title,
        artist: album.artists?.[0]?.name || 'Unknown Artist',
        year: album.year,
        coverArt: album.thumbnails?.[0]?.url,
        trackCount: album.trackCount || 0,
        service: 'youtubeMusic'
      }))

      console.log(`[YTM] ✓ Mapped ${mappedAlbums.length} albums successfully`)
      return mappedAlbums

    } catch (error) {
      console.error('[YTM] getAlbums error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async getPlaylists() {
    console.log('[YTM] getPlaylists() called')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getPlaylists: Authentication failed')
      return []
    }

    try {
      console.log('[YTM] Searching for popular playlists...')
      const playlists = await this.ytm.searchPlaylists('popular playlists')
      
      console.log('[YTM] searchPlaylists response:', {
        type: typeof playlists,
        isArray: Array.isArray(playlists),
        length: playlists?.length,
        sample: playlists?.[0] ? {
          title: playlists[0].title,
          playlistId: playlists[0].playlistId
        } : null
      })
      
      if (!playlists || !Array.isArray(playlists) || playlists.length === 0) {
        console.warn('[YTM] No playlists found')
        return []
      }
      
      const mappedPlaylists = playlists.slice(0, 20).map(playlist => ({
        id: `ytm:${playlist.playlistId}`,
        title: playlist.title,
        description: playlist.description || '',
        trackCount: playlist.trackCount || 0,
        coverArt: playlist.thumbnails?.[0]?.url,
        service: 'youtubeMusic'
      }))

      console.log(`[YTM] ✓ Mapped ${mappedPlaylists.length} playlists successfully`)
      return mappedPlaylists

    } catch (error) {
      console.error('[YTM] getPlaylists error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async getArtists() {
    console.log('[YTM] getArtists() called')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getArtists: Authentication failed')
      return []
    }

    try {
      console.log('[YTM] Searching for popular artists...')
      const artists = await this.ytm.searchArtists('popular artists')
      
      console.log('[YTM] searchArtists response:', {
        type: typeof artists,
        isArray: Array.isArray(artists),
        length: artists?.length,
        sample: artists?.[0] ? {
          name: artists[0].name,
          browseId: artists[0].browseId
        } : null
      })
      
      if (!artists || !Array.isArray(artists) || artists.length === 0) {
        console.warn('[YTM] No artists found')
        return []
      }
      
      const mappedArtists = artists.slice(0, 20).map(artist => ({
        id: `ytm:${artist.browseId || artist.id}`,
        name: artist.name,
        image: artist.thumbnails?.[0]?.url,
        service: 'youtubeMusic'
      }))

      console.log(`[YTM] ✓ Mapped ${mappedArtists.length} artists successfully`)
      return mappedArtists

    } catch (error) {
      console.error('[YTM] getArtists error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async search(query) {
    console.log('[YTM] search() called with query:', query)
    
    if (!await this.authenticate()) {
      console.error('[YTM] search: Authentication failed')
      return []
    }

    try {
      console.log('[YTM] Calling ytm.searchSongs()...')
      const results = await this.ytm.searchSongs(query)
      
      console.log('[YTM] searchSongs response:', {
        type: typeof results,
        isArray: Array.isArray(results),
        length: results?.length,
        sample: results?.[0] ? {
          title: results[0].title,
          videoId: results[0].videoId
        } : null
      })
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        console.warn('[YTM] No search results found')
        return []
      }

      const mappedResults = results.map(track => ({
        id: `ytm:${track.videoId}`,
        title: track.title,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        duration: track.duration,
        albumArt: track.thumbnails?.[0]?.url,
        streamUrl: `/api/stream/youtube/${track.videoId}`,
        service: 'youtubeMusic'
      }))

      console.log(`[YTM] ✓ Mapped ${mappedResults.length} search results successfully`)
      return mappedResults

    } catch (error) {
      console.error('[YTM] search error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async getRecommendations() {
    console.log('[YTM] getRecommendations() called')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getRecommendations: Authentication failed')
      return []
    }

    try {
      // Try multiple popular search queries to simulate recommendations
      const queries = [
        'top hits 2025',
        'popular music',
        'trending songs',
        'new releases'
      ]
      
      const recommendations = []
      
      for (const query of queries) {
        try {
          console.log(`[YTM] Searching recommendations: ${query}`)
          const results = await this.ytm.searchSongs(query)
          
          if (results && Array.isArray(results)) {
            const mapped = results.slice(0, 5).map(item => ({
              id: `ytm:${item.videoId}`,
              title: item.title,
              artist: item.artists?.[0]?.name || 'Unknown Artist',
              album: item.album?.name || 'Unknown Album',
              duration: item.duration,
              albumArt: item.thumbnails?.[0]?.url,
              streamUrl: `/api/stream/youtube/${item.videoId}`,
              service: 'youtubeMusic',
              section: query
            }))
            
            recommendations.push(...mapped)
          }
        } catch (queryError) {
          console.error(`[YTM] Error with query "${query}":`, queryError.message)
        }
      }

      console.log(`[YTM] ✓ Found ${recommendations.length} recommendations`)
      return recommendations

    } catch (error) {
      console.error('[YTM] getRecommendations error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async getProfiles() {
    console.log('[YTM] getProfiles() called')
    return [
      { id: '0', name: 'Primary Account', description: 'Your main YouTube Music account' },
      { id: '1', name: 'Brand Account 1', description: 'First brand channel' },
      { id: '2', name: 'Brand Account 2', description: 'Second brand channel' }
    ]
  }

  async switchProfile(profileId) {
    console.log('[YTM] switchProfile() called with profileId:', profileId)
    this.selectedProfile = profileId
    this.isAuthenticated = false
    this.ytm = null
    return await this.authenticate()
  }
}
