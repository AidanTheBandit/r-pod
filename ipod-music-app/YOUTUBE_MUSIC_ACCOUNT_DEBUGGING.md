# YouTube Music Account Debugging Guide

## Problem
YouTube Music authentication can be tricky when you have multiple Google accounts or channels. The API returns music based on which account/channel is active, but the authentication headers don't always work as expected.

## Solution: Account Debugging Tool

The backend now includes an account debugging endpoint that tests different account indices to help you identify which one has your preferred music.

### How to Use

1. **Start the backend** with your YouTube Music cookie configured
2. **Call the account debugging endpoint**:
   ```bash
   curl "http://localhost:3001/api/debug/accounts?sessionId=YOUR_SESSION_ID" \
     -H "X-Server-Password: music-aggregator-2025"
   ```

3. **Review the results** - each account index will show:
   - Whether authentication succeeded
   - Home sections available
   - Sample tracks from that account

4. **Find your account** - Look for the account that shows your preferred music (e.g., The Smashing Pumpkins, Beatles, etc.)

5. **Update your configuration**:
   ```bash
   # In your .env file
   YOUTUBE_MUSIC_PROFILE=0  # or 1, 2, etc. - whichever shows your music
   ```

### Example Output
```json
{
  "accounts_tested": [
    {
      "account_index": 0,
      "authentication_success": true,
      "home_sections": ["Quick picks", "Listen again"],
      "sample_tracks": [
        {"title": "Tennessee Whiskey", "artist": "Chris Stapleton"},
        {"title": "Wagon Wheel", "artist": "Darius Rucker"}
      ]
    },
    {
      "account_index": 1,
      "authentication_success": true,
      "home_sections": ["Throwback jams", "Quick picks"],
      "sample_tracks": [
        {"title": "MOI NOTHOKAR ANUBHAB", "artist": "Zubeen Garg"},
        {"title": "Dil Huwa Hai Tukde Tukde", "artist": "Zubeen Garg"}
      ]
    }
  ]
}
```

## Getting the Correct Cookie

### Method 1: Browser Developer Tools (Recommended)
1. Go to `music.youtube.com`
2. **Ensure you're on the correct account/channel**
3. Open **Developer Tools** (F12)
4. Go to **Network** tab
5. **Refresh the page** or navigate
6. **Find a request** to `youtubei/v1/browse` or `youtubei/v1/music/get_search_suggestions`
7. **Right-click** → **Copy** → **Copy as cURL**
8. **Extract the cookie** from the `-b` or `--cookie` parameter

### Method 2: Browser Cookie Export
1. Install a browser extension like "Cookie-Editor" or "EditThisCookie"
2. Go to `music.youtube.com`
3. **Export cookies** as Netscape format
4. **Copy the cookie string**

## Troubleshooting

### All accounts show the same music
- Your cookie is from the same session
- Try extracting a fresh cookie from the correct account
- Make sure you're actually switched to the @AidanDSMusic channel

### Authentication fails
- Cookie may be expired
- Try extracting a fresh cookie
- Check that all required cookies are present (SAPISID, HSID, SID, etc.)

### Still getting wrong music
- YouTube Music may not differentiate between channels for recommendations
- The main account preferences override channel-specific preferences
- Try using a completely separate Google account

## Technical Details

The account debugging tool:
- Tests account indices 0-4
- Uses the `X-Goog-AuthUser` header to specify account
- Fetches home sections and sample tracks
- Returns structured data for easy identification

The authentication uses multiple methods:
1. Cookie file method (most reliable)
2. Manual headers with account-specific authentication
3. SAPISID hash generation for API authentication