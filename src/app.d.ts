// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Db } from '#lib/server/db.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/**
			 * Supabase for this request, reading and refreshing the sign-in cookies.
			 * Null when PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY aren't
			 * set (the generator still works; signing in doesn't).
			 */
			supabase: SupabaseClient | null;
			/** Who's signed in, checked against Supabase's signing keys. */
			user: SignedInUser | null;
			/** Postgres for this request. Opened the first time it's used. */
			readonly db: Db;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface SignedInUser {
		id: string;
		email?: string;
	}
}

export {};
