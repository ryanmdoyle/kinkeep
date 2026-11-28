import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { isProvider, PROVIDERS, safeNext } from '#lib/server/auth.ts';
import { ensureProfile } from '#lib/server/profiles.ts';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

const NOT_CONFIGURED = "Signing in isn't set up on this server yet.";

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	return {
		configured: Boolean(locals.supabase),
		providers: PROVIDERS.map((p) => ({ ...p })),
		problem: url.searchParams.get('error')
	};
};

function credentials(form: FormData) {
	const email = String(form.get('email') ?? '').trim();
	const password = String(form.get('password') ?? '');
	return { email, password, missing: !email || !password };
}

export const actions = {
	signin: async ({ request, locals, url }) => {
		if (!locals.supabase) return fail(503, { message: NOT_CONFIGURED });
		const { email, password, missing } = credentials(await request.formData());
		if (missing) return fail(400, { email, message: 'Enter your email and password.' });

		const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { email, message: error.message });
		await ensureProfile(locals.db, data.user);
		redirect(303, safeNext(url.searchParams.get('next')));
	},

	signup: async ({ request, locals, url }) => {
		if (!locals.supabase) return fail(503, { message: NOT_CONFIGURED });
		const { email, password, missing } = credentials(await request.formData());
		if (missing) return fail(400, { email, message: 'Enter an email and a password.' });

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: `${url.origin}/auth/callback` }
		});
		if (error) return fail(400, { email, message: error.message });
		// With email confirmation off, they're signed in already.
		if (data.session && data.user) {
			await ensureProfile(locals.db, data.user);
			redirect(303, safeNext(url.searchParams.get('next')));
		}
		return { email, sent: true };
	},

	oauth: async ({ request, locals, url }) => {
		if (!locals.supabase) return fail(503, { message: NOT_CONFIGURED });
		const provider = (await request.formData()).get('provider');
		if (!isProvider(provider)) return fail(400, { message: 'Pick a way to sign in.' });

		const back = new URL('/auth/callback', url.origin);
		back.searchParams.set('next', safeNext(url.searchParams.get('next')));
		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: back.href }
		});
		if (error || !data.url) return fail(400, { message: error?.message ?? 'That didn’t work.' });
		// Off to Supabase, which sends them on to Discord or Google. Only its origin is allowed.
		redirect(303, data.url, { external: [new URL(PUBLIC_SUPABASE_URL!).origin] });
	}
} satisfies Actions;
