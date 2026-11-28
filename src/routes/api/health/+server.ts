import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const prerender = false;

/** Checks the Worker can reach Postgres through Hyperdrive, and says who's signed in. */
export const GET: RequestHandler = async ({ locals }) => {
	const [{ now }] = await locals.db.$queryRaw<{ now: Date }[]>`select now()`;
	const migrations = await locals.db.$queryRaw<{ name: string }[]>`
		select migration_name as name from "_prisma_migrations"
		where finished_at is not null order by finished_at`;
	return json({
		ok: true,
		databaseTime: now,
		migrations: migrations.map((m) => m.name),
		auth: locals.supabase ? 'configured' : 'not configured',
		signedIn: Boolean(locals.user)
	});
};
