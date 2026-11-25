// Formatos dos dados que a API devolve. Espelham os schemas Zod do back-end.

export type FuelType = 'GASOLINE' | 'ETHANOL' | 'FLEX' | 'DIESEL' | 'CNG' | 'ELECTRIC';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Session {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

// Listas paginadas: nextCursor é null quando não há mais páginas
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  fuelType: FuelType;
  odometerKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface Fueling {
  id: string;
  vehicleId: string;
  filledAt: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometerKm: number;
  station: string | null;
  fullTank: boolean;
  createdAt: string;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  kind: 'PART' | 'SERVICE';
  item: string;
  performedAt: string;
  odometerKm: number;
  cost: number;
  workshop: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  vehicleId: string;
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastDoneAt: string;
  lastDoneKm: number;
  status: 'ok' | 'due_soon' | 'overdue';
  dueKm: number | null;
  dueDate: string | null;
  remainingKm: number | null;
  remainingDays: number | null;
}

export interface Stats {
  fuelingCount: number;
  totalLiters: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  distanceKm: number;
  averageKmPerLiter: number | null;
  costPerKm: number | null;
  consumption: {
    fuelingId: string;
    filledAt: string;
    distanceKm: number;
    liters: number;
    kmPerLiter: number;
    costPerKm: number;
  }[];
  monthly: { month: string; fuelCost: number; maintenanceCost: number; liters: number }[];
}
