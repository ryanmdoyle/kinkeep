import { describe, expect, it } from 'vitest';
import { contentKey, usedKeys } from '#lib/content/keys.ts';
import {
	at,
	CONTENT_VERSION,
	highestDeclaredVersion,
	retired,
	table
} from '#lib/content/versioned.ts';
import { DEFAULT_FAMILIES, defaultFamiliesAt } from '#lib/data/families.ts';
import { TIERS } from '#lib/data/tiers.ts';
import { generateSettlement } from '#lib/generator.ts';
import { hashString } from '#lib/hash.ts';
import { createRng } from '#lib/rng.ts';
import type { Family, Settlement } from '#lib/types.ts';

const families = DEFAULT_FAMILIES;
// Read before this file declares its own example tables.
const highestInContent = highestDeclaredVersion();
const strip = (town: Settlement) => ({ ...town, createdAt: '' });

describe('versioned tables', () => {
	const t = table({
		1: ['a', 'b', retired(3, 'c')],
		2: ['d'],
		3: ['e']
	});

	it('shows each version exactly as it was', () => {
		expect(at(t, 1)).toEqual(['a', 'b', 'c']);
		expect(at(t, 2)).toEqual(['a', 'b', 'c', 'd']);
		expect(at(t, 3)).toEqual(['a', 'b', 'd', 'e']);
	});

	it('has no content above CONTENT_VERSION (bump it when adding a block)', () => {
		expect(highestInContent).toBeLessThanOrEqual(CONTENT_VERSION);
	});
});

describe('picks that survive table growth', () => {
	it('uses one roll per pick, whatever the list length', () => {
		const a = createRng('x');
		const b = createRng('x');
		a.pick(['one', 'two']);
		b.pick(['one', 'two', 'three', 'four', 'five', 'six']);
		expect(a.next()).toBe(b.next());
	});

	it('only changes a pick when a new entry wins it', () => {
		const old = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
		const grown = [...old, 'i', 'j'];
		let changed = 0;
		for (let n = 0; n < 500; n++) {
			const before = createRng(`s${n}`).pick(old);
			const after = createRng(`s${n}`).pick(grown);
			if (before !== after) {
				changed++;
				expect(['i', 'j']).toContain(after);
			}
		}
		// Roughly 2 in 10 should move to a new entry; none move between old ones.
		expect(changed).toBeGreaterThan(50);
		expect(changed).toBeLessThan(160);
	});

	it('keeps the pick when a line is reworded', () => {
		const before = ['wyvern', 'owlbear', 'goul', 'troll'];
		const after = ['wyvern', 'owlbear', 'ghoul', 'troll'];
		for (let n = 0; n < 50; n++) {
			const a = before.indexOf(createRng(`m${n}`).pick(before));
			const b = after.indexOf(createRng(`m${n}`).pick(after));
			expect(b).toBe(a);
		}
	});

	it('only changes the family that got new lines', () => {
		// Simulate a content update: the general-store family gains five quirks.
		const grown: Family[] = families.map((f) =>
			f.id === 'general'
				? { ...f, quirks: [...f.quirks, 'New 1', 'New 2', 'New 3', 'New 4', 'New 5'] }
				: f
		);
		for (let n = 0; n < 20; n++) {
			const opts = { seed: `grow-${n}`, tier: 'large-town' as const };
			const before = generateSettlement({ ...opts, families });
			const after = generateSettlement({ ...opts, families: grown });
			expect(after.name).toBe(before.name);
			expect(after.population).toBe(before.population);
			for (const [i, shop] of after.shops.entries()) {
				const old = before.shops[i];
				expect(shop.stock).toEqual(old.stock);
				expect(shop.keeper.rumour).toEqual(old.keeper.rumour);
				expect(shop.keeper.firstName).toBe(old.keeper.firstName);
				if (shop.type !== 'general') expect(shop.keeper).toEqual(old.keeper);
			}
		}
	});
});

describe('avoiding repeats in a campaign', () => {
	it('skips used names, quirks and rumours but keeps the rest of the seed', () => {
		const first = generateSettlement({ seed: 'repeat', tier: 'small-town', families });
		const again = generateSettlement({
			seed: 'repeat',
			tier: 'small-town',
			families,
			avoid: usedKeys(first)
		});
		expect(again.population).toBe(first.population);
		expect(again.shops.map((s) => s.type)).toEqual(first.shops.map((s) => s.type));
		expect(again.name).not.toBe(first.name);

		const used = new Set(usedKeys(first));
		for (const shop of again.shops) {
			expect(used.has(contentKey.keeper(shop.keeper.familyId, shop.keeper.firstName))).toBe(false);
			expect(used.has(shop.keeper.rumour!.key!)).toBe(false);
			for (const key of shop.keeper.quirkKeys ?? []) expect(used.has(key)).toBe(false);
		}
	});

	it('falls back to repeats once a table runs out instead of failing', () => {
		let avoid = new Set<string>();
		for (let n = 0; n < 30; n++) {
			const town = generateSettlement({ seed: `run-${n}`, tier: 'village', families, avoid });
			expect(town.shops.every((s) => s.keeper.firstName && s.keeper.rumour?.text)).toBe(true);
			avoid = new Set([...avoid, ...usedKeys(town)]);
		}
	});
});

/*
 * Golden towns: a fixed set of seeds built at every content version. If an
 * already-released version's file changes, old links have broken. Only the
 * newest, unreleased version's file should ever be updated (`npm test -- -u`).
 */
const GOLDEN_SEEDS = TIERS.flatMap((tier, i) => [
	{ seed: `golden-${tier.id}`, tier: tier.id, region: 'heartland' as const },
	{
		seed: `golden-${tier.id}-b`,
		tier: tier.id,
		region: (['coastal', 'mountain', 'northern', 'desert', 'forest', 'swamp'] as const)[i % 6]
	}
]).concat([{ seed: 'golden-random-1' }, { seed: 'golden-random-2' }] as never[]);

function digest(town: Settlement) {
	return {
		seed: town.seed,
		name: town.name,
		tier: town.tier,
		region: town.region,
		population: town.population,
		shopTotals: town.shopTotals,
		trades: town.trades.map((t) => `${t.label}: ${t.count}`),
		shops: town.shops.map((s) => ({
			name: s.name,
			keeper: `${s.keeper.firstName} (${s.keeper.age}) ${s.keeper.bargaining.label}`,
			greeting: s.keeper.greeting,
			quirks: s.keeper.quirks,
			rumour: `[${s.keeper.rumour?.truth}] ${s.keeper.rumour?.text}`,
			stock: hashString(JSON.stringify(s.stock)).toString(36),
			orders: hashString(JSON.stringify(s.specialOrders)).toString(36)
		}))
	};
}

describe('golden towns', () => {
	for (let version = 1; version <= CONTENT_VERSION; version++) {
		it(`content v${version} still builds the same towns`, async () => {
			const built = GOLDEN_SEEDS.map((opts) =>
				digest(
					strip(
						generateSettlement({
							...opts,
							contentVersion: version,
							families: defaultFamiliesAt(version)
						})
					)
				)
			);
			await expect(JSON.stringify(built, null, '\t') + '\n').toMatchFileSnapshot(
				`./__golden__/content-v${version}.json`
			);
		});
	}
});
