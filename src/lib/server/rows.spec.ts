import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { addStockItem, renameShop } from '#lib/edit.ts';
import { generateBookTown, generateSettlement } from '#lib/generator.ts';
import { tokenFamilies } from '#lib/render.ts';
import {
	editRumour,
	partyPrices,
	sell,
	setNote,
	setOrder,
	setRelation,
	setRumourTold,
	setVisited
} from '#lib/tracking.ts';
import type { Settlement } from '#lib/types.ts';
import { uuid7 } from './ids.ts';
import {
	parseShopKey,
	partyRows,
	rowsToSettlement,
	shopKey,
	townToRows,
	type PartyRows,
	type PartyView,
	type TownRows,
	type TownWithShops
} from './rows.ts';

const families = DEFAULT_FAMILIES;
const NOW = new Date('2026-11-28T15:00:00Z');

function counter() {
	let n = 0;
	return () => `id-${++n}`;
}

/** What Prisma would hand back after inserting the rows: defaults filled in, in order. */
function readBack(rows: TownRows): TownWithShops {
	const stamp = { createdAt: NOW, updatedAt: NOW };
	return {
		...rows.town,
		...stamp,
		createdAt: rows.town.createdAt as Date,
		shops: rows.shops.map((shop) => ({
			...shop,
			...stamp,
			nameFixed: shop.nameFixed ?? false,
			restockedAt: NOW,
			stock: rows.stock
				.filter((s) => s.shopId === shop.id)
				.map((s) => ({ ...s, sold: s.sold ?? 0, source: s.source ?? 'generated' })),
			keepers: rows.keepers
				.filter((k) => k.shopId === shop.id)
				.map((k) => ({
					...k,
					...stamp,
					replacedAt: null,
					rumours: rows.rumours
						.filter((r) => r.keeperId === k.id)
						.map((r) => ({
							...r,
							createdAt: NOW,
							places: r.places ?? null,
							edited: r.edited ?? false,
							replacedAt: null
						}))
				}))
		}))
	} as TownWithShops;
}

function partyView(rows: PartyRows): PartyView {
	return {
		keepers: rows.keepers.map((k) => ({
			keeperId: k.keeperId,
			metAt: (k.metAt as Date | null) ?? null,
			standing: k.standing ?? null,
			note: k.note ?? null
		})),
		heard: rows.rumours.map((r) => r.rumourId),
		orders: rows.orders.map((o) => ({
			shopId: o.shopId,
			itemName: o.itemName,
			placedAt: o.placedAt as Date,
			collectedAt: (o.collectedAt as Date | null) ?? null
		}))
	};
}

/** A town after a busy session: visits, standing, notes, rumours, sales, orders and edits. */
function playedTown(): Settlement {
	let town = generateSettlement({ seed: 'rows-played', tier: 'large-town', families });
	const [inn, general, third, fourth] = town.shops;
	town = setVisited(town, inn.id, true);
	town = setRelation(town, inn.id, 'positive');
	town = setNote(town, inn.id, 'Owes them a favour');
	town = setNote(town, general.id, 'Never met, but heard of them'); // a note before any visit
	town = setRumourTold(town, third.id, true);
	town = editRumour(town, third.id, { text: 'Reworded by the DM', truth: 'false' });
	const counted = fourth.stock.find((i) => i.qty > 1)!;
	town = sell(town, fourth.id, counted.name, 2);
	const offers = town.shops.find((s) => s.specialOrders.length >= 2)!;
	town = setOrder(town, offers.id, offers.specialOrders[0].name, 'order', '2026-11-01');
	town = setOrder(town, offers.id, offers.specialOrders[1].name, 'order', '2026-11-02');
	town = setOrder(town, offers.id, offers.specialOrders[1].name, 'collect');
	town = addStockItem(town, general.id, {
		name: 'Bag of holding (DM)',
		category: 'Wondrous',
		price: 412.37,
		qty: 1
	});
	town = renameShop(town, fourth.id, { shopName: 'The Book Name', surname: 'Hallwinter' });
	return { ...town, notes: 'The mayor is a doppelganger.' };
}

