# 🚀 Quick Start - Auto-Detection Enabled

## What You Asked For
> "could you have it work so whatever domain or ip you access from itll auto know where to send the request to on that same domain or ip without the port if a domain"

## ✅ Done!

The system now **automatically detects** the backend URL based on your current host.

## Usage

### 🏠 Localhost (Development)
```bash
./start-all.sh
```
Open: http://localhost:5173
- Auto-connects to: `http://localhost:8000`
- Pairing URL: `http://localhost:3000`

### 📱 LAN/Phone (Testing)
Find your IP:
```bash
hostname -I | awk '{print $1}'
# Example: 192.168.1.100
```

Open on phone: `http://192.168.1.100:5173`
- Auto-connects to: `http://192.168.1.100:8000`
- Pairing URL: `http://192.168.1.100:3000`

**No .env changes needed!**

### 🌐 Production (Domain)
Open: `https://r-pod.example.com`
- Auto-connects to: `https://r-pod.example.com` **(no port!)**
- Pairing URL: `https://pair.r-pod.example.com`

**Just works!**

## How to Test

1. **Start services** (if not running):
   ```bash
   ./start-all.sh
   ```

2. **Open R1 app**:
   ```
   http://localhost:5173
   ```

3. **Check console** for auto-detection:
   ```
   [Config] Auto-detected configuration: {
     backendUrl: 'http://localhost:8000',
     pairingUrl: 'http://localhost:3000',
     ...
   }
   ```

4. **Test pairing**:
   - Settings → Pair Device
   - Generate code
   - Open pairing URL in another tab
   - Complete wizard

## Override (Optional)

If you need to force a specific URL:

**Create `.env.local`:**
```env
VITE_BACKEND_URL=http://custom-url:8000
VITE_PAIRING_URL=http://custom-pairing:3000
```

**Or use Settings:**
- Settings → Backend Server
- Enter custom URL + password
- Saves to localStorage

## Documentation

- **Full Guide**: `AUTO_DETECTION_GUIDE.md`
- **Testing Steps**: `TESTING_GUIDE.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

## Key Changes

| Component | Change |
|-----------|--------|
| `src/config.js` | **NEW** - Auto-detection logic |
| `src/services/backendClient.js` | Uses auto-detect + sends `device_id` |
| `src/views/DevicePairingView.jsx` | Uses auto-detect URLs |
| `pairing-client/src/config.js` | **NEW** - Auto-detection |
| All API calls | Include `device_id` parameter |

## What This Means

✅ **No hardcoded URLs** anywhere
✅ **Works on localhost** out of the box
✅ **Works on LAN** with IP addresses
✅ **Works in production** with domains
✅ **One codebase** for all environments
✅ **QR codes** always point to correct URL

---

**Ready to test!** Services are already running at:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000  
- Pairing: http://localhost:3000
