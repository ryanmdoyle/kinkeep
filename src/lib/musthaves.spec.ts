import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import {
	allCatalogItems,
	generateBookTown,
	generateSettlement,
	missingMustHaves,
	rerollShop,
	restock,
	stockMustHaves
} from '#lib/generator.ts';
import type { MustHave, Settlement } from '#lib/types.ts';

const families = DEFAULT_FAMILIES;
const potion: MustHave = { name: 'Potion of healing', qty: 2 };

/** Every shelf in town that has the item. */
const shelves = (town: Settlement, name: string) =>
	town.shops.flatMap((s) =>
		s.stock.filter((i) => i.name === name).map((i) => ({ shop: s.type, item: i }))
	);

/** The town with an item taken off every shelf. */
const without = (town: Settlement, name: string): Settlement => ({
	...town,
	shops: town.shops.map((s) => ({ ...s, stock: s.stock.filter((i) => i.name !== name) }))
});

describe('must-haves', () => {
	it('keeps one in the back of a hamlet store, at a price for coming from afar', () => {
		const hamlet = generateSettlement({ seed: 'mh-hamlet', tier: 'hamlet', families });
		expect(shelves(hamlet, potion.name)).toEqual([]);
		const stocked = generateSettlement({
			seed: 'mh-hamlet',
			tier: 'hamlet',
			families,
			mustHaves: [potion]
		});
		const [found] = shelves(stocked, potion.name);
		expect(found.shop).toBe('general');
		expect(found.item).toMatchObject({ qty: 2, category: 'Potion', mustHave: true });
		// 50 gp, a hamlet's 1.2 and a quarter more, give or take the keeper's haggling.
		expect(found.item.price).toBeGreaterThan(55);
		// Nothing else changes.
		expect(without(stocked, potion.name)).toEqual({ ...hamlet, createdAt: stocked.createdAt });
	});

	it('goes to a shop that sells it when the town has one', () => {
		const town = without(
			generateSettlement({ seed: 'mh-town', tier: 'small-town', families }),
			potion.name
		);
		const stocked = stockMustHaves(town, [potion]);
		expect(shelves(stocked, potion.name).map((f) => f.shop)).toEqual(['potions']);
	});

	it('leaves a town alone when it already has them', () => {
		const town = stockMustHaves(
			generateSettlement({ seed: 'mh-village', tier: 'village', families }),
			[potion]
		);
		expect(stockMustHaves(town, [potion])).toBe(town);
		expect(missingMustHaves(town, [potion])).toEqual([]);
		expect(missingMustHaves(without(town, potion.name), [potion])).toEqual([potion]);
	});

	it("stocks the DM's own items at their price", () => {
		const town = generateSettlement({ seed: 'mh-own', tier: 'village', families });
		const own = { name: 'Bottled moonlight', qty: 1, price: 10 };
		const [found] = shelves(stockMustHaves(town, [own]), own.name);
		expect(found.shop).toBe('general');
		expect(found.item.category).toBe('Other');
		expect(found.item.price).toBeGreaterThanOrEqual(10);
		// Without a price there's nothing to sell it for.
		expect(stockMustHaves(town, [{ name: 'Mystery', qty: 1 }])).toBe(town);
	});

	it('skips towns with no shops', () => {
		const empty = generateBookTown({
			name: 'Nowhere',
			tier: 'thorp',
			region: 'heartland',
			shops: [],
			families
		});
		expect(stockMustHaves(empty, [potion])).toBe(empty);
	});

	it('come back after a restock or a reroll', () => {
		const input = { families, mustHaves: [potion] };
		const town = generateSettlement({ seed: 'mh-restock', tier: 'hamlet', ...input });
		expect(shelves(restock(town, input), potion.name)).toHaveLength(1);
		const store = town.shops.find((s) => s.type === 'general')!;
		expect(shelves(rerollShop(town, store.id, input), potion.name)).toHaveLength(1);
	});

	it('puts them in book towns too', () => {
		const town = generateBookTown({
			name: 'Phandalin',
			tier: 'village',
			region: 'heartland',
			shops: [{ type: 'inn' }, { type: 'general' }],
			families,
			mustHaves: [potion]
		});
		expect(shelves(town, potion.name).map((f) => f.shop)).toEqual(['general']);
	});

	it('can be picked from every shop and region', () => {
		const names = allCatalogItems().map((i) => i.name);
		expect(names).toContain('Potion of healing');
		expect(names).toContain('Longsword');
		expect(new Set(names).size).toBe(names.length);
	});
});
