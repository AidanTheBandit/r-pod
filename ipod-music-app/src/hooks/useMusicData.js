import { useQuery } from '@tanstack/react-query'
import { backendAPI } from '../services/backendClient'

/**
 * Custom hooks for fetching music data from the backend aggregator
 * Production-ready with proper error handling and caching
 */

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      try {
        return await backendAPI.getPlaylists()
      } catch (error) {
        console.error('Error fetching playlists:', error)
        throw error // Re-throw for React Query error handling
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useAlbums(type = 'user') {
  return useQuery({
    queryKey: ['albums', type],
    queryFn: async () => {
      try {
        return await backendAPI.getAlbums(type)
      } catch (error) {
        console.error('Error fetching albums:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useArtists(type = 'user') {
  return useQuery({
    queryKey: ['artists', type],
    queryFn: async () => {
      try {
        return await backendAPI.getArtists(type)
      } catch (error) {
        console.error('Error fetching artists:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useTracks() {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      try {
        return await backendAPI.getTracks()
      } catch (error) {
        console.error('Error fetching tracks:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useSearch(query, type = 'track') {
  const isEnabled = Boolean(query && typeof query === 'string' && query.trim().length >= 2)

  return useQuery({
    queryKey: ['search', query, type],
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return []
      }

      try {
        return await backendAPI.search(query, type)
      } catch (error) {
        console.error('Error searching:', error)
        throw error
      }
    },
    enabled: isEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    retry: 1,
    retryDelay: 1000,
  })
}
