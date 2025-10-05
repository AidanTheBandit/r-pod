# 🚀 Production Deployment Checklist

## Pre-Deployment

### ✅ Environment Setup
- [ ] Set production environment variables in `.env.production`
- [ ] Configure CORS_ORIGIN for your domain
- [ ] Set secure SERVER_PASSWORD
- [ ] Configure VITE_BACKEND_URL in frontend

### ✅ Security
- [ ] Change default SERVER_PASSWORD
- [ ] Set up HTTPS certificates
- [ ] Configure firewall rules
- [ ] Review CORS settings
- [ ] Enable nginx security headers

### ✅ Dependencies
- [ ] Install Node.js 20+ on server
- [ ] Install Docker (optional)
- [ ] Install nginx (optional)

## Backend Deployment

### ✅ Build & Test
- [ ] Run `npm install` in backend directory
- [ ] Test server startup: `node server.js`
- [ ] Verify health endpoint: `curl http://localhost:3001/health`
- [ ] Test service connections manually

### ✅ Docker Deployment (Option 1)
- [ ] Build image: `docker build -t music-aggregator ./backend`
- [ ] Run container: `docker run -d -p 3001:3001 --env-file .env.production music-aggregator`
- [ ] Verify container health

### ✅ Direct Deployment (Option 2)
- [ ] Copy backend files to server
- [ ] Install PM2: `npm install -g pm2`
- [ ] Start with PM2: `pm2 start server.js --name music-aggregator`
- [ ] Configure PM2 startup script

## Frontend Deployment

### ✅ Build
- [ ] Run `./build.sh` to build production assets
- [ ] Verify `dist/` folder contains built files
- [ ] Test build locally: `npx serve dist`

### ✅ Web Server Setup
- [ ] Copy `dist/` contents to web server root
- [ ] Configure nginx with provided `nginx.conf`
- [ ] Set up SSL certificates
- [ ] Test frontend loads correctly

### ✅ Reverse Proxy (nginx)
- [ ] Install nginx on server
- [ ] Copy `nginx.conf` to `/etc/nginx/nginx.conf`
- [ ] Update server_name and SSL paths
- [ ] Test configuration: `nginx -t`
- [ ] Reload nginx: `nginx -s reload`

## Service Configuration

### ✅ Spotify Setup
- [ ] Create Spotify app at developer.spotify.com
- [ ] Configure redirect URIs
- [ ] Note Client ID and Secret
- [ ] Test connection in Settings

### ✅ YouTube Music Setup
- [ ] Document cookie extraction process
- [ ] Test cookie validity
- [ ] Implement cookie refresh mechanism

### ✅ FOSS Services
- [ ] Document server URL formats
- [ ] Test Jellyfin API key generation
- [ ] Verify Subsonic/Navidrome compatibility

## Testing

### ✅ Functionality Tests
- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] Settings page accessible
- [ ] Service connections work
- [ ] Music playback functional
- [ ] Search returns results

### ✅ Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] Memory usage stable
- [ ] No console errors

### ✅ Security Tests
- [ ] HTTPS enabled
- [ ] No sensitive data in logs
- [ ] CORS properly configured
- [ ] Authentication required for API

## Monitoring & Maintenance

### ✅ Logging
- [ ] Configure log rotation
- [ ] Set up log aggregation
- [ ] Monitor error rates
- [ ] Track API usage

### ✅ Backups
- [ ] Database backups (if applicable)
- [ ] Configuration backups
- [ ] SSL certificate renewal

### ✅ Updates
- [ ] Monitor for security updates
- [ ] Plan update procedures
- [ ] Test updates in staging

## User Documentation

### ✅ Setup Guide
- [ ] Service connection instructions
- [ ] Troubleshooting guide
- [ ] FAQ document
- [ ] Contact information

### ✅ Admin Documentation
- [ ] Deployment procedures
- [ ] Configuration options
- [ ] Backup procedures
- [ ] Monitoring guides

## Go-Live Checklist

### ✅ Final Verification
- [ ] All services tested and working
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] User acceptance testing complete
- [ ] Rollback plan documented

### ✅ Launch
- [ ] Update DNS records
- [ ] Enable monitoring alerts
- [ ] Notify users of launch
- [ ] Monitor initial usage

### ✅ Post-Launch
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Plan feature updates
- [ ] Schedule maintenance windows

## Emergency Procedures

### ✅ Incident Response
- [ ] Document escalation procedures
- [ ] Define severity levels
- [ ] Create communication plan
- [ ] Test incident response

### ✅ Rollback Plan
- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Define rollback triggers
- [ ] Backup current state

---

## Quick Deployment Commands

```bash
# Backend
cd backend
npm install
NODE_ENV=production node server.js

# Frontend
npm run build
cp -r dist/* /var/www/html/

# Docker
docker-compose --profile production up -d

# PM2
pm2 start backend/server.js --name music-aggregator
pm2 save
pm2 startup
```

## Health Checks

```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl -I http://your-domain.com

# Docker
docker ps
docker logs music-aggregator-backend
```

## Common Issues & Solutions

### Backend Won't Start
- Check Node.js version: `node --version`
- Verify environment variables
- Check port availability: `lsof -i :3001`

### Frontend Shows Blank Page
- Check build output in `dist/`
- Verify nginx configuration
- Check browser console for errors

### Service Connections Fail
- Verify API credentials
- Check service API status
- Review backend logs

### Performance Issues
- Enable nginx gzip compression
- Configure caching headers
- Monitor resource usage