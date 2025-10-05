# 🎵 Universal Music Aggregator for R1 Device

A production-ready iPod-style music player for the Rabbit R1 device with support for multiple streaming services including Spotify, YouTube Music, Jellyfin, Navidrome, and Subsonic.

![Screenshot](metadata/screenshot.jpg)

## ✨ Features

### 🎨 Production-Ready iPod Interface
- Authentic iPod navigation optimized for 240x282px R1 display
- Clean list-based UI with blue selection highlights
- Hardware integration (scroll wheel, PTT button)
- No emojis or placeholders - pure text/symbol interface

### 🎵 Universal Music Aggregation
- **Commercial Services**: Spotify, YouTube Music
- **FOSS Services**: Jellyfin, Navidrome, Subsonic
- **Real API Integration**: No fake data, actual service connections
- **Unified Library**: All services aggregated into one interface

### 🔐 Secure Authentication
- Backend server handles all service authentication
- Session-based credential management
- Secure cookie storage for session persistence
- Password-protected API endpoints

### 🎧 Full Playback Features
- HTML5 audio playback with full controls
- Progress bar with seeking capability
- Shuffle and repeat modes
- Queue management and track navigation
- Album art display

### 🔍 Advanced Features
- Real-time search across all connected services
- Unified library browsing (tracks, albums, artists, playlists)
- Service-specific configuration in settings
- Error handling and loading states

## 🚀 Production Deployment

### Quick Start (Development)

```bash
# Install dependencies
npm install
cd backend && npm install

# Start backend server
cd backend && node server.js

# In another terminal, start frontend
cd .. && npm run dev
```

### Production Build

```bash
# Build for production
./build.sh

# The 'dist' folder contains the production frontend
# Backend runs with: node backend/server.js
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t music-aggregator ./backend
docker run -p 3001:3001 music-aggregator
```

### Environment Configuration

#### Frontend (.env.local)
```bash
VITE_BACKEND_URL=http://your-server.com:3001
VITE_BACKEND_PASSWORD=your-secure-password
```

#### Backend (.env.production)
```bash
NODE_ENV=production
PORT=3001
SERVER_PASSWORD=your-secure-password
CACHE_TTL=3600
CORS_ORIGIN=https://your-domain.com
```

## 🔧 Service Configuration

### Spotify Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy Client ID and Client Secret
4. In Settings → Spotify, enter credentials

### YouTube Music Setup
1. Log into YouTube Music in Chrome
2. Open DevTools → Network tab
3. Filter for `browse` requests
4. Copy the full `cookie` header value
5. In Settings → YouTube Music, paste the cookie

### FOSS Services (Jellyfin/Navidrome/Subsonic)
1. Enter your server URL (e.g., `https://your-server.com`)
2. Enter username and password/API key
3. Test connection in settings

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Universal Aggregator**: Combines multiple music services into one API
- **Session Management**: Per-user service connections with caching
- **Real Service Integrations**: Direct API calls to Spotify, YouTube Music, etc.
- **Security**: Password authentication, CORS protection

### Frontend (React/Vite)
- **iPod UI**: Authentic interface optimized for R1 device
- **State Management**: Zustand stores for navigation, player, and services
- **Data Fetching**: React Query for caching and background updates
- **Real API Integration**: No mock data, connects to production backend

### Key Components
- `backendClient.js`: API client for backend communication
- `useMusicData.js`: React Query hooks for data fetching
- Service aggregators: Real API integrations for each service
- Settings view: Actual service connection management

## � Security

- **No Credentials in Frontend**: All authentication handled server-side
- **Session-Based**: Secure session management with automatic cleanup
- **Password Protection**: API endpoints require authentication
- **CORS Protection**: Configurable origin restrictions
- **Environment Variables**: Sensitive data stored securely

## 📊 API Endpoints

