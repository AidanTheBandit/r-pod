# Fixes Applied - October 5, 2025

## Issues Fixed

### 1. **Profile Selection Support**
- ✅ Added `YOUTUBE_MUSIC_PROFILE` environment variable support
- ✅ Logs all available YouTube Music profiles on server startup
- ✅ Falls back to profile `0` by default
- ✅ Auto-connect uses the selected profile from env

**Usage:**
```bash
YOUTUBE_MUSIC_PROFILE=1  # Set in .env to select different account/channel
```

### 2. **User Library Integration**
- ✅ Changed playlists to show user's playlists (`getLibraryPlaylists`)
- ✅ Changed artists to show user's artists with toggle for popular
- ✅ Changed albums to show user's albums with toggle for popular
- ✅ All views now have "Your X" vs "Popular X" toggle buttons

### 3. **Enhanced Search**
- ✅ Search now returns songs, albums, AND artists
- ✅ Results properly categorized by type
- ✅ Click handling differentiates between songs and other types

### 4. **Background Music Playback**
- ✅ Moved audio element to persistent `BackgroundPlayer` component in App.jsx
- ✅ Music continues playing while navigating between views
- ✅ Removed duplicate audio element from NowPlayingView
- ✅ Audio state managed centrally through playerStore

### 5. **Data Mapping Improvements**
- ✅ Fixed undefined titles - now properly extracts `title` or `name` with fallback
- ✅ Added comprehensive logging for track mapping
- ✅ Stream URLs properly constructed with full backend URL
- ✅ Added `videoId` to track objects for better debugging

### 6. **Now Playing UI Improvements**
- ✅ Fixed sizing - album art now 200x200px instead of responsive %
- ✅ Improved spacing and layout with flexbox centering
- ✅ Better typography - fixed pixel sizes instead of viewport units
- ✅ Enhanced button styling with borders and shadows
- ✅ Maximum width constraints for better readability
- ✅ Cleaner gradient background

### 7. **App Performance**
- ✅ Removed unnecessary useEffect dependency that caused remounting
- ✅ App now only mounts once instead of on every navigation
- ✅ Reduced console spam from repeated mounting

### 8. **API Library Method Fallbacks**
- ✅ Changed `getLibraryAlbums()` to `getLibrary()` (ytmusic-api limitation)
- ✅ Changed `getLibraryArtists()` to `getLibrary()` with filtering
- ✅ Added proper type filtering for albums vs artists from library

## Files Modified

### Backend
1. `/backend/server.js`
   - Added `ensureYouTubeMusicConnected()` function
   - Added `logAvailableYouTubeProfiles()` function
   - Added `type` parameter to albums/artists endpoints
   - Fixed profile selection in auto-connect

2. `/backend/services/youtubeMusicAggregator.js`
   - Enhanced `getTracks()` with better logging and title fallbacks
   - Updated `getAlbums(type)` to support user/popular with `getLibrary()`
   - Updated `getArtists(type)` to support user/popular with `getLibrary()`
   - Updated `getPlaylists()` to use `getLibraryPlaylists()`
   - Updated `search()` to return songs, albums, and artists

### Frontend
1. `/src/App.jsx`
   - Added missing imports (QueryClient, navigation, services, etc.)
   - Created `BackgroundPlayer` component for persistent audio
   - Fixed useEffect dependencies to prevent remounting
   - Moved audio element out of NowPlayingView

2. `/src/views/NowPlayingView.jsx`
   - Removed audio element (now in BackgroundPlayer)
   - Removed duplicate audio management code
   - Simplified to just display current track state

3. `/src/views/NowPlayingView.css`
   - Fixed all sizing from viewport units to pixels
   - Improved layout with max-width constraints
   - Enhanced button styling
   - Better typography and spacing

4. `/src/views/ArtistsView.jsx`
   - Added state for artist type toggle
   - Added UI buttons for "Your Artists" vs "Popular"
   - Updated hooks to pass type parameter

5. `/src/views/AlbumsView.jsx`
   - Added state for album type toggle
   - Added UI buttons for "Your Albums" vs "Popular"
   - Updated hooks to pass type parameter

6. `/src/views/PlaylistsView.jsx`
   - Changed header from "Popular Playlists" to "Your Playlists"

7. `/src/views/SearchView.jsx`
   - Enhanced result formatting for different types
   - Added type-specific click handling

8. `/src/hooks/useMusicData.js`
   - Updated `useArtists(type)` to accept type parameter
   - Updated `useAlbums(type)` to accept type parameter

9. `/src/services/backendClient.js`
   - Added logging for stream URL construction
   - Enhanced stream URL mapping with full backend URL
   - Added `type` parameter to getArtists/getAlbums

10. `/src/views/ArtistsView.css` & `/src/views/AlbumsView.css`
    - Added styles for toggle buttons
    - Added active state styling

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads without console errors
- [ ] Songs view shows tracks with proper titles
- [ ] Clicking a song plays audio
- [ ] Music continues playing when navigating
- [ ] Now Playing view shows current track info
- [ ] Play/pause buttons work
- [ ] Progress bar updates
- [ ] Artists view has "Your Artists" / "Popular" toggle
- [ ] Albums view has "Your Albums" / "Popular" toggle
- [ ] Playlists view shows user playlists
- [ ] Search returns songs, albums, and artists
- [ ] Profile selection works via YOUTUBE_MUSIC_PROFILE env var

## Known Limitations

1. **ytmusic-api Library Methods**
   - `getLibraryAlbums()` and `getLibraryArtists()` don't exist
   - Using `getLibrary()` instead and filtering by type
   - May not capture all user library items

2. **Streaming**
   - Audio streaming relies on YouTube proxy endpoint
   - Requires working YouTube cookie authentication
   - Stream URLs may expire and need refresh

3. **Profile Detection**
   - Profile names are guessed from home section titles
   - May show "Profile 0, Profile 1" if names can't be determined

## Next Steps

1. Test audio playback end-to-end
2. Verify stream URL construction is correct
3. Test profile switching with multiple accounts
4. Add loading states to toggle buttons
5. Consider caching library data to reduce API calls
6. Add error boundaries for failed API calls
7. Implement playlist/album detail views (TODO in code)
