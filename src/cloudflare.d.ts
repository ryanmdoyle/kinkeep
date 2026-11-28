// The parts of the Workers runtime module the app uses. The Worker's bindings
// are set in wrangler.jsonc. (`npx wrangler types` can generate the full
// runtime types if more is needed.)
declare module 'cloudflare:workers' {
	export const env: {
		/** Postgres through Hyperdrive. Missing when the Worker has no Hyperdrive binding. */
		HYPERDRIVE?: { connectionString: string };
	};
	/** Keeps the Worker running until `promise` settles, after the response is sent. */
	export function waitUntil(promise: Promise<unknown>): void;
}
