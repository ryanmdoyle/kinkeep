import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	user: locals.user,
	/** Whether signing in is set up on this server. */
	accounts: Boolean(locals.supabase)
});
