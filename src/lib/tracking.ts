import { RETURNING, WORD_OF_KIN } from '#lib/data/reactions.ts';
import { createRng } from '#lib/rng.ts';
import type { Relation, Rumour, Settlement, Shop, StockItem } from '#lib/types.ts';

/**
 * What the party has actually done in a town: which shops they've been to,
 * which rumours they heard, and how they left things with each keeper.
 */

function patchShop(settlement: Settlement, shopId: string, fn: (shop: Shop) => Shop): Settlement {
	return {
		...settlement,
		shops: settlement.shops.map((s) => (s.id === shopId ? fn(s) : s))
	};
}

export function setVisited(settlement: Settlement, shopId: string, visited: boolean): Settlement {
	return patchShop(settlement, shopId, (shop) => ({ ...shop, visited }));
}

/** Marking a rumour as told also marks the shop as visited: they heard it there. */
export function setRumourTold(settlement: Settlement, shopId: string, told: boolean): Settlement {
	return patchShop(settlement, shopId, (shop) =>
		shop.keeper.rumour
			? {
					...shop,
					visited: told || shop.visited,
					keeper: { ...shop.keeper, rumour: { ...shop.keeper.rumour, told } }
				}
			: shop
	);
}

/** How many of an item are left (-1 for things sold by the serving). */
export function remaining(item: StockItem): number {
	return item.qty < 0 ? -1 : Math.max(0, item.qty - (item.sold ?? 0));
}

/** What the party has bought here since the last restock. */
export function purchases(shop: Shop): { name: string; count: number }[] {
	return shop.stock.filter((i) => i.sold).map((i) => ({ name: i.name, count: i.sold ?? 0 }));
}

/**
 * The party buys (`delta` > 0) or the DM undoes a sale (`delta` < 0). Buying
 * marks the shop as visited. Things sold by the serving aren't counted.
 */
export function sell(
	settlement: Settlement,
	shopId: string,
	itemName: string,
	delta: number
): Settlement {
	return patchShop(settlement, shopId, (shop) => {
		const item = shop.stock.find((i) => i.name === itemName);
		if (!item || item.qty < 0) return shop;
		const sold = Math.min(item.qty, Math.max(0, (item.sold ?? 0) + delta));
		if (sold === (item.sold ?? 0)) return shop;
		const stock = shop.stock.map((i) => {
			if (i !== item) return i;
			const next: StockItem = { ...i, sold };
			if (!sold) delete next.sold;
			return next;
		});
		return { ...shop, stock, visited: delta > 0 || shop.visited };
	});
}

export type OrderAction = 'order' | 'collect' | 'cancel';

