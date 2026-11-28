import { CUSTOM_RUMOUR_PREFIX, kindOf, usedKeys, type ContentKind } from '#lib/content/keys.ts';
import { CONTENT_VERSION } from '#lib/content/versioned.ts';
import type { CampaignInput } from '#lib/generator.ts';
import { renameInTown, type Rename } from '#lib/rename.ts';
import { relationOf, type Kin } from '#lib/tracking.ts';
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

	/** The saved town the party is in, if it's still saved. */
	get partyTown(): Settlement | undefined {
		const id = campaigns.active.partyTownId;
		return id ? this.list.find((t) => t.id === id) : undefined;
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

	/** Renames family surnames in a campaign's saved towns (see `renameInTown`). */
	renameSurnames(campaignId: string, renames: Rename[]) {
		let changed = false;
		const next = this.all.map((town) => {
			if (town.campaignId !== campaignId) return town;
			const renamed = renameInTown(town, renames);
			if (renamed !== town) changed = true;
			return renamed;
		});
		if (!changed) return;
		this.all = next;
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

	/**
	 * What new towns should skip right now: everything used in the campaign
	 * when avoid-repeats is on, and always the DM's own rumours already placed,
	 * so they get spread around instead of repeated.
	 */
	avoidFor(exceptTownId?: string): Set<string> {
		const used = this.usedKeys(undefined, exceptTownId);
		if (campaigns.active.avoidRepeats) return used;
		return new Set([...used].filter((k) => k.startsWith(CUSTOM_RUMOUR_PREFIX)));
	}

	/** Everything the active campaign feeds into generating or rerolling a town. */
	inputFor(version = CONTENT_VERSION, exceptTownId?: string): CampaignInput {
		const campaign = campaigns.active;
		return {
			families: campaigns.familiesFor(campaign, version),
			avoid: this.avoidFor(exceptTownId),
			customRumours: campaign.rumours ?? [],
			rumourMode: campaign.rumourMode ?? 'first'
		};
	}

	/** Where each of the campaign's own rumours has been placed in its saved towns. */
	rumourPlacements(campaignId = campaigns.active.id) {
		const placed = new Map<
			string,
			{ town: string; townId: string; keeper: string; shop: string; told: boolean }[]
		>();
		for (const town of this.inCampaign(campaignId)) {
			for (const shop of town.shops) {
				const key = shop.keeper.rumour?.key;
				if (!key?.startsWith(CUSTOM_RUMOUR_PREFIX)) continue;
				const id = key.slice(CUSTOM_RUMOUR_PREFIX.length);
				const list = placed.get(id) ?? [];
				list.push({
					town: town.name,
					townId: town.id,
					keeper: shop.keeper.firstName,
					shop: shop.name,
					told: !!shop.keeper.rumour?.told
				});
				placed.set(id, list);
			}
		}
		return placed;
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
	 * Other members of a family that the party has met (visited shops in this
	 * campaign's saved towns, this one included), so the DM can say "you've met
	 * my cousin Brunna in Oakford" and know whether Brunna would have good
	 * things to say. Pass the town and shop being shown to leave that keeper out.
	 */
	kinOf(familyId: FamilyRole, townId?: string, shopId?: string) {
		const kin: Kin[] = [];
		for (const town of this.list) {
			const here = town.id === townId;
			for (const shop of town.shops) {
				if (here && shop.id === shopId) continue;
				const relation = relationOf(shop);
				if (shop.keeper.familyId === familyId && relation) {
					kin.push({
						firstName: shop.keeper.firstName,
						town: town.name,
						townId: town.id,
						shop: shop.name,
						relation,
						here
					});
				}
			}
		}
		// Kin in the same town first: "my sister, down the street".
		return kin.sort((a, b) => Number(b.here) - Number(a.here));
	}
}

export const towns = new TownStore();
