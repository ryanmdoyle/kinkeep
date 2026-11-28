import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { generateSettlement } from '#lib/generator.ts';
import {
	findItems,
	heardRumours,
	keepersByFamily,
	pendingOrders,
	standingCounts
} from '#lib/party.ts';
import { sell, setNote, setOrder, setRelation, setRumourTold, setVisited } from '#lib/tracking.ts';

const families = DEFAULT_FAMILIES;
const a = generateSettlement({ seed: 'party-a', tier: 'small-town', families });
const b = generateSettlement({ seed: 'party-b', tier: 'large-town', families });
const inn = a.shops.find((s) => s.type === 'inn')!;

describe('party summary', () => {
	it('groups keepers by family, met ones first, with standing and notes', () => {
		let town = setVisited(a, inn.id, true);
		town = setRelation(town, inn.id, 'negative');
		town = setNote(town, inn.id, 'Broke a chair');
		const byFamily = keepersByFamily([b, town]);
		const inns = byFamily.get('inn')!;
		expect(inns[0]).toMatchObject({
			firstName: inn.keeper.firstName,
			visited: true,
			relation: 'negative',
			note: 'Broke a chair',
			town: a.name
		});
		expect(inns.slice(1).every((k) => !k.visited && k.relation === undefined)).toBe(true);
		expect(standingCounts(inns)).toEqual({ positive: 0, neutral: 0, negative: 1 });
	});

	it('lists only rumours told to the party', () => {
		const told = a.shops.find((s) => s.keeper.rumour)!;
		const heard = heardRumours([setRumourTold(a, told.id, true), b]);
		expect(heard).toHaveLength(1);
		expect(heard[0]).toMatchObject({ keeper: told.keeper.firstName, town: a.name });
	});

	it('lists orders waiting to be collected, oldest first', () => {
		const shopA = a.shops.find((s) => s.specialOrders.length)!;
		const shopB = b.shops.find((s) => s.specialOrders.length)!;
		let townA = setOrder(a, shopA.id, shopA.specialOrders[0].name, 'order', '2026-11-20');
		const townB = setOrder(b, shopB.id, shopB.specialOrders[0].name, 'order', '2026-11-01');
		expect(pendingOrders([townA, townB]).map((o) => o.at)).toEqual(['2026-11-01', '2026-11-20']);
		townA = setOrder(townA, shopA.id, shopA.specialOrders[0].name, 'collect');
		expect(pendingOrders([townA, townB])).toHaveLength(1);
	});

	it('finds items in stock, cheapest first, then special orders', () => {
		const found = findItems([a, b], 'ROPE');
		expect(found.length).toBeGreaterThan(0);
		expect(found.every((m) => m.name.toLowerCase().includes('rope'))).toBe(true);
		const stocked = found.filter((m) => m.wait === undefined).map((m) => m.price);
		expect(stocked).toEqual([...stocked].sort((x, y) => x - y));
		expect(findItems([a, b], 'r')).toEqual([]);
	});

	it('leaves out sold-out items', () => {
		const shop = a.shops.find((s) => s.stock.some((i) => i.qty === 1))!;
		const item = shop.stock.find((i) => i.qty === 1)!;
		const soldOut = sell(a, shop.id, item.name, 1);
		const hits = (t: typeof a) =>
			findItems([t], item.name).filter((m) => m.shopId === shop.id && m.name === item.name);
		expect(hits(a)).toHaveLength(1);
		expect(hits(soldOut)).toHaveLength(0);
	});
});
