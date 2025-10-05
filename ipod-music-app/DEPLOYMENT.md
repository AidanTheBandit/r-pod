# 🚀 Quick Deployment Guide

## Frontend Deployment to R1 Device

### Step 1: Install Dependencies
```bash
cd ipod-music-app
npm install
```

### Step 2: Build for Production
```bash
npm run build
```

### Step 3: Deploy to R1
The build output is in the `dist/` folder. Transfer these files to your R1 device:

```bash
# Option 1: Use rabbit-cli (if available)
rabbit-cli deploy dist/

# Option 2: Manual transfer via web interface
# 1. Zip the dist folder
# 2. Upload through R1 web interface
# 3. Extract on device
```

### Step 4: Test on Device
Navigate to the app on your R1 device and test:
- Scroll wheel navigation
- PTT button selection
- Main menu navigation
- Settings configuration

## Backend Server Deployment

### Option 1: Local Development

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

Server will run on `http://localhost:3001`

### Option 2: Docker Deployment

```bash
cd backend

# Build and run with docker-compose
docker-compose up -d

# Or manually
docker build -t ipod-music-backend .
docker run -p 3001:3001 --env-file .env ipod-music-backend
```

### Option 3: Cloud Deployment

**Heroku:**
```bash
heroku create ipod-music-backend
heroku config:set SERVER_PASSWORD=your-password
heroku config:set SPOTIFY_CLIENT_ID=your-client-id
# ... set other vars
git push heroku main
```

**DigitalOcean/AWS/GCP:**
1. Create a VM instance
2. Install Node.js 20+
3. Clone repository
4. Copy .env file
5. Run `npm install && npm start`
6. Use PM2 for process management: `pm2 start server.js`

**Railway/Render/Fly.io:**
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically

## Configuration After Deployment

### Frontend Configuration

1. Open the app on your R1 device
2. Navigate to **Settings**
3. Configure your preferred method:

#### Method A: Backend Server
- Toggle "Use Backend Server"
- Enter server URL: `http://your-server-ip:3001`
- Enter server password
- Click "Test Connection"

#### Method B: Direct OAuth (BYOK)
- Select a service (e.g., Spotify)
- Enter Client ID and Client Secret
- Click "Connect with OAuth"
- Complete authorization

### Backend Configuration

Edit `backend/.env`:

```env
# Server
PORT=3001
SERVER_PASSWORD=change-this-password

# Spotify
SPOTIFY_CLIENT_ID=your-client-id-here
SPOTIFY_CLIENT_SECRET=your-client-secret-here
SPOTIFY_REDIRECT_URI=http://your-server:3001/callback/spotify

# Add other services as needed
```

Restart backend after changes:
```bash
# Docker
docker-compose restart

# Direct
npm restart

# PM2
pm2 restart server
```

## Getting OAuth Credentials

### Spotify
1. Visit https://developer.spotify.com/dashboard
2. Create new app
3. Add redirect URI: `http://your-server:3001/callback/spotify`
4. Copy Client ID and Secret

### Apple Music
1. Join Apple Developer Program
2. Create MusicKit identifier
3. Generate private key
4. Save key to `backend/keys/AuthKey_XXXXX.p8`
5. Note Team ID and Key ID

### YouTube Music
1. Visit https://console.cloud.google.com
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI
5. Copy Client ID and Secret

## Verification Checklist

### Frontend
- [ ] App loads on R1 device
- [ ] Scroll wheel navigates lists
- [ ] PTT button selects items
- [ ] Back navigation works
- [ ] Settings accessible

### Backend (if using)
- [ ] Health check responds: `curl http://your-server:3001/health`
- [ ] Test connection works from frontend
- [ ] OAuth redirects work
- [ ] Services can authenticate

### Services
- [ ] At least one service configured
- [ ] Service shows as "Connected" in settings
- [ ] Library data loads (playlists/albums/songs)
- [ ] Search returns results
- [ ] Playback works

## Troubleshooting

### App won't load on R1
- Check dist/ files are properly transferred
- Verify index.html is in root of deployment
- Check R1 console for JavaScript errors

### Backend connection fails
- Verify server is running: `curl http://server:3001/health`
- Check firewall allows port 3001
- Ensure SERVER_PASSWORD matches in both ends
- Verify IP address/domain is correct

### OAuth fails
- Redirect URIs must match exactly (http vs https, trailing slash)
- Check client ID and secret are correct
- Verify scopes are appropriate
- Check token hasn't expired

### No audio playback
- Spotify only provides 30s previews without SDK
- Check stream URL is accessible
- Verify CORS allows audio requests
- Test with different browser/device

## Production Considerations

### Security
- Use HTTPS for backend in production
- Change default passwords
- Don't commit .env files
- Rotate tokens regularly
- Use environment variables

### Performance
- Enable backend caching (already configured)
- Use CDN for frontend assets
- Optimize images/album art
- Monitor API rate limits

### Monitoring
- Backend logs: `tail -f logs/server.log`
- Docker logs: `docker logs ipod-music-backend -f`
- PM2 logs: `pm2 logs server`
- Health endpoint: Monitor `/health`

## Support

If you encounter issues:

1. Check logs (frontend console, backend logs)
2. Review documentation in README.md
3. Test with demo data first
4. Verify all environment variables are set
5. Try minimal configuration (one service only)

## Next Steps

After successful deployment:

1. **Add Services**: Configure additional music services
2. **Customize**: Adjust styling and themes
3. **Extend**: Implement video streaming support
4. **Optimize**: Add offline caching
5. **Share**: Contribute improvements back to the project

🎉 **Enjoy your iPod-style music player on R1!**
