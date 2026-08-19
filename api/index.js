import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '../backend/src/routes/authRoutes.js';
import roomRoutes from '../backend/src/routes/roomRoutes.js';
import messageRoutes from '../backend/src/routes/messageRoutes.js';
import userRoutes from '../backend/src/routes/userRoutes.js';
import { errorHandler } from '../backend/src/middleware/errorHandler.js';

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Always allow incoming requests from any client domain, preview URL, or direct curl
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Mount routes on both /api/* and /* to handle any Vercel URL rewrite mapping
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/rooms', '/rooms'], roomRoutes);
app.use(['/api/rooms', '/rooms'], messageRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
