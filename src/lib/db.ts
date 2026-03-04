import { PrismaClient } from '@/generated/prisma/client';
import { PrismaNeonHttp } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

// Disable Next.js fetch caching for all Neon HTTP queries.
// Without this, Next.js caches fetch() responses used by the Neon HTTP adapter,
// causing stale reads after writes.
neonConfig.fetchFunction = (url: string, init: RequestInit) => {
  return fetch(url, { ...init, cache: 'no-store' });
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaNeonHttp(connectionString, { fullResults: true });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
