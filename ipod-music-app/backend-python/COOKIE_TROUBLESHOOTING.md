# 🔴 IMPORTANT: Your Current Cookie is Incomplete!

## Problem
Your current cookie in `.env` is missing critical authentication tokens. You need the **FULL cookie string**.

## ✅ Correct Way to Get the Cookie

### Method 1: Browser Console (Easiest)

1. **Open YouTube Music**: https://music.youtube.com
2. **IMPORTANT**: Click your profile picture and **verify** you see "AidanDSMusic" at the top
3. If not, click "Switch account" → Select "AidanDSMusic"
4. **Refresh the page** after switching
5. Press **F12** (or Cmd+Option+I on Mac)
6. Click **"Console"** tab
7. Type this EXACTLY and press Enter:
   ```javascript
   copy(document.cookie)
   ```
8. You'll see: `undefined` (this is normal - cookie is now in clipboard!)

### Method 2: Network Tab (More Reliable)

1. Go to https://music.youtube.com
2. Switch to AidanDSMusic account
3. **Refresh the page**
4. Press F12 → **Network** tab
5. Look for a request to `music.youtube.com`
6. Click on it
7. Scroll down to **Request Headers**
8. Find **"cookie:"** header
9. **Copy the ENTIRE value** (it will be VERY long, 2000+ characters)
10. It should include these parts:
    - `YSC=`
    - `PREF=`
    - `VISITOR_INFO1_LIVE=`
    - `SID=`
    - `__Secure-1PSID=`
    - `__Secure-3PSID=`
    - `LOGIN_INFO=` ← **THIS IS CRITICAL!**
    - `SIDCC=`
    - Many more...

### Method 3: Cookie-Editor Extension (Recommended!)

1. **Install Extension**:
   - Chrome: https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm
   - Firefox: https://addons.mozilla.org/firefox/addon/cookie-editor/

2. **Extract Cookie**:
   - Go to https://music.youtube.com
   - Switch to AidanDSMusic
   - Click the Cookie-Editor icon (puzzle piece icon)
   - Click **"Export"**
   - Select **"Header String"** format
   - **Copy all the text**
   - Should start with something like: `YSC=xxx; PREF=xxx; ...`

## 📝 How to Paste It Correctly

1. Open: `/Users/aidanpds/Downloads/r1-ipod-ui-plugin/ipod-music-app/backend-python/.env`

2. Find this line (around line 21):
   ```env
   YOUTUBE_MUSIC_COOKIE="PREF=f4=4000000..."
   ```

3. **Replace the entire value** between the quotes with your new cookie:
   ```env
   YOUTUBE_MUSIC_COOKIE="YSC=xxx; PREF=xxx; VISITOR_INFO1_LIVE=xxx; ... [PASTE YOUR ENTIRE COOKIE HERE]"
   ```

4. **IMPORTANT**: Keep it on ONE line (don't split across multiple lines)

5. **Save the file** (Cmd+S or Ctrl+S)

## 🔄 Restart Backend

After updating the cookie:

```bash
# Kill current backend
ps aux | grep "python main.py" | grep -v grep | awk '{print $2}' | xargs kill

# Start fresh
cd /Users/aidanpds/Downloads/r1-ipod-ui-plugin/ipod-music-app/backend-python
source venv/bin/activate
python main.py
```

## ✅ How to Verify It Worked

After restarting, check the backend logs. You should see:
```
[YTM] ✓ Authentication successful
```

Then refresh your frontend and go to Songs. You should see:
- ❌ NO MORE Indian/Assamese songs
- ✅ Songs YOU actually listen to
- ✅ YOUR Quick Picks
- ✅ YOUR playlists in Playlists page

## 🚨 Common Mistakes

### ❌ WRONG: Copying only part of the cookie
Your current cookie is missing `LOGIN_INFO` and other critical tokens!

### ❌ WRONG: Not switching accounts first
The cookie captures whatever account is ACTIVE when you copy it.

### ❌ WRONG: Using cookie from YouTube (not YouTube Music)
Must be from https://music.youtube.com (not youtube.com)

### ✅ CORRECT: Full cookie from youtube.music.com while AidanDSMusic is active
Should be 2000-4000 characters long!

## 📏 Check Cookie Length

Your current cookie length: ~500 characters ❌  
Correct cookie length: ~2000-4000 characters ✅

If your cookie is less than 1500 characters, it's incomplete!

## Need Help?

**Still showing wrong content?**
1. Verify you're on **music.youtube.com** (not youtube.com)
2. Profile picture shows "AidanDSMusic" BEFORE copying cookie
3. Cookie includes `LOGIN_INFO=AFmmF2...` (this is the account selector)
4. Cookie is copied as ONE continuous string (no line breaks)

**Can't find LOGIN_INFO in cookie?**
- You may not be logged in properly
- Try logging out and back in to YouTube Music
- Use Incognito mode, log in ONLY as AidanDSMusic, then copy cookie

**Extension method not working?**
- Make sure extension is installed for your browser
- Reload YouTube Music page after installing
- Click extension icon while on music.youtube.com page
