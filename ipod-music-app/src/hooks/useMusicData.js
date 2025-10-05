import { useQuery } from '@tanstack/react-query'
import { musicServiceManager } from '../services/musicServiceManager'

/**
 * Custom hooks for fetching music data from services
 */

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      try {
        return await musicServiceManager.getAllPlaylists()
      } catch (error) {
        console.error('Error fetching playlists:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      try {
        return await musicServiceManager.getAllAlbums()
      } catch (error) {
        console.error('Error fetching albums:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useArtists() {
  return useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      try {
        return await musicServiceManager.getAllArtists()
      } catch (error) {
        console.error('Error fetching artists:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useTracks() {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      try {
        return await musicServiceManager.getAllTracks()
      } catch (error) {
        console.error('Error fetching tracks:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSearch(query, type = 'track') {
  return useQuery({
    queryKey: ['search', query, type],
    queryFn: async () => {
      if (!query || query.trim().length === 0) {
        return []
      }
      
      try {
        return await musicServiceManager.searchAll(query, type)
      } catch (error) {
        console.error('Error searching:', error)
        return []
      }
    },
    enabled: query && query.trim().length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  })
}
