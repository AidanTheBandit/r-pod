# R-Pod Pairing Client

Web interface for pairing and configuring Rabbit R1 devices with YouTube Music credentials.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:5174
```

## 📱 Usage

### For Users

1. **On your R1 device:**
   - Open Settings → Device Pairing
   - A 6-character code will appear (e.g., "ABCD12")
   - Scan the QR code or note the code

2. **On your phone/computer:**
   - Visit https://pair.r-pod.app (or http://localhost:5174 for local)
   - Enter the pairing code
   - Paste your YouTube Music cookie
   - Click "Detect Accounts" to find your account
   - Select your account from the list
   - Click "Pair Device"

3. **Done!**
   - Your R1 will automatically configure itself
   - No need to manually edit .env files!

## 🔐 How to Get Your YouTube Music Cookie

### Chrome/Edge

1. Open https://music.youtube.com
2. Log in to your account
3. Press `F12` (or `Cmd+Option+I` on Mac)
4. Click the **Network** tab
5. Type "browse" in the filter box
6. Refresh the page if no requests appear
7. Click any `/browse` request
8. Scroll down to **Request Headers**
9. Find the `Cookie:` header
10. Click to select the entire value
11. Copy it (Ctrl+C or Cmd+C)

### Firefox

1. Open https://music.youtube.com
2. Log in to your account
3. Press `F12` (or `Cmd+Option+K` on Mac)
4. Click the **Network** tab
5. Type "browse" in the filter
6. Refresh the page
7. Click any `/browse` request
8. Click the **Headers** tab
9. Scroll to **Request Headers**
10. Find `Cookie:` and copy the value

## 🔧 Development

### Environment Variables

Create `.env.local`:

```bash
VITE_BACKEND_URL=http://localhost:3451
```

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy

The pairing client can be deployed separately from the main R-Pod app:

- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **Static hosting**: Upload `dist/` folder

## 🏗️ Architecture

```
┌──────────────┐     Socket.IO     ┌──────────────┐
│  R1 Device   │ ←──────────────→  │   Backend    │
│              │                    │  (FastAPI +  │
└──────────────┘                    │  Socket.IO)  │
                                    └──────┬───────┘
                                           │
                                           │ Socket.IO
                                           │
                                    ┌──────▼───────┐
                                    │ Pairing Web  │
                                    │   Client     │
                                    │  (React)     │
                                    └──────────────┘
```

## 🔒 Security

- ✅ Pairing codes expire after 5 minutes
- ✅ Codes are one-time use only
- ✅ Credentials sent over encrypted Socket.IO
- ✅ Credentials never stored on server
- ✅ Device stores credentials locally only
- ✅ HTTPS required for production

## 📦 Dependencies

- **React** - UI framework
- **Socket.IO Client** - Real-time communication
- **Vite** - Build tool

## 🐛 Troubleshooting

### Code Invalid/Expired

- Codes expire after 5 minutes
- Request a new code on the R1 device

### Can't Connect

- Check backend is running: `http://localhost:3451/health`
- Verify `VITE_BACKEND_URL` in `.env.local`
- Check browser console for errors

### Cookie Not Working

- Make sure you copied the **entire** cookie
- Cookie should be very long (2000+ characters)
- Try logging out and back into YouTube Music
- Get a fresh cookie

### Account Detection Fails

- Verify cookie is valid
- Try testing with profile "0" first
- Check backend logs for errors

## 📄 License

MIT

---

**Part of the R-Pod Music Aggregator System**
