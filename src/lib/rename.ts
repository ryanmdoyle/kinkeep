import type { Family, Settlement, Shop } from '#lib/types.ts';

/**
 * A family's surname is written into its shop names, greetings and quirks
 * (and other families' rumours, via {kin}) when a town is built. Keeper names
 * read the surname live, so after renaming a family the saved text has to be
 * updated to match.
 */
export interface Rename {
	from: string;
	to: string;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces whole-word surnames, including plurals ("the Pennywhistles") and
 * possessives ("Emberforge's"). All renames happen at once, so swapping two
 * names works.
 */
export function renameText(text: string, renames: Rename[]): string {
	const active = renames.filter((r) => r.from.trim() && r.from !== r.to);
	if (!active.length) return text;
	const to = new Map(active.map((r) => [r.from, r.to]));
	// Longest first, so "Veyl" never wins over "Veylstar".
	const names = [...to.keys()].sort((a, b) => b.length - a.length).map(escape);
	const pattern = new RegExp(`(?<!\\p{L})(${names.join('|')})(?=s?(?!\\p{L}))`, 'gu');
	return text.replace(pattern, (match) => to.get(match) ?? match);
}

function renameShop(shop: Shop, renames: Rename[]): Shop {
	const { keeper } = shop;
	return {
		...shop,
		name: renameText(shop.name, renames),
		keeper: {
			...keeper,
			greeting: renameText(keeper.greeting, renames),
			quirks: keeper.quirks.map((q) => renameText(q, renames)),
			rumour: keeper.rumour && { ...keeper.rumour, text: renameText(keeper.rumour.text, renames) }
		}
	};
}

/** The town with surnames renamed, or the same object if nothing changed. */
export function renameInTown(town: Settlement, renames: Rename[]): Settlement {
	const next = { ...town, shops: town.shops.map((s) => renameShop(s, renames)) };
	return JSON.stringify(next) === JSON.stringify(town) ? town : next;
}

/** A family's own descriptions with its old surname replaced ("Clan Emberforge" and so on). */
export function renameFamilyText(family: Family, renames: Rename[]): Family {
	const r = (text: string) => renameText(text, renames);
	return {
		...family,
		groupName: r(family.groupName),
		signature: r(family.signature),
		personality: r(family.personality),
		voice: r(family.voice),
		greetings: family.greetings.map(r),
		quirks: family.quirks.map(r),
		shopNames: family.shopNames.map(r)
	};
}
