# iPod Music Backend Server

Optional backend server for the iPod Music App that simplifies multi-service management and provides OAuth proxy functionality.

## Features

- 🔐 OAuth proxy for Spotify, Apple Music, YouTube Music
- 🎵 Multi-service aggregation
- 🔒 Secure credential storage
- 📦 Simple deployment with Docker
- 🚀 CORS handling for R1 device
- ⚡ Response caching for better performance

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Configuration

Edit `.env` with your service credentials:

```env
# Server Settings
PORT=3001
SERVER_PASSWORD=your-secure-password

# Add your service API keys
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

### Running

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Docker Deployment

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

Or use docker-compose:

```bash
docker-compose up -d
```

## API Endpoints

### Health Check
```
GET /health
```

### Test Connection
```
POST /api/test-connection
Headers: x-server-password: your-password
```

### Spotify OAuth
```
POST /api/spotify/auth-url
POST /api/spotify/token
POST /api/spotify/refresh
```

### Aggregated Data
```
GET /api/playlists
GET /api/albums
GET /api/tracks
GET /api/search?q=query&type=track
```

All endpoints require authentication via `x-server-password` header.

## Frontend Configuration

In the iPod Music App:

1. Go to Settings
2. Enable "Use Backend Server"
3. Enter server URL: `http://your-server-ip:3001`
4. Enter server password
5. Click "Test Connection"

## Security Notes

- Always use HTTPS in production
- Change default password immediately
- Keep `.env` file secure
- Use environment variables in production
- Consider using a reverse proxy (nginx)

## Development

### Adding a New Service

1. Add credentials to `.env.example`
2. Create OAuth routes in `server.js`
3. Implement data aggregation endpoints
4. Update service list in health check

### Environment Variables

Required:
- `PORT` - Server port (default: 3001)
- `SERVER_PASSWORD` - Authentication password
- `SPOTIFY_CLIENT_ID` - Spotify app credentials
- `SPOTIFY_CLIENT_SECRET`

Optional:
- `CACHE_TTL` - Cache duration in seconds (default: 3600)
- `NODE_ENV` - Environment (development/production)

## Troubleshooting

### Connection Refused
- Check if server is running: `curl http://localhost:3001/health`
- Verify firewall settings
- Ensure correct IP address

### OAuth Errors
- Verify redirect URIs match exactly
- Check client IDs and secrets
- Ensure scopes are correct

### CORS Issues
- Server includes CORS headers
- Check frontend origin is allowed
- Verify request headers

## License

MIT
