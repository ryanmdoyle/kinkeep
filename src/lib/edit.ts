import { renameText } from '#lib/rename.ts';
import type { Family, Settlement, Shop, Shopkeeper } from '#lib/types.ts';

/**
 * Hand edits to a town: renaming shops and keepers (to match a published
 * adventure, say) and removing shops.
 */

export interface NamePatch {
	/** The shop's new name. Blank keeps the old one. */
	shopName?: string;
	/** The keeper's new first name. Blank keeps the old one. */
	firstName?: string;
	/**
	 * The keeper's own surname, shown instead of the family's ("Sildar
	 * Hallwinter" while still one of the family). Blank goes back to the
	 * family's surname.
	 */
	surname?: string;
}

/** A keeper's full name: their own surname if they have one, else the family's. */
export function keeperName(keeper: Pick<Shopkeeper, 'firstName' | 'surname'>, family?: Family) {
	const surname = keeper.surname ?? family?.surname;
	return surname ? `${keeper.firstName} ${surname}` : keeper.firstName;
}

/**
 * Renames a shop and/or its keeper. A new first name also replaces the old
 * one in the shop's name ("Brodda's Forge" becomes "Sildar's Forge") unless
 * the shop is being renamed at the same time. A shop the DM names keeps that
 * name through rerolls.
 */
export function renameShop(settlement: Settlement, shopId: string, patch: NamePatch): Settlement {
	return {
		...settlement,
		shops: settlement.shops.map((shop) => (shop.id === shopId ? applyNames(shop, patch) : shop))
	};
}

function applyNames(shop: Shop, patch: NamePatch): Shop {
	let next: Shop = { ...shop, keeper: { ...shop.keeper } };
	const shopName = patch.shopName?.trim();
	if (shopName && shopName !== shop.name) next = { ...next, name: shopName, fixedName: true };

	const firstName = patch.firstName?.trim();
	if (firstName && firstName !== shop.keeper.firstName) {
		next.keeper.firstName = firstName;
		if (!shopName) {
			next.name = renameText(next.name, [{ from: shop.keeper.firstName, to: firstName }]);
		}
	}

	if (patch.surname !== undefined) {
		const surname = patch.surname.trim();
		if (surname) next.keeper.surname = surname;
		else delete next.keeper.surname;
	}
	return next;
}

/**
 * Takes a shop out of the town. In a town from a book the shop is gone; in a
 * generated town it still exists but isn't written up any more (so "Detail
 * one" can bring a new one back).
 */
export function removeShop(settlement: Settlement, shopId: string): Settlement {
	const shop = settlement.shops.find((s) => s.id === shopId);
	if (!shop) return settlement;
	const shops = settlement.shops.filter((s) => s.id !== shopId);
	if (!settlement.fromBook) return { ...settlement, shops };
	const shopTotals = { ...settlement.shopTotals };
	const left = (shopTotals[shop.type] ?? 1) - 1;
	if (left > 0) shopTotals[shop.type] = left;
	else delete shopTotals[shop.type];
	return { ...settlement, shops, shopTotals };
}
