/**
 * Player view hides everything only the DM should see (rumours and whether
 * they're true, quirks, bargaining, notes, standing, the DM's buttons), so a
 * town can be shown to the players or printed as a handout.
 */
class ViewStore {
	players = $state(false);

	toggle(on = !this.players) {
		this.players = on;
	}
}

export const view = new ViewStore();
