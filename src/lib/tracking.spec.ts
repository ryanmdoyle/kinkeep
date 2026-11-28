import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { generateSettlement, rerollRumour, rerollShop, restock } from '#lib/generator.ts';
import {
	editRumour,
	purchases,
	remaining,
	sell,
	setOrder,
	familyStanding,
	partyPrices,
	relationOf,
	returningGreeting,
	setNote,
	setRelation,
	setRumourTold,
	setVisited,
	townProgress,
	wordOfKin,
	type Kin
} from '#lib/tracking.ts';
import { RETURNING, WORD_OF_KIN } from '#lib/data/reactions.ts';

const families = DEFAULT_FAMILIES;
const town = generateSettlement({ seed: 'track-1', tier: 'small-town', families });
const withRumour = town.shops.find((s) => s.keeper.rumour)!;

describe('tracking', () => {
	it('starts with nothing visited or told', () => {
		const p = townProgress(town);
		expect(p.visited).toBe(0);
		expect(p.told).toBe(0);
		expect(town.shops.every((s) => relationOf(s) === undefined)).toBe(true);
	});

	it('marks a shop visited without touching the others', () => {
		const next = setVisited(town, withRumour.id, true);
		expect(townProgress(next).visited).toBe(1);
		expect(relationOf(next.shops.find((s) => s.id === withRumour.id)!)).toBe('neutral');
		expect(town.shops.some((s) => s.visited)).toBe(false);
	});

	it('marking a rumour told also marks the shop visited', () => {
		const next = setRumourTold(town, withRumour.id, true);
		const shop = next.shops.find((s) => s.id === withRumour.id)!;
		expect(shop.keeper.rumour?.told).toBe(true);
		expect(shop.visited).toBe(true);
		const undone = setRumourTold(next, withRumour.id, false);
		expect(undone.shops.find((s) => s.id === withRumour.id)!.visited).toBe(true);
		expect(townProgress(undone).told).toBe(0);
	});

	it('records standing, shown only once visited', () => {
		const soured = setRelation(town, withRumour.id, 'negative');
		expect(relationOf(soured.shops.find((s) => s.id === withRumour.id)!)).toBeUndefined();
		const visited = setVisited(soured, withRumour.id, true);
		expect(relationOf(visited.shops.find((s) => s.id === withRumour.id)!)).toBe('negative');
	});

	it('a new rumour or a rerolled shop starts fresh', () => {
		let next = setRumourTold(town, withRumour.id, true);
		next = setRelation(next, withRumour.id, 'positive');
		const input = {
			families,
			avoid: new Set<string>(),
			customRumours: [],
			rumourMode: 'first' as const
		};
		const newRumour = rerollRumour(next, withRumour.id, input);
		expect(newRumour.shops.find((s) => s.id === withRumour.id)!.keeper.rumour?.told).toBeFalsy();
		const rerolled = rerollShop(next, withRumour.id, input).shops.find(
			(s) => s.id === withRumour.id
		)!;
		expect(rerolled.visited).toBeFalsy();
		expect(rerolled.keeper.relation).toBeUndefined();
	});
});

describe('notes', () => {
	it('saves a trimmed note and clears a blank one', () => {
		const noted = setNote(town, withRumour.id, '  owes 5 gp ');
		expect(noted.shops.find((s) => s.id === withRumour.id)!.keeper.note).toBe('owes 5 gp');
		const cleared = setNote(noted, withRumour.id, '   ');
		expect('note' in cleared.shops.find((s) => s.id === withRumour.id)!.keeper).toBe(false);
	});
});

describe('party prices', () => {
	const shop = withRumour;
	const fair = {
		...shop,
		keeper: { ...shop.keeper, bargaining: { label: 'Fair and firm (no haggling)', modifier: 0 } }
	};
	const regulars = {
		...shop,
		keeper: {
			...shop.keeper,
			bargaining: { label: 'Gives regulars a discount (−10% on return visits)', modifier: 0 }
		}
	};

	it('leaves prices alone until the party has visited', () => {
		expect(partyPrices({ ...regulars, visited: false }).factor).toBe(1);
	});

	it('moves prices by standing, unless turned off', () => {
		const sour = {
			...fair,
			visited: true,
			keeper: { ...fair.keeper, relation: 'negative' as const }
		};
		expect(partyPrices(sour).factor).toBeCloseTo(1.2);
		expect(partyPrices(sour, false).factor).toBe(1);
		const sweet = {
			...fair,
			visited: true,
			keeper: { ...fair.keeper, relation: 'positive' as const }
		};
		expect(partyPrices(sweet).factor).toBeCloseTo(0.9);
		expect(partyPrices({ ...fair, visited: true }).factor).toBe(1);
	});

	it('gives regulars their promised discount, standing or not', () => {
		const back = { ...regulars, visited: true };
		expect(partyPrices(back, false).factor).toBeCloseTo(0.9);
		expect(partyPrices(back, false).reasons).toEqual(['−10% for regulars']);
		const friends = { ...back, keeper: { ...back.keeper, relation: 'positive' as const } };
		expect(partyPrices(friends).factor).toBeCloseTo(0.81);
	});
});

