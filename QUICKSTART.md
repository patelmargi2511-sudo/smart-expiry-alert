# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Node.js
Download and install from https://nodejs.org (LTS version recommended)

### Step 2: Open Terminal/Command Prompt
Navigate to the project folder:
```bash
cd "C:\Users\Margi Patel\Desktop\Desktop\smart expiry alert"
```

### Step 3: Install Dependencies
```bash
npm install
```

This creates a `node_modules` folder and installs all required packages.

### Step 4: Start the Server
```bash
npm start
```

You should see:
```
🎁 EXPIRA Server running on http://localhost:3000
```

### Step 5: Open Browser
Go to: **http://localhost:3000**

## Using the App

### First Time Setup
1. Click "Create one" to register
2. Enter:
   - Username (e.g., `john`)
   - Email (e.g., `john@example.com`)
   - Password (e.g., `password123`)
3. Click "Create Account"
4. Login with your credentials

### Adding Items
1. Click "+ Add Item" button
2. Fill in:
   - **Item Name** (required) - e.g., "Milk", "Passport"
   - **Category** - Food, Medicine, Document, etc.
   - **Quantity** - Number of items
   - **Expiry Date** (required) - When it expires
   - **Purchase Date** - When purchased
   - **Location** - Where it's stored
   - **Description** - Notes/details
3. Click "Save Item"

### Viewing Items
- **Dashboard** - See overview stats and upcoming expirations
- **Items** - Full list of all tracked items
- **Alerts** - View notifications and alerts
- **Settings** - Configure notification preferences

### Managing Items
- **Edit** - Click Edit button to modify
- **Delete** - Click Delete button to remove
- **Search** - Use search bar to find items
- **Filter** - Click tabs to show: All, Safe, Alert, Expired
- **Sort** - Change sort order from dropdown

## Real-Time Features

✓ **Live Updates** - Changes appear instantly across all open windows
✓ **Automatic Alerts** - Get notified when items are about to expire
✓ **Push Notifications** - Browser notifications for expiry alerts
✓ **Statistics** - Dashboard updates in real-time

## Stopping the Server

Press **Ctrl+C** in the terminal

## Development Mode

For auto-reload when editing files:
```bash
npm run dev
```

## Troubleshooting

**Port 3000 already in use?**
Set a different port:
```bash
PORT=3001 npm start
```

**Need to clear data?**
Delete the `expiry_alert.db` file and restart - a fresh database will be created

**Want to see raw data?**
The database is stored in `expiry_alert.db` (SQLite format)

## Next Steps

- Add your first item to start tracking
- Grant browser permission for notifications
- Explore the Settings tab to customize alerts
- Use Search and Filters to organize items

For more details, see **README.md**
