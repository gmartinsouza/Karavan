const PLATE_PATTERN = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function normalizePlate(input: string): string | null {
  const plate = input.toUpperCase().replace(/[\s-]/g, '');
  return PLATE_PATTERN.test(plate) ? plate : null;
}
