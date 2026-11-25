import { z } from 'zod';
import { problems } from './errors.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().min(1).optional().describe('valor de nextCursor da página anterior'),
});

export interface Cursor {
  sortValue: string;
  id: string;
}

const cursorSchema = z.object({ sortValue: z.string(), id: z.uuid() });

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(encoded: string): Cursor {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return cursorSchema.parse(decoded);
  } catch {
    throw problems.badRequest('invalid-cursor', 'Cursor de paginação inválido.');
  }
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function toPage<T>(rows: T[], limit: number, cursorOf: (row: T) => Cursor): Page<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const hasMore = rows.length > limit;
  return { items, nextCursor: hasMore && last ? encodeCursor(cursorOf(last)) : null };
}

export function pageResponse<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}
