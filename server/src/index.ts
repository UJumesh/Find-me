import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { seedDatabase } from './db/seed';
import { authRoutes } from './routes/authRoutes';
import { categoryRoutes } from './routes/categoryRoutes';
import { aiRoutes } from './routes/aiRoutes';
import { bookingRoutes } from './routes/bookingRoutes';
import { providerRoutes } from './routes/providerRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { reviewRoutes } from './routes/reviewRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { initSocketHandler } from './sockets/socketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB schema & ensure seed data exists
initDatabase();
const dbCheck = require('./db/database').db;
const catCount = dbCheck.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
if (catCount.count === 0) {
  console.log('Database empty, auto-seeding initial categories & demo providers...');
  seedDatabase();
}

// Initialize Socket.io handlers
initSocketHandler(io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Find Me Hyperlocal AI Marketplace',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve Frontend Apps
const clientDir = path.resolve(__dirname, '../../client');
const workerDir = path.resolve(__dirname, '../../worker_app');
const adminDir = path.resolve(__dirname, '../../admin_panel');
const assetsDir = path.resolve(__dirname, '../../assets');

app.use('/worker', express.static(workerDir));
app.use('/admin', express.static(adminDir));
app.use('/assets', express.static(assetsDir));
app.use('/', express.static(clientDir));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
=====================================================
🚀 FIND ME - AI Hyperlocal Marketplace is Running!
📡 Port: http://localhost:${PORT}
-----------------------------------------------------
📱 Customer App:       http://localhost:${PORT}/
👷 Worker/Provider App: http://localhost:${PORT}/worker/
🛡️ Admin Console:       http://localhost:${PORT}/admin/
🔌 REST & WebSocket:   http://localhost:${PORT}/api/
=====================================================
  `);
});
