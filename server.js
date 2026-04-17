import path from "path";
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Database = require('better-sqlite3');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../'));
app.use(express.static(path.join(process.cwd())));
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "expiry_alert.html"));
});

// Database setup
const dbPath = path.join(__dirname, 'expiry_alert.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

let firebaseInitialized = false;

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Cloud Messaging initialized');
    } else {
      console.log('⚠️  Firebase service account JSON not found. Notifications via FCM disabled.');
    }
  } catch (err) {
    console.log('⚠️  Firebase initialization skipped:', err.message);
  }
};

// Initialize database schema
const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      fcm_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#FF6B6B',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER DEFAULT 1,
      unit TEXT,
      expiry_date DATE NOT NULL,
      purchase_date DATE,
      location TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER,
      type TEXT,
      message TEXT,
      read_status INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      email_alerts INTEGER DEFAULT 1,
      push_alerts INTEGER DEFAULT 1,
      alert_days_before INTEGER DEFAULT 7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_expiry ON items(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
  `);
  console.log('✅ Database schema initialized');
};

// Authentication endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  try {
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, passwordHash);
    
    const prefs = db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)');
    prefs.run(result.lastInsertRowid);

    res.json({ 
      success: true, 
      userId: result.lastInsertRowid,
      message: 'User registered successfully'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?');
    const user = stmt.get(username, passwordHash);
    
    if (user) {
      res.json({ 
        success: true, 
        userId: user.id,
        username: user.username,
        email: user.email
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Item CRUD endpoints
app.post('/api/items', (req, res) => {
  const { userId, categoryId, name, description, quantity, unit, expiryDate, purchaseDate, location } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO items (user_id, category_id, name, description, quantity, unit, expiry_date, purchase_date, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, categoryId, name, description, quantity, unit, expiryDate, purchaseDate, location);

    // Send real-time notification via Socket.io
    io.to(`user_${userId}`).emit('item_added', {
      id: result.lastInsertRowid,
      name,
      expiryDate,
      message: `✅ Item "${name}" added`
    });

    // Send FCM notification if Firebase is initialized
    if (firebaseInitialized) {
      const userStmt = db.prepare('SELECT fcm_token FROM users WHERE id = ?');
      const user = userStmt.get(userId);
      
      if (user && user.fcm_token) {
        admin.messaging().send({
          token: user.fcm_token,
          notification: {
            title: 'Item Added',
            body: `${name} added to your inventory`
          },
          data: {
            itemId: result.lastInsertRowid.toString(),
            itemName: name
          }
        }).catch(err => console.log('FCM send error:', err.message));
      }
    }

    res.json({ success: true, itemId: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/items/:userId', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM items WHERE user_id = ? ORDER BY expiry_date ASC');
    const items = stmt.all(req.params.userId);
    res.json({ success: true, items });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/items/:itemId', (req, res) => {
  const { name, description, quantity, unit, expiryDate, purchaseDate, location, status } = req.body;
  try {
    const stmt = db.prepare(`
      UPDATE items 
      SET name = ?, description = ?, quantity = ?, unit = ?, expiry_date = ?, 
          purchase_date = ?, location = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, description, quantity, unit, expiryDate, purchaseDate, location, status, req.params.itemId);

    const itemStmt = db.prepare('SELECT user_id FROM items WHERE id = ?');
    const item = itemStmt.get(req.params.itemId);
    
    if (item) {
      io.to(`user_${item.user_id}`).emit('item_updated', { id: req.params.itemId, message: `✏️ Item updated` });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/items/:itemId', (req, res) => {
  try {
    const itemStmt = db.prepare('SELECT user_id, name FROM items WHERE id = ?');
    const item = itemStmt.get(req.params.itemId);
    
    if (item) {
      const stmt = db.prepare('DELETE FROM items WHERE id = ?');
      stmt.run(req.params.itemId);
      
      io.to(`user_${item.user_id}`).emit('item_deleted', { 
        id: req.params.itemId, 
        message: `🗑️ Item "${item.name}" deleted` 
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// FCM token endpoint
app.post('/api/users/fcm-token', (req, res) => {
  const { userId, fcmToken } = req.body;
  try {
    const stmt = db.prepare('UPDATE users SET fcm_token = ? WHERE id = ?');
    stmt.run(fcmToken, userId);
    res.json({ success: true, message: 'FCM token registered' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Test notification endpoint
app.post('/api/notifications/send-test', (req, res) => {
  const { userId } = req.body;
  try {
    if (!firebaseInitialized) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase not initialized. Add firebase-service-account.json' 
      });
    }

    const userStmt = db.prepare('SELECT fcm_token FROM users WHERE id = ?');
    const user = userStmt.get(userId);

    if (!user || !user.fcm_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'No FCM token found for user' 
      });
    }

    admin.messaging().send({
      token: user.fcm_token,
      notification: {
        title: '🧪 Test Notification',
        body: 'Your notification system is working correctly!'
      },
      data: {
        type: 'test'
      }
    }).then(() => {
      res.json({ success: true, message: 'Test notification sent' });
    }).catch(err => {
      res.status(400).json({ success: false, error: err.message });
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('📱 New client connected:', socket.id);

  socket.on('user_login', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`✅ User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('📴 Client disconnected:', socket.id);
  });
});

// Automatic expiration checker (runs every hour)
setInterval(() => {
  try {
    const alertDays = 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + alertDays);

    const stmt = db.prepare(`
      SELECT DISTINCT u.id, u.fcm_token, i.id as item_id, i.name 
      FROM items i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.expiry_date <= ? AND i.status = 'active'
    `);
    const expiringItems = stmt.all(futureDate.toISOString().split('T')[0]);

    expiringItems.forEach(item => {
      // Socket.io notification
      io.to(`user_${item.id}`).emit('expiry_alert', {
        itemId: item.item_id,
        itemName: item.name,
        message: `⚠️ "${item.name}" is expiring soon!`
      });

      // FCM notification
      if (firebaseInitialized && item.fcm_token) {
        admin.messaging().send({
          token: item.fcm_token,
          notification: {
            title: '⚠️ Item Expiring Soon',
            body: `${item.name} is expiring within ${alertDays} days`
          },
          data: {
            itemId: item.item_id.toString(),
            itemName: item.name
          }
        }).catch(err => console.log('FCM error:', err.message));
      }

      // Log notification
      const logStmt = db.prepare('INSERT INTO notifications (user_id, item_id, type, message) VALUES (?, ?, ?, ?)');
      logStmt.run(item.id, item.item_id, 'expiry_alert', `${item.name} is expiring soon`);
    });

    if (expiringItems.length > 0) {
      console.log(`🔔 Checked ${expiringItems.length} expiring items`);
    }
  } catch (err) {
    console.error('Expiration check error:', err);
  }
}, 3600000); // 1 hour

// Initialize and start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  initSchema();
  initializeFirebase();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🔌 Socket.io ready for real-time notifications`);
});

module.exports = server;
