import { defaultFamily } from '#lib/data/families.ts';
import type { Family, FamilyRole } from '#lib/types.ts';
import { campaigns, familyOverrides } from './campaigns.svelte.ts';

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

	update(id: FamilyRole, patch: Partial<Family>) {
		campaigns.setFamily(id, { ...this.get(id), ...patch, id });
	}

	reset(id?: FamilyRole) {
		if (id) campaigns.setFamily(id, undefined);
		else campaigns.update(campaigns.active.id, { families: {} });
	}

	replaceAll(list: Family[]) {
		campaigns.update(campaigns.active.id, { families: familyOverrides(list) });
	}
}

export const families = new FamilyStore();
