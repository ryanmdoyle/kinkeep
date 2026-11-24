import { hashString } from '#lib/hash.ts';
import type { FamilyRole, Settlement } from '#lib/types.ts';

/**
 * Content keys name the bits of a town that should feel unique within a
 * campaign: town names, shop names, shopkeepers, quirk lines and rumour
 * lines. A campaign's "used" list is just every key in its saved towns, so
 * forgetting a town frees its content up again.
 */
const short = (text: string) => hashString(text).toString(36);

/** Keys of a campaign's own rumours start with this. */
export const CUSTOM_RUMOUR_PREFIX = 'rumour:custom:';

export const contentKey = {
	town: (name: string) => `town:${name}`,
	shop: (name: string) => `shop:${name}`,
	keeper: (familyId: FamilyRole, firstName: string) => `keeper:${familyId}:${firstName}`,
	/** Keyed by the template line, before {surname}/{color} are filled in. */
	quirk: (familyId: FamilyRole, template: string) => `quirk:${familyId}:${short(template)}`,
	/** Keyed by the template line, before {place}/{person}/... are filled in. */
	rumour: (template: string) => `rumour:${short(template)}`,
	/** A campaign's own rumour, keyed by id so editing its wording keeps its history. */
	customRumour: (id: string) => `${CUSTOM_RUMOUR_PREFIX}${id}`
};

export type ContentKind = 'town' | 'shop' | 'keeper' | 'quirk' | 'rumour';

export function kindOf(key: string): ContentKind {
	return key.slice(0, key.indexOf(':')) as ContentKind;
}

/** Every content key a town uses. Pass `exceptShopId` to leave one shop out. */
export function usedKeys(town: Settlement, exceptShopId?: string): string[] {
	const out = [contentKey.town(town.name)];
	for (const shop of town.shops) {
		if (shop.id === exceptShopId) continue;
		out.push(contentKey.shop(shop.name));
		out.push(contentKey.keeper(shop.keeper.familyId, shop.keeper.firstName));
		out.push(...(shop.keeper.quirkKeys ?? []));
		if (shop.keeper.rumour?.key) out.push(shop.keeper.rumour.key);
	}
	return out;
}
