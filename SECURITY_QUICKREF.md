# 🔒 Security Quick Reference

## 🚀 Quick Setup Checklist

```bash
# 1. Setup environment files
cp backend-python/.env.example backend-python/.env
cp .env.example .env.local

# 2. Generate secure password
openssl rand -base64 32

# 3. Edit configuration files
nano backend-python/.env    # Add password and credentials
nano .env.local              # Add same password

# 4. Set secure permissions
chmod 600 backend-python/.env
chmod 600 .env.local

# 5. Verify security
./verify-security.sh

# 6. Start application
npm run host-both
```

---

## 🔑 Required Credentials

| File | Variable | How to Get | Required |
|------|----------|------------|----------|
| `backend-python/.env` | `SERVER_PASSWORD` | Generate: `openssl rand -base64 32` | ✅ Yes |
| `backend-python/.env` | `YOUTUBE_MUSIC_COOKIE` | Browser DevTools → Network → Copy Cookie | ✅ Yes |
| `.env.local` | `VITE_BACKEND_PASSWORD` | Same as `SERVER_PASSWORD` | ✅ Yes |
| `.env.local` | `VITE_BACKEND_URL` | `http://localhost:3451` | ✅ Yes |

---

## 📋 YouTube Music Setup (2 Methods)

### Method 1: Headers Auth (Recommended)
```bash
cd backend-python
source venv/bin/activate
ytmusicapi oauth
# Follow prompts
```

### Method 2: Browser Cookie
1. Open https://music.youtube.com in Chrome
2. F12 → Network tab → Filter "browse"
3. Copy Cookie header from Request Headers
4. Paste in `backend-python/.env`:
   ```bash
   YOUTUBE_MUSIC_COOKIE=your-very-long-cookie-here
   ```

---

## 🛡️ Security Rules

### ✅ DO

- ✅ Use `.env` files for all credentials
- ✅ Generate strong random passwords (16+ chars)
- ✅ Run `./verify-security.sh` before deploying
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use `chmod 600` for `.env` files
- ✅ Rotate passwords every 90 days

### ❌ DON'T

- ❌ Commit `.env` or `.env.local` to Git
- ❌ Share credentials via email/chat
- ❌ Use default passwords in production
- ❌ Log credentials in console
- ❌ Use same password for multiple services
- ❌ Commit `headers_auth.json`

---

## 🔍 Quick Verification

```bash
# Check if credentials are properly configured
./verify-security.sh

# Check if .env is ignored
git check-ignore -v .env backend-python/.env

# Test backend connection
curl http://localhost:3451/health

# Verify passwords match
grep SERVER_PASSWORD backend-python/.env
grep VITE_BACKEND_PASSWORD .env.local
```

---

## 🚨 Emergency: Credentials Leaked

### Immediate Actions

1. **Change all passwords immediately**
   ```bash
   # Generate new password
   NEW_PASS=$(openssl rand -base64 32)
   
   # Update both files
   sed -i "s/^SERVER_PASSWORD=.*/SERVER_PASSWORD=$NEW_PASS/" backend-python/.env
   sed -i "s/^VITE_BACKEND_PASSWORD=.*/VITE_BACKEND_PASSWORD=$NEW_PASS/" .env.local
   ```

2. **Regenerate YouTube Music cookie**
   - Clear browser cookies
   - Login again
   - Get new cookie

3. **Revoke Spotify credentials**
   - Go to https://developer.spotify.com/dashboard
   - Delete old app
   - Create new app with new credentials

4. **Clean Git history**
   ```bash
   # Install git-filter-repo
   pip install git-filter-repo
   
   # Remove .env from history
   git filter-repo --path .env --invert-paths
   
   # Force push (if already pushed)
   git push origin --force --all
   ```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [SECURITY.md](./SECURITY.md) | Complete security guide |
| [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) | Detailed setup instructions |
| [API_KEYS_REFERENCE.md](./API_KEYS_REFERENCE.md) | API keys explained |
| [SECURITY_AUDIT_SUMMARY.md](./SECURITY_AUDIT_SUMMARY.md) | Audit results |

---

## 🆘 Common Issues

### Issue: "Unauthorized" errors

**Solution:**
```bash
# Check passwords match
diff <(grep SERVER_PASSWORD backend-python/.env) \
     <(grep VITE_BACKEND_PASSWORD .env.local)
```

### Issue: YouTube Music not working

**Solution:**
```bash
# Cookie might be expired - get new one
# OR use OAuth method instead:
cd backend-python && ytmusicapi oauth
```

### Issue: .env appears in git status

**Solution:**
```bash
# Remove from tracking
git rm --cached .env backend-python/.env .env.local

# Verify .gitignore has these entries
cat .gitignore | grep -E "^\.env"
```

### Issue: "No file system provider" when running script

**Solution:**
```bash
# Use bash explicitly
bash verify-security.sh

# Or make executable
chmod +x verify-security.sh
./verify-security.sh
```

---

## 💡 Pro Tips

1. **Use a password manager** (1Password, Bitwarden) to store credentials
2. **Enable 2FA** on Spotify, Google accounts
3. **Use different passwords** for dev/staging/prod
4. **Set calendar reminders** for password rotation
5. **Document your setup** for team members
6. **Test in dev** before deploying to production

---

## 🔐 Password Generation Examples

```bash
# Method 1: OpenSSL (Linux/Mac)
openssl rand -base64 32

# Method 2: Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Method 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 4: pwgen (if installed)
pwgen -s 32 1
```

---

## 📞 Support

- **GitHub Issues:** [Report security issues privately](https://github.com/AidanTheBandit/r-pod/security/advisories)
- **Documentation:** Check [SECURITY.md](./SECURITY.md)
- **Verification:** Run `./verify-security.sh`

---

**Last Updated:** October 26, 2025
