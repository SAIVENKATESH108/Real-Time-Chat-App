import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { initSocketServer } from './sockets/index.js';
import prisma from './config/db.js';

const server = http.createServer(app);

// Initialize Socket.io real-time engine
const io = initSocketServer(server);

// Export io and server for testing
export { server, io };

// Start listening if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, async () => {
    console.log(`========================================`);
    console.log(`🚀 chatO Backend Server running on port ${config.port}`);
    console.log(`🌐 Environment: ${config.nodeEnv}`);
    console.log(`💬 Socket.io real-time engine active`);
    console.log(`========================================`);

    // Verify database connection
    try {
      await prisma.$connect();
      console.log('✅ Connected to PostgreSQL database via Prisma');
    } catch (dbErr) {
      console.error('❌ Database connection error:', dbErr.message);
      console.error('👉 Make sure PostgreSQL is running (e.g. docker-compose up -d) and DATABASE_URL is correct.');
    }
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      io.close();
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server and database connections closed cleanly.');
        process.exit(0);
      });
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
