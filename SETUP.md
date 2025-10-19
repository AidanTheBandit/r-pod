# 🎵 R-Pod Music Aggregator - Setup Guide

A production-ready iPod-style music player for the Rabbit R1 device with support for multiple streaming services.

## 🚀 Quick Start

### Automated Setup (Recommended)

```bash
# Clone and setup everything automatically
git clone https://github.com/AidanTheBandit/r-pod.git
cd r-pod

# Run automated setup
./setup.sh

# Edit configuration files with your settings
nano backend-python/.env
nano .env.local

# Start services
./start-backend.sh
npm run dev
```

### Manual Setup

```bash
# Install dependencies
npm install
cd backend-python && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Configure environment
cp backend-python/.env.example backend-python/.env
cp .env.example .env.local

# Start development server
npm run dev
```

## 🔧 Backend Configuration

### Environment Variables (backend-python/.env)

```bash
# Server Configuration
PORT=3451
HOST=0.0.0.0

# Security (REQUIRED - Change this!)
SERVER_PASSWORD=your-super-secure-password-here

# YouTube Music (Required for music playback)
YOUTUBE_MUSIC_COOKIE=your-full-youtube-music-cookie-here
YOUTUBE_MUSIC_BRAND_ACCOUNT_ID=your-brand-account-id

# Spotify (Optional)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Jellyfin (Optional)
JELLYFIN_SERVER_URL=https://your-jellyfin-server.com
JELLYFIN_API_KEY=your-jellyfin-api-key

# Subsonic/Navidrome (Optional)
SUBSONIC_SERVER_URL=https://your-subsonic-server.com
SUBSONIC_USERNAME=your-username
SUBSONIC_PASSWORD=your-password

# Cache Settings
CACHE_TTL=3600

# CORS (Allow all for internet hosting)
CORS_ORIGINS=["*"]
```

### Getting YouTube Music Cookie

1. **Open Chrome and go to** `https://music.youtube.com`
2. **Log in** to your YouTube Music account
3. **Open Developer Tools** (F12) → Network tab
4. **Filter for** `browse` requests
5. **Click any browse request** → Request Headers
6. **Copy the entire `cookie:` value** (very long string)
7. **Paste into** `YOUTUBE_MUSIC_COOKIE` in your `.env`

### YouTube Bot Protection Setup (Required)

YouTube requires **PO tokens** to bypass bot protection. Install the automatic provider:

```bash
# Install dependencies (included in requirements.txt)
cd backend-python
pip install yt-dlp-get-pot bgutil-ytdlp-pot-provider

# Run PO token provider:
docker run --name bgutil-provider -d -p 4416:4416 --init brainicism/bgutil-ytdlp-pot-provider

# Verify:
yt-dlp -v https://www.youtube.com/watch?v=dIdiuPPD69E
# Should show: [debug] [youtube] [pot] PO Token Providers: bgutil:http-1.1.0 (external)
```

## 🎨 Frontend Configuration

### Environment Variables (.env.local)

```bash
# Backend Configuration (leave empty for manual entry)
VITE_BACKEND_URL=
VITE_BACKEND_PASSWORD=your-super-secure-password-here
```

**Important**: Leave `VITE_BACKEND_URL` empty so users must manually enter their backend URL. This allows you to host the frontend publicly while keeping your backend private.

## 🏠 Hosting Options

### Development

```bash
# Start both services
./start-backend.sh
npm run dev

# Frontend: http://localhost:3450
# Backend: http://localhost:3451
```

### Production Server

#### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend-python
pm2 start "source venv/bin/activate && python main.py" --name music-backend

# Start frontend (built)
cd ..
npm run build
pm2 serve dist/ 3450 --name music-frontend --spa

# Save configuration
pm2 save
pm2 startup
```

#### Using Systemd Services

**Backend Service** (`/etc/systemd/system/music-backend.service`):

```ini
[Unit]
Description=Music Aggregator Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/r-pod/backend-python
ExecStart=/path/to/r-pod/backend-python/venv/bin/python main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Frontend Service** (`/etc/systemd/system/music-frontend.service`):

```ini
[Unit]
Description=Music Aggregator Frontend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/r-pod
ExecStart=/usr/bin/npm run preview -- --port 3450 --host
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start services
sudo systemctl enable music-backend music-frontend
sudo systemctl start music-backend music-frontend
```

### Docker Deployment

#### Docker Compose (Full Stack)

```yaml
version: '3.8'

services:
  backend:
    build: ./backend-python
    ports:
      - "3451:3451"
    env_file:
      - ./backend-python/.env
    volumes:
      - ./backend-python:/app
    restart: unless-stopped

  frontend:
    build: .
    ports:
      - "3450:3450"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

```bash
# Deploy
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🔒 Security Configuration

### Password Security

```bash
# Generate strong password
openssl rand -base64 32

# Update in both .env files
SERVER_PASSWORD=generated-strong-password
VITE_BACKEND_PASSWORD=generated-strong-password
```

### HTTPS Setup (Required for Production)

#### Using Certbot (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Certificates auto-renew
sudo certbot renew --dry-run
```

#### Nginx Reverse Proxy Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend (static files)
    location / {
        proxy_pass http://localhost:3450;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3451;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Backend password from environment
        proxy_set_header x-server-password $BACKEND_PASSWORD;
    }
}
```

### Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 🎵 Service Integration

### Spotify Setup

1. **Create Spotify App**: https://developer.spotify.com/dashboard
2. **Set Redirect URI**: `http://yourdomain.com/callback/spotify`
3. **Copy credentials** to `.env`
4. **Test connection** in the app settings

### Jellyfin/Navidrome Setup

```bash
# Environment variables
JELLYFIN_SERVER_URL=https://your-server.com:8096
JELLYFIN_API_KEY=your-api-key-here

# OR for Navidrome
SUBSONIC_SERVER_URL=https://your-server.com
SUBSONIC_USERNAME=your-username
SUBSONIC_PASSWORD=your-password
```

## 🧹 Cleanup & Optimization

Run the cleanup script to optimize for production:

```bash
./cleanup.sh
```

This removes:
- Development cache files
- Python bytecode
- Log files
- Git history (optional)
- Unused documentation
- IDE files

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check Python environment
cd backend-python
source venv/bin/activate
python -c "import fastapi; print('FastAPI OK')"

# Check environment variables
python -c "import os; print(os.environ.get('SERVER_PASSWORD', 'NOT SET'))"

# Check port availability
netstat -tlnp | grep 3451
```

### Frontend Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version
npm --version
```

### Service Connection Issues

```bash
# Test YouTube Music
curl "http://localhost:3451/api/debug/accounts?sessionId=test" \
  -H "x-server-password:your-password"

# Test backend health
curl -H "x-server-password:your-password" http://localhost:3451/health
```

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

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run host-frontend # Host frontend only
npm run host-backend  # Host backend only
npm run host-both    # Host both services
```

## 🎯 Final Checklist

- [ ] Backend environment configured with secure password
- [ ] YouTube Music cookie obtained and configured
- [ ] PO token provider running for YouTube bot protection
- [ ] Frontend environment configured
- [ ] Services tested and working
- [ ] HTTPS configured for production
- [ ] Firewall configured
- [ ] Cleanup script run for optimization

**Your music aggregator is now ready!** 🎵

For additional help, check the [GitHub Issues](https://github.com/AidanTheBandit/r-pod/issues).</content>
<parameter name="filePath">/workspaces/r-pod/SETUP.md