### Authentication Required
```
POST /api/services/connect     # Connect a music service
GET  /api/tracks              # Get all tracks
GET  /api/albums              # Get all albums
GET  /api/playlists           # Get all playlists
GET  /api/artists             # Get all artists
GET  /api/search?q=query      # Search across services
```

### Public
```
GET  /health                  # Health check
```

## 🐳 Docker Support

### Single Container
```bash
docker build -t music-aggregator ./backend
docker run -p 3001:3001 -e SERVER_PASSWORD=secure-password music-aggregator
```

### Docker Compose (with Nginx)
```bash
docker-compose --profile production up -d
```

## 🔧 Development

### Project Structure
```
ipod-music-app/
├── src/
│   ├── components/           # UI components (Header, ListView)
│   ├── views/               # Main views (Songs, Albums, Settings, etc.)
│   ├── services/            # Backend API client
│   ├── store/               # Zustand state management
│   ├── hooks/               # React Query data hooks
│   └── styles/              # CSS styles
├── backend/
│   ├── services/            # Service aggregators
│   ├── server.js            # Express server
│   └── Dockerfile           # Production container
├── dist/                    # Production frontend build
└── docker-compose.yml       # Multi-container setup
```

### Adding New Services
1. Create aggregator in `backend/services/`
2. Add to server.js service switch
3. Update SettingsView.jsx
4. Add to docker-compose environment

## 🚨 Troubleshooting

### Backend Connection Issues
- Check `VITE_BACKEND_URL` in frontend environment
- Verify backend server is running on correct port
- Check CORS_ORIGIN in backend environment

### Service Connection Failures
- Verify credentials are correct
- Check service API status
- Review backend logs for specific errors

### Playback Issues
- Check browser audio permissions
- Verify track URLs are accessible
- Check network connectivity

## 📝 License

This project is open source. See individual service terms for usage restrictions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review backend logs for errors
- Ensure all environment variables are set correctly
npm install

# Start development server
npm run dev
```

### Build for R1 Device

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to deploy to your R1 device.

## ⚙️ Configuration

### Method 1: Direct OAuth (BYOK)

1. Open the app and navigate to **Settings**
2. Select a service (e.g., Spotify)
3. Enter your OAuth credentials:
   - **Spotify**: Get from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - **Apple Music**: Get from [Apple Developer](https://developer.apple.com/)
   - **YouTube Music**: Get from [Google Cloud Console](https://console.cloud.google.com/)
4. Click "Connect with OAuth"
5. Complete the authentication flow

#### Getting OAuth Credentials

**Spotify:**
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Add redirect URI: `http://your-r1-ip/callback/spotify`
4. Copy Client ID and Client Secret

