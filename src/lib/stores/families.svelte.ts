import { defaultFamily } from '#lib/data/families.ts';
import { renameFamilyText, type Rename } from '#lib/rename.ts';
import type { Family, FamilyRole } from '#lib/types.ts';
import { campaigns, familyOverrides } from './campaigns.svelte.ts';
import { towns } from './towns.svelte.ts';

/**
 * The active campaign's families. Built-in families that haven't been
 * changed keep picking up new names, quirks and greetings as they're added;
 * a changed family is the campaign's own copy.
 */
class FamilyStore {
	get list(): Family[] {
		return campaigns.familiesFor(campaigns.active);
	}

	get(id: FamilyRole): Family {
		return this.list.find((f) => f.id === id) ?? defaultFamily(id);
	}

	isCustom(id: FamilyRole): boolean {
		return Boolean(campaigns.active.families[id]);
	}

	/**
	 * Makes a change to the families, then renames any family whose surname
	 * changed in the campaign's saved towns, where it's written into shop
	 * names, greetings, quirks and rumours.
	 */
	private change(apply: () => void) {
		const campaignId = campaigns.active.id;
		const before = this.list;
		apply();
		const after = this.list;
		const renames: Rename[] = before
			.map((f) => ({ from: f.surname, to: after.find((a) => a.id === f.id)?.surname ?? '' }))
			.filter((r) => r.from.trim() && r.to.trim() && r.from !== r.to);
		if (renames.length) towns.renameSurnames(campaignId, renames);
	}

	update(id: FamilyRole, patch: Partial<Family>) {
		const current = this.get(id);
		const next = { ...current, ...patch, id };
		const to = patch.surname?.trim();
		if (to && to !== current.surname) {
			// "Clan Emberforge" becomes "Clan Ironhand", and so on.
			const renamed = renameFamilyText(next, [{ from: current.surname, to }]);
			Object.assign(next, renamed, patch);
		}
		this.change(() => campaigns.setFamily(id, next));
	}

	reset(id?: FamilyRole) {
		this.change(() => {
			if (id) campaigns.setFamily(id, undefined);
			else campaigns.update(campaigns.active.id, { families: {} });
		});
	}

	replaceAll(list: Family[]) {
		this.change(() => campaigns.update(campaigns.active.id, { families: familyOverrides(list) }));
	}
}

export const families = new FamilyStore();
