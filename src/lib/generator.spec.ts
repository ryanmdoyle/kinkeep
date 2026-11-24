import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { TIERS } from '#lib/data/tiers.ts';
import { generateSettlement, rerollRumour, rerollShop } from '#lib/generator.ts';
import { formatPrice, roundPrice } from '#lib/money.ts';
import { createRng } from '#lib/rng.ts';

const families = DEFAULT_FAMILIES;

describe('rng', () => {
	it('is deterministic for a seed', () => {
		const a = createRng('oak');
		const b = createRng('oak');
		expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
	});
});

describe('money', () => {
	it('formats coins', () => {
		expect(formatPrice(2.5)).toBe('2 gp 5 sp');
		expect(formatPrice(0.04)).toBe('4 cp');
		expect(formatPrice(1500)).toBe('1,500 gp');
	});
	it('rounds to sensible prices', () => {
		expect(roundPrice(1523)).toBe(1525);
		expect(roundPrice(14.6)).toBe(15);
		expect(roundPrice(0.013)).toBe(0.01);
	});
});

describe('generateSettlement', () => {
	it('gives the same town for the same seed and size', () => {
		const a = generateSettlement({ seed: 'mossy-otter-1', tier: 'small-town', families });
		const b = generateSettlement({ seed: 'mossy-otter-1', tier: 'small-town', families });
		expect({ ...a, createdAt: '' }).toEqual({ ...b, createdAt: '' });
	});

	it('keeps population inside the tier range', () => {
		for (const tier of TIERS) {
			for (let n = 0; n < 25; n++) {
				const town = generateSettlement({ seed: `${tier.id}-${n}`, tier: tier.id, families });
				expect(town.population).toBeGreaterThanOrEqual(tier.min);
				expect(town.population).toBeLessThanOrEqual(tier.max);
			}
		}
	});

	it('scales shops with size', () => {
		for (let n = 0; n < 30; n++) {
			const hamlet = generateSettlement({ seed: `h${n}`, tier: 'hamlet', families });
			expect(hamlet.shops.some((s) => s.type === 'general')).toBe(true);
			expect(hamlet.shops.some((s) => s.type === 'magic' || s.type === 'weapons')).toBe(false);

			const village = generateSettlement({ seed: `v${n}`, tier: 'village', families });
			expect(village.shops.some((s) => s.type === 'smithy')).toBe(true);
			expect(village.shops.some((s) => s.type === 'armor')).toBe(false);

			const town = generateSettlement({ seed: `t${n}`, tier: 'large-town', families });
			for (const type of ['general', 'weapons', 'armor', 'potions', 'magic'] as const) {
				expect(town.shops.some((s) => s.type === type)).toBe(true);
			}
		}
	});

	it('runs every shop type with its family', () => {
		const city = generateSettlement({ seed: 'city', tier: 'large-city', families });
		for (const shop of city.shops) {
			const expected = shop.type === 'smithy' ? 'weapons' : shop.type;
			expect(shop.keeper.familyId).toBe(expected);
		}
		const names = city.shops.map((s) => `${s.keeper.familyId}:${s.keeper.firstName}`);
		expect(new Set(names).size).toBe(names.length);
	});

	it('only stocks items allowed at the tier', () => {
		const hamlet = generateSettlement({ seed: 'x', tier: 'hamlet', families });
		const names = hamlet.shops.flatMap((s) => s.stock.map((i) => i.name));
		expect(names).not.toContain('Plate armor');
		expect(names).not.toContain('Spyglass');
	});

	it('rerolls a single shop and leaves the rest alone', () => {
		const town = generateSettlement({ seed: 'reroll', tier: 'small-city', families });
		const target = town.shops[0];
		const next = rerollShop(town, target.id, families);
		expect(next.shops.slice(1)).toEqual(town.shops.slice(1));
		expect(next.shops[0].id).toBe(target.id);
		expect(next.shops[0].keeper.familyId).toBe(target.keeper.familyId);
	});
});

describe('inns, rumours and regions', () => {
	it('gives villages and up an inn run by the innkeeping family', () => {
		for (let n = 0; n < 20; n++) {
			const town = generateSettlement({ seed: `inn${n}`, tier: 'village', families });
			const inn = town.shops.find((s) => s.type === 'inn');
			expect(inn?.keeper.familyId).toBe('inn');
			expect(inn?.stock.some((i) => i.name.startsWith('House special'))).toBe(true);
		}
	});

	it('gives every shopkeeper a filled-in rumour', () => {
		const city = generateSettlement({ seed: 'rumours', tier: 'metropolis', families });
		for (const shop of city.shops) {
			expect(shop.keeper.rumour?.text).toBeTruthy();
			expect(shop.keeper.rumour?.text).not.toMatch(/\{\w+\}/);
			expect(['true', 'partly true', 'false']).toContain(shop.keeper.rumour?.truth);
		}
	});

	it('rerolls only the rumour', () => {
		const town = generateSettlement({ seed: 'r', tier: 'small-town', families });
		const next = rerollRumour(town, town.shops[0].id, families);
		expect({ ...next.shops[0].keeper, rumour: undefined }).toEqual({
			...town.shops[0].keeper,
			rumour: undefined
		});
		expect(next.shops.slice(1)).toEqual(town.shops.slice(1));
	});

	it('applies regional goods and prices', () => {
		const coastal = generateSettlement({
			seed: 'sea',
			tier: 'small-city',
			region: 'coastal',
			families
		});
		const heartland = generateSettlement({
			seed: 'sea',
			tier: 'small-city',
			region: 'heartland',
			families
		});
		expect(coastal.region).toBe('coastal');
		const generalItems = (s: typeof coastal) =>
			s.shops.filter((x) => x.type === 'general').flatMap((x) => x.stock.map((i) => i.name));
		expect(generalItems(coastal)).toContain('Salted fish (1 day)');
		expect(generalItems(heartland)).not.toContain('Salted fish (1 day)');
	});

	it('moves goods into smaller places where the region makes them common', () => {
		// Scimitars are normally large-town goods; on the desert road a village smith has them.
		let found = false;
		for (let n = 0; n < 20 && !found; n++) {
			const village = generateSettlement({
				seed: `d${n}`,
				tier: 'village',
				region: 'desert',
				families
			});
			found = village.shops.some((s) => s.stock.some((i) => i.name === 'Scimitar'));
		}
		expect(found).toBe(true);
	});
});
