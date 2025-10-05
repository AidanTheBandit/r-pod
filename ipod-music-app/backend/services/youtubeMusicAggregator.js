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
    console.log('[YTM] getTracks() called - fetching Quick Picks & Listen Again')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getTracks: Authentication failed')
      return []
    }

    try {
      // Get home sections to find "Quick Picks" and "Listen Again"
      const homeSections = typeof this.ytm.getHomeSections === 'function'
        ? await this.ytm.getHomeSections()
        : (typeof this.ytm.getHome === 'function' ? await this.ytm.getHome() : [])

      console.log('[YTM] Home sections response:', {
        type: typeof homeSections,
        isArray: Array.isArray(homeSections),
        length: homeSections?.length,
        sectionTitles: homeSections?.map(s => s.title).filter(Boolean)
      })

      if (!homeSections || !Array.isArray(homeSections)) {
        console.warn('[YTM] No home sections found, falling back to search')
        return await this.getFallbackTracks()
      }

      // Find sections by title (case insensitive) - expanded to include more recommendation types
      let relevantSections = homeSections.filter(
        section =>
          section.title &&
          (
            section.title.toLowerCase().includes('quick pick') ||
            section.title.toLowerCase().includes('listen again') ||
            section.title.toLowerCase().includes('mixed for you') ||
            section.title.toLowerCase().includes('recommended') ||
            section.title.toLowerCase().includes('for you') ||
            section.title.toLowerCase().includes('trending') ||
            section.title.toLowerCase().includes('today') ||
            section.title.toLowerCase().includes('new') ||
            section.title.toLowerCase().includes('popular') ||
            section.title.toLowerCase().includes('hits') ||
            section.title.toLowerCase().includes('jams')
          )
      )

      console.log('[YTM] Found relevant home sections:', relevantSections.map(s => s.title))

      // If no relevant sections found, try to get tracks from first few sections that have tracks
      if (relevantSections.length === 0) {
        console.log('[YTM] No specific sections found, using sections with track content')
        relevantSections = homeSections.filter(section => 
          section.contents && 
          Array.isArray(section.contents) && 
          section.contents.length > 0 &&
          section.contents.some(item => item.videoId) // Has actual tracks
        ).slice(0, 5) // Take first 5 sections with content
      }

      // Aggregate tracks from relevant sections
      const tracks = []
      relevantSections.forEach(section => {
        if (section.contents && Array.isArray(section.contents)) {
          console.log(`[YTM] Processing section "${section.title}" with ${section.contents.length} items`)
          
          section.contents.forEach((item, index) => {
            if (item.videoId && tracks.length < 100) { // Limit to 100 tracks total
              try {
                tracks.push({
                  id: `ytm:${item.videoId}`,
                  title: item.title || item.name,
                  artist: item.artist?.name || item.artists?.[0]?.name || 'Unknown Artist',
                  album: item.album?.name || 'Unknown Album',
                  duration: item.duration,
                  albumArt: item.thumbnails?.[0]?.url || item.thumbnail?.url,
                  streamUrl: `/api/stream/youtube/${item.videoId}`,
                  service: 'youtubeMusic',
                  section: section.title
                })
              } catch (mapError) {
                console.error(`[YTM] Error mapping item ${index} in section "${section.title}":`, mapError.message)
              }
            }
          })
        }
      })

      console.log(`[YTM] ✓ Returning ${tracks.length} tracks from Quick Picks & Listen Again`)
      return tracks

    } catch (error) {
      console.error('[YTM] getTracks error:', {
        message: error.message,
        stack: error.stack
      })
      // Fallback to search-based tracks
      return await this.getFallbackTracks()
    }
  }

  // Fallback method for when home sections don't work
  async getFallbackTracks() {
    console.log('[YTM] getFallbackTracks: Using search-based recommendations')
    
    try {
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

      console.log(`[YTM] ✓ Mapped ${mappedTracks.length} fallback tracks successfully`)
      return mappedTracks

    } catch (error) {
      console.error('[YTM] getFallbackTracks error:', error.message)
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
        id: `ytm:${album.albumId || album.browseId || album.playlistId}`,
        title: album.name,
        artist: album.artist?.name || 'Unknown Artist',
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
    console.log('[YTM] getPlaylists() called - fetching user playlists')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getPlaylists: Authentication failed')
      return []
    }

    try {
      console.log('[YTM] Fetching user playlists from library...')
      const playlists = await this.ytm.getLibraryPlaylists()
      
      console.log('[YTM] getLibraryPlaylists response:', {
        type: typeof playlists,
        isArray: Array.isArray(playlists),
        length: playlists?.length,
        sample: playlists?.[0] ? {
          title: playlists[0].title,
          playlistId: playlists[0].playlistId
        } : null
      })
      
      if (!playlists || !Array.isArray(playlists) || playlists.length === 0) {
        console.warn('[YTM] No user playlists found')
        return []
      }
      
      const mappedPlaylists = playlists.map((playlist, index) => {
        if (index === 0) {
          console.log('[YTM] First playlist object:', JSON.stringify(playlist, null, 2))
        }
        
        return {
          id: `ytm:${playlist.playlistId}`,
          name: playlist.title || playlist.name || 'Unknown Playlist',
          title: playlist.title || playlist.name || 'Unknown Playlist',
          description: playlist.description || '',
          trackCount: playlist.trackCount || playlist.count || 0,
          coverArt: playlist.thumbnails?.[0]?.url,
          service: 'youtubeMusic'
        }
      })

      console.log(`[YTM] ✓ Mapped ${mappedPlaylists.length} user playlists successfully`)
      return mappedPlaylists

    } catch (error) {
      console.error('[YTM] getLibraryPlaylists error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async getArtists(type = 'user') {
    console.log('[YTM] getArtists() called - fetching', type, 'artists')
    
    if (!await this.authenticate()) {
      console.error('[YTM] getArtists: Authentication failed')
      return []
    }

    try {
      if (type === 'popular') {
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
        
        const mappedArtists = artists.slice(0, 20).map((artist, index) => {
          console.log(`[YTM] Mapping artist ${index}:`, {
            name: artist.name,
            artistId: artist.artistId,
            browseId: artist.browseId,
            id: artist.id,
            type: artist.type
          })
          
          return {
            id: `ytm:${artist.artistId || artist.browseId || artist.id}`,
            name: artist.name,
            image: artist.thumbnails?.[0]?.url,
            service: 'youtubeMusic'
          }
        })

        console.log(`[YTM] ✓ Mapped ${mappedArtists.length} popular artists successfully`)
        return mappedArtists
      } else {
        // User artists
        console.log('[YTM] Fetching user artists from library...')
        const artists = await this.ytm.getLibraryArtists()
        
        console.log('[YTM] getLibraryArtists response:', {
          type: typeof artists,
          isArray: Array.isArray(artists),
          length: artists?.length,
          sample: artists?.[0] ? {
            name: artists[0].name,
            browseId: artists[0].browseId
          } : null
        })
        
        if (!artists || !Array.isArray(artists) || artists.length === 0) {
          console.warn('[YTM] No user artists found')
          return []
        }
        
        const mappedArtists = artists.map((artist, index) => {
          console.log(`[YTM] Mapping artist ${index}:`, {
            name: artist.name,
            artistId: artist.artistId,
            browseId: artist.browseId,
            id: artist.id,
            type: artist.type
          })
          
          return {
            id: `ytm:${artist.artistId || artist.browseId || artist.id}`,
            name: artist.name,
            image: artist.thumbnails?.[0]?.url,
            service: 'youtubeMusic'
          }
        })

        console.log(`[YTM] ✓ Mapped ${mappedArtists.length} user artists successfully`)
        return mappedArtists
      }
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

  // Get radio recommendations based on a seed track (YouTube Music radio feature)
  async getRadio(videoId) {
    console.log('[YTM] getRadio() called for videoId:', videoId)
    
    if (!await this.authenticate()) {
      console.error('[YTM] getRadio: Authentication failed')
      return []
    }

    try {
      // Use getWatchPlaylist to get radio recommendations (autoplay queue)
      const watchPlaylist = await this.ytm.getWatchPlaylist(videoId)
      
      console.log('[YTM] getWatchPlaylist response:', {
        type: typeof watchPlaylist,
        hasTracks: watchPlaylist?.tracks ? true : false,
        trackCount: watchPlaylist?.tracks?.length || 0
      })
      
      if (!watchPlaylist || !watchPlaylist.tracks || !Array.isArray(watchPlaylist.tracks)) {
        console.warn('[YTM] No radio tracks found')
        return []
      }

      const mappedTracks = watchPlaylist.tracks.slice(0, 20).map(track => ({
        id: `ytm:${track.videoId}`,
        title: track.title,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        duration: track.duration,
        albumArt: track.thumbnails?.[0]?.url,
        streamUrl: `/api/stream/youtube/${track.videoId}`,
        service: 'youtubeMusic',
        section: 'Radio'
      }))

      console.log(`[YTM] ✓ Found ${mappedTracks.length} radio tracks`)
      return mappedTracks

    } catch (error) {
      console.error('[YTM] getRadio error:', {
        message: error.message,
        stack: error.stack
      })
      return []
    }
  }

  async switchProfile(profileId) {
    console.log('[YTM] switchProfile() called with profileId:', profileId)
    this.selectedProfile = profileId
    this.isAuthenticated = false
    this.ytm = null
    return await this.authenticate()
  }
}
