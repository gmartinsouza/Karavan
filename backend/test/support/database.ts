import { inject } from 'vitest';
import { createDatabase, type Database } from '../../src/shared/database.js';

export function connectTestDatabase(): Database {
  return createDatabase(inject('databaseUrl'));
}

export async function resetDatabase(database: Database) {
  await database.$executeRaw`TRUNCATE users, refresh_tokens, vehicles, fuelings, maintenances, review_plans CASCADE`;
}

export async function createUser(database: Database, email = 'motorista@example.com') {
  return database.user.create({ data: { email, name: 'Motorista', passwordHash: 'x' } });
}

export async function createVehicle(database: Database, userId: string, plate = 'ABC1D23') {
  return database.vehicle.create({
    data: {
      userId,
      brand: 'Fiat',
      model: 'Argo',
      year: 2021,
      plate,
      fuelType: 'FLEX',
      odometerKm: 1000,
    },
  });
}
