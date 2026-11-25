export const OLDEST_SUPPORTED_YEAR = 1950;

export function isValidVehicleYear(year: number, now: Date): boolean {
  return year >= OLDEST_SUPPORTED_YEAR && year <= now.getUTCFullYear() + 1;
}

export function canChangeOdometer(currentKm: number, newKm: number): boolean {
  return newKm >= currentKm;
}
