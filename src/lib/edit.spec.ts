import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { addStockItem, keeperName, removeShop, removeStockItem, renameShop } from '#lib/edit.ts';
import {
	addBookShop,
	generateBookTown,
	generateSettlement,
	itemForShop,
	rerollShop,
	restock
} from '#lib/generator.ts';
import { keepersByFamily } from '#lib/party.ts';
import { sell } from '#lib/tracking.ts';
import type { Settlement } from '#lib/types.ts';

const families = DEFAULT_FAMILIES;
const input = {
	families,
	avoid: new Set<string>(),
	customRumours: [],
	rumourMode: 'first' as const
};
const ember = families.find((f) => f.id === 'weapons')!;

const book = generateBookTown({
	...input,
	name: 'Phandalin',
	tier: 'village',
	region: 'heartland',
	shops: [{ type: 'inn', name: 'Stonehill Inn' }, { type: 'smithy' }]
});
const smithy = book.shops.find((s) => s.type === 'smithy')!;

describe('renaming', () => {
	it('changes the first name, and the shop name that used it', () => {
		const next = renameShop(book, smithy.id, { firstName: 'Sildar' });
		const shop = next.shops.find((s) => s.id === smithy.id)!;
		expect(shop.keeper.firstName).toBe('Sildar');
		expect(shop.name).toBe(smithy.name.replace(smithy.keeper.firstName, 'Sildar'));
		expect(keeperName(shop.keeper, ember)).toBe(`Sildar ${ember.surname}`);
	});

	it('gives a keeper their own surname, and blank goes back to the family', () => {
		const full = renameShop(book, smithy.id, { firstName: 'Sildar', surname: 'Hallwinter' });
		const keeper = full.shops.find((s) => s.id === smithy.id)!.keeper;
		expect(keeperName(keeper, ember)).toBe('Sildar Hallwinter');
		expect(keeper.familyId).toBe('weapons');
		expect(keepersByFamily([full]).get('weapons')![0]).toMatchObject({
			firstName: 'Sildar',
			surname: 'Hallwinter'
		});
		const back = renameShop(full, smithy.id, { surname: '  ' });
		expect(back.shops.find((s) => s.id === smithy.id)!.keeper.surname).toBeUndefined();
	});

	it('keeps a shop name the DM chose through rerolls', () => {
		const named = renameShop(book, smithy.id, { shopName: "Halia's Forge" });
		expect(named.shops.find((s) => s.id === smithy.id)).toMatchObject({
			name: "Halia's Forge",
			fixedName: true
		});
		expect(rerollShop(named, smithy.id, input).shops.find((s) => s.id === smithy.id)!.name).toBe(
			"Halia's Forge"
		);
	});

	it('ignores blank names', () => {
		const same = renameShop(book, smithy.id, { shopName: ' ', firstName: '' });
		expect(same.shops).toEqual(book.shops);
	});
});

describe('adding and removing shops', () => {
	it('adds a shop to a book town, named or not, in the right place', () => {
		let next = addBookShop(book, 'general', input, "Barthen's Provisions");
		next = addBookShop(next, 'general', input);
		expect(next.shops.map((s) => s.type)).toEqual(['inn', 'general', 'general', 'smithy']);
		expect(next.shops[1]).toMatchObject({ name: "Barthen's Provisions", fixedName: true });
		expect(next.shopTotals.general).toBe(2);
		expect(new Set(next.shops.map((s) => s.id)).size).toBe(4);
	});

	it('removes a shop from a book town and its count', () => {
		const next = removeShop(book, smithy.id);
		expect(next.shops.map((s) => s.type)).toEqual(['inn']);
		expect(next.shopTotals.smithy).toBeUndefined();
	});

	it('only stops detailing a shop in a generated town', () => {
		const town = generateSettlement({ seed: 'edit-1', tier: 'small-town', families });
		const next = removeShop(town, town.shops[0].id);
		expect(next.shops).toHaveLength(town.shops.length - 1);
		expect(next.shopTotals).toEqual(town.shopTotals);
	});
});

describe('editing stock', () => {
	const village = generateSettlement({ seed: 'stock-edit', tier: 'village', ...input });
	const store = village.shops.find((s) => s.type === 'general')!;
	const stockOf = (town: Settlement) => town.shops.find((s) => s.id === store.id)!.stock;

	it("prices a catalog item at this keeper's prices", () => {
		const potion = itemForShop(village, store, 'potion of HEALING', 2)!;
		expect(potion).toMatchObject({ name: 'Potion of healing', category: 'Potion', qty: 2 });
		expect(potion.price).toBeGreaterThan(50);
		expect(itemForShop(village, store, 'Bottled moonlight')).toBeUndefined();
	});

	it('adds an item, and keeps it through restocks and rerolls', () => {
		const potion = itemForShop(village, store, 'Potion of healing')!;
		let town = addStockItem(village, store.id, potion);
		expect(stockOf(town).at(-1)).toMatchObject({ name: 'Potion of healing', added: true });
		town = sell(town, store.id, 'Potion of healing', 1);
		const restocked = stockOf(restock(town, input, store.id));
		expect(restocked.filter((i) => i.name === 'Potion of healing')).toEqual([
			{ ...potion, added: true }
		]);
		const rerolled = stockOf(rerollShop(town, store.id, input));
		expect(rerolled.some((i) => i.name === 'Potion of healing' && i.added)).toBe(true);
	});

	it('replaces an item of the same name instead of listing it twice', () => {
		const torch = stockOf(village).find((i) => i.name === 'Torch')!;
		const town = addStockItem(village, store.id, { ...torch, name: 'torch ', qty: 99, price: 1 });
		const torches = stockOf(town).filter((i) => i.name.toLowerCase() === 'torch');
		expect(torches).toEqual([{ ...torch, name: 'torch', qty: 99, price: 1, added: true }]);
	});

	it('removes an item', () => {
		const town = removeStockItem(village, store.id, 'TORCH');
		expect(stockOf(town).some((i) => i.name === 'Torch')).toBe(false);
		expect(stockOf(town)).toHaveLength(stockOf(village).length - 1);
	});
});
