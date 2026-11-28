import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(import.meta.dirname, '../../../prisma/migrations');
const sql = readdirSync(dir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => readFileSync(join(dir, entry.name, 'migration.sql'), 'utf8'))
	.join('\n');

describe('migrations', () => {
	it('turn on row-level security for every table they create', () => {
		const tables = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]);
		expect(tables.length).toBeGreaterThan(10);
		const locked = new Set(
			[...sql.matchAll(/ALTER TABLE "(\w+)" ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1])
		);
		// Supabase would serve any table without it to browsers.
		expect(tables.filter((t) => !locked.has(t))).toEqual([]);
		expect(locked.has('_prisma_migrations')).toBe(true);
	});
});
