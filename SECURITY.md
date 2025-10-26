# R-Pod Security Guide

## 🔒 Security Overview

This guide explains how to securely configure R-Pod with sensitive credentials like API keys, cookies, and passwords. **Never commit sensitive credentials to version control.**

## ✅ Security Status

### Backend Code Audit

All backend Python code has been audited and confirmed to be **free of hardcoded credentials**:

- ✅ No hardcoded API keys
- ✅ No hardcoded cookies
- ✅ No hardcoded passwords
- ✅ All sensitive data loaded from environment variables
- ✅ `.env` files properly ignored in `.gitignore`

### Protected Files

The following files contain sensitive data and **must never be committed**:

```
.env                          # Backend credentials
.env.local                    # Frontend credentials
backend-python/.env          # Backend environment config
headers_auth.json            # YouTube Music authentication
```

These are already included in `.gitignore`.

---

## 🔐 Environment Variables Setup

### Step 1: Backend Configuration

1. **Navigate to the backend directory:**
   ```bash
   cd backend-python
   ```

2. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit the `.env` file with your secure credentials:**
   ```bash
   nano .env  # or use your preferred editor
   ```

4. **Required settings:**
   ```bash
   # CRITICAL: Change this to a strong, random password
   SERVER_PASSWORD=your-strong-random-password-here
   
   # Server configuration
   HOST=0.0.0.0
   PORT=3451
   
   # CORS settings (restrict in production)
   CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
   ```

### Step 2: Frontend Configuration

1. **Navigate to the root directory:**
   ```bash
   cd ..
   ```

2. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Edit the `.env.local` file:**
   ```bash
   nano .env.local
   ```

4. **Configure frontend settings:**
   ```bash
   # Backend connection
   VITE_BACKEND_URL=http://localhost:3451
   VITE_BACKEND_PASSWORD=your-strong-random-password-here
   ```

   **Important:** The `VITE_BACKEND_PASSWORD` must match the `SERVER_PASSWORD` in `backend-python/.env`.

---

## 🎵 Service-Specific Configuration

### YouTube Music Setup

YouTube Music requires cookie-based authentication for full access to your library.

#### Method 1: Browser Cookie (Recommended)

