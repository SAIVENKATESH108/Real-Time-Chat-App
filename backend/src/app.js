import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Enable CORS with support for credentials / cookies across localhost and vercel.app domains
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  })
);

// Parsers (10MB limit for avatar image data and attachments)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    appName: 'chatO',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes (Mounted on both /api/... and /... for universal compatibility)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/rooms', '/rooms'], roomRoutes);
app.use(['/api/rooms', '/rooms'], messageRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
