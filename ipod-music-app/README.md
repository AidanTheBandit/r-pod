# 🎵 iPod Music App for R1 Device

A beautiful iPod-style music player for the Rabbit R1 device with support for multiple streaming services including Spotify, Apple Music, YouTube Music, and FOSS alternatives.

![Screenshot](metadata/screenshot.jpg)

## ✨ Features

### 🎨 Classic iPod Interface
- Authentic iPod navigation with scroll wheel support
- Clean list-based UI optimized for 240x282px display
- Blue selection highlights and smooth animations
- Hardware button integration (PTT button, scroll wheel)

### 🎵 Multi-Service Support
- **Commercial Services**: Spotify, Apple Music, YouTube Music
- **FOSS Services**: Jellyfin, Navidrome, Subsonic
- **Video Services**: YouTube, Vimeo, PeerTube
- Unified library across all services

### 🔐 Flexible Authentication
- **Option 1**: Bring Your Own OAuth Keys (BYOK) - Connect directly through the UI
- **Option 2**: Backend Server - Self-host for easier multi-service management
- Secure credential storage using cookies

### 🎧 Playback Features
- Play, pause, skip tracks
- Progress bar with seeking
- Shuffle and repeat modes
- Queue management
- Now Playing view with album art

### 🔍 Advanced Features
- Real-time search across all services
- Unified library view
- Playlist, album, and artist browsing
- Offline caching (planned)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Rabbit R1 device or development browser

### Installation

```bash
# Clone the repository
cd ipod-music-app

# Install dependencies
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
