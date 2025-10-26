# YouTube Music Streaming & Authentication Guide

## Overview

R-Pod now supports **backend-stored authentication** for YouTube Music, enabling:
- 🎵 Enhanced search with better formatting
- 📻 Direct streaming via yt-dlp
- 🎤 AI-powered lyrics transcription (Whisper)
- 🎨 High-quality thumbnail fetching
- 📡 Personalized recommendations

## Authentication Flow

### Method 1: Pairing System (Recommended for R1)

1. **R1 Device**: Navigate to Settings → Pair Device
2. **QR Code**: Scan the QR code or visit the pairing URL
3. **Web Client**: Enter your YouTube Music cookie
4. **Auto-Detection**: System detects available accounts
5. **Selection**: Choose your preferred account
6. **Testing**: Credentials are tested before submission
7. **Pairing**: Credentials sent to R1 AND stored on backend

**Backend Storage**: Credentials are stored in memory on the backend server, keyed by `device_id`. This allows the backend to make authenticated API calls on behalf of the device.

### Method 2: Environment Variables (Server Default)

Set in `backend-python/.env`:

```env
YOUTUBE_MUSIC_COOKIE=your_cookie_here
YOUTUBE_MUSIC_PROFILE=0
YOUTUBE_MUSIC_BRAND_ACCOUNT_ID=optional
```

This provides default credentials for all devices when no device-specific credentials exist.

## How Backend Authentication Works

### Request Flow

```
R1 Device → Backend API → YouTube Music
          ↑
    device_id passed in query param
```

1. **R1 makes request** with `device_id` query parameter
2. **Backend checks** `device_credentials[device_id]`
3. **If found**: Uses device-specific credentials
4. **If not found**: Falls back to environment variables
5. **Backend makes authenticated call** to YouTube Music
6. **Response sent** back to R1

### Example API Call

```javascript
// From R1 device
fetch('http://backend:8000/api/ytm/search?q=The Beatles&device_id=r1-12345', {
  headers: {
    'X-Server-Password': 'your-password'
  }
})
```

Backend automatically uses the stored credentials for device `r1-12345`.

## Enhanced YTM Endpoints

### Search
```
GET /api/ytm/search?q={query}&limit={limit}&device_id={device_id}
```

Returns tracks with enhanced formatting and high-quality thumbnails.

### Track Info
```
GET /api/ytm/track/{video_id}?device_id={device_id}
```

Returns track metadata and fresh streaming URL via yt-dlp.

### Recommendations
```
GET /api/ytm/recommendations/{video_id}?limit={limit}&device_id={device_id}
```

Returns personalized recommendations based on a seed track.

### Lyrics (Cached)
```
GET /api/ytm/lyrics/{video_id}?device_id={device_id}
```

Returns cached lyrics or triggers AI transcription.

### Lyrics Transcription
```
POST /api/ytm/lyrics/{video_id}/transcribe?device_id={device_id}
```

Transcribes lyrics using Whisper AI:
- Downloads audio via yt-dlp
- Transcribes with faster-whisper (base model)
- Auto-detects language (99 languages supported)
- Returns synced lyrics with timestamps
- Caches result for future requests

### Thumbnail
```
GET /api/ytm/thumbnail/{video_id}
```

Finds the best available thumbnail quality (maxres → sd → hq → mq → default).

## Device Credential Management

### Store Credentials
```
POST /api/devices/{device_id}/credentials
Headers: X-Server-Password
Body: {
  "cookie": "...",
  "profile": "0",
  "channel_id": "optional",
  "brand_account_id": "optional"
}
```

### Get Credentials (Sanitized)
```
GET /api/devices/{device_id}/credentials
Headers: X-Server-Password
```

Returns:
```json
{
  "device_id": "r1-12345",
  "has_cookie": true,
  "profile": "0",
  "timestamp": "2025-10-26T12:34:56"
}
```

### Delete Credentials
```
DELETE /api/devices/{device_id}/credentials
Headers: X-Server-Password
```

## AI Lyrics Transcription

### Requirements

```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install ffmpeg

# Python packages (already in requirements.txt)
pip install faster-whisper yt-dlp
```

### How It Works

