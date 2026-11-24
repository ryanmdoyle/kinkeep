import type { FamilyRole, Settlement } from '#lib/types.ts';
import { load, save } from './storage.ts';

const KEY = 'kinkeep:towns';

class TownStore {
	list = $state<Settlement[]>(load<Settlement[]>(KEY, []));

	has(id: string) {
		return this.list.some((t) => t.id === id);
	}

	get(id: string) {
		return this.list.find((t) => t.id === id);
	}

	/** Adds or replaces a town (matched by id). */
	put(town: Settlement) {
		const snapshot = JSON.parse(JSON.stringify(town)) as Settlement;
		const exists = this.has(town.id);
		this.list = exists
			? this.list.map((t) => (t.id === town.id ? snapshot : t))
			: [snapshot, ...this.list];
		save(KEY, this.list);
	}

	remove(id: string) {
		this.list = this.list.filter((t) => t.id !== id);
		save(KEY, this.list);
	}

	replaceAll(list: Settlement[]) {
		this.list = list;
		save(KEY, this.list);
	}

	/**
	 * Other members of a family that the party has met in saved towns, so the
	 * DM can say "you've met my cousin Brunna in Oakford".
	 */
	kinOf(familyId: FamilyRole, exceptTownId?: string) {
		const kin: { firstName: string; town: string; townId: string; shop: string }[] = [];
		for (const town of this.list) {
			if (town.id === exceptTownId) continue;
			for (const shop of town.shops) {
				if (shop.keeper.familyId === familyId) {
					kin.push({
						firstName: shop.keeper.firstName,
						town: town.name,
						townId: town.id,
						shop: shop.name
					});
				}
			}
		}
		return kin;
	}
}

export const towns = new TownStore();
