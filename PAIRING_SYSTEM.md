# R-Pod Pairing System

## Overview

The R-Pod Pairing System allows you to easily configure your Rabbit R1 device by entering credentials through a convenient web interface, similar to how smart TVs pair with streaming services.

## How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Rabbit R1     │         │  Backend Server  │         │  Web Client     │
│   Device        │         │  (Socket.IO)     │         │  (Browser)      │
└────────┬────────┘         └────────┬─────────┘         └────────┬────────┘
         │                           │                            │
         │  1. Request pairing code  │                            │
         ├──────────────────────────>│                            │
         │                           │                            │
         │  2. Generate & return     │                            │
         │     code (e.g., "ABCD12") │                            │
         │<──────────────────────────┤                            │
         │                           │                            │
         │  3. Display code on       │                            │
         │     screen: "ABCD12"      │                            │
         │                           │                            │
         │                           │  4. Enter code "ABCD12"   │
         │                           │<───────────────────────────┤
         │                           │                            │
         │                           │  5. Validate code          │
         │                           │                            │
         │                           │  6. Return success         │
         │                           ├───────────────────────────>│
         │                           │                            │
         │                           │  7. Enter credentials:     │
         │                           │     - YTM Cookie           │
         │                           │     - Account Index        │
         │                           │     - Channel ID           │
         │                           │<───────────────────────────┤
         │                           │                            │
         │  8. Notify device with    │                            │
         │     new credentials       │                            │
         │<──────────────────────────┤                            │
         │                           │                            │
         │  9. Store credentials     │                            │
         │     in local storage      │                            │
         │                           │                            │
         │  10. Confirm stored       │                            │
         ├──────────────────────────>│                            │
         │                           │                            │
         │                           │  11. Show success          │
         │                           ├───────────────────────────>│
```

## Features

### For Rabbit R1 Device
- Display 6-character pairing code
- QR code for easy web client access
- Real-time credential updates
- Secure local storage
- Auto-expiring codes (5 minutes)

### For Web Client
- Simple code entry interface
- YouTube Music cookie helper
- Account detection and selection
- Channel/brand account picker
- Test connection before saving
- Mobile-friendly UI

### For Backend
- Socket.IO for real-time communication
- Code generation and validation
- Secure credential transmission
- Session management
- Automatic cleanup of expired codes

## Security

1. **Short-lived codes**: Pairing codes expire after 5 minutes
2. **One-time use**: Codes are invalidated after successful pairing
3. **Encrypted transmission**: All credentials sent over Socket.IO with encryption
4. **Local storage only**: Credentials stored on device, not server
5. **No logging**: Credentials never logged or stored server-side
6. **HTTPS required**: Production deployment requires SSL/TLS

## User Flow

### On Rabbit R1 Device

1. Open Settings → Device Pairing
2. Device generates and displays code: **ABCD12**
3. Shows QR code linking to: `https://pair.your-domain.com?device=ABCD12`
4. Wait for pairing confirmation
5. Credentials automatically applied

### On Web Client

1. Visit pairing URL or scan QR code
2. Enter pairing code: **ABCD12**
3. Paste YouTube Music cookie from browser
4. Click "Detect Accounts" to scan available accounts
5. Select your account from the list
6. (Optional) Select brand/channel account
7. Click "Test Connection" to verify
8. Click "Pair Device" to send credentials
9. Success! Device is configured

## Implementation

See the following files:
- `backend-python/pairing_service.py` - Backend pairing logic
- `src/views/DevicePairingView.jsx` - R1 device pairing view
- `pairing-client/` - Web client for credential entry

## API Endpoints

### REST API

```
POST /api/pairing/generate     Generate new pairing code
POST /api/pairing/validate     Validate a pairing code
GET  /api/pairing/status/:code Get pairing status
```

### Socket.IO Events

```
// Client → Server
pair:request              Request new pairing code
pair:submit               Submit credentials for device
pair:test                 Test credentials before pairing

// Server → Client  
pair:code                 Pairing code generated
pair:credentials          New credentials received
pair:success              Pairing successful
pair:error                Pairing error
```

## Usage Examples

### Generate Pairing Code (R1 Device)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3451');

// Request pairing code
socket.emit('pair:request', (response) => {
  console.log('Pairing code:', response.code);
  // Display: ABCD12
  // Show QR code: https://pair.your-domain.com?device=ABCD12
});

// Listen for credentials
socket.on('pair:credentials', (data) => {
  // Store credentials locally
  localStorage.setItem('ytm_cookie', data.cookie);
  localStorage.setItem('ytm_profile', data.profile);
  localStorage.setItem('ytm_channel_id', data.channelId);
  
  // Notify success
  socket.emit('pair:success');
});
```

### Submit Credentials (Web Client)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3451');

// Validate code
socket.emit('pair:validate', { code: 'ABCD12' }, (response) => {
  if (response.valid) {
    // Code is valid, show credential form
  }
});

// Submit credentials
socket.emit('pair:submit', {
  code: 'ABCD12',
  credentials: {
    cookie: 'VISITOR_INFO1_LIVE=...',
    profile: '1',
    channelId: 'UC1234567890',
    brandAccountId: 'optional-brand-id'
  }
}, (response) => {
  if (response.success) {
    // Show success message
  }
});
```

## Testing

```bash
# Start backend with pairing support
cd backend-python
python main.py

# Start web pairing client
cd pairing-client
npm install
npm run dev

# Test pairing flow
# 1. Open http://localhost:5173 (R1 device simulator)
# 2. Click "Device Pairing"
# 3. Note the code displayed
# 4. Open http://localhost:5174 (pairing client)
# 5. Enter the code and credentials
# 6. Verify pairing success
```

## Troubleshooting

### Code not working
- Codes expire after 5 minutes
- Codes are one-time use
- Check backend logs for errors
- Ensure Socket.IO connection is established

### Credentials not saving
- Check browser console for errors
- Verify Socket.IO connection
- Check device has sufficient storage
- Ensure credentials are valid format

### Connection issues
- Verify backend is running
- Check CORS configuration
- Ensure Socket.IO is properly configured
- Test with `curl http://localhost:3451/health`

---

**Last Updated:** October 26, 2025
