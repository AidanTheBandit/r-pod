# Auto-Detection Configuration Guide

## Overview

The R-Pod system now **automatically detects** the backend URL based on where you're accessing it from. No more hardcoded URLs!

## How Auto-Detection Works

### Development (localhost)
```
Accessing from: http://localhost:5173
↓
Auto-detects: http://localhost:8000 (backend)
              http://localhost:3000 (pairing)
```

### LAN/IP Address
```
Accessing from: http://192.168.1.100:5173
↓
Auto-detects: http://192.168.1.100:8000 (backend)
              http://192.168.1.100:3000 (pairing)
```

### Production Domain
```
Accessing from: https://r-pod.example.com
↓
Auto-detects: https://r-pod.example.com (backend - no port)
              https://pair.example.com (pairing subdomain)
```

## Configuration Priority

The system checks in this order:

1. **Environment Variable** (`.env.local`)
   - If `VITE_BACKEND_URL` is set, use it
   - Useful for override or testing

2. **localStorage** (Settings)
   - If user has saved custom backend config
   - Persists across sessions

3. **Auto-Detection** (default)
   - Based on current hostname
   - Works everywhere automatically

## Deployment Scenarios

### Scenario 1: Development (Default)

No configuration needed! Just run:
```bash
./start-all.sh
```

Access from:
- R1 Frontend: http://localhost:5173
- Pairing Client: http://localhost:3000
- Backend API: http://localhost:8000

Everything auto-connects!

### Scenario 2: LAN Testing (R1 Device or Phone)

1. Find your computer's IP:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# Example: 192.168.1.100
```

2. Start services:
```bash
./start-all.sh
```

3. Access from phone/R1:
```
http://192.168.1.100:5173
```

Auto-detects:
- Backend: `http://192.168.1.100:8000`
- Pairing: `http://192.168.1.100:3000`

**No configuration changes needed!**

### Scenario 3: Production with Reverse Proxy

#### Architecture
```
Internet
  ↓
Nginx Reverse Proxy
  ↓
  ├─ r-pod.example.com → Frontend (port 5173 or static)
  ├─ r-pod.example.com/api → Backend (port 8000)
  └─ pair.example.com → Pairing Client (port 3000)
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/r-pod`:

```nginx
# Main R-Pod Frontend
server {
    listen 80;
    listen [::]:80;
    server_name r-pod.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name r-pod.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/r-pod.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/r-pod.example.com/privkey.pem;

    # Frontend (Vite build)
    location / {
        root /var/www/r-pod/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}

# Pairing Client Subdomain
server {
    listen 80;
    listen [::]:80;
    server_name pair.r-pod.example.com;

    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pair.r-pod.example.com;

    ssl_certificate /etc/letsencrypt/live/pair.r-pod.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pair.r-pod.example.com/privkey.pem;

    # Pairing Client
    location / {
        root /var/www/r-pod/pairing-client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

#### Build for Production

```bash
# Build frontend
npm run build

# Build pairing client
cd pairing-client
npm run build
cd ..

# Copy to web root
sudo mkdir -p /var/www/r-pod
sudo cp -r dist /var/www/r-pod/
sudo cp -r pairing-client/dist /var/www/r-pod/pairing-client/

# Set permissions
sudo chown -R www-data:www-data /var/www/r-pod
```

#### Run Backend as Service

Create `/etc/systemd/system/r-pod-backend.service`:

```ini
[Unit]
Description=R-Pod Backend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/r-pod/backend-python
Environment="PATH=/var/www/r-pod/backend-python/venv/bin"
ExecStart=/var/www/r-pod/backend-python/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable r-pod-backend
sudo systemctl start r-pod-backend
sudo systemctl status r-pod-backend
```

#### SSL Certificates (Let's Encrypt)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d r-pod.example.com
sudo certbot --nginx -d pair.r-pod.example.com

# Auto-renewal is configured automatically
```

#### Access in Production

Users visit:
- **https://r-pod.example.com** (R1 app)
- **https://pair.r-pod.example.com** (pairing)

Auto-detection works:
- Frontend detects it's on `r-pod.example.com`
- Connects to backend at `https://r-pod.example.com/api`
- QR codes point to `https://pair.r-pod.example.com`

**No .env configuration needed!**

### Scenario 4: Docker Deployment

#### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend-python
    ports:
      - "8000:8000"
    environment:
      - SERVER_PASSWORD=${SERVER_PASSWORD}
      - HOST=0.0.0.0
      - PORT=8000
    volumes:
      - ./backend-python/.env:/app/.env
    restart: unless-stopped

  frontend:
    build: .
    ports:
      - "5173:80"
    depends_on:
      - backend
    restart: unless-stopped

  pairing:
    build: ./pairing-client
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
      - pairing
    restart: unless-stopped
```

## Manual Override (Optional)

If you need to override auto-detection:

### Frontend Override

Create `.env.local`:
```env
VITE_BACKEND_URL=https://custom-backend.example.com
VITE_PAIRING_URL=https://custom-pairing.example.com
VITE_BACKEND_PASSWORD=your-password
```

### Runtime Override (Settings)

Users can also configure manually:
1. Go to Settings → Backend Server
2. Enter custom URL and password
3. Save - persists in localStorage

## Testing Auto-Detection

### Test on Different Hosts

```bash
# Terminal 1: Start services
./start-all.sh

# Terminal 2: Test localhost
curl http://localhost:5173
# Should work

# Terminal 3: Test IP (from another machine)
curl http://YOUR_IP:5173
# Should work

# Check browser console for detected URLs
# Should see: [Config] Auto-detected configuration: {...}
```

### Verify Detection Logic

Open browser console on R1 app:
```javascript
// Check detected config
console.log(import('../config.js'))

// Current hostname
console.log(window.location.hostname)

// Detected backend
console.log(localStorage.getItem('backend-config'))
```

## Troubleshooting

### Auto-Detection Not Working

**Symptom**: App can't connect to backend

**Solution**:
1. Check browser console for errors
2. Look for `[Config] Auto-detected configuration` log
3. Verify backend is actually running:
   ```bash
   curl http://localhost:8000/health
   ```
4. Try manual override in `.env.local`

### Pairing URL Wrong in QR Code

**Symptom**: QR code points to wrong URL

**Solution**:
1. Check `getPairingUrl()` logic in `src/config.js`
2. Override with environment variable:
   ```env
   VITE_PAIRING_URL=http://correct-url:3000
   ```

### Production: Backend Gets Port Number

**Symptom**: Frontend tries `https://example.com:8000`

**Cause**: Auto-detection adds port for IP addresses

**Solution**: Use domain name, not IP, in production
- ✅ `https://r-pod.example.com`
- ❌ `https://123.456.789.0`

## Best Practices

### Development
✅ Use auto-detection (no .env needed)
✅ Access via `localhost` for simplicity

### Testing on Device
✅ Use auto-detection with IP address
✅ No configuration changes needed
✅ Just access `http://YOUR_IP:5173`

### Production
✅ Use domain names (not IP)
✅ Use reverse proxy (nginx)
✅ Let auto-detection handle URLs
✅ No hardcoded URLs in code

### Security
✅ Always use HTTPS in production
✅ Set strong `SERVER_PASSWORD` in backend
✅ Restrict CORS to specific domains
✅ Keep backend `.env` private

## Summary

**Key Benefits**:
- 🚀 Works out of the box (localhost)
- 📱 Works on LAN without config (IP addresses)
- 🌐 Works in production (domains)
- 🔧 Can be overridden if needed
- 🎯 One codebase for all environments

**No more hardcoded URLs!** The system adapts to wherever it's running.
