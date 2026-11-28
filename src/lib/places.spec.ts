import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { detailAnotherShop, generateSettlement } from '#lib/generator.ts';
import { placeQuery, splitPlaces } from '#lib/places.ts';

const families = DEFAULT_FAMILIES;
const input = {
	families,
	avoid: new Set<string>(),
	customRumours: [],
	rumourMode: 'first' as const
};

describe('rumour places', () => {
	it('splits text around each place', () => {
		const place = { name: 'Cobcote', tier: 'village' as const };
		expect(splitPlaces('The caravan from Cobcote is late.', [place])).toEqual([
			{ text: 'The caravan from ' },
			{ text: 'Cobcote', place },
			{ text: ' is late.' }
		]);
		expect(splitPlaces('Nothing here.', [place])).toEqual([{ text: 'Nothing here.' }]);
	});

	it('builds the same town from the same rumour', () => {
		const q = new URLSearchParams(
			placeQuery({ name: 'Briarton-on-the-River', tier: 'hamlet' }, 'coastal')
		);
		expect(Object.fromEntries(q)).toMatchObject({
			seed: 'briarton-on-the-river',
			size: 'hamlet',
			region: 'coastal',
			name: 'Briarton-on-the-River'
		});
	});

	it('records the places rumours name', () => {
		let found = 0;
		for (let n = 0; n < 40; n++) {
			const town = generateSettlement({ seed: `places-${n}`, tier: 'large-city', families });
			for (const shop of town.shops) {
				for (const place of shop.keeper.rumour?.places ?? []) {
					expect(shop.keeper.rumour!.text).toContain(place.name);
					expect(place.name).not.toBe(town.name);
					found++;
				}
			}
		}
		expect(found).toBeGreaterThan(0);
	});
});

describe('detailing another shop', () => {
	const city = generateSettlement({ seed: 'detail-1', tier: 'large-city', families });
	const type = (['weapons', 'armor', 'general', 'inn'] as const).find(
		(t) => (city.shopTotals[t] ?? 0) > city.shops.filter((s) => s.type === t).length
	)!;

	it('adds one more of the type, after the others', () => {
		const before = city.shops.filter((s) => s.type === type);
		const next = detailAnotherShop(city, type, input);
		const after = next.shops.filter((s) => s.type === type);
		expect(after).toHaveLength(before.length + 1);
		const added = after.at(-1)!;
		expect(added.id).toBe(`${type}-${before.length}`);
		expect(next.shops.indexOf(added)).toBe(next.shops.indexOf(after.at(-2)!) + 1);
		const names = next.shops.map((s) => s.keeper.firstName + s.keeper.familyId);
		expect(new Set(names).size).toBe(names.length);
	});

	it('gives the same extra shop each time, and stops at the real total', () => {
		expect(detailAnotherShop(city, type, input).shops).toEqual(
			detailAnotherShop(city, type, input).shops
		);
		let next = city;
		for (let n = 0; n < 30; n++) next = detailAnotherShop(next, type, input);
		expect(next.shops.filter((s) => s.type === type)).toHaveLength(city.shopTotals[type]!);
	});
});
