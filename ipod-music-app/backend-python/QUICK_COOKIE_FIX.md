# Quick Cookie Update Guide - Switch to AidanDSMusic

## The Issue
Your current cookie is authenticated to an Indian music account. You need to get a fresh cookie while **AidanDSMusic** is the active account.

## ⚡ Quick Fix (2 minutes)

### Step 1: Switch Account in YouTube Music
1. Go to **https://music.youtube.com**
2. Click your **profile picture** (top right)
3. Click **"Switch account"**
4. Select **"AidanDSMusic"**
5. **Refresh the page** to confirm you're on the right account

### Step 2: Copy Cookie (Fastest Method)
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Paste this and press Enter:
   ```javascript
   copy(document.cookie)
   ```
4. Cookie is now in your clipboard! ✅

### Step 3: Update .env File
1. Open: `/Users/aidanpds/Downloads/r1-ipod-ui-plugin/ipod-music-app/backend-python/.env`
2. Find the line starting with: `YOUTUBE_MUSIC_COOKIE=`
3. Replace the entire value (keeping the quotes):
   ```env
   YOUTUBE_MUSIC_COOKIE="paste-your-new-cookie-here"
   ```
4. **Save the file**

### Step 4: Restart Backend
Run in terminal:
```bash
ps aux | grep "python main.py" | grep -v grep | awk '{print $2}' | xargs kill
cd /Users/aidanpds/Downloads/r1-ipod-ui-plugin/ipod-music-app/backend-python
source venv/bin/activate
python main.py
```

Or use VS Code to kill the Python terminal and rerun it.

### Step 5: Test
1. Refresh your frontend app
2. Go to **Songs** page
3. You should now see **YOUR** Quick Picks and recommendations! 🎉

---

## Alternative: Using Cookie-Editor Extension

### Install Extension
- **Chrome**: https://chrome.google.com/webstore/detail/cookie-editor/
- **Firefox**: https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/

### Extract Cookie
1. Switch to AidanDSMusic on music.youtube.com
2. Click the Cookie-Editor icon
3. Click **"Export"** → **"Header String"**
4. Paste into `.env` file

---

## Why This Works

The YouTube Music cookie contains your **active account session**. When you:
1. Switch to AidanDSMusic in the browser
2. Copy the cookie while that account is active
3. Paste it into your backend

**All YouTube Music API calls will use AidanDSMusic's library, playlists, and recommendations!**

No profile numbers or brand account IDs needed - the cookie IS the authentication.

---

## Verify It Worked

After restarting, check the Songs page. You should see songs from:
- **Your Quick Picks** (personalized for AidanDSMusic)
- **Your Listen Again** (your recently played)
- **Your taste profile** (not Indian music!)

If you still see wrong content, make sure you:
1. Switched accounts BEFORE copying the cookie
2. Used `copy(document.cookie)` while on music.youtube.com
3. Pasted the ENTIRE cookie string (it's very long!)
4. Restarted the backend

---

## Need Help?

**Still seeing Indian music?**
- Double-check you're on AidanDSMusic before copying cookie
- Try in Incognito mode logged into AidanDSMusic only
- Make sure the cookie starts with `YSC=` and includes `LOGIN_INFO=`

**Cookie won't copy?**
- Make sure you're on https://music.youtube.com (not regular YouTube)
- Refresh the page after switching accounts
- Try the Cookie-Editor extension method instead
