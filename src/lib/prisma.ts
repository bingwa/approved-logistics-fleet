// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as { prisma?: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],          // optional: ['query','info','warn','error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;   // prevent new instances on hot-reload
}

export default prisma;               // <<< default export