1. **Request**: Client requests lyrics for `video_id`
2. **Cache Check**: Backend checks cache directory
3. **Download**: If not cached, downloads audio via yt-dlp
4. **Transcribe**: Uses Whisper base model (CPU, int8)
5. **Format**: Returns synced lyrics with timestamps
6. **Cache**: Saves to temp directory for future requests
7. **Cleanup**: Deletes audio file, keeps lyrics JSON

### Performance

- **First request**: 15-30 seconds (download + transcribe)
- **Cached requests**: Instant
- **Languages**: 99 languages auto-detected
- **Accuracy**: Good for English, varies for other languages

### Cache Location

```
/tmp/r_pod_lyrics_cache/
├── {video_id}.json  # Cached lyrics
└── {video_id}.mp3   # Temporary (deleted after transcription)
```

## Security Considerations

### Credential Storage

⚠️ **In-Memory Only**: Credentials are stored in memory (`device_credentials` dict) and lost on server restart.

**Production Improvements Needed**:
- Encrypt credentials before storing
- Use persistent database (Redis, PostgreSQL)
- Implement credential rotation
- Add rate limiting per device
- Log credential access

### Cookie Security

- Cookies contain authentication tokens
- Never log full cookies
- Use HTTPS in production
- Implement token refresh if possible

### API Protection

- All endpoints require `X-Server-Password` header
- CORS configured for specific origins
- Session management with timeouts
- Input validation on all endpoints

## Integration Example (R1 Client)

```javascript
// In your R1 app
const DEVICE_ID = localStorage.getItem('device_id') || generateDeviceId();
const API_BASE = 'http://backend:8000';
const SERVER_PASSWORD = 'your-password';

async function searchYTM(query) {
  const response = await fetch(
    `${API_BASE}/api/ytm/search?q=${encodeURIComponent(query)}&device_id=${DEVICE_ID}`,
    {
      headers: {
        'X-Server-Password': SERVER_PASSWORD
      }
    }
  );
  
  const data = await response.json();
  return data.tracks.items;
}

async function getLyrics(videoId) {
  // Check if cached
  let response = await fetch(
    `${API_BASE}/api/ytm/lyrics/${videoId}?device_id=${DEVICE_ID}`,
    {
      headers: { 'X-Server-Password': SERVER_PASSWORD }
    }
  );
  
  let data = await response.json();
  
  // If not cached, trigger transcription
  if (data.source === 'transcribing') {
    response = await fetch(
      `${API_BASE}/api/ytm/lyrics/${videoId}/transcribe?device_id=${DEVICE_ID}`,
      {
        method: 'POST',
        headers: { 'X-Server-Password': SERVER_PASSWORD }
      }
    );
    data = await response.json();
  }
  
  return data;
}
```

## Troubleshooting

### Credentials Not Working

1. Check backend logs: `tail -f backend.log`
2. Verify credentials stored: `GET /api/devices/{device_id}/credentials`
3. Test with environment variables first
4. Use pairing system to re-authenticate

### Transcription Failing

1. Check ffmpeg installed: `ffmpeg -version`
2. Check disk space in `/tmp`
3. Verify yt-dlp can access YouTube
4. Check backend logs for Whisper errors

### Streaming Issues

1. URLs expire after ~6 hours
2. Use fresh URL for each playback session
3. Check CORS headers if streaming from browser
4. Verify yt-dlp is up to date: `pip install --upgrade yt-dlp`

## Performance Optimization

### Caching Strategy

- **Lyrics**: Cached indefinitely in temp directory
- **Stream URLs**: Not cached (expire quickly)
- **Search Results**: Not cached (real-time data)
- **Thumbnails**: Browser caches via URL

### Resource Usage

- **Whisper Model**: ~400MB RAM (base model, int8)
- **Thread Pool**: 2 workers for CPU tasks
- **Storage**: ~10KB per cached lyrics file

### Scaling Considerations

- Use Redis for credential storage
- CDN for thumbnails
- Dedicated transcription service
- Queue system for transcription requests
- Webhook for transcription completion

## Future Enhancements

- [ ] Persistent credential storage with encryption
- [ ] OAuth2 flow for YouTube Music
- [ ] Webhook notifications for transcription completion
- [ ] Batch transcription queue
- [ ] Lyrics editing and correction UI
- [ ] Multi-language UI for lyrics display
- [ ] Integration with YouTube Music playlists
- [ ] Like/dislike sync with YouTube Music account
