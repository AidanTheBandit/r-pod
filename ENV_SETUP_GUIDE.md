# Environment Configuration Guide

This guide provides step-by-step instructions for setting up `.env` files and managing sensitive credentials for R-Pod.

---

## 📁 File Structure

After setup, your project should have these configuration files:

```
r-pod/
├── .env.local                    # Frontend environment variables (gitignored)
├── .env.example                  # Frontend template (committed)
├── backend-python/
│   ├── .env                      # Backend environment variables (gitignored)
│   ├── .env.example              # Backend template (committed)
│   └── headers_auth.json         # YouTube Music auth (gitignored, optional)
```

**🚨 NEVER commit `.env`, `.env.local`, or `headers_auth.json` to version control!**

---

## 🚀 Quick Start

### 1. Backend Setup (Required)

```bash
# Navigate to backend directory
cd backend-python

# Copy the template
cp .env.example .env

# Edit with your credentials
nano .env  # or code .env, vim .env, etc.
```

**Minimum required configuration:**

```bash
# REQUIRED: Set a strong password
SERVER_PASSWORD=YourStrongRandomPassword123!

# Server settings
HOST=0.0.0.0
PORT=3451

# CORS (for development)
CORS_ORIGINS=["*"]
```

### 2. Frontend Setup (Required)

```bash
# Navigate to project root
cd ..

# Copy the template
cp .env.example .env.local

# Edit with your credentials
nano .env.local
```

**Required configuration:**

```bash
# Must match backend SERVER_PASSWORD
VITE_BACKEND_PASSWORD=YourStrongRandomPassword123!

# Backend URL
VITE_BACKEND_URL=http://localhost:3451
```

### 3. Verify Setup

```bash
# Check that .env files exist and are ignored
git status

# Should NOT show .env or .env.local in untracked files
# If they appear, check your .gitignore
```

---

## 🎵 Service Configuration

### YouTube Music (Recommended)

YouTube Music is the primary service for R-Pod. Choose one method:

#### Option A: Headers Auth File (Most Reliable) ⭐

**Best for:** Full library access, all features working

1. **Install ytmusicapi:**
   ```bash
   cd backend-python
   source venv/bin/activate
   pip install ytmusicapi
   ```

2. **Run OAuth setup:**
   ```bash
   ytmusicapi oauth
   ```

3. **Follow the interactive prompts:**
   ```
   Step 1: Open this URL in your browser:
   https://accounts.google.com/o/oauth2/v2/auth?client_id=...
   
   Step 2: Grant permissions
   
   Step 3: Copy the authorization code from the URL
   
   Step 4: Paste the code here:
   ```

4. **Verify the file was created:**
   ```bash
   ls -la headers_auth.json
   # Should show: -rw-r--r-- 1 user user 1234 Oct 26 12:00 headers_auth.json
   ```

5. **Done!** The backend will automatically detect and use this file.

#### Option B: Browser Cookie Method

**Best for:** Quick setup, personal use

1. **Open Chrome/Firefox** and go to https://music.youtube.com
2. **Log in** to your account
3. **Open Developer Tools:**
   - Chrome: `F12` or `Cmd+Option+I` (Mac)
   - Firefox: `F12` or `Cmd+Option+K` (Mac)
4. **Go to Network tab**
5. **Filter by "browse"** (type "browse" in the filter box)
6. **Refresh the page** if no requests appear
7. **Click any `/browse` request** in the list
8. **Find the "Cookie" header** under "Request Headers"
9. **Copy the ENTIRE cookie value** (very long string, 2000+ chars)
10. **Add to `backend-python/.env`:**
    ```bash
    YOUTUBE_MUSIC_COOKIE=PASTE_COOKIE_HERE
    ```

**Example cookie format:**
```
VISITOR_INFO1_LIVE=abc123; PREF=tz=America.Los_Angeles; ...
```

#### Brand Account Setup (Optional)

If using a YouTube brand account (like @YourChannelName):

1. **Find your account index:**
   ```bash
   # Start the backend
   python main.py
   
   # In another terminal, test accounts
   curl -H "X-Server-Password: YOUR_PASSWORD" \
        "http://localhost:3451/api/debug/accounts?sessionId=test"
   ```

