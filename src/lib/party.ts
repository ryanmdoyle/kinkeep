import { partyPrices, purchases, relationOf, remaining } from '#lib/tracking.ts';
import type { FamilyRole, Relation, Rumour, Settlement, StockItem } from '#lib/types.ts';

/**
 * Everything the party has done across a campaign's saved towns, gathered
 * for the Party page.
 */

interface Where {
	shopId: string;
	shop: string;
	townId: string;
	town: string;
}

export interface KeeperEntry extends Where {
	familyId: FamilyRole;
	firstName: string;
	/** The keeper's own surname, if the DM gave them one. */
	surname?: string;
	visited: boolean;
	/** Undefined until the party has visited. */
	relation?: Relation;
	note?: string;
	bought: { name: string; count: number }[];
}

/** Every keeper in the towns, grouped by family: those the party has met first. */
export function keepersByFamily(towns: Settlement[]): Map<FamilyRole, KeeperEntry[]> {
	const out = new Map<FamilyRole, KeeperEntry[]>();
	for (const town of towns) {
		for (const shop of town.shops) {
			const list = out.get(shop.keeper.familyId) ?? [];
			list.push({
				familyId: shop.keeper.familyId,
				firstName: shop.keeper.firstName,
				surname: shop.keeper.surname,
				shopId: shop.id,
				shop: shop.name,
				townId: town.id,
				town: town.name,
				visited: !!shop.visited,
				relation: relationOf(shop),
				note: shop.keeper.note,
				bought: purchases(shop)
			});
			out.set(shop.keeper.familyId, list);
		}
	}
	for (const list of out.values()) list.sort((a, b) => Number(b.visited) - Number(a.visited));
	return out;
}

export interface HeardRumour extends Where {
	rumour: Rumour;
	keeper: string;
	surname?: string;
	familyId: FamilyRole;
}

/** Rumours marked as told to the party. */
export function heardRumours(towns: Settlement[]): HeardRumour[] {
	return towns.flatMap((town) =>
		town.shops
			.filter((shop) => shop.keeper.rumour?.told)
			.map((shop) => ({
				rumour: shop.keeper.rumour!,
				keeper: shop.keeper.firstName,
				surname: shop.keeper.surname,
				familyId: shop.keeper.familyId,
				shopId: shop.id,
				shop: shop.name,
				townId: town.id,
				town: town.name
			}))
	);
}

export interface PendingOrder extends Where {
	name: string;
	price: number;
	wait: string;
	/** The day it was ordered (YYYY-MM-DD). */
	at: string;
	keeper: string;
	surname?: string;
	familyId: FamilyRole;
}

/** Special orders the party has placed and not collected, oldest first. */
export function pendingOrders(towns: Settlement[], standingPrices = true): PendingOrder[] {
	return towns
		.flatMap((town) =>
			town.shops.flatMap((shop) => {
				const { factor } = partyPrices(shop, standingPrices);
				return shop.specialOrders
					.filter((o) => o.order && !o.order.collected)
					.map((o) => ({
						name: o.name,
						price: o.price * factor,
						wait: o.wait,
						at: o.order!.at,
						keeper: shop.keeper.firstName,
						surname: shop.keeper.surname,
						familyId: shop.keeper.familyId,
						shopId: shop.id,
						shop: shop.name,
						townId: town.id,
						town: town.name
					}));
			})
		)
		.sort((a, b) => a.at.localeCompare(b.at));
}

export interface ItemMatch extends Where {
	name: string;
	/** What this keeper would charge the party. */
	price: number;
	/** How many are left (-1 = by the serving). Undefined for special orders. */
	left?: number;
	/** Set for things that have to be ordered in. */
	wait?: string;
	note?: string;
	rarity?: StockItem['rarity'];
	familyId: FamilyRole;
}

/**
 * "Where can we buy a longsword?" Items in stock across the towns whose name
 * contains the search, cheapest first, then things that can be ordered in.
 */
export function findItems(towns: Settlement[], query: string, standingPrices = true): ItemMatch[] {
	const q = query.trim().toLowerCase();
	if (q.length < 2) return [];
	const inStock: ItemMatch[] = [];
	const toOrder: ItemMatch[] = [];
	for (const town of towns) {
		for (const shop of town.shops) {
			const { factor } = partyPrices(shop, standingPrices);
			const where = {
				shopId: shop.id,
				shop: shop.name,
				townId: town.id,
				town: town.name,
				familyId: shop.keeper.familyId
			};
			for (const item of shop.stock) {
				const left = remaining(item);
				if (left === 0 || !item.name.toLowerCase().includes(q)) continue;
				inStock.push({
					...where,
					name: item.name,
					price: item.price * factor,
					left,
					note: item.note,
					rarity: item.rarity
				});
			}
			for (const order of shop.specialOrders) {
				if (order.order || !order.name.toLowerCase().includes(q)) continue;
				toOrder.push({ ...where, name: order.name, price: order.price * factor, wait: order.wait });
			}
		}
	}
	const cheapest = (a: ItemMatch, b: ItemMatch) => a.price - b.price;
	return [...inStock.sort(cheapest), ...toOrder.sort(cheapest)];
}

/** How many keepers of a family the party stands well, neutrally and badly with. */
export function standingCounts(keepers: KeeperEntry[]): Record<Relation, number> {
	const counts: Record<Relation, number> = { positive: 0, neutral: 0, negative: 0 };
	for (const k of keepers) if (k.relation) counts[k.relation]++;
	return counts;
}
