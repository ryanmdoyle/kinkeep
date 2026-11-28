import { redirect } from '@sveltejs/kit';
import type { EmailOtpType, User } from '@supabase/supabase-js';
import { safeNext } from '#lib/server/auth.ts';
import { ensureProfile } from '#lib/server/profiles.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/**
 * Where Supabase sends people back to: after Discord or Google (`?code=`), and
 * from the link in a confirmation email (`?token_hash=&type=`, see the email
 * template note in docs/PLAN.md, or `?code=` with Supabase's default template).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const next = safeNext(url.searchParams.get('next'));
	if (!supabase) redirect(303, '/login?error=auth-not-configured');

	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;

	let user: User | null = null;
	if (code) {
		const { data } = await supabase.auth.exchangeCodeForSession(code);
		user = data.user;
	} else if (tokenHash && type) {
		const { data } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		user = data.user;
	}
	if (!user) redirect(303, '/login?error=link');

	await ensureProfile(locals.db, user);
	redirect(303, next);
};
