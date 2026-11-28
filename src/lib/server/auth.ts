/** Sign-in services offered alongside email and password (each is switched on in Supabase). */
export const PROVIDERS = [
	{ id: 'discord', label: 'Discord' },
	{ id: 'google', label: 'Google' }
] as const;

export type Provider = (typeof PROVIDERS)[number]['id'];

export function isProvider(value: unknown): value is Provider {
	return PROVIDERS.some((p) => p.id === value);
}

/** Where to go after signing in: only ever a page on this site. */
export function safeNext(next: string | null | undefined): string {
	return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}
