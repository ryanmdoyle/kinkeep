import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { keeperName, removeShop, renameShop } from '#lib/edit.ts';
import { addBookShop, generateBookTown, generateSettlement, rerollShop } from '#lib/generator.ts';
import { keepersByFamily } from '#lib/party.ts';

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