describe('what keepers say', () => {
	it('greets returning parties by standing', () => {
		expect(returningGreeting(withRumour)).toBeUndefined();
		const sour = {
			...withRumour,
			visited: true,
			keeper: { ...withRumour.keeper, relation: 'negative' as const }
		};
		expect(RETURNING.negative).toContain(returningGreeting(sour));
		expect(returningGreeting(sour)).toBe(returningGreeting(sour));
	});

	const kin = (relation: Kin['relation'], here = false): Kin => ({
		firstName: 'Magda',
		town: 'Oakford',
		townId: 't1',
		shop: 'The Anvil',
		relation,
		here
	});

	it('sums family standing', () => {
		expect(familyStanding([])).toBeUndefined();
		expect(familyStanding([kin('positive'), kin('negative')])).toBe('neutral');
		expect(familyStanding([kin('negative'), kin('neutral')])).toBe('negative');
	});

	it('passes on word from kin to keepers the party has not met', () => {
		const said = wordOfKin(withRumour, [kin('negative')])!;
		expect(said.relation).toBe('negative');
		expect(said.text).toContain('Magda in Oakford');
		expect(said.text).not.toMatch(/[{}]/);
		expect(wordOfKin(withRumour, [kin('positive', true)])!.text).toContain('Magda down the street');
		expect(wordOfKin({ ...withRumour, visited: true }, [kin('negative')])).toBeUndefined();
		expect(wordOfKin(withRumour, [])).toBeUndefined();
	});

	it('every line fills cleanly', () => {
		for (const lines of Object.values(WORD_OF_KIN)) {
			for (const line of lines) {
				expect(line.replace(/\{cousin\}|\{where\}/g, '')).not.toMatch(/[{}]/);
				expect(line).toContain('{cousin}');
			}
		}
	});
});

describe('editing rumours', () => {
	it('rewords a rumour and marks it edited', () => {
		const next = editRumour(town, withRumour.id, {
			text: ' The mill is haunted. ',
			truth: 'false'
		});
		const rumour = next.shops.find((s) => s.id === withRumour.id)!.keeper.rumour!;
		expect(rumour).toMatchObject({ text: 'The mill is haunted.', truth: 'false', edited: true });
		expect(rumour.key).toBe(withRumour.keeper.rumour!.key);
	});
	it('ignores a blank or unchanged edit', () => {
		expect(editRumour(town, withRumour.id, { text: '   ' }).shops).toEqual(town.shops);
		const same = editRumour(town, withRumour.id, { text: withRumour.keeper.rumour!.text });
		expect(same.shops.find((s) => s.id === withRumour.id)!.keeper.rumour!.edited).toBeUndefined();
	});
});

describe('shopping', () => {
	const shop = town.shops.find((s) => s.stock.some((i) => i.qty >= 2))!;
	const item = shop.stock.find((i) => i.qty >= 2)!;
	const input = {
		families,
		avoid: new Set<string>(),
		customRumours: [],
		rumourMode: 'first' as const
	};
	const find = (t: typeof town) => t.shops.find((s) => s.id === shop.id)!;

	it('counts what the party buys and marks the shop visited', () => {
		let next = sell(town, shop.id, item.name, 1);
		next = sell(next, shop.id, item.name, 1);
		const after = find(next);
		expect(after.visited).toBe(true);
		expect(remaining(after.stock.find((i) => i.name === item.name)!)).toBe(item.qty - 2);
		expect(purchases(after)).toEqual([{ name: item.name, count: 2 }]);
	});

	it("can't sell more than there is, and undoing goes back to none", () => {
		let next = town;
		for (let n = 0; n < item.qty + 3; n++) next = sell(next, shop.id, item.name, 1);
		expect(remaining(find(next).stock.find((i) => i.name === item.name)!)).toBe(0);
		for (let n = 0; n < item.qty + 3; n++) next = sell(next, shop.id, item.name, -1);
		expect('sold' in find(next).stock.find((i) => i.name === item.name)!).toBe(false);
	});

	it('ignores things sold by the serving', () => {
		const inn = town.shops.find((s) => s.stock.some((i) => i.qty < 0));
		if (!inn) return;
		const meal = inn.stock.find((i) => i.qty < 0)!;
		expect(sell(town, inn.id, meal.name, 1).shops).toEqual(town.shops);
	});

	it('places, collects and cancels special orders', () => {
		const withOrders = town.shops.find((s) => s.specialOrders.length)!;
		const name = withOrders.specialOrders[0].name;
		const get = (t: typeof town) =>
			t.shops.find((s) => s.id === withOrders.id)!.specialOrders.find((o) => o.name === name)!;
		const ordered = setOrder(town, withOrders.id, name, 'order', '2026-11-27');
		expect(get(ordered).order).toEqual({ at: '2026-11-27' });
		expect(ordered.shops.find((s) => s.id === withOrders.id)!.visited).toBe(true);
		const collected = setOrder(ordered, withOrders.id, name, 'collect');
		expect(get(collected).order).toEqual({ at: '2026-11-27', collected: true });
		expect(get(setOrder(ordered, withOrders.id, name, 'cancel')).order).toBeUndefined();
	});

	it('restocking clears sales but keeps the keeper and orders', () => {
		let next = sell(town, shop.id, item.name, 1);
		const withOrders = next.shops.find((s) => s.specialOrders.length)!;
		next = setOrder(next, withOrders.id, withOrders.specialOrders[0].name, 'order', '2026-11-27');
		const fresh = restock(next, input);
		for (const s of fresh.shops) {
			const before = next.shops.find((b) => b.id === s.id)!;
			expect(s.keeper).toEqual(before.keeper);
			expect(s.specialOrders).toEqual(before.specialOrders);
			expect(s.stock.some((i) => i.sold)).toBe(false);
		}
		const one = restock(next, input, shop.id);
		expect(one.shops.filter((s) => s.id !== shop.id)).toEqual(
			next.shops.filter((s) => s.id !== shop.id)
		);
	});
});