2. **Check the response** to find which account has your music:
   ```json
   {
     "accounts_tested": [
       {
         "account_index": 0,
         "sample_tracks": ["Generic Track 1", ...]
       },
       {
         "account_index": 1,
         "sample_tracks": ["Your Favorite Song", ...]
       }
     ]
   }
   ```

3. **Add the correct profile to `.env`:**
   ```bash
   YOUTUBE_MUSIC_PROFILE=1  # Use the account_index that has your music
   ```

### Spotify (Optional)

1. **Create Spotify Developer Account:**
   - Go to https://developer.spotify.com/dashboard
   - Log in with your Spotify account
   - Click "Create an App"

2. **Fill in app details:**
   - App name: "R-Pod" (or your choice)
   - App description: "Personal music aggregator"
   - Redirect URI: `http://localhost:3001/callback/spotify`
   - Check agreement boxes
   - Click "Create"

3. **Get your credentials:**
   - Click on your new app
   - Copy the **Client ID**
   - Click "Show Client Secret" and copy it

4. **Add to `backend-python/.env`:**
   ```bash
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   SPOTIFY_REDIRECT_URI=http://localhost:3001/callback/spotify
   ```

### Jellyfin (Optional)

1. **Access Jellyfin Dashboard:**
   - Open your Jellyfin web interface
   - Log in as admin
   - Go to Dashboard (hamburger menu → Dashboard)

2. **Create API Key:**
   - Navigate to "API Keys" in the sidebar
   - Click "+" to create new key
   - Give it a name (e.g., "R-Pod")
   - Copy the generated API key

3. **Add to `backend-python/.env`:**
   ```bash
   JELLYFIN_SERVER_URL=https://jellyfin.yourdomain.com
   JELLYFIN_API_KEY=your_api_key_here
   ```

### Subsonic/Navidrome (Optional)

1. **Add to `backend-python/.env`:**
   ```bash
   # For Subsonic
   SUBSONIC_SERVER_URL=https://subsonic.yourdomain.com
   SUBSONIC_USERNAME=your_username
   SUBSONIC_PASSWORD=your_password
   
   # OR for Navidrome
   NAVIDROME_SERVER_URL=https://navidrome.yourdomain.com
   NAVIDROME_USERNAME=your_username
   NAVIDROME_PASSWORD=your_password
   ```

---

## 🔧 Advanced Configuration

### Cache Settings

Control how long data is cached:

```bash
# In backend-python/.env
CACHE_TTL=3600  # Cache duration in seconds (1 hour)
```

### CORS Configuration

**Development (permissive):**
```bash
CORS_ORIGINS=["*"]
```

**Production (restrictive):**
```bash
CORS_ORIGINS=["https://your-domain.com","https://www.your-domain.com"]
```

### Session Management

```bash
# In backend-python/.env
SESSION_TIMEOUT=3600           # Session timeout in seconds
SESSION_CLEANUP_INTERVAL=300   # Cleanup frequency in seconds
```

### Proxy Configuration (Advanced)

For YouTube streaming with proxies:

```bash
# Enable proxy rotation
PROXY_ENABLED=true
PROXY_LIST=http://proxy1.com:8080,http://proxy2.com:8080
PROXY_ROTATION_INTERVAL=300  # Rotate every 5 minutes
```

---

## 🔍 Troubleshooting

### Backend won't start

1. **Check environment file exists:**
   ```bash
   ls -la backend-python/.env
   ```

2. **Verify required variables are set:**
   ```bash
   cat backend-python/.env | grep SERVER_PASSWORD
   # Should show: SERVER_PASSWORD=something
   ```

3. **Check for syntax errors:**
   ```bash
   # No spaces around =
   ✅ SERVER_PASSWORD=mypass
   ❌ SERVER_PASSWORD = mypass
   
   # No quotes for simple values
   ✅ SERVER_PASSWORD=mypass123
   ❌ SERVER_PASSWORD="mypass123"
   
   # Use quotes for values with spaces/special chars
   ✅ CORS_ORIGINS=["http://localhost:5173"]
   ```

### YouTube Music authentication fails

