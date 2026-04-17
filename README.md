# EXPIRA — Smart Expiry Alert System

A full-stack real-time expiry tracking application with database persistence, real-time notifications, and mobile-responsive UI.

## Features

✅ **Relational Database** - SQLite3 with user management, items, categories, and notifications
✅ **Real-time Notifications** - Socket.io for instant updates via WebSockets
✅ **Mobile-Friendly UI** - Responsive design works on phones, tablets, and desktops
✅ **User Authentication** - Secure login/registration system
✅ **Item Management** - Add, edit, delete items with expiry tracking  
✅ **Smart Alerts** - Automatic notifications for expiring/expired items
✅ **Categories** - Organize items by type (Food, Medicine, Documents, etc.)
✅ **Search & Filter** - Find items quickly with search and status filters
✅ **Dashboard** - Real-time stats showing expired, expiring, and safe items
✅ **Notification History** - View all alerts and notifications
✅ **Settings** - Configure alert preferences and notification types

## Project Structure

```
smart expiry alert/
├── package.json              # Node.js dependencies
├── server.js                 # Express server with Socket.io
├── database.sql              # Database schema (SQLite)
├── expiry_alert.html         # Frontend (responsive UI)
└── expiry_alert.db           # SQLite database (auto-created)
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- **express** - Web framework
- **socket.io** - Real-time bidirectional communication
- **sqlite3** - Relational database
- **cors** - Cross-origin requests
- **body-parser** - JSON parsing

### 2. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

Server runs on **http://localhost:3000** by default (or PORT env variable)

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Database Architecture

### Users Table
- `id` - Unique identifier
- `username` - Unique username
- `email` - User email
- `password_hash` - Hashed password
- `created_at` - Account creation timestamp

### Items Table
- `id` - Unique identifier
- `user_id` - Owner of the item (FK to users)
- `category_id` - Item category (FK to categories)
- `name` - Item name
- `description` - Optional notes
- `quantity` - Number of items
- `unit` - Unit of measurement
- `expiry_date` - Expiration date
- `purchase_date` - When purchased
- `location` - Storage location
- `status` - active/deleted
- `created_at`, `updated_at` - Timestamps

### Categories Table
- `id` - Unique identifier
- `user_id` - Owner (FK to users)
- `name` - Category name
- `color` - Display color
- `created_at` - Created timestamp

### Notifications Table
- `id` - Unique identifier
- `user_id` - Recipient (FK to users)
- `item_id` - Related item (FK to items)
- `type` - expiration_alert, reminder, etc.
- `message` - Notification text
- `read_status` - Read/unread flag
- `created_at` - Timestamp

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login user

### Items
- `GET /api/items/:userId` - Get all items for user
- `POST /api/items` - Create new item
- `PUT /api/items/:itemId` - Update item
- `DELETE /api/items/:itemId` - Delete item (soft delete)

### Notifications
- `GET /api/notifications/:userId` - Get user notifications
- `PUT /api/notifications/:notifId/read` - Mark as read

### Categories
- `GET /api/categories/:userId` - Get user categories
- `POST /api/categories` - Create new category

### Stats
- `GET /api/stats/:userId` - Get dashboard stats

## Socket.io Events

### Client → Server
- `join_room` - User joins their notification room
- `new_item` - Broadcast new item added
- `item_expiring` - Send expiration alert

### Server → Client
- `notification` - Real-time alert/notification
- `item_added` - New item broadcast
- `item_updated` - Item modification broadcast
- `item_deleted` - Item deletion broadcast

## Frontend Features

### Authentication Screen
- Login with username/password
- Registration with new account creation
- Secure token storage in localStorage

### Dashboard
- Overview stats: Expired, Expiring, Safe, Total items
- Calendar view showing upcoming expirations
- Real-time updates via WebSocket

### Items Management
- Add items with name, expiry date, category
- Edit existing items
- Delete items
- Search by name, category, or notes
- Filter by status: All, Safe, Alert, Expired
- Sort by: Days Left, Name, Category, Date Added

### Notifications
- Real-time push notifications
- In-app notification center
- Notification history
- Mark as read

### Settings
- Alert days before expiry
- Enable/disable email alerts
- Enable/disable push notifications

## Mobile Responsiveness

The UI adapts to all screen sizes:
- **Desktop** (>768px): Full sidebar, multi-column layout
- **Tablet** (600-768px): Collapsible sidebar, optimized spacing
- **Mobile** (<600px): Hidden sidebar toggle, single-column layout, touch-friendly buttons

## Real-time Features

✓ Automatic expiration checks every hour
✓ Socket.io broadcasts for multi-client sync
✓ Browser push notifications when items expire
✓ Live notifications in app
✓ Instant updates when items are added/edited/deleted by any user

## Expiration Logic

Items are automatically categorized:
- **EXPIRED** - Days left < 0
- **CRITICAL/ALERT** - Days left ≤ 7 (configurable)
- **SAFE** - Days left > 7

## Browser Notifications

The app requests permission for browser push notifications:
- Shows alerts when items expire
- Can work even when browser tab is closed (if OS supports)
- Configurable in browser settings

## Security Notes

- Passwords are stored as plain text (for demo - use bcrypt in production)
- User data is isolated via `user_id` foreign keys
- CORS enabled for development (configure in production)
- Database uses WAL mode for better concurrency

## Customization

### Add New Categories
Edit the item form in expiry_alert.html:
```javascript
const categories = ['Food', 'Medicine', 'Document', 'Cosmetic', 'Finance', 'Electronics', 'Other'];
```

### Change Alert Window
Modify in server.js:
```javascript
alert_days_before INTEGER DEFAULT 7
```

### Adjust Check Frequency
Change in server.js:
```javascript
setInterval(() => { ... }, 3600000); // 1 hour
```

## Troubleshooting

**Cannot connect to server**
- Ensure server is running: `npm start`
- Check port 3000 is not in use
- Verify browser can access http://localhost:3000

**Database errors**
- Delete `expiry_alert.db` to reset
- Ensure `better-sqlite3` is installed
- Check file permissions in project directory

**Notifications not working**
- Grant browser permission when prompted
- Check browser console for errors
- Verify Socket.io is connected (check Network tab)

**Items not syncing in real-time**
- Ensure Socket.io is loaded: Check `<script src="socket.io">` 
- Verify server is broadcasting events
- Check browser console for connectivity issues

## Performance Tips

- Database indexes optimize queries on `user_id`, `expiry_date`, `status`
- WAL mode allows read/write concurrency
- Notifications debounced to prevent spam
- UI updates batched for performance

## Future Enhancements

- [ ] Export/import CSV
- [ ] Recurring items
- [ ] Barcode scanning
- [ ] Photo attachments
- [ ] Sharing lists with family
- [ ] Mobile app (React Native)
- [ ] Email digest notifications
- [ ] Calendar integration

## License

MIT - Free to use and modify

## Support

For issues or questions, file a GitHub issue or contact support.

---

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Technology Stack:** Node.js • Express • Socket.io • SQLite • Vanilla JS
