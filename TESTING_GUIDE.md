# Complete Setup & Testing Guide

## Overview

This guide walks you through setting up and testing the complete R-Pod system with device pairing.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   R1 Device     │         │  Backend Server  │         │  Pairing Client │
│  (localhost:    │◄───────►│  (localhost:8000)│◄───────►│  (localhost:    │
│   5173)         │ Socket  │                  │ Socket  │   3000)         │
│                 │  .IO    │  FastAPI         │  .IO    │                 │
│  - UI/Views     │         │  - API Endpoints │         │  - Web Form     │
│  - Socket.IO    │         │  - Socket.IO     │         │  - Account      │
│  - localStorage │         │  - Credentials   │         │    Detection    │
└─────────────────┘         │    Storage       │         └─────────────────┘
                           └──────────────────┘
```

## Step-by-Step Setup

### 1. Initial Configuration

#### Backend Configuration
```bash
cd /workspaces/r-pod/backend-python
cp .env.example .env  # If not exists
```

Edit `backend-python/.env`:
```env
# Required
SERVER_PASSWORD=your-secure-password-here

# Optional (can configure via pairing instead)
YOUTUBE_MUSIC_COOKIE=
YOUTUBE_MUSIC_PROFILE=0
```

#### Frontend Configuration
```bash
cd /workspaces/r-pod
cp .env.example .env.local  # If not exists
```

Edit `.env.local`:
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_BACKEND_PASSWORD=your-secure-password-here
VITE_PAIRING_URL=http://localhost:3000
```

### 2. Start All Services

```bash
./start-all.sh
```

This will:
1. Install all dependencies
2. Build frontend & pairing client
3. Start backend on port 8000
4. Start R1 frontend on port 5173
5. Start pairing client on port 3000

### 3. Verify Services

Open these URLs in your browser:

- **Backend Health**: http://localhost:8000/health
  - Should show `{"status": "ok"}`
  
- **R1 Frontend**: http://localhost:5173
  - Should show iPod-style interface
  
- **Pairing Client**: http://localhost:3000
  - Should show pairing code entry form

- **API Docs**: http://localhost:8000/docs
  - Interactive API documentation

## Testing the Pairing Flow

### Method 1: Same Computer (Testing)

#### Step 1: Start Pairing on R1
1. Open http://localhost:5173
2. Navigate: Settings → Pair Device
3. Click "Generate Pairing Code"
4. Note the 6-character code (e.g., "ABC123")

#### Step 2: Enter Code on Pairing Client
1. Open http://localhost:3000 in another browser tab/window
2. Enter the 6-character code
3. Click "Continue"

#### Step 3: Configure Credentials
1. Paste your YouTube Music cookie
2. Click "Detect Accounts" (optional but recommended)
3. Select your preferred account
4. Click "Test Credentials" to verify
5. Click "Complete Pairing"

#### Step 4: Verify on R1
1. R1 should show "Pairing Successful!"
2. Page will reload automatically
3. Credentials are now stored in:
   - **R1 localStorage** (for UI)
   - **Backend memory** (for API calls with `device_id`)

### Method 2: Mobile Phone (Real Usage)

#### Step 1: Make Services Accessible
If testing on actual R1 device or phone:

1. Find your computer's IP address:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

2. Update `.env.local`:
```env
VITE_BACKEND_URL=http://YOUR_IP:8000
VITE_PAIRING_URL=http://YOUR_IP:3000
```

3. Restart services:
```bash
./stop-all.sh
./start-all.sh
```

#### Step 2: Scan QR Code
1. On R1: Settings → Pair Device → Generate Code
2. Scan QR code with phone
3. Follow pairing wizard on phone
4. R1 auto-configures

## Testing API Endpoints

### Test with Device ID

The R1 automatically generates and stores a `device_id` in localStorage. The backend uses this to retrieve device-specific credentials.

#### Example: Search with Device Credentials
```bash
# Get device ID from browser console on R1:
# localStorage.getItem('r1_device_id')

curl -X GET \
  "http://localhost:8000/api/ytm/search?q=The%20Beatles&device_id=r1-abc123xyz" \
  -H "X-Server-Password: your-password"
```

#### Example: Get Lyrics
```bash
curl -X GET \
  "http://localhost:8000/api/ytm/lyrics/dQw4w9WgXcQ?device_id=r1-abc123xyz" \
  -H "X-Server-Password: your-password"
```

#### Example: Transcribe Lyrics
```bash
curl -X POST \
  "http://localhost:8000/api/ytm/lyrics/dQw4w9WgXcQ/transcribe?device_id=r1-abc123xyz" \
  -H "X-Server-Password: your-password"
```

### Check Stored Credentials

```bash
curl -X GET \
  "http://localhost:8000/api/devices/r1-abc123xyz/credentials" \
  -H "X-Server-Password: your-password"
```

Response:
```json
{
  "device_id": "r1-abc123xyz",
  "has_cookie": true,
  "profile": "0",
  "timestamp": "2025-10-26T12:34:56"
}
```

## How It Works

### Pairing Flow Sequence

