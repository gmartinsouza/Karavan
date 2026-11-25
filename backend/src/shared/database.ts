import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { ReadinessCheck } from '../modules/health/routes.js';

export type Database = PrismaClient;

export function createDatabase(databaseUrl: string): Database {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export function databaseReadinessCheck(database: Database): ReadinessCheck {
  return {
    name: 'postgres',
    check: async () => {
      await database.$queryRaw`SELECT 1`;
    },
  };
}
