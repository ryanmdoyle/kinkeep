import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { generateBookTown, rerollShop, restock } from '#lib/generator.ts';

const families = DEFAULT_FAMILIES;
const input = {
	families,
	avoid: new Set<string>(),
	customRumours: [],
	rumourMode: 'first' as const
};

const phandalin = generateBookTown({
	...input,
	name: 'Phandalin',
	tier: 'village',
	region: 'heartland',
	population: 400,
	description: 'A frontier town on the ruins of an older settlement.',
	shops: [
		{ type: 'inn', name: 'Stonehill Inn' },
		{ type: 'general', name: "Barthen's Provisions" },
		{ type: 'general' },
		{ type: 'smithy' },
		{ type: 'potions', name: 'Lionshield Coster' }
	]
});

describe('towns from books', () => {
	it('keeps the name, size, population and description given', () => {
		expect(phandalin).toMatchObject({
			name: 'Phandalin',
			tier: 'village',
			region: 'heartland',
			population: 400,
			fromBook: true,
			description: 'A frontier town on the ruins of an older settlement.'
		});
	});

	it('has exactly the shops asked for, with book names where given', () => {
		expect(phandalin.shops.map((s) => s.type)).toEqual([
			'inn',
			'general',
			'general',
			'smithy',
			'potions'
		]);
		expect(phandalin.shops.map((s) => s.id)).toEqual([
			'inn-0',
			'general-0',
			'general-1',
			'smithy-0',
			'potions-0'
		]);
		expect(phandalin.shops[0]).toMatchObject({ name: 'Stonehill Inn', fixedName: true });
		expect(phandalin.shops[2].fixedName).toBeUndefined();
		expect(phandalin.shopTotals).toEqual({ inn: 1, general: 2, smithy: 1, potions: 1 });
		expect(phandalin.shops.every((s) => s.keeper.familyId)).toBe(true);
	});

	it('picks a typical population when none is given', () => {
		const town = generateBookTown({
			...input,
			name: 'Red Larch',
			tier: 'hamlet',
			region: 'heartland',
			shops: []
		});
		expect(town.population).toBeGreaterThanOrEqual(81);
		expect(town.population).toBeLessThanOrEqual(400);
		expect(town.shops).toEqual([]);
	});

	it('keeps book names through rerolls and has no peddler in a thorp', () => {
		const rerolled = rerollShop(phandalin, 'inn-0', input).shops[0];
		expect(rerolled.name).toBe('Stonehill Inn');
		expect(rerolled.fixedName).toBe(true);
		const thorp = generateBookTown({
			...input,
			name: 'Tiny',
			tier: 'thorp',
			region: 'heartland',
			shops: [{ type: 'general' }]
		});
		expect(thorp.shops[0].name).not.toMatch(/Peddler/);
		expect(rerollShop(thorp, 'general-0', input).shops[0].name).not.toMatch(/Peddler/);
		expect(restock(thorp, input).shops[0].name).toBe(thorp.shops[0].name);
	});
});
