import { createDatabase, type Database } from '../src/shared/database.js';
import { hashPassword } from '../src/modules/auth/password.js';
import type { FuelType, MaintenanceKind } from '../src/generated/prisma/enums.js';

const DEMO_EMAIL = 'demo@caravana.dev';
const DEMO_PASSWORD = 'caravana123';
const DAY_MS = 24 * 60 * 60 * 1000;

function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    between: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    chance: (probability: number) => next() < probability,
    pick: <T>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) {
        throw new Error('lista vazia');
      }
      return item;
    },
  };
}

type Random = ReturnType<typeof createRandom>;

interface VehicleProfile {
  brand: string;
  model: string;
  year: number;
  plate: string;
  fuelType: FuelType;
  initialOdometerKm: number;
  kmPerLiter: number;
  dailyKm: [number, number];
  stations: string[];
  workshop: string;
}

interface ScheduledMaintenance {
  kind: MaintenanceKind;
  item: string;
  everyKm: number;
  cost: [number, number];
  notes: string[];
  reviewPlan?: { name: string; intervalMonths: number };
}

const profiles: VehicleProfile[] = [
  {
    brand: 'Fiat',
    model: 'Argo Drive 1.3',
    year: 2021,
    plate: 'RTB4E21',
    fuelType: 'FLEX',
    initialOdometerKm: 38_420,
    kmPerLiter: 12.6,
    dailyKm: [25, 55],
    stations: ['Auto Posto Avenida', 'Posto Trevo', 'Posto Rota 116'],
    workshop: 'Mecânica Lima',
  },
  {
    brand: 'Toyota',
    model: 'Corolla XEi 2.0',
    year: 2019,
    plate: 'QOK7H90',
    fuelType: 'FLEX',
    initialOdometerKm: 71_300,
    kmPerLiter: 11.2,
    dailyKm: [35, 80],
    stations: ['Posto Bandeirantes', 'Auto Posto Avenida', 'Posto Jardim Europa'],
    workshop: 'Auto Center Pinheiros',
  },
];

