# Firebase Cloud Messaging (FCM) Implementation Complete ✅

Your EXPIRA app now has Firebase Cloud Messaging integrated! Here's what's been added:

## What's New

### Backend (server.js)
✅ Firebase Admin SDK integration
✅ FCM token storage in database
✅ Automatic push notifications for expiring items
✅ Test notification endpoint
✅ Socket.io + FCM dual notification system

### Frontend (expiry_alert.html)
✅ Firebase SDK loaded
✅ Browser notification permission request
✅ FCM token generation & registration
✅ Service Worker for background notifications
✅ Real-time updates via Socket.io

### Database
✅ `fcm_token` field added to users table
✅ Notification history tracking
✅ Preference management

## How It Works

```
1. User Logs In
   ├─ Browser requests notification permission
   ├─ FCM token generated & sent to server
   └─ Token stored in database

2. Item Expires
   ├─ Server detects expiry
   ├─ Sends Socket.io → Web browsers (instant)
   └─ Sends FCM → Android/Mobile apps (works offline)

3. User Receives
   ├─ Browser notification (if app open)
   ├─ System notification (even if app closed)
   ├─ Sound + vibration (on mobile)
   └─ In-app alert + notification center
```

## Setup Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Firebase Console Setup
1. `` https://console.firebase.google.com
2. Create project: `expira-app`
3. Go to **Settings → Service Accounts**
4. Click **"Generate New Private Key"**
5. Save as `firebase-service-account.json` in project root

### Step 3: Start Server
```bash
npm start
```

You should see:
```
✅ Firebase Cloud Messaging initialized
📱 Real-time notifications enabled via Socket.io
🔥 Firebase Cloud Messaging enabled
```

### Step 4: Test in Browser
1. Go to `http://localhost:3000`
2. Login/Register
3. Click notification bell → "Test Notification"
4. You'll receive a test push notification

## Key Files Modified

### server.js
```javascript
// Firebase initialization
import admin from 'firebase-admin';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send FCM notifications
admin.messaging().send({
  token: userToken,
  notification: {
    title: '🔴 EXPIRED: Milk',
    body: 'Expired 2 days ago!'
  }
});
```

### expiry_alert.html
```javascript
// Request FCM token
function initializeFirebase() {
  fetchFCMToken();
  registerServiceWorker();
}

// Register token with server
sendFCMTokenToServer(userId, token);
```

## Features Enabled

### Real-Time Notifications
✅ Socket.io for instant web updates
✅ FCM for mobile/offline notifications
✅ Notification center in app
✅ Notification history tracking

### Automatic Alerts
✅ Hourly expiration checks
✅ Smart notification deduplication
✅ Configurable alert days
✅ Severity levels (Expired/Critical/Safe)

### Mobile Ready
✅ Background push notifications
✅ Sound + vibration effects
✅ Click-to-open actions
✅ Requires Interaction flag

## Two-Way Notification System

| Channel | Browser | Mobile | Background |
|---------|---------|--------|-----------|
| Socket.io | ✅ | ✅ | ❌ |
| FCM/Push | ✅ | ✅ | ✅ |
| In-App Toast | ✅ | ✅ | N/A |
| Notification Center | ✅ | ✅ | ✅ |

## API Endpoints

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

## Browser Support

| Browser | Notifications | FCM |
|---------|---------------|-----|
| Chrome | ✅ | ✅ |
| Edge | ✅ | ✅ |
| Firefox | ✅ | ⚠️ Limited |
| Safari | ✅ | ❌ |
| Mobile Chrome | ✅ | ✅ |
| Mobile Safari | ✅ | ❌ |

## For Android APK Build

When building APK with Capacitor:

1. Add Firebase JSON to Android project
2. Configure FCM in AndroidManifest.xml
3. The server.js FCM code will automatically work
4. Users get full system notifications

See **MOBILE_DEPLOYMENT.md** for detailed APK build steps.

## Troubleshooting

### "Firebase is not initialized"
→ Upload `firebase-service-account.json` to project root
→ Restart server: `npm start`

### "FCM Token not found"
→ Click **Allow** when browser asks for notification permission
→ Check browser console: `F12 → Console tab`
→ Refresh page after allowing

### "Notification not received"
→ Check notification permission settings
→ Verify `firebase-service-account.json` is valid
→ Check server console for errors

### "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
npm start
```

## Files Structure

```
smart expiry alert/
├── firebase-service-account.json       ← Download from Firebase (REQUIRED)
├── firebase-service-account.json.example  ← Example template
├── server.js                           ← Updated with FCM
├── expiry_alert.html                   ← Updated with FCM
├── database.sql                        ← Updated schema
├── package.json                        ← Updated with firebase-admin
├── .gitignore                          ← Exclude firebase JSON
├── FIREBASE_SETUP.md                   ← Setup guide
├── MOBILE_DEPLOYMENT.md                ← APK guide
├── QUICKSTART.md                       ← Quick start
├── README.md                           ← Full documentation
└── node_modules/                       ← Dependencies
```

## Next Steps

1. ✅ Download `firebase-service-account.json` from Firebase Console
2. ✅ Place in project root
3. ✅ Run `npm install && npm start`
4. ✅ Test notifications
5. ✅ Build APK with Capacitor (see MOBILE_DEPLOYMENT.md)

## Security ⚠️

- Never commit `firebase-service-account.json` to Git
- Keep server API key secret
- Use environment variables in production
- Always use HTTPS in production
- Validate FCM tokens server-side

## Performance

- Notifications sent via worker thread (non-blocking)
- Database indexes optimize query performance
- WAL mode enables concurrent read/write
- Batch operations for multiple notifications

## Production Deployment

Before deploying to production:

1. ✅ Set `NODE_ENV=production`
2. ✅ Use environment variables for Firebase key
3. ✅ Enable HTTPS only
4. ✅ Set strong CORS rules
5. ✅ Use database backups
6. ✅ Monitor notification delivery
7. ✅ Set up error logging

## Success Indicators

You know it's working when:
- ✅ "FCM Token registered" appears in console
- ✅ Test notification is received
- ✅ Expiring items trigger notifications
- ✅ Notifications work even when app is closed
- ✅ Android app receives background notifications

## Support

For issues:
1. Check server console logs
2. Check browser console (F12)
3. Verify firebase-service-account.json exists
4. Try test notification endpoint
5. Restart server

## Version Info

- **Firebase Admin SDK:** 11.11.0
- **Socket.io:** 4.5.4
- **Express:** 4.18.2
- **Database:** SQLite (better-sqlite3)

🎉 Firebase Cloud Messaging is now fully integrated!