**Apple Music:**
1. Join [Apple Developer Program](https://developer.apple.com/)
2. Create a MusicKit identifier
3. Generate developer token
4. Configure in app settings

**YouTube Music:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI
5. Copy Client ID and Secret

### Method 2: Backend Server (Recommended)

The backend server simplifies multi-service management and provides better security.

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your service credentials

# Start server
npm start
```

#### Frontend Configuration

1. Open app settings
2. Enable "Use Backend Server"
3. Enter server URL: `http://your-server-ip:3001`
4. Enter server password (set in backend .env)
5. Click "Test Connection"

All your services will be managed centrally through the backend!

## 🖥️ Backend Server (Optional)

The optional backend server provides:

- ✅ Centralized service management
- ✅ Simplified OAuth flows
- ✅ Secure credential storage
- ✅ Multi-service search aggregation
- ✅ CORS handling
- ✅ Token refresh automation

See [backend/README.md](./backend/README.md) for detailed setup instructions.

## 🎮 Hardware Controls

### R1 Device
- **Scroll Wheel**: Navigate up/down through lists
- **PTT Button (Side Button)**: Select/Confirm, Play/Pause in Now Playing
- **Back**: Automatic navigation with menu history

### Development (Browser)
- **Arrow Up/Down**: Navigate lists
- **Space/Enter**: Select item
- **Escape**: Go back

## 📁 Project Structure

```
ipod-music-app/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Header.jsx
│   │   └── ListView.jsx
│   ├── views/           # Main application views
│   │   ├── MainMenu.jsx
│   │   ├── SongsView.jsx
│   │   ├── AlbumsView.jsx
│   │   ├── ArtistsView.jsx
│   │   ├── PlaylistsView.jsx
│   │   ├── NowPlayingView.jsx
│   │   ├── SettingsView.jsx
│   │   └── SearchView.jsx
│   ├── store/           # Zustand state management
│   │   ├── navigationStore.js
│   │   ├── playerStore.js
│   │   └── serviceStore.js
│   ├── services/        # Music service integrations
│   │   ├── baseMusicService.js
│   │   ├── spotifyService.js
│   │   ├── appleMusicService.js (planned)
│   │   ├── youtubeMusicService.js (planned)
│   │   ├── jellyfinService.js (planned)
│   │   └── musicServiceManager.js
│   ├── hooks/           # Custom React hooks
│   │   └── useDeviceControls.js
│   ├── styles/          # CSS styles
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── backend/             # Optional backend server
│   ├── server.js
│   ├── services/
│   └── routes/
├── package.json
└── README.md
```

## 🔧 Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Adding a New Service

1. Create service class extending `BaseMusicService`
2. Implement required methods (authenticate, getPlaylists, etc.)
3. Add service to `musicServiceManager.js`
4. Update `SettingsView.jsx` with UI configuration
5. Add service to `serviceStore.js`

Example:

```javascript
// src/services/myService.js
import { BaseMusicService, Track } from './baseMusicService'

export class MyService extends BaseMusicService {
  async authenticate() {
    // Implement OAuth flow
  }
  
  async getTracks() {
    // Fetch and normalize tracks
    return tracks.map(t => new Track({
      id: t.id,
      title: t.name,
      artist: t.artist,
      // ...
      serviceId: 'myService',
    }))
  }
}
```

## 🎨 Customization

### Styling

The app uses viewport-relative units (vw/vh) for perfect scaling on the R1's 240x282px display. All styles are in CSS modules:

- Global styles: `src/styles/index.css`
- Component styles: Co-located with components (e.g., `Header.css`)
- iPod color scheme: Blue selection (#5a9fd4), white background

### Adding Views

1. Create view component in `src/views/`
2. Add route in `App.jsx`
3. Update navigation store if needed
4. Add menu item in `MainMenu.jsx`

## 🐛 Troubleshooting

### Services Not Connecting
- Verify OAuth credentials are correct
- Check redirect URIs match exactly
- Ensure tokens haven't expired
- Check browser console for errors

### Audio Not Playing
- Spotify requires Web Playback SDK for full tracks (preview URLs are 30s)
- Ensure stream URLs are accessible
- Check CORS settings for self-hosted services

### R1 Hardware Not Responding
- Verify `r1-create` package is installed
- Check device controls are initialized
- Test keyboard fallback in browser first

## 📝 TODO / Roadmap

- [ ] Complete Apple Music integration
- [ ] Complete YouTube Music integration  
- [ ] Add Jellyfin, Navidrome, Subsonic services
- [ ] Video streaming support (YouTube, Vimeo, PeerTube)
- [ ] Offline caching and playback
- [ ] Playlist creation and management
- [ ] Lyrics display
- [ ] Equalizer settings
- [ ] Sleep timer
- [ ] Podcast support
- [ ] Backend server implementation
- [ ] Docker deployment for backend
- [ ] More themes (dark mode, custom colors)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Original iPod interface inspiration from research project
- [r1-create](https://www.npmjs.com/package/r1-create) SDK for R1 device integration
- Rabbit R1 community for support and feedback

## 📧 Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/ipod-music-app/issues)
- Community: Join the Rabbit R1 Discord

---

Made with ♥ for the Rabbit R1 community