```
1. R1 → Backend: "pair_request" with device_id
2. Backend → R1: "pair_code" with 6-char code
3. R1: Display code + QR code
4. Web Client → Backend: "pair_validate" with code
5. Backend → Web Client: "pair_validate_result" (valid/invalid)
6. Web Client: User enters credentials
7. Web Client → Backend: "pair_submit" with code + credentials
8. Backend → R1: "pair_credentials" with credentials
9. R1: Store in localStorage
10. Backend: Store in device_credentials[device_id]
11. R1 → Backend: "pair_confirm" success
12. R1: Reload page
```

### Backend Credential Lookup

When R1 makes an API call:

```javascript
// R1 sends device_id in query
fetch('http://backend:8000/api/ytm/search?device_id=r1-abc123&q=test', {
  headers: { 'X-Server-Password': 'password' }
})
```

Backend logic:
```python
# Check for device-specific credentials
if device_id and device_id in device_credentials:
    creds = device_credentials[device_id]
    # Use creds['cookie'], creds['profile']
else:
    # Fall back to environment variables
    # Use settings.youtube_music_cookie
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
tail -f backend.log
tail -f frontend.log
tail -f pairing.log

# Check if ports are in use
lsof -i :8000
lsof -i :5173
lsof -i :3000

# Kill stuck processes
./stop-all.sh
pkill -f python
pkill -f node
```

### Socket.IO Connection Fails

**Symptoms**: Pairing code doesn't appear, "Disconnected from server"

**Fix**:
1. Check backend is running: `curl http://localhost:8000/health`
2. Check Socket.IO endpoint: `curl http://localhost:8000/socket.io/`
3. Verify CORS settings in backend `.env`:
   ```env
   CORS_ORIGINS=["*"]
   ```
4. Check browser console for errors
5. Try different transport in DevicePairingView.jsx:
   ```javascript
   const newSocket = io(backendUrl, {
     transports: ['polling']  // Force polling instead of websocket
   });
   ```

### Pairing Code Expires Too Fast

Edit `backend-python/pairing_service.py`:
```python
self.expires_at = datetime.now() + timedelta(minutes=10)  # Change from 5 to 10
```

### Credentials Not Persisting

**R1 Side**:
```javascript
// Check in browser console
console.log(localStorage.getItem('ytm_cookie'))
console.log(localStorage.getItem('r1_device_id'))
```

**Backend Side**:
```bash
# Check backend logs for credential storage
grep "Credentials stored" backend.log
```

### API Calls Fail with 401

**Possible causes**:
1. Wrong `X-Server-Password` header
2. Password mismatch between frontend `.env.local` and backend `.env`
3. Check backend logs for auth failures

**Fix**:
```bash
# Verify password match
cat .env.local | grep VITE_BACKEND_PASSWORD
cat backend-python/.env | grep SERVER_PASSWORD
```

### YouTube Music Cookie Invalid

**Symptoms**: "Authentication failed", 401 errors

**How to get a fresh cookie**:
1. Open https://music.youtube.com in browser
2. Log in to your account
3. Open DevTools (F12)
4. Go to Application → Cookies → https://music.youtube.com
5. Find cookie named `__Secure-1PSID` or similar
6. Copy the entire cookie string
7. Use in pairing or environment variable

### Lyrics Transcription Fails

**Requirement**: ffmpeg must be installed

```bash
# Install ffmpeg
sudo apt-get update
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version

# Restart backend
./stop-all.sh
./start-all.sh
```

## Advanced Configuration

### Production Deployment

1. **Use HTTPS**: Deploy behind nginx with SSL
2. **Secure Passwords**: Use strong random passwords
3. **Restrict CORS**: Set specific origins in backend `.env`:
   ```env
   CORS_ORIGINS=["https://your-r1-domain.com"]
   ```
4. **Persist Credentials**: Modify backend to use Redis/PostgreSQL instead of in-memory storage
5. **Rate Limiting**: Add rate limiting to API endpoints
6. **Monitoring**: Set up logging and monitoring

### Custom Pairing URL

If hosting pairing client on different domain:

1. Update `.env.local`:
   ```env
   VITE_PAIRING_URL=https://pair.yourdomain.com
   ```

2. Deploy pairing client to that domain

3. QR codes will automatically use the new URL

## Next Steps

1. ✅ Test pairing flow end-to-end
2. ✅ Verify credentials are stored on backend
3. ✅ Test YTM search with device credentials
4. ✅ Test lyrics transcription (if ffmpeg installed)
5. ✅ Test on actual R1 device (if available)
6. ⬜ Deploy to production
7. ⬜ Add persistent credential storage
8. ⬜ Implement credential encryption

## Useful Commands

```bash
# Start everything
./start-all.sh

# Stop everything
./stop-all.sh

# View logs
tail -f backend.log frontend.log pairing.log

# Check service health
curl http://localhost:8000/health

# Test pairing statistics
curl http://localhost:8000/api/pairing/stats \
  -H "X-Server-Password: your-password"

# Clear device credentials
curl -X DELETE \
  "http://localhost:8000/api/devices/r1-abc123/credentials" \
  -H "X-Server-Password: your-password"
```

## Support & Documentation

- **Main README**: `/workspaces/r-pod/README.md`
- **YTM Streaming Guide**: `/workspaces/r-pod/YTM_STREAMING_GUIDE.md`
- **Pairing System Docs**: `/workspaces/r-pod/PAIRING_SYSTEM.md`
- **Security Guide**: `/workspaces/r-pod/SECURITY.md`
- **API Documentation**: http://localhost:8000/docs (when running)