1. **Open Chrome/Firefox** and navigate to https://music.youtube.com
2. **Log in** to your YouTube Music account
3. **Open Developer Tools** (F12 or Cmd+Option+I)
4. **Go to the Network tab**
5. **Filter by "browse"** requests
6. **Click on any `/browse` request**
7. **Find the "Cookie" header** in Request Headers
8. **Copy the entire cookie value** (it's very long, ~2000+ characters)
9. **Add to `backend-python/.env`:**
   ```bash
   YOUTUBE_MUSIC_COOKIE=your-very-long-cookie-string-here
   ```

#### Method 2: Official Headers Auth File (Most Reliable)

For the most reliable authentication that works with all endpoints:

1. **Install ytmusicapi tools:**
   ```bash
   cd backend-python
   source venv/bin/activate
   pip install ytmusicapi
   ```

2. **Run the setup wizard:**
   ```bash
   ytmusicapi oauth
   ```

3. **Follow the prompts:**
   - Open the authorization URL in your browser
   - Grant permissions
   - Copy the authorization code
   - Paste it back in the terminal

4. **This creates `headers_auth.json`** in the `backend-python` directory
5. **The backend will automatically detect and use this file**

   **Security Note:** The `headers_auth.json` file is automatically ignored by `.gitignore`.

#### Brand Account Configuration (Optional)

If you have multiple YouTube accounts or a brand account:

1. **Find your brand account ID:**
   - Go to https://myaccount.google.com
   - Switch to your brand account
   - The account ID is in the URL: `...?hl=en&authuser=0&pageId=YOUR_BRAND_ID`

2. **Add to `.env`:**
   ```bash
   YOUTUBE_MUSIC_BRAND_ACCOUNT_ID=your-brand-account-id
   YOUTUBE_MUSIC_PROFILE=1  # Usually 1 for brand accounts, 0 for personal
   ```

### Spotify Setup

1. **Create a Spotify App:**
   - Go to https://developer.spotify.com/dashboard
   - Click "Create an App"
   - Fill in app name and description
   - Note your **Client ID** and **Client Secret**

2. **Add to `backend-python/.env`:**
   ```bash
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   SPOTIFY_REDIRECT_URI=http://localhost:3001/callback/spotify
   ```

3. **Configure redirect URI in Spotify Dashboard:**
   - Go to your app settings
   - Add `http://localhost:3001/callback/spotify` to Redirect URIs

### Jellyfin Setup

1. **Get your API key from Jellyfin:**
   - Log in to Jellyfin web interface
   - Go to Dashboard → API Keys
   - Create a new API key

2. **Add to `backend-python/.env`:**
   ```bash
   JELLYFIN_SERVER_URL=https://your-jellyfin-server.com
   JELLYFIN_API_KEY=your-jellyfin-api-key
   ```

### Subsonic/Navidrome Setup

1. **Add your server credentials to `backend-python/.env`:**
   ```bash
   SUBSONIC_SERVER_URL=https://your-subsonic-server.com
   SUBSONIC_USERNAME=your-username
   SUBSONIC_PASSWORD=your-password
   ```

   Or for Navidrome:
   ```bash
   NAVIDROME_SERVER_URL=https://your-navidrome-server.com
   NAVIDROME_USERNAME=your-username
   NAVIDROME_PASSWORD=your-password
   ```

---

## 🔑 Password Security Best Practices

### Generating Strong Passwords

Use a password manager or generate strong passwords:

```bash
# Generate a random 32-character password (Linux/Mac)
openssl rand -base64 32

# Generate using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Password Requirements

- **Minimum length:** 16 characters
- **Use a mix of:** uppercase, lowercase, numbers, and symbols
- **Don't use:** dictionary words, personal information, or patterns
- **Use unique passwords** for each service

---

## 🛡️ Production Deployment Security

### 1. Restrict CORS Origins

In `backend-python/.env`, change from wildcard to specific origins:

```bash
# Development (permissive)
CORS_ORIGINS=["*"]

# Production (restrictive)
CORS_ORIGINS=["https://your-production-domain.com","https://www.your-production-domain.com"]
```

### 2. Use HTTPS

Always use HTTPS in production:

```bash
# Frontend .env.local
VITE_BACKEND_URL=https://api.your-domain.com

# Backend should be behind HTTPS reverse proxy (nginx, Caddy, etc.)
```

### 3. Environment-Specific Settings

Use different `.env` files for different environments:

```bash
.env.development
.env.staging
.env.production
```

Load the appropriate file based on your deployment environment.

### 4. Secret Rotation

Regularly rotate sensitive credentials:

- **Passwords:** Every 90 days
- **API Keys:** Every 6 months
- **Cookies:** When you notice issues or suspect compromise

### 5. Docker Secrets (for Docker deployments)

Instead of environment variables, use Docker secrets:

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    secrets:
      - server_password
      - youtube_cookie
    environment:
      SERVER_PASSWORD_FILE: /run/secrets/server_password
      YOUTUBE_MUSIC_COOKIE_FILE: /run/secrets/youtube_cookie

secrets:
  server_password:
    file: ./secrets/server_password.txt
  youtube_cookie:
    file: ./secrets/youtube_cookie.txt
```

---

## 📋 Security Checklist

Before deploying or committing code:

- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded credentials in source code
- [ ] Strong, unique passwords used for all services
- [ ] `headers_auth.json` is not committed
- [ ] CORS origins restricted in production
- [ ] HTTPS enabled for production
- [ ] File permissions set correctly (`chmod 600 .env`)
- [ ] Backup of credentials stored securely (password manager)

---

## 🚨 What to Do If Credentials Are Compromised

### If you accidentally committed credentials to Git:

1. **Immediately rotate all compromised credentials**
   - Change passwords
   - Regenerate API keys
   - Create new cookies

2. **Remove from Git history:**
   ```bash
   # Use git-filter-repo (recommended)
   pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   
   # Or use BFG Repo-Cleaner
   java -jar bfg.jar --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Force push to remote (if already pushed):**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

4. **Notify team members** to re-clone the repository

### If credentials are leaked publicly:

1. **Immediately revoke/change all credentials**
2. **Check for unauthorized access** in service logs
3. **Enable 2FA** where available
4. **Monitor for suspicious activity**

---

## 🔍 Additional Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 Best Practices](https://oauth.net/2/)
- [12-Factor App - Config](https://12factor.net/config)
- [Git Secrets](https://github.com/awslabs/git-secrets) - Prevent committing secrets

---

## 📞 Support

If you have security concerns or find a vulnerability:

1. **Do not** create a public issue
2. Contact the maintainer privately
3. Provide details about the vulnerability
4. Allow time for a fix before public disclosure

---

**Last Updated:** October 26, 2025
