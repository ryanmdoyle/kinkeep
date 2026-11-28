import { defineEnvVars } from '@sveltejs/kit/env';

/** Optional: unset means the app runs without accounts (the generator still works). */
const optional = (value: string | undefined) => value?.trim() || undefined;

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: {
		public: true,
		description: "Your Supabase project's URL (Project Settings → API).",
		schema: optional
	},
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
		public: true,
		description:
			"Supabase's publishable (anon) key. Browsers see it; row-level security keeps it away from every table.",
		schema: optional
	}
});
