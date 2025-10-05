# 🎵 Advanced Self-Hosting Guide for Universal Music Aggregator

This guide provides comprehensive instructions for self-hosting the Universal Music Aggregator application, including setup, deployment, security, and cleanup procedures.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Hosting Options](#hosting-options)
- [Security Configuration](#security-configuration)
- [Service Integration](#service-integration)
- [Cleanup & Optimization](#cleanup--optimization)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## 🔧 Prerequisites

### System Requirements

- **Node.js**: 18+ (LTS recommended)
- **Python**: 3.8+ (for backend)
- **Git**: Latest version
- **Docker**: Optional, for containerized deployment
- **Nginx/Apache**: Optional, for reverse proxy

### Network Requirements

- **Outbound**: HTTPS access to music service APIs
- **Inbound**: HTTP/HTTPS for your server
- **Ports**: 3450 (frontend), 3451 (backend) - configurable

### Hardware Requirements

- **RAM**: 512MB minimum, 1GB recommended
- **Storage**: 100MB for application, plus music cache
- **CPU**: 1 core minimum, 2+ cores recommended

## 🚀 Quick Start

### One-Command Setup (Development)

```bash
# Clone and setup everything
git clone https://github.com/AidanTheBandit/r-pod.git
cd r-pod
npm install
cd backend-python && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
cd ..
npm run host-both
```

### Production Setup

```bash
# 1. Clone repository
git clone https://github.com/AidanTheBandit/r-pod.git
cd r-pod

# 2. Setup backend
cd backend-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your services

# 3. Setup frontend
cd ..
npm install
cp .env.example .env.local  # Configure frontend

# 4. Build and start
npm run host-both
```

## 🖥️ Backend Setup

### Python Environment Setup

```bash
# Create virtual environment
cd backend-python
python3 -m venv venv

# Activate environment
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi, uvicorn, ytmusicapi; print('✅ All dependencies installed')"
```

### Environment Configuration

Create `.env` file in `backend-python/` directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=3451
HOST=0.0.0.0

# Security (CHANGE THIS!)
SERVER_PASSWORD=your-super-secure-password-here

# YouTube Music (Required for music playback)
YOUTUBE_MUSIC_COOKIE=your-full-youtube-music-cookie-here
YOUTUBE_MUSIC_PROFILE=1
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
3. **Open Developer Tools** (F12)
4. **Go to Network tab**
5. **Filter for** `browse` requests
6. **Click any browse request**
7. **Scroll to Request Headers**
8. **Copy the entire `cookie:` value** (very long string)
9. **Paste into** `YOUTUBE_MUSIC_COOKIE` in your `.env`

### Testing Backend

```bash
# Activate virtual environment
cd backend-python
source venv/bin/activate

# Start server
python main.py

# Test health endpoint
curl http://localhost:3451/health

# Test with password
curl -H "x-server-password:your-password" http://localhost:3451/health
```

## 🎨 Frontend Setup

### Node.js Dependencies

```bash
# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### Environment Configuration

Create `.env.local` file in root directory:

```bash
# Backend Configuration (leave empty for manual entry)
VITE_BACKEND_URL=
VITE_BACKEND_PASSWORD=your-super-secure-password-here
```

**Important**: Leave `VITE_BACKEND_URL` empty so users must manually enter their backend URL. This allows you to host the frontend publicly while keeping your backend private.

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview -- --port 3000 --host

# The built files are in ./dist/
```

## 🏠 Hosting Options

### Option 1: Local Development

```bash
# Start both services
npm run host-both

# Frontend: http://localhost:3450
# Backend: http://localhost:3451
```

### Option 2: Production Server (Recommended)

#### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend-python
pm2 start "source venv/bin/activate && python main.py" --name music-backend

# Start frontend (built)
cd ..
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

### Option 3: Docker Deployment

#### Single Container (Backend Only)

```dockerfile
# backend-python/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3451

CMD ["python", "main.py"]
```

```bash
# Build and run
cd backend-python
docker build -t music-backend .
docker run -d -p 3451:3451 --env-file .env --name music-backend music-backend
```

#### Docker Compose (Full Stack)

```yaml
# docker-compose.yml
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

### Option 4: Cloud Hosting

#### Railway (Recommended)

1. **Connect GitHub repository**
2. **Add environment variables** in Railway dashboard
3. **Deploy automatically**

#### Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
vercel --prod

# Set environment variables in Vercel dashboard
# VITE_BACKEND_URL: (leave empty)
# VITE_BACKEND_PASSWORD: your-password
```

#### DigitalOcean App Platform

1. **Create app from GitHub**
2. **Configure environment variables**
3. **Set build command**: `npm run build`
4. **Set output directory**: `dist`

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
# /etc/nginx/sites-available/music-app
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

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

# Verify
sudo ufw status
```

## 🎵 Service Integration

### YouTube Music Setup

#### Account Selection

If you have multiple Google accounts, find which one has your music:

```bash
# Test accounts via API
curl "http://localhost:3451/api/debug/accounts?sessionId=test" \
  -H "x-server-password:your-password"
```

Look for the account with your preferred music library and set `YOUTUBE_MUSIC_PROFILE` accordingly.

#### Cookie Refresh

YouTube cookies expire. Refresh them:

1. Follow the cookie extraction steps again
2. Update `YOUTUBE_MUSIC_COOKIE` in your `.env`
3. Restart the backend service

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

### Remove Development Files

```bash
# Remove unnecessary files
rm -rf node_modules/.cache
rm -rf backend-python/__pycache__
rm -rf .git
find . -name "*.log" -delete
find . -name "*.tmp" -delete

# Remove development dependencies
npm prune --production

# Clean Python cache
find backend-python -name "__pycache__" -type d -exec rm -rf {} +
find backend-python -name "*.pyc" -delete
```

### Optimize Production Build

```bash
# Create optimized build
npm run build

# Compress static files
gzip -9 dist/assets/*.js
gzip -9 dist/assets/*.css

# Minify further if needed
npx terser dist/assets/*.js -o dist/assets/*.min.js --compress --mangle
```

### Database Cleanup (if using SQLite)

```bash
# Vacuum database to reclaim space
sqlite3 database.db "VACUUM;"

# Analyze for optimization
sqlite3 database.db "ANALYZE;"
```

### Log Rotation

```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/music-app

# Add configuration:
/var/log/music-app/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 your-user your-user
    postrotate
        systemctl reload music-app
    endscript
}
```

### Backup Configuration

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/music-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup environment files
tar -czf $BACKUP_DIR/env_$DATE.tar.gz \
    backend-python/.env \
    .env.local

# Backup database if exists
if [ -f "backend-python/database.db" ]; then
    cp backend-python/database.db $BACKUP_DIR/database_$DATE.db
fi

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh
```

### System Optimization

```bash
# Disable unnecessary services
sudo systemctl disable bluetooth.service
sudo systemctl disable avahi-daemon.service

# Optimize kernel parameters
echo "net.core.somaxconn=1024" | sudo tee -a /etc/sysctl.conf
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Setup swap file if needed
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 🔧 Troubleshooting

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

# View logs
python main.py 2>&1 | tee backend.log
```

### Frontend Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version
npm --version

# Build with verbose output
npm run build --verbose
```

### CORS Issues

```bash
# Check CORS configuration
curl -H "Origin: https://yourdomain.com" \
     -H "x-server-password:your-password" \
     -v http://localhost:3451/health
```

### Service Connection Issues

```bash
# Test YouTube Music
curl "http://localhost:3001/api/debug/auth?sessionId=test" \
  -H "x-server-password:your-password"

# Test Spotify
curl "http://localhost:3001/api/services/connect" \
  -H "x-server-password:your-password" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","service":"spotify","credentials":{}}'
```

### Performance Issues

```bash
# Monitor system resources
top -p $(pgrep -f "python main.py")
htop

# Check memory usage
ps aux --sort=-%mem | head

# Monitor network
sudo nload

# Check disk I/O
iotop -o
```

## ⚙️ Advanced Configuration

### Custom Nginx Configuration

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

server {
    # ... existing config ...

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        # ... existing proxy config ...
    }

    # Auth stricter limiting
    location ~ ^/api/(services/connect|auth) {
        limit_req zone=auth burst=5 nodelay;
        # ... existing proxy config ...
    }
}
```

### Monitoring Setup

```bash
# Install monitoring
sudo apt install prometheus-node-exporter
sudo systemctl enable prometheus-node-exporter

# Setup health checks
cat > healthcheck.sh << 'EOF'
#!/bin/bash
# Health check script
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# Check backend
if curl -f -H "x-server-password:$BACKEND_PASSWORD" $BACKEND_URL/health > /dev/null 2>&1; then
    echo "✅ Backend healthy"
else
    echo "❌ Backend unhealthy"
    exit 1
fi

# Check frontend
if curl -f $FRONTEND_URL > /dev/null 2>&1; then
    echo "✅ Frontend healthy"
else
    echo "❌ Frontend unhealthy"
    exit 1
fi
EOF

chmod +x healthcheck.sh
```

### Load Balancing (Multiple Instances)

```nginx
upstream backend_cluster {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    # ... existing config ...

    location /api/ {
        proxy_pass http://backend_cluster;
        # ... existing config ...
    }
}
```

### Database Migration (Future)

```bash
# Export current data
python -c "
import json
# Export logic here
"

# Import to new database
python -c "
import json
# Import logic here
"
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

```bash
# Weekly tasks
0 2 * * 1 /path/to/backup.sh
0 3 * * 1 /path/to/cleanup.sh

# Monthly tasks
0 4 1 * * certbot renew
0 5 1 * * /path/to/optimize.sh
```

### Monitoring Commands

```bash
# Check service status
sudo systemctl status music-backend music-frontend

# View recent logs
journalctl -u music-backend -n 50
journalctl -u music-frontend -n 50

# Monitor resource usage
sudo htop
df -h
free -h
```

### Emergency Recovery

```bash
# Quick restart all services
sudo systemctl restart music-backend music-frontend

# Restore from backup
cd /var/backups/music-app
ls -la *.tar.gz | tail -1
# Extract latest backup
tar -xzf $(ls -t *.tar.gz | head -1)
```

---

## 🎯 Final Checklist

- [ ] Backend environment configured
- [ ] Frontend environment configured
- [ ] YouTube Music cookie obtained
- [ ] Password changed from default
- [ ] HTTPS configured
- [ ] Firewall configured
- [ ] Services tested
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Documentation updated

**Your music aggregator is now ready for production!** 🎵

For additional help, check the [GitHub Issues](https://github.com/AidanTheBandit/r-pod/issues) or community forums.</content>
<parameter name="filePath">/Users/aidanpds/Downloads/r1-ipod-ui-plugin/SELF_HOSTING_GUIDE.md