import { kindOf, usedKeys, type ContentKind } from '#lib/content/keys.ts';
import type { FamilyRole, Settlement } from '#lib/types.ts';
import { campaigns, TOWNS_KEY } from './campaigns.svelte.ts';
import { load, save } from './storage.ts';

class TownStore {
	/** Every saved town in every campaign. */
	all = $state<Settlement[]>(load<Settlement[]>(TOWNS_KEY, []));

	/** Saved towns in the active campaign. */
	get list(): Settlement[] {
		const id = campaigns.active.id;
		return this.all.filter((t) => t.campaignId === id);
	}

	inCampaign(campaignId: string): Settlement[] {
		return this.all.filter((t) => t.campaignId === campaignId);
	}

	has(id: string) {
		return this.all.some((t) => t.id === id);
	}

	get(id: string) {
		return this.all.find((t) => t.id === id);
	}

	/** Adds or replaces a town (matched by id). Towns without a campaign join the active one. */
	put(town: Settlement) {
		const snapshot = JSON.parse(JSON.stringify(town)) as Settlement;
		snapshot.campaignId ??= campaigns.active.id;
		const exists = this.has(town.id);
		this.all = exists
			? this.all.map((t) => (t.id === town.id ? snapshot : t))
			: [snapshot, ...this.all];
		save(TOWNS_KEY, this.all);
	}

	remove(id: string) {
		this.all = this.all.filter((t) => t.id !== id);
		save(TOWNS_KEY, this.all);
	}

	removeCampaign(campaignId: string) {
		this.all = this.all.filter((t) => t.campaignId !== campaignId);
		save(TOWNS_KEY, this.all);
	}

	/**
	 * Names, quirks and rumours already used in a campaign's saved towns. New
	 * towns skip these while there are unused ones left. Leave out a town by id
	 * to reroll inside it.
	 */
	usedKeys(campaignId = campaigns.active.id, exceptTownId?: string): Set<string> {
		const keys = new Set<string>();
		for (const town of this.inCampaign(campaignId)) {
			if (town.id === exceptTownId) continue;
			for (const key of usedKeys(town)) keys.add(key);
		}
		return keys;
	}

	/** What the avoid-repeats rule should skip right now (empty when it's off). */
	avoidFor(exceptTownId?: string): Set<string> {
		return campaigns.active.avoidRepeats ? this.usedKeys(undefined, exceptTownId) : new Set();
	}

	/** How much of each kind of content a campaign has used. */
	usage(campaignId: string): Record<ContentKind, number> {
		const counts: Record<ContentKind, number> = {
			town: 0,
			shop: 0,
			keeper: 0,
			quirk: 0,
			rumour: 0
		};
		for (const key of this.usedKeys(campaignId)) counts[kindOf(key)]++;
		return counts;
	}

	/**
	 * Other members of a family that the party has met in this campaign's saved
	 * towns, so the DM can say "you've met my cousin Brunna in Oakford".
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
