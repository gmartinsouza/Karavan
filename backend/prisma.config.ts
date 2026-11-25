import { defineConfig } from 'prisma/config';

const localDatabaseUrl = 'postgresql://caravana:caravana@localhost:5432/caravana';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl,
  },
});
