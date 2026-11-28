import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma/client.ts';

export type Db = PrismaClient;

/**
 * A Prisma client for one request. A Worker can't reuse a database connection
 * across requests, so each request opens its own through Hyperdrive, which
 * keeps the real connections to Postgres warm and pooled.
 */
export function createDb(connectionString: string): Db {
	return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
