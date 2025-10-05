import { useQuery } from '@tanstack/react-query'
import { backendAPI } from '../services/backendClient'

/**
 * Custom hooks for fetching music data from the backend aggregator
 */

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      try {
        return await backendAPI.getPlaylists()
      } catch (error) {
        console.error('Error fetching playlists:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      try {
        return await backendAPI.getAlbums()
      } catch (error) {
        console.error('Error fetching albums:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

export function useArtists() {
  return useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      try {
        return await backendAPI.getArtists()
      } catch (error) {
        console.error('Error fetching artists:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
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
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

export function useSearch(query, type = 'track') {
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
        return []
      }
    },
    enabled: query && query.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    retry: 1,
  })
}