/** Today's date where the DM is (YYYY-MM-DD), not in UTC. */
function localDay(date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Places, collects or cancels a special order. Ordering marks the shop as
 * visited. `today` is the date to record (YYYY-MM-DD).
 */
export function setOrder(
	settlement: Settlement,
	shopId: string,
	name: string,
	action: OrderAction,
	today = localDay()
): Settlement {
	return patchShop(settlement, shopId, (shop) => {
		const specialOrders = shop.specialOrders.map((o) => {
			if (o.name !== name) return o;
			if (action === 'cancel') {
				const next = { ...o };
				delete next.order;
				return next;
			}
			if (action === 'collect')
				return o.order ? { ...o, order: { ...o.order, collected: true } } : o;
			return { ...o, order: { at: today } };
		});
		return { ...shop, specialOrders, visited: action === 'order' || shop.visited };
	});
}

/** The DM's own wording or truth for a keeper's rumour. A blank text keeps the old one. */
export function editRumour(
	settlement: Settlement,
	shopId: string,
	patch: Partial<Pick<Rumour, 'text' | 'truth'>>
): Settlement {
	return patchShop(settlement, shopId, (shop) => {
		const rumour = shop.keeper.rumour;
		if (!rumour) return shop;
		const text = patch.text?.trim() || rumour.text;
		const truth = patch.truth ?? rumour.truth;
		if (text === rumour.text && truth === rumour.truth) return shop;
		return {
			...shop,
			keeper: { ...shop.keeper, rumour: { ...rumour, text, truth, edited: true } }
		};
	});
}

export function setRelation(
	settlement: Settlement,
	shopId: string,
	relation: Relation
): Settlement {
	return patchShop(settlement, shopId, (shop) => ({
		...shop,
		keeper: { ...shop.keeper, relation }
	}));
}

/** The DM's own note about a keeper ("promised to bring back the hammer"). */
export function setNote(settlement: Settlement, shopId: string, note: string): Settlement {
	return patchShop(settlement, shopId, (shop) => {
		const keeper = { ...shop.keeper, note: note.trim() || undefined };
		if (!keeper.note) delete keeper.note;
		return { ...shop, keeper };
	});
}

/** The keeper's standing with the party, or undefined if they've never met. */
export function relationOf(shop: Shop): Relation | undefined {
	return shop.visited ? (shop.keeper.relation ?? 'neutral') : undefined;
}

export const RELATIONS: { value: Relation; label: string; symbol: string }[] = [
	{ value: 'positive', label: 'Positive', symbol: '+' },
	{ value: 'neutral', label: 'Neutral', symbol: '~' },
	{ value: 'negative', label: 'Negative', symbol: '−' }
];

export function townProgress(settlement: Settlement) {
	const shops = settlement.shops;
	return {
		shops: shops.length,
		visited: shops.filter((s) => s.visited).length,
		rumours: shops.filter((s) => s.keeper.rumour).length,
		told: shops.filter((s) => s.keeper.rumour?.told).length
	};
}

/** A relative of a keeper whom the party has met (see `towns.kinOf`). */
export interface Kin {
	firstName: string;
	town: string;
	townId: string;
	shop: string;
	relation: Relation;
	/** In the same town as the keeper being shown. */
	here: boolean;
}

/** How standing changes what a keeper charges the party. */
export const STANDING_PRICE: Record<Relation, number> = {
	positive: -0.1,
	neutral: 0,
	negative: 0.2
};

/** The bargaining style that promises regulars a discount (see BARGAINING in names.ts). */
const REGULARS_DISCOUNT = /^Gives regulars a discount/;

/**
 * What this keeper charges the party compared with the listed prices, and
 * why. Regulars get the discount their keeper promised; standing moves prices
 * when the campaign has that turned on.
 */
export function partyPrices(shop: Shop, standingPrices = true) {
	const relation = relationOf(shop);
	let factor = 1;
	const reasons: string[] = [];
	if (relation && REGULARS_DISCOUNT.test(shop.keeper.bargaining.label)) {
		factor *= 0.9;
		reasons.push('−10% for regulars');
	}
	if (relation && standingPrices && STANDING_PRICE[relation]) {
		const change = STANDING_PRICE[relation];
		factor *= 1 + change;
		const percent = `${change > 0 ? '+' : '−'}${Math.round(Math.abs(change) * 100)}%`;
		reasons.push(`${percent} for ${relation} standing`);
	}
	return { factor, reasons };
}

/** What a keeper says when the party comes back, by how things were left. */
export function returningGreeting(shop: Shop): string | undefined {
	const relation = relationOf(shop);
	if (!relation) return undefined;
	const rng = createRng(`returning:${shop.name}:${shop.keeper.firstName}`).fork(relation);
	return rng.pick(RETURNING[relation]);
}

/** Where kin stand with the party overall: more good visits than bad is positive. */
export function familyStanding(kin: Pick<Kin, 'relation'>[]): Relation | undefined {
	if (!kin.length) return undefined;
	const score = kin.reduce(
		(sum, k) => sum + (k.relation === 'positive' ? 1 : k.relation === 'negative' ? -1 : 0),
		0
	);
	return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
}

/**
 * What a keeper the party hasn't met has heard about them from relatives they
 * have met. Undefined once the party has visited (they know them first-hand).
 */
export function wordOfKin(
	shop: Shop,
	kin: Kin[]
): { text: string; relation: Relation } | undefined {
	if (shop.visited) return undefined;
	const relation = familyStanding(kin);
	if (!relation) return undefined;
	const source = kin.find((k) => k.relation === relation) ?? kin[0];
	const rng = createRng(`word:${shop.name}:${shop.keeper.firstName}:${source.firstName}`).fork(
		relation
	);
	const text = rng
		.pick(WORD_OF_KIN[relation])
		.replaceAll('{cousin}', source.firstName)
		.replaceAll('{where}', source.here ? 'down the street' : `in ${source.town}`);
	return { text, relation };
}
