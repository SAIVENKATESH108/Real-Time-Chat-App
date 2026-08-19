import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

let prisma;

if (config.isProduction) {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // Prevent multiple instances of Prisma Client in development / test hot reload
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

export default prisma;
