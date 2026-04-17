# Mobile App Deployment & Notifications

## APK/Android App Notifications - Will They Work?

### Current Setup (Web Browser)
- ✅ **Browser Push Notifications** work in Chrome, Firefox, Edge
- ✅ Uses Web Notifications API + Socket.io
- ✅ Works on Android browsers
- ❌ **Does NOT work in standalone APK** without additional setup

### Converting to Native Android APK

There are several approaches:

## Option 1: Web Wrapper APK (Easiest) ⭐ RECOMMENDED

### How It Works
- Wrap the web app in Android using **Android WebView**
- Runs the same `expiry_alert.html` inside an Android container
- Still has limitation: notifications only work if app is active

### Tools
- **Android Studio** + WebView
- **Capacitor** (by Ionic)
- **Cordova** (older, still works)
- **React Native Web**
- **Flutter Web**

### Setup with Capacitor (Easiest)

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Add Android
npx cap add android

# Copy web files
npx cap copy

# Build APK
npx cap build android
```

### Will Notifications Work?
- ✅ If app is **open** - YES
- ❌ If app is **closed** - Needs native implementation
- ⚠️ Limited to in-app toasts on Android

---

## Option 2: Native Notifications (Better) ⭐ RECOMMENDED FOR PRODUCTION

### How It Works
- Use **Firebase Cloud Messaging (FCM)**
- Server sends push notifications via FCM
- Works even when app is **closed**
- Creates native notifications with sound/vibration

### Required Changes

#### Backend (server.js)
```javascript
import admin from 'firebase-admin';

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project.firebaseio.com"
});

// Send push notification
async function sendPushNotification(userId, title, body) {
  const userToken = await db.prepare(
    'SELECT fcm_token FROM users WHERE id = ?'
  ).get(userId);
  
  if (userToken) {
    await admin.messaging().send({
      webpush: {
        notification: {
          title: title,
          body: body,
          icon: 'https://yourserver.com/icon.png',
          click_action: 'https://yourserver.com'
        }
      },
      token: userToken.fcm_token
    });
  }
}
```

#### Mobile App Side
```javascript
// Get FCM token from user device
firebase.messaging().getToken().then(token => {
  // Send token to server
  fetch('/api/users/fcm-token', {
    method: 'POST',
    body: JSON.stringify({ userId, fcmToken: token })
  });
});

// Listen for notifications when app is closed
firebase.messaging().onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

### Will Notifications Work?
- ✅ If app is **open** - YES
- ✅ If app is **closed** - YES ⭐
- ✅ Works in background
- ✅ Sound, vibration, LED support

---

## Option 3: Hybrid Approach (Recommended)

### Combine Both
1. **Web browser notifications** - for web users
2. **FCM notifications** - for Android APK users
3. **Socket.io live updates** - when app is open

### Flowchart
```
When item expires:
  ├─ Send to Socket.io → Web users get instant notification
  ├─ Send to FCM → Android app users get system notification
  └─ Store in DB → Show in notifications center
```

---

## Step-by-Step: Make APK with Notifications

### Step 1: Setup Firebase Project
```
1. Go to https://console.firebase.google.com
2. Create new project (e.g., "expira-app")
3. Enable Firestore Database
4. Enable Cloud Messaging
5. Download service account JSON
```

### Step 2: Update Backend
```bash
npm install firebase-admin
```

### Step 3: Modify server.js
```javascript
import admin from 'firebase-admin';
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Store FCM tokens
app.post('/api/users/fcm-token', (req, res) => {
  const { userId, fcmToken } = req.body;
  db.prepare(`
    UPDATE users SET fcm_token = ? WHERE id = ?
  `).run(fcmToken, userId);
  res.json({ success: true });
});

// Send notification function
async function notifyExpiringItems() {
  const items = db.prepare(`
    SELECT DISTINCT u.fcm_token, i.name, i.expiry_date
    FROM items i
    JOIN users u ON i.user_id = u.id
    WHERE i.expiry_date BETWEEN date('now') AND date('now', '+7 days')
    AND u.fcm_token IS NOT NULL
  `).all();

  for (const item of items) {
    await admin.messaging().send({
      token: item.fcm_token,
      notification: {
        title: `⏰ ${item.name} Expiring Soon!`,
        body: `Expires on ${item.expiry_date}`
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'default'
        }
      }
    });
  }
}

setInterval(notifyExpiringItems, 3600000); // Every hour
```

### Step 4: Build APK with Capacitor

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Add Android
npx cap add android

# Copy files
npx cap copy

# Open Android Studio
npx cap open android
```

### Step 5: Configure Android Manifest
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<service android:name="com.google.firebase.messaging.FirebaseMessagingService">
  <intent-filter>
    <action android:name="com.google.firebase.MESSAGING_EVENT" />
  </intent-filter>
</service>
```

### Step 6: Build APK in Android Studio
```
1. Build → Generate Signed APK
2. Select keystore (create if doesn't exist)
3. Choose release version
4. APK will be in app/release/app-release.apk
```

---

## Comparison Table

| Feature | Web | WebView APK | Native APK + FCM |
|---------|-----|-----------|-----------------|
| Browser Notifications | ✅ | ⚠️ Limited | ✅ Full |
| Background Notifications | ❌ | ❌ | ✅ |
| Sound/Vibration | ✅ | ⚠️ | ✅ |
| When App Closed | ❌ | ❌ | ✅ |
| Setup Difficulty | Easy | Medium | Hard |
| Cost | Free | Free | Free |
| Performance | Good | Good | Excellent |

---

## Quick Answer: Will Notifications Work in APK?

### ❌ **Without FCM Setup**
- Only works when app is **open**
- No background notifications
- Limited to in-app alerts

### ✅ **With FCM Setup**
- Works when app is **open or closed**
- Proper Android notifications
- Sound, vibration, LED effects
- Professional user experience

---

## Recommended Path for You

### For Quick Testing
1. Use Capacitor WebView wrapper
2. Keep web app as-is
3. Test on Android device
4. Notifications work in-app

### For Production
1. Setup Firebase Cloud Messaging
2. Modify server.js to send FCM notifications
3. Build native APK with Capacitor
4. Users get background notifications even when app closed

---

## Files You'll Need to Create

```
expiry_alert/
├── firebase-service-account.json   (from Firebase Console)
├── android/                        (created by Capacitor)
├── capacitor.config.ts             (Capacitor configuration)
└── server.js                       (modified with FCM)
```

---

## Resources

- **Capacitor Guide**: https://capacitorjs.com/docs/android
- **Firebase Messaging**: https://firebase.google.com/docs/cloud-messaging
- **Android Studio**: https://developer.android.com/studio

---

## Summary

| Question | Answer |
|----------|--------|
| Will APK send notifications? | ❌ No (without Firebase) / ✅ Yes (with Firebase) |
| Do I need to change the app? | ✅ Yes, add FCM backend code |
| Is it hard? | Medium difficulty |
| How long to implement? | 2-4 hours |
| Is it worth it? | ✅ Yes, for production apps |
