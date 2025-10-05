# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Python 3.10 or higher
- YouTube Music cookie (see below)

### Step 1: Install Dependencies

```bash
cd backend-python
chmod +x setup.sh
./setup.sh
```

### Step 2: Get YouTube Music Cookie

1. Open [YouTube Music](https://music.youtube.com) in your browser
2. Press F12 to open Developer Tools
3. Go to **Application** > **Cookies** > `https://music.youtube.com`
4. Copy ALL cookies as a single string (format: `key1=value1; key2=value2; ...`)

**Quick tip**: Use a browser extension like "EditThisCookie" or "Cookie-Editor" to export all cookies at once.

### Step 3: Configure

Edit `.env` file:

```env
SERVER_PASSWORD=my-secure-password
YOUTUBE_MUSIC_COOKIE=PASTE_YOUR_COOKIE_HERE
```

### Step 4: Run

```bash
source venv/bin/activate
python main.py
```

That's it! Server runs at `http://localhost:3001`

## 🧪 Test It Works

```bash
# Health check
curl http://localhost:3001/health

# Get tracks (replace PASSWORD and SESSION_ID)
curl -H "X-Server-Password: my-secure-password" \
  "http://localhost:3001/api/tracks?sessionId=test-session"
```

## 🐳 Docker Alternative

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your settings
nano .env

# Start with Docker
docker-compose up -d

# Check logs
docker-compose logs -f
```

## 🎵 Connect from Frontend

Update your frontend's backend URL to:
```
http://localhost:3001
```

## 📝 Getting Your YouTube Music Cookie (Detailed)

### Method 1: Manual Copy (Chrome/Edge)

1. Visit https://music.youtube.com
2. Log in to your account
3. Press `F12` or `Ctrl+Shift+I`
4. Click **Application** tab
5. Expand **Cookies** in left sidebar
6. Click on `https://music.youtube.com`
7. You'll see a list of cookies
8. Manually copy each cookie in format: `name=value; name2=value2; ...`

### Method 2: Using Browser Extension (Recommended)

1. Install **Cookie-Editor** extension:
   - [Chrome](https://chrome.google.com/webstore/detail/cookie-editor/)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/)

2. Visit https://music.youtube.com and log in
3. Click the Cookie-Editor icon
4. Click **Export** > **Header String**
5. Paste into `.env` file

### Method 3: JavaScript Console

1. Visit https://music.youtube.com
2. Open Console (F12 > Console tab)
3. Paste this code:
   ```javascript
   copy(document.cookie)
   ```
4. Press Enter (cookie string copied to clipboard)
5. Paste into `.env` file

## ⚠️ Troubleshooting

### "Authentication failed"
- Cookie may have expired - get a fresh one
- Make sure you copied the ENTIRE cookie string
- Try logging out and back in to YouTube Music

### "Import errors"
```bash
pip install --upgrade -r requirements.txt
```

### "Port 3001 already in use"
Change in `.env`:
```env
PORT=3002
```

### "No module named 'ytmusicapi'"
Make sure virtual environment is activated:
```bash
source venv/bin/activate
```

## 🎉 Next Steps

1. ✅ Backend running
2. Configure frontend to use `http://localhost:3001`
3. Test with the frontend UI
4. Add Spotify/Jellyfin/Subsonic credentials (optional)
5. Deploy to production

## 📚 Full Documentation

See [README.md](README.md) for complete documentation.
