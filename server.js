import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Database Setup
const db = new Database('expiry_alert.db');
db.pragma('journal_mode = WAL');

// Firebase Cloud Messaging Setup
let firebaseInitialized = false;
const initializeFirebase = () => {
  try {
    const serviceAccountPath = './firebase-service-account.json';
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Cloud Messaging initialized');
    } else {
      console.log('⚠️  firebase-service-account.json not found. FCM disabled. See FIREBASE_SETUP.md for setup.');
    }
  } catch (err) {
    console.log('⚠️  Firebase initialization skipped:', err.message);
  }
};

// Initialize database schema
const initSchema = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      fcm_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#b89a5a',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER DEFAULT 1,
      unit TEXT DEFAULT 'units',
      expiry_date DATE NOT NULL,
      purchase_date DATE,
      location TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read_status BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      email_alerts BOOLEAN DEFAULT 1,
      push_alerts BOOLEAN DEFAULT 1,
      alert_days_before INTEGER DEFAULT 7,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_expiry_date ON items(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
  `;
  
  schema.split(';').forEach(stmt => {
    if (stmt.trim()) db.exec(stmt);
  });
};

initSchema();

// User authentication
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, password);
    
    // Create default notification preferences
    db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)')
      .run(user.lastInsertRowid);
    
    res.json({ success: true, userId: user.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?')
      .get(username, password);
    
    if (!user) throw new Error('Invalid credentials');
    res.json({ success: true, userId: user.id, username: user.username });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// FCM Token Management
app.post('/api/users/fcm-token', (req, res) => {
  const { userId, fcmToken } = req.body;
  try {
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'Missing userId or fcmToken' });
    }
    db.prepare('UPDATE users SET fcm_token = ? WHERE id = ?')
      .run(fcmToken, userId);
    res.json({ success: true, message: 'FCM token saved' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Send test notification
app.post('/api/notifications/send-test', (req, res) => {
  const { userId } = req.body;
  try {
    if (!firebaseInitialized) {
      return res.status(400).json({ error: 'Firebase not initialized. Set up firebase-service-account.json' });
    }
    
    const user = db.prepare('SELECT fcm_token FROM users WHERE id = ?').get(userId);
    if (!user || !user.fcm_token) {
      return res.status(400).json({ error: 'User has no FCM token' });
    }

    admin.messaging().send({
      token: user.fcm_token,
      notification: {
        title: '✅ EXPIRA Test Notification',
        body: 'FCM is working! You will receive real alerts.',
        imageUrl: 'https://emoji.uc.cn/static/img/2e/5e/2e5e37be3a9b6b43e29f51b689dd60c1_280w.png'
      },
      webpush: {
        fcmOptions: {
          link: 'http://localhost:3000'
        }
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    }).then(() => {
      res.json({ success: true, message: 'Test notification sent!' });
    }).catch(err => {
      res.status(400).json({ error: err.message });
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Item management
app.post('/api/items', (req, res) => {
  const { user_id, name, category_id, expiry_date, quantity, unit, location, description } = req.body;
  try {
    const item = db.prepare(`
      INSERT INTO items (user_id, name, category_id, expiry_date, quantity, unit, location, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, name, category_id, expiry_date, quantity, unit, location, description);
    
    // Emit real-time notification
    io.emit('item_added', { 
      id: item.lastInsertRowid, 
      name, 
      expiry_date,
      user_id 
    });

    // Send FCM notification if available
    if (firebaseInitialized) {
      const user = db.prepare('SELECT fcm_token FROM users WHERE id = ?').get(user_id);
      if (user && user.fcm_token) {
        admin.messaging().send({
          token: user.fcm_token,
          notification: {
            title: `✅ Item Added: ${name}`,
            body: `Expires on ${expiry_date}`
          },
          webpush: {
            fcmOptions: {
              link: 'http://localhost:3000'
            }
          }
        }).catch(err => console.error('FCM send error:', err.message));
      }
    }
    
    res.json({ success: true, id: item.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/items/:userId', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT 
        i.*, 
        c.name as category_name,
        CAST((julianday(i.expiry_date) - julianday('now')) AS INTEGER) as days_left
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.user_id = ? AND i.status = 'active'
      ORDER BY i.expiry_date ASC
    `).all(req.params.userId);
    
    res.json(items);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/items/:itemId', (req, res) => {
  const { name, category_id, expiry_date, quantity, unit, location } = req.body;
  try {
    db.prepare(`
      UPDATE items 
      SET name = ?, category_id = ?, expiry_date = ?, quantity = ?, unit = ?, location = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category_id, expiry_date, quantity, unit, location, req.params.itemId);
    
    io.emit('item_updated', { id: req.params.itemId, ...req.body });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/items/:itemId', (req, res) => {
  try {
    db.prepare('UPDATE items SET status = ? WHERE id = ?').run('deleted', req.params.itemId);
    io.emit('item_deleted', { id: req.params.itemId });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Notifications
app.get('/api/notifications/:userId', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT n.*, i.name as item_name
      FROM notifications n
      LEFT JOIN items i ON n.item_id = i.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.params.userId);
    
    res.json(notifications);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/notifications/:notifId/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read_status = 1 WHERE id = ?').run(req.params.notifId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Categories
app.post('/api/categories', (req, res) => {
  const { user_id, name, color } = req.body;
  try {
    const category = db.prepare(`
      INSERT INTO categories (user_id, name, color)
      VALUES (?, ?, ?)
    `).run(user_id, name, color);
    
    res.json({ success: true, id: category.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/categories/:userId', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM categories
      WHERE user_id = ?
      ORDER BY name ASC
    `).all(req.params.userId);
    
    res.json(categories);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stats endpoint
app.get('/api/stats/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    
    const expired = db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE user_id = ? AND expiry_date < date('now') AND status = 'active'
    `).get(userId).count;
    
    const expiring = db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE user_id = ? 
      AND expiry_date BETWEEN date('now') AND date('now', '+7 days')
      AND status = 'active'
    `).get(userId).count;
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE user_id = ? AND status = 'active'
    `).get(userId).count;
    
    const safe = total - expired - expiring;
    
    res.json({ expired, expiring, safe, total });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Socket.io Real-time Events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('new_item', (data) => {
    io.to(`user_${data.user_id}`).emit('notification', {
      type: 'item_created',
      message: `New item added: ${data.name}`,
      timestamp: new Date()
    });
  });

  socket.on('item_expiring', (data) => {
    io.to(`user_${data.user_id}`).emit('notification', {
      type: 'expiration_alert',
      message: `${data.name} expires in ${data.days_left} days!`,
      severity: 'warning',
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Check for expiring items every hour
setInterval(() => {
  const alertDays = 7;
  const expiringItems = db.prepare(`
    SELECT i.id, i.user_id, i.name, 
      CAST((julianday(i.expiry_date) - julianday('now')) AS INTEGER) as days_left
    FROM items i
    WHERE i.status = 'active'
    AND i.expiry_date BETWEEN date('now') AND date('now', '+${alertDays} days')
    AND NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE item_id = i.id AND type = 'expiration_alert' 
      AND date(created_at) = date('now')
    )
  `).all();

  expiringItems.forEach(item => {
    const notification = db.prepare(`
      INSERT INTO notifications (user_id, item_id, type, message)
      VALUES (?, ?, 'expiration_alert', ?)
    `).run(item.user_id, item.id, `${item.name} expires in ${item.days_left} days`);

    // Send Socket.io notification
    io.to(`user_${item.user_id}`).emit('notification', {
      id: notification.lastInsertRowid,
      type: 'expiration_alert',
      message: `${item.name} expires in ${item.days_left} days`,
      severity: item.days_left <= 1 ? 'danger' : 'warning',
      timestamp: new Date()
    });

    // Send FCM notification if available
    if (firebaseInitialized) {
      const user = db.prepare('SELECT fcm_token FROM users WHERE id = ?').get(item.user_id);
      if (user && user.fcm_token) {
        const severity = item.days_left < 0 ? '⛔ EXPIRED' : item.days_left <= 1 ? '🔴 CRITICAL' : '⚠️ ALERT';
        admin.messaging().send({
          token: user.fcm_token,
          notification: {
            title: `${severity}: ${item.name}`,
            body: item.days_left < 0 ? `Expired ${Math.abs(item.days_left)} days ago!` : `Expires in ${item.days_left} days`
          },
          webpush: {
            fcmOptions: {
              link: 'http://localhost:3000'
            }
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'expiration_alerts'
            }
          }
        }).catch(err => console.error('FCM error:', err.message));
      }
    }
  });
}, 3600000); // Every hour

const PORT = process.env.PORT || 5000;
initializeFirebase();
server.listen(PORT, () => {
  console.log(`🎁 EXPIRA Server running on http://localhost:${PORT}`);
  console.log(`📱 Real-time notifications enabled via Socket.io`);
  console.log(firebaseInitialized ? '🔥 Firebase Cloud Messaging enabled' : '⚠️  Firebase disabled - see FIREBASE_SETUP.md');
});
