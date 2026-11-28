import type { User } from '@supabase/supabase-js';
import type { Db } from './db.ts';

/** A name to show for someone: what their sign-in provider calls them, else their email's first part. */
export function displayNameFor(user: Pick<User, 'email' | 'user_metadata'>): string {
	const meta = user.user_metadata ?? {};
	const candidates = [meta.full_name, meta.name, meta.user_name, user.email?.split('@')[0]];
	const name = candidates.find((c): c is string => typeof c === 'string' && c.trim().length > 0);
	return name?.trim() ?? 'Dungeon Master';
}

/** Makes sure someone who just signed in has a profile row. Leaves an existing one alone. */
export async function ensureProfile(db: Db, user: Pick<User, 'id' | 'email' | 'user_metadata'>) {
	await db.profile.upsert({
		where: { id: user.id },
		create: { id: user.id, displayName: displayNameFor(user) },
		update: {}
	});
}
