import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { error, type RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import { env, waitUntil } from 'cloudflare:workers';
import { createDb, type Db } from '#lib/server/db.ts';

/** Supabase for one request, keeping its sign-in cookies in step with the browser's. */
function supabaseFor(event: RequestEvent): SupabaseClient | null {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});
}

/** Who's signed in. The token is checked against Supabase's signing keys, not just read. */
async function signedIn(supabase: SupabaseClient | null): Promise<SignedInUser | null> {
	if (!supabase) return null;
	const { data, error: problem } = await supabase.auth.getClaims();
	if (problem || !data?.claims.sub) return null;
	return { id: data.claims.sub, email: data.claims.email };
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = supabaseFor(event);
	event.locals.user = await signedIn(event.locals.supabase);

	// Opened the first time something uses it, so pages that don't need the
	// database (the generator) never connect.
	let db: Db | undefined;
	Object.defineProperty(event.locals, 'db', {
		get(): Db {
			if (db) return db;
			const connectionString = env.HYPERDRIVE?.connectionString;
			if (!connectionString) error(503, 'The database is not configured.');
			db = createDb(connectionString);
			return db;
		}
	});

	try {
		return await resolve(event, {
			// Supabase reads these when it runs in the browser after a server load.
			filterSerializedResponseHeaders: (name) =>
				name === 'content-range' || name === 'x-supabase-api-version'
		});
	} finally {
		// Close the connection after the response is on its way.
		if (db) waitUntil(db.$disconnect());
	}
};
