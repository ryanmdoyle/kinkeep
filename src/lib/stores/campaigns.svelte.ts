import { defaultFamiliesAt } from '#lib/data/families.ts';
import { CONTENT_VERSION } from '#lib/content/versioned.ts';
import type {
	Campaign,
	CustomRumour,
	Family,
	FamilyRole,
	RumourMode,
	Settlement
} from '#lib/types.ts';
import { load, save } from './storage.ts';

const KEY = 'kinkeep:campaigns';
const ACTIVE_KEY = 'kinkeep:campaign';
/** Pre-campaign storage, migrated into the first campaign. */
const LEGACY_FAMILIES_KEY = 'kinkeep:families';
export const TOWNS_KEY = 'kinkeep:towns';

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function newId(): string {
	return Math.random().toString(36).slice(2, 10);
}

/** Keeps only families that differ from the built-ins, so the rest pick up new content. */
export function familyOverrides(list: Family[]): Campaign['families'] {
	const defaults = defaultFamiliesAt(CONTENT_VERSION);
	const out: Campaign['families'] = {};
	for (const family of list) {
		const def = defaults.find((d) => d.id === family.id);
		if (!def) continue;
		const merged = { ...clone(def), ...family };
		if (JSON.stringify(merged) !== JSON.stringify(def)) out[family.id] = merged;
	}
	return out;
}

export function makeCampaign(name: string, families: Campaign['families'] = {}): Campaign {
	return {
		id: newId(),
		name,
		createdAt: new Date().toISOString(),
		families: clone(families),
		avoidRepeats: true
	};
}

/**
 * First run after campaigns were added: put the existing families and saved
 * towns into a first campaign so nothing is lost.
 */
function initial(): Campaign[] {
	const saved = load<Campaign[]>(KEY, []);
	if (saved.length) return saved;

	const first = makeCampaign(
		'My campaign',
		familyOverrides(load<Family[]>(LEGACY_FAMILIES_KEY, []))
	);
	const towns = load<Settlement[]>(TOWNS_KEY, []);
	if (towns.some((t) => !t.campaignId)) {
		save(
			TOWNS_KEY,
			towns.map((t) => ({ ...t, campaignId: t.campaignId ?? first.id }))
		);
	}
	save(KEY, [first]);
	return [first];
}

class CampaignStore {
	list = $state<Campaign[]>(initial());
	activeId = $state<string>(load<string>(ACTIVE_KEY, ''));

	get active(): Campaign {
		return this.list.find((c) => c.id === this.activeId) ?? this.list[0];
	}

	get(id: string): Campaign | undefined {
		return this.list.find((c) => c.id === id);
	}

	select(id: string) {
		this.activeId = id;
		save(ACTIVE_KEY, id);
	}

	/** Adds a campaign (or replaces one with the same id, e.g. from a backup). */
	put(campaign: Campaign) {
		const exists = this.list.some((c) => c.id === campaign.id);
		this.list = exists
			? this.list.map((c) => (c.id === campaign.id ? clone(campaign) : c))
			: [...this.list, clone(campaign)];
		save(KEY, this.list);
	}

	create(name: string, families: Campaign['families'] = {}): Campaign {
		const campaign = makeCampaign(name.trim() || 'New campaign', families);
		this.put(campaign);
		this.select(campaign.id);
		return campaign;
	}

	update(id: string, patch: Partial<Omit<Campaign, 'id'>>) {
		this.list = this.list.map((c) => (c.id === id ? { ...c, ...patch, id } : c));
		save(KEY, this.list);
	}

	/** Removes the campaign record. The caller removes its towns. Keeps at least one. */
	remove(id: string) {
		this.list = this.list.filter((c) => c.id !== id);
		if (!this.list.length) this.list = [makeCampaign('My campaign')];
		save(KEY, this.list);
		if (this.activeId === id) this.select(this.list[0].id);
	}

	/** The campaign's families: built-ins at `version`, with the campaign's changes on top. */
	familiesFor(campaign: Campaign = this.active, version = CONTENT_VERSION): Family[] {
		return defaultFamiliesAt(version).map((def) => campaign.families[def.id] ?? def);
	}

	/** Adds rumours to the active campaign's bank (one per non-empty line of text). */
	addRumours(lines: string[], truth: CustomRumour['truth'], roles: FamilyRole[]) {
		const added = lines
			.map((text) => text.trim())
			.filter(Boolean)
			.map((text) => ({ id: newId(), text, truth, roles: [...roles] }));
		const campaign = this.active;
		this.update(campaign.id, { rumours: [...(campaign.rumours ?? []), ...added] });
		return added.length;
	}

	updateRumour(id: string, patch: Partial<Omit<CustomRumour, 'id'>>) {
		const campaign = this.active;
		this.update(campaign.id, {
			rumours: (campaign.rumours ?? []).map((r) => (r.id === id ? { ...r, ...patch, id } : r))
		});
	}

	removeRumour(id: string) {
		const campaign = this.active;
		this.update(campaign.id, { rumours: (campaign.rumours ?? []).filter((r) => r.id !== id) });
	}

	setRumourMode(mode: RumourMode) {
		this.update(this.active.id, { rumourMode: mode });
	}

	setFamily(role: FamilyRole, family: Family | undefined, campaign: Campaign = this.active) {
		const families = { ...campaign.families };
		if (family) families[role] = clone({ ...family, id: role });
		else delete families[role];
		this.update(campaign.id, { families });
	}
}

export const campaigns = new CampaignStore();
