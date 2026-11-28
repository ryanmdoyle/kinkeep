import { defineConfig } from 'prisma/config';

// Prisma 7 doesn't read .env on its own. Migrations use DIRECT_URL (the
// Supabase direct or session-pooler connection, not the transaction pooler);
// `prisma generate` doesn't need it.
try {
	process.loadEnvFile();
} catch {
	// No .env file: use the environment as it is.
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: { path: 'prisma/migrations' },
	datasource: { url: process.env.DIRECT_URL }
});
