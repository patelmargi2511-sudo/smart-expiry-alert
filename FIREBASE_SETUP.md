# Firebase Cloud Messaging Setup Guide

## Step 1: Create Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Create a project"**
3. Enter project name: `expira-app`
4. Click **Continue**
5. Select **"Enable Google Analytics"** (optional)
6. Click **Create project**
7. Wait for setup to complete (1-2 minutes)

## Step 2: Download Service Account Key

1. Go to **Project Settings** (gear icon top left)
2. Click **"Service Accounts"** tab
3. Click **"Generate New Private Key"**
4. A JSON file will download automatically
5. Save it as **`firebase-service-account.json`** in your project folder:
   ```
   smart expiry alert/
   ├── firebase-service-account.json  ← Put it here
   ├── server.js
   ├── expiry_alert.html
   └── ...
   ```

## Step 3: Enable Cloud Messaging

1. In Firebase Console, go to **"Cloud Messaging"** tab
2. Copy your **Server API Key** (you'll need this for APK)
3. Click **"Create Service Account"** (if not already done)

## Step 4: Install Firebase Admin SDK

Already done! Run:
```bash
npm install
```

## Step 5: Test Firebase Integration

1. Start the server:
   ```bash
   npm start
   ```

2. You should see in console:
   ```
   ✅ Firebase Cloud Messaging initialized
   ```

   If you see:
   ```
   ⚠️  firebase-service-account.json not found
   ```
   Then upload the JSON file you downloaded in Step 2.

## Step 6: Get FCM Token from Browser

When you login to the web app:
1. Browser will ask permission for notifications
2. Click **Allow**
3. FCM token will be sent to backend automatically
4. Check console (F12 → Console tab) for:
   ```
   ✅ FCM Token registered: [token]
   ```

## Step 7: Send Test Notification (Optional)

Open browser DevTools (F12) and run:
```javascript
fetch('/api/notifications/send-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 1 })
}).then(r => r.json()).then(console.log)
```

You should receive a test notification!

## Step 8: For Mobile APK

When converting to APK using Capacitor:

1. Add your **Google Services JSON** to Android project
2. Configure FCM in Android manifest
3. Install Firebase messaging library:
   ```bash
   npm install @capacitor/firebase
   ```

4. Rebuild APK:
   ```bash
   npx cap build android
   ```

---

## Notification Flow

```
Item Expires
    ↓
Server detects expiry
    ↓
├─ Save to Database
├─ Send Socket.io → Web browsers get instant notification
└─ Send FCM → Mobile apps get system notification
    ↓
User sees notification
├─ Even if app is closed
├─ Even if device is locked
└─ With sound + vibration
```

---

## Troubleshooting

### "firebase-service-account.json not found"
- Download it from Firebase Console
- Place in project root folder
- Restart server: `npm start`

### "Error: Failed to initialize Firebase"
- Check JSON file is valid (copy from Firebase Console again)
- Ensure file name is exactly: `firebase-service-account.json`
- Check file permissions

### "FCM Token not found for user"
- Make sure you clicked **Allow** for notifications
- Check browser console for errors (F12)
- Browser must support Web Notifications API

### "Unable to send notification"
- Firebase may not be initialized
- Check server console for FCM status
- Try sending test notification

---

## Firebase Console URLs Reference

| Feature | URL |
|---------|-----|
| Firebase Console | https://console.firebase.google.com |
| Cloud Messaging | https://console.firebase.google.com/project/{PROJECT}/messaging |
| Service Accounts | https://console.firebase.google.com/project/{PROJECT}/settings/serviceaccounts |
| Firestore Database | https://console.firebase.google.com/project/{PROJECT}/firestore |

---

## API Endpoints for FCM

### Register FCM Token
```bash
POST /api/users/fcm-token
Body: { userId, fcmToken }
```

### Send Test Notification
```bash
POST /api/notifications/send-test
Body: { userId }
```

### Get Notifications
```bash
GET /api/notifications/:userId
```

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `"Firebase is not initialized"` | Upload firebase-service-account.json and restart |
| `"Unable to parse service account key"` | Re-download JSON from Firebase Console |
| `"Missing required fields"` | Check JSON has: `type`, `project_id`, `private_key` |
| `"Invalid credential"` | Regenerate key in Firebase Console |

---

## Security Notes

⚠️ **Important:**
- Never commit `firebase-service-account.json` to Git
- Add to `.gitignore`:
  ```
  firebase-service-account.json
  ```
- Keep server key secret - it controls all FCM sending
- For production, use environment variables:
  ```bash
  export FIREBASE_KEY=$(cat firebase-service-account.json)
  ```

---

## File Structure After Setup

```
smart expiry alert/
├── firebase-service-account.json   ✅ REQUIRED
├── package.json
├── server.js                       ✅ Updated with FCM
├── expiry_alert.html               ✅ Updated with FCM
├── database.sql
├── FIREBASE_SETUP.md               ← You are here
├── MOBILE_DEPLOYMENT.md
├── README.md
└── QUICKSTART.md
```

---

## Next Steps

1. ✅ Create Firebase Project
2. ✅ Download Service Account JSON
3. ✅ Place `firebase-service-account.json` in project folder
4. ✅ Run `npm install`
5. ✅ Run `npm start`
6. ✅ Login and test notifications
7. ✅ Build Android APK with Capacitor

---

## Support

If you encounter issues:
1. Check server console for errors
2. Check browser console (F12) for client errors
3. Verify firebase-service-account.json exists
4. Try restarting: `npm start`
5. Check Firebase Console is working

Enjoy real-time notifications! 🎉