const maintenanceSchedule: ScheduledMaintenance[] = [
  {
    kind: 'SERVICE',
    item: 'Troca de óleo e filtro de óleo',
    everyKm: 10_000,
    cost: [280, 420],
    notes: ['Óleo 5W30 sintético', 'Óleo 0W20, filtro original'],
    reviewPlan: { name: 'Troca de óleo', intervalMonths: 12 },
  },
  {
    kind: 'SERVICE',
    item: 'Alinhamento e balanceamento',
    everyKm: 10_000,
    cost: [120, 180],
    notes: ['Volante puxando para a direita', 'Rodízio dos pneus feito junto'],
    reviewPlan: { name: 'Alinhamento e balanceamento', intervalMonths: 12 },
  },
  {
    kind: 'PART',
    item: 'Pastilhas de freio dianteiras',
    everyKm: 25_000,
    cost: [260, 390],
    notes: ['Discos ainda dentro da medida', 'Barulho ao frear em descida'],
  },
  {
    kind: 'PART',
    item: 'Filtro de ar do motor',
    everyKm: 15_000,
    cost: [60, 110],
    notes: ['Filtro bem sujo, muita estrada de terra'],
  },
  {
    kind: 'PART',
    item: 'Filtro de cabine (ar-condicionado)',
    everyKm: 15_000,
    cost: [70, 120],
    notes: ['Cheiro de mofo no ar-condicionado'],
  },
];

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function seedVehicle(
  database: Database,
  userId: string,
  profile: VehicleProfile,
  random: Random,
  startDate: Date,
  endDate: Date,
) {
  const vehicle = await database.vehicle.create({
    data: {
      userId,
      brand: profile.brand,
      model: profile.model,
      year: profile.year,
      plate: profile.plate,
      fuelType: profile.fuelType,
      odometerKm: profile.initialOdometerKm,
    },
  });

  const fuelings = [];
  const maintenances = [];
  const lastDone = new Map<string, { at: Date; km: number }>();
  const nextDueKm = new Map(
    maintenanceSchedule.map((scheduled) => [
      scheduled.item,
      profile.initialOdometerKm + random.int(1_000, scheduled.everyKm),
    ]),
  );

  let odometerKm = profile.initialOdometerKm;
  let litersUsedSinceLastFill = 0;
  let pricePerLiter = 5.89;
  let date = new Date(startDate);
  let daysUntilNextFill = random.int(6, 13);
  let nextDate = new Date(date.getTime() + daysUntilNextFill * DAY_MS);

  while (nextDate <= endDate) {
    const distanceKm = Math.round(daysUntilNextFill * random.between(...profile.dailyKm));
    const tripKmPerLiter = profile.kmPerLiter * random.between(0.9, 1.08);
    litersUsedSinceLastFill += distanceKm / tripKmPerLiter;
    odometerKm += distanceKm;
    date = nextDate;
    date.setHours(random.int(7, 21), random.int(0, 59), 0, 0);

    pricePerLiter = roundTo(
      Math.min(6.59, Math.max(5.69, pricePerLiter + random.between(-0.08, 0.1))),
      3,
    );
    const fullTank = random.chance(0.8);
    const liters = roundTo(
      fullTank ? litersUsedSinceLastFill : litersUsedSinceLastFill * random.between(0.4, 0.7),
      3,
    );
    litersUsedSinceLastFill -= liters;

    fuelings.push({
      vehicleId: vehicle.id,
      filledAt: new Date(date),
      liters,
      pricePerLiter,
      totalCost: roundTo(liters * pricePerLiter, 2),
      odometerKm,
      station: random.pick(profile.stations),
      fullTank,
    });

    for (const scheduled of maintenanceSchedule) {
      const dueKm = nextDueKm.get(scheduled.item) ?? Number.POSITIVE_INFINITY;
      if (odometerKm < dueKm) {
        continue;
      }
      const performedAt = new Date(date.getTime() + random.int(1, 3) * DAY_MS);
      if (performedAt > endDate) {
        continue;
      }
      performedAt.setHours(random.int(8, 17), 0, 0, 0);
      maintenances.push({
        vehicleId: vehicle.id,
        kind: scheduled.kind,
        item: scheduled.item,
        performedAt,
        odometerKm,
        cost: roundTo(random.between(...scheduled.cost), 2),
        workshop: profile.workshop,
        notes: random.chance(0.7) ? random.pick(scheduled.notes) : null,
      });
      lastDone.set(scheduled.item, { at: performedAt, km: odometerKm });
      nextDueKm.set(scheduled.item, odometerKm + scheduled.everyKm);
    }

    daysUntilNextFill = random.int(6, 13);
    nextDate = new Date(date.getTime() + daysUntilNextFill * DAY_MS);
  }

  await database.fueling.createMany({ data: fuelings });
  await database.maintenance.createMany({ data: maintenances });
  await database.vehicle.update({ where: { id: vehicle.id }, data: { odometerKm } });

  const reviewPlans = maintenanceSchedule.flatMap((scheduled) => {
    if (!scheduled.reviewPlan) {
      return [];
    }
    const done = lastDone.get(scheduled.item) ?? { at: startDate, km: profile.initialOdometerKm };
    return [
      {
        vehicleId: vehicle.id,
        name: scheduled.reviewPlan.name,
        intervalKm: scheduled.everyKm,
        intervalMonths: scheduled.reviewPlan.intervalMonths,
        lastDoneAt: done.at,
        lastDoneKm: done.km,
      },
    ];
  });
  await database.reviewPlan.createMany({ data: reviewPlans });

  return {
    label: `${profile.brand} ${profile.model} (${profile.plate})`,
    fuelings: fuelings.length,
    maintenances: maintenances.length,
    reviewPlans: reviewPlans.length,
    odometerKm,
  };
}

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ?? 'postgresql://caravana:caravana@localhost:5432/caravana';
  const database = createDatabase(databaseUrl);
  const random = createRandom(2026);
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 365 * DAY_MS);

  try {
    await database.user.deleteMany({ where: { email: DEMO_EMAIL } });
    const user = await database.user.create({
      data: {
        email: DEMO_EMAIL,
        name: 'Motorista Demo',
        passwordHash: await hashPassword(DEMO_PASSWORD),
      },
    });

    for (const profile of profiles) {
      const summary = await seedVehicle(database, user.id, profile, random, startDate, endDate);
      console.log(
        `${summary.label}: ${summary.fuelings} abastecimentos, ${summary.maintenances} manutenções, ` +
          `${summary.reviewPlans} planos de revisão, odômetro final ${summary.odometerKm} km`,
      );
    }
    console.log(`Usuário: ${DEMO_EMAIL} / senha: ${DEMO_PASSWORD}`);
  } finally {
    await database.$disconnect();
  }
}

await main();
