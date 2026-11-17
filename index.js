const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const fleetRoutes = require('./routes/fleet');
const driverRoutes = require('./routes/drivers');
const routeRoutes = require('./routes/routes');
const tripRoutes = require('./routes/trips');
const trackingRoutes = require('./routes/tracking');
const allocationRoutes = require('./routes/allocations');
const attendanceRoutes = require('./routes/attendance');
const incidentRoutes = require('./routes/incidents');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Integrated Institutional Transport Tracking System',
    db_type: db.getDbType()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Fallback for Single Page App routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

let server = null;

async function startServer() {
  await db.ensureInit();

  // Check if database needs initial schema
  try {
    const testRes = await db.query(`SELECT COUNT(*) as cnt FROM users`);
    if (parseInt(testRes.rows[0]?.cnt || 0) === 0) {
      console.log('[STARTUP] Database empty. Running initial seeding...');
      const seedDatabase = require('./scripts/seed');
      await seedDatabase();
    }
  } catch (err) {
    console.log('[STARTUP] Tables not found. Initializing schema and seed data...');
    const runMigrations = require('./scripts/migrate');
    const seedDatabase = require('./scripts/seed');
    await runMigrations();
    await seedDatabase();
  }

  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`================================================================`);
      console.log(` Integrated Institutional Transport Tracking System`);
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` Database: ${db.getDbType().toUpperCase()}`);
      console.log(`================================================================`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