1. **Check cookie is complete:**
   ```bash
   # Cookie should be very long (2000+ characters)
   cat backend-python/.env | grep YOUTUBE_MUSIC_COOKIE | wc -c
   # Should show: 2000+ (or much higher)
   ```

2. **Verify cookie is fresh:**
   - Cookies expire after ~1 year
   - Get a new cookie from browser
   - Or use `headers_auth.json` (doesn't expire)

3. **Check logs for specific errors:**
   ```bash
   # Start backend with debug logging
   cd backend-python
   DEBUG=1 python main.py
   ```

### Frontend can't connect to backend

1. **Verify passwords match:**
   ```bash
   # Backend password
   grep SERVER_PASSWORD backend-python/.env
   
   # Frontend password (should match)
   grep VITE_BACKEND_PASSWORD .env.local
   ```

2. **Check backend URL:**
   ```bash
   # Should match where backend is running
   grep VITE_BACKEND_URL .env.local
   # Common values:
   # - Development: http://localhost:3451
   # - Docker: http://localhost:3451
   # - Production: https://api.your-domain.com
   ```

3. **Test backend is running:**
   ```bash
   curl http://localhost:3451/health
   # Should return: {"status":"ok",...}
   ```

---

## 🔐 Security Tips

### 1. Generate Strong Passwords

```bash
# Method 1: OpenSSL (Linux/Mac)
openssl rand -base64 32

# Method 2: Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Method 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. File Permissions

Protect your `.env` files:

```bash
# Make .env files readable only by you
chmod 600 backend-python/.env
chmod 600 .env.local
chmod 600 backend-python/headers_auth.json  # if using
```

### 3. Verify Git Ignore

```bash
# Check that sensitive files are ignored
git check-ignore -v .env backend-python/.env .env.local
# Should show they're matched by .gitignore
```

### 4. Backup Credentials Securely

- Use a password manager (1Password, Bitwarden, LastPass)
- Don't store in plain text files
- Don't share via email or chat

---

## 📋 Complete Example

### Backend `.env` (full example)

```bash
# Server Configuration
SERVER_PASSWORD=MySecureRandomPassword123!
HOST=0.0.0.0
PORT=3451
NODE_ENV=production

# CORS Settings
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Cache
CACHE_TTL=3600

# YouTube Music (choose one method)
# Method 1: OAuth file (headers_auth.json - most reliable)
# Just create the file, no env vars needed

# Method 2: Cookie (alternative)
YOUTUBE_MUSIC_COOKIE=VISITOR_INFO1_LIVE=abc123...very_long_cookie_string
YOUTUBE_MUSIC_PROFILE=1
YOUTUBE_MUSIC_BRAND_ACCOUNT_ID=UC1234567890

# Spotify (optional)
SPOTIFY_CLIENT_ID=abc123def456
SPOTIFY_CLIENT_SECRET=xyz789uvw012
SPOTIFY_REDIRECT_URI=http://localhost:3001/callback/spotify

# Jellyfin (optional)
JELLYFIN_SERVER_URL=https://jellyfin.mydomain.com
JELLYFIN_API_KEY=1234567890abcdef

# Session Management
SESSION_TIMEOUT=3600
SESSION_CLEANUP_INTERVAL=300
```

### Frontend `.env.local` (full example)

```bash
# Backend Connection
VITE_BACKEND_URL=http://localhost:3451
VITE_BACKEND_PASSWORD=MySecureRandomPassword123!

# Note: Must match SERVER_PASSWORD in backend-python/.env
```

---

## 🆘 Getting Help

If you're still having issues:

1. **Check the logs:**
   ```bash
   # Backend logs
   cd backend-python
   python main.py
   # Look for [ERROR] or [WARNING] messages
   ```

2. **Enable debug mode:**
   ```bash
   # In backend-python/.env
   DEBUG=true
   NODE_ENV=development
   ```

3. **Test endpoints:**
   ```bash
   # Health check
   curl http://localhost:3451/health
   
   # CORS test
   curl http://localhost:3451/cors-test
   ```

4. **Check GitHub Issues:**
   - Search existing issues
   - Create a new issue with:
     - Your OS and Python version
     - Steps to reproduce
     - Error messages (redact sensitive info!)

---

**Last Updated:** October 26, 2025