describe('town rows', () => {
	it('round-trips a played town as the party sees it', () => {
		const town = playedTown();
		const rows = townToRows(town, { campaignId: 'c1', newId: counter() });
		const party = partyRows(town, rows, { partyId: 'p1', now: NOW, newId: counter() });
		const back = rowsToSettlement(readBack(rows), partyView(party));
		expect(back).toEqual({ ...town, id: rows.town.id, campaignId: 'c1' });
	});

	it('round-trips every size, a town from a book, and placeholders', () => {
		const towns = [
			...['thorp', 'hamlet', 'village', 'small-city', 'metropolis'].map((tier) =>
				generateSettlement({
					seed: `rows-${tier}`,
					tier: tier as never,
					families: tokenFamilies(families)
				})
			),
			generateBookTown({
				name: 'Phandalin',
				tier: 'village',
				region: 'forest',
				description: 'A frontier town.',
				shops: [{ type: 'inn', name: 'Stonehill Inn' }, { type: 'general' }, { type: 'general' }],
				families
			})
		];
		for (const town of towns) {
			const rows = townToRows(town, { campaignId: 'c1', newId: counter() });
			expect(rowsToSettlement(readBack(rows))).toEqual({
				...town,
				id: rows.town.id,
				campaignId: 'c1'
			});
		}
	});

	it('stores the world in rows and leaves the party out', () => {
		const town = playedTown();
		const rows = townToRows(town, { campaignId: 'c1', newId: counter() });
		expect(rows.town.lookupKey).toBe(town.id);
		expect(rows.town.contentKeys).toContain(`town:${town.name}`);
		expect(rows.shops.map((s) => shopKey(s.type, s.slot))).toEqual(town.shops.map((s) => s.id));
		const dm = rows.stock.find((s) => s.name === 'Bag of holding (DM)')!;
		expect(dm).toMatchObject({ priceCp: 41237, source: 'added', qty: 1 });
		expect(rows.stock.some((s) => s.qty === null)).toBe(true); // drinks by the serving
		expect(JSON.stringify(rows)).not.toMatch(/Owes them a favour|"visited"|"relation"|"told"/);
	});

	it("pulls out the party's record, with what they paid", () => {
		const town = playedTown();
		const rows = townToRows(town, { campaignId: 'c1', newId: counter() });
		const party = partyRows(town, rows, { partyId: 'p1', now: NOW, newId: counter() });
		expect(party.town).toMatchObject({ partyId: 'p1', townId: rows.town.id });
		// Visiting, hearing a rumour, buying and ordering all count as meeting the keeper.
		const visited = town.shops.filter((s) => s.visited).length;
		expect(visited).toBeGreaterThanOrEqual(3);
		expect(party.keepers.filter((k) => k.metAt)).toHaveLength(visited);
		const noteOnly = party.keepers.find((k) => k.note === 'Never met, but heard of them');
		expect(noteOnly).toMatchObject({ metAt: null, standing: null });
		expect(party.keepers.find((k) => k.note === 'Owes them a favour')?.standing).toBe('positive');
		expect(party.rumours).toHaveLength(1);
		expect(party.orders.map((o) => Boolean(o.collectedAt))).toEqual([false, true]);
		const [bought] = party.purchases;
		const shop = town.shops[3];
		const item = shop.stock.find((i) => i.sold === 2)!;
		expect(shop.visited).toBe(true); // buying something is a visit
		expect(bought).toMatchObject({
			itemName: item.name,
			qty: 2,
			unitPriceCp: Math.round(item.price * partyPrices(shop).factor * 100)
		});
	});

	it("knows a town the party hasn't touched only when they're in it", () => {
		const town = generateSettlement({ seed: 'rows-quiet', tier: 'village', families });
		const rows = townToRows(town, { campaignId: 'c1', newId: counter() });
		expect(partyRows(town, rows, { partyId: 'p1' }).town).toBeUndefined();
		expect(partyRows(town, rows, { partyId: 'p1', here: true }).town).toBeDefined();
	});

	it('links rumours from the campaign bank', () => {
		const bankId = uuid7();
		const town = generateSettlement({
			seed: 'rows-bank',
			tier: 'small-town',
			families,
			customRumours: [{ id: bankId, text: 'The well is cursed.', truth: 'true', roles: [] }],
			rumourMode: 'only'
		});
		const rows = townToRows(town, { campaignId: 'c1', bankRumourIds: new Set([bankId]) });
		expect(rows.rumours.some((r) => r.bankRumourId === bankId)).toBe(true);
		expect(rowsToSettlement(readBack(rows)).shops.some((s) => s.keeper.rumour?.custom)).toBe(true);
	});
});

describe('ids', () => {
	it('parses shop ids', () => {
		expect(parseShopKey('weapons-12')).toEqual({ type: 'weapons', slot: 12 });
		expect(() => parseShopKey('weapons')).toThrow();
		expect(() => parseShopKey('0190a9a2-7a1b-7c3d-8e4f-123456789abc')).toThrow();
	});

	it('makes time-ordered v7 uuids', () => {
		const a = uuid7(1_700_000_000_000);
		const b = uuid7(1_700_000_000_001);
		expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(a.slice(0, 13) < b.slice(0, 13)).toBe(true);
		expect(a.slice(0, 13).replace('-', '')).toBe(
			(1_700_000_000_000).toString(16).padStart(12, '0')
		);
	});
});
