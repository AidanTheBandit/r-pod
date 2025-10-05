# YouTube Music Account Switching Guide

## Problem
Your YouTube Music cookie is authenticated to a specific Google account (brand channel). To get music from a different account, you need a fresh cookie from that account.

## Solution: Switch Accounts and Get New Cookie

### Method 1: Using Brand Account Switcher (Recommended)

1. **Open YouTube Music**: Go to https://music.youtube.com
2. **Click your profile picture** (top right corner)
3. **Click "Switch account"**
4. **Select the account** you want to use (the one with your preferred music)
5. **Get the new cookie**:
   - Press `F12` to open Developer Tools
   - Go to **Application** > **Cookies** > `https://music.youtube.com`
   - Copy ALL cookies as a string: `key1=value1; key2=value2; ...`
6. **Update your `.env` file**:
   ```env
   YOUTUBE_MUSIC_COOKIE="paste-your-new-cookie-here"
   ```
7. **Restart the Python backend**

### Method 2: Using Incognito/Private Window

1. Open YouTube Music in **Incognito/Private mode**
2. Log in with the Google account you want
3. Get the cookie (F12 > Application > Cookies)
4. Update `.env` file
5. Restart backend

### Method 3: Browser Profile

1. Create a **new browser profile** dedicated to YouTube Music
2. Log in with your preferred account
3. Get the cookie
4. Update `.env`

## Quick Cookie Export

### Using Browser Console (Fastest):
1. Go to https://music.youtube.com
2. Switch to your preferred account
3. Press `F12` > Console tab
4. Paste and run:
   ```javascript
   copy(document.cookie)
   ```
5. Cookie is now in your clipboard!
6. Paste directly into `.env` file

### Using Cookie-Editor Extension:
1. Install [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/)
2. Switch to your preferred YTM account
3. Click Cookie-Editor icon
4. Click **Export** > **Header String**
5. Paste into `.env` file

## Verify Your Account

After updating the cookie and restarting:

1. Open your app's Songs page
2. Check if the music recommendations match your taste
3. If still wrong, repeat the process and ensure you're on the correct account

## Note About Profile Numbers

The `YOUTUBE_MUSIC_PROFILE` environment variable in the old Node.js backend is NOT used in the Python backend. The cookie itself determines which account is active.

## Current Status

Your current cookie is authenticated to an account with Indian/Assamese music content. To get your preferred English/American music:

1. Follow Method 1 above to switch accounts
2. Get a fresh cookie from your preferred account
3. Replace the `YOUTUBE_MUSIC_COOKIE` value in `.env`
4. Restart the Python backend

## Troubleshooting

**Still getting wrong content?**
- Make sure you switched accounts in YouTube Music BEFORE copying the cookie
- Clear your browser cache and cookies
- Try using Incognito mode (Method 2)

**Cookie expired error?**
- YouTube cookies expire periodically
- Get a fresh cookie using the steps above
- Consider using a browser extension to auto-export cookies

**Multiple accounts showing up?**
- YouTube Music shows all linked accounts in the switcher
- Make sure to click on the correct account name
- Verify in YouTube Music that you're on the right account before copying the cookie
