import { CUSTOM_RUMOUR_PREFIX, usedKeys } from '#lib/content/keys.ts';
import { fromCp, toCp } from '#lib/money.ts';
import { partyPrices } from '#lib/tracking.ts';
import type {
	FamilyRole,
	RegionId,
	Rumour as RumourView,
	RumourPlace,
	Settlement,
	Shop as ShopView,
	Shopkeeper,
	ShopType,
	SpecialOrder as OrderView,
	StockItem as StockView,
	TierId,
	TradeCount,
	Truth as TruthView
} from '#lib/types.ts';
import { uuid7 } from './ids.ts';
import type { PartyKeeper, Prisma, SpecialOrder, StockSource, Truth } from './prisma/client.ts';

/*
 * Between the app's towns and the database's rows.
 *
 * The app's pure functions (generator, tracking, edits, Party page) all work
 * on a `Settlement`: one town with everything in it. The database splits that
 * into the world (town, shops, keepers, rumours, stock) and each party's own
 * record (keepers met, standing, notes, rumours heard, purchases, orders).
 *
 * - `townToRows` turns a town into rows to insert. Store towns with surname
 *   placeholders (see render.ts).
 * - `partyRows` pulls a party's record out of a town (for importing a backup).
 * - `rowsToSettlement` puts a town back together as one party sees it.
 *
 * Shops keep their app ids ("weapons-2": type and slot) in the town as it's
 * shown, because the generator works out the next "Detail one" slot from them.
 * The town's id is its database id; its seed hash is `lookupKey`.
 */

const TRUTH_TO_DB: Record<TruthView, Truth> = { true: 'yes', 'partly true': 'partly', false: 'no' };
const TRUTH_FROM_DB: Record<Truth, TruthView> = { yes: 'true', partly: 'partly true', no: 'false' };

/** A shop's id in the app: its type and slot, unique in its town. */
export function shopKey(type: string, slot: number): string {
	return `${type}-${slot}`;
}

/** "weapons-2" -> { type: 'weapons', slot: 2 }. */
export function parseShopKey(id: string): { type: ShopType; slot: number } {
	const at = id.lastIndexOf('-');
	const slot = Number(id.slice(at + 1));
	if (at < 1 || !Number.isInteger(slot) || slot < 0) {
		throw new Error(`"${id}" isn't a shop id like "weapons-2"`);
	}
	return { type: id.slice(0, at) as ShopType, slot };
}

/** The YYYY-MM-DD an order was placed, as the app shows it. */
function day(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** An old backup's YYYY-MM-DD as a time (midday UTC, so it's the same day nearly everywhere). */
function fromDay(value: string, fallback: Date): Date {
	const date = new Date(`${value}T12:00:00Z`);
	return Number.isNaN(date.getTime()) ? fallback : date;
}

const json = (value: unknown) => value as Prisma.InputJsonValue;

// ── A town to rows ─────────────────────────────────────────────────────────

type WithId<T> = T & { id: string };

export interface TownRows {
	town: WithId<Prisma.TownCreateManyInput>;
	/** In the town's order; `keepers[i]` runs `shops[i]`. */
	shops: WithId<Prisma.ShopCreateManyInput>[];
	keepers: WithId<Prisma.KeeperCreateManyInput>[];
	rumours: WithId<Prisma.RumourCreateManyInput>[];
	stock: WithId<Prisma.StockItemCreateManyInput>[];
}

export interface TownRowsOptions {
	campaignId: string;
	/** The campaign's rumour bank ids, so placed rumours link back to their entry. */
	bankRumourIds?: ReadonlySet<string>;
	/** Makes row ids (tests pass a counter). */
	newId?: () => string;
}

function stockSource(item: StockView): StockSource {
	if (item.added) return 'added';
	if (item.mustHave) return 'must_have';
	return 'generated';
}

/**
 * A town as rows to insert in one transaction. Only the world goes here: what
 * a party did (visits, standing, notes, rumours heard, orders) comes from
 * `partyRows`. How many of each item have been sold is shared by everyone, so
 * that stays with the stock.
 */
export function townToRows(town: Settlement, opts: TownRowsOptions): TownRows {
	const newId = opts.newId ?? (() => uuid7());
	const { campaignId } = opts;
	const townId = newId();
	const rows: TownRows = {
		town: {
			id: townId,
			campaignId,
			lookupKey: town.id,
			origin: town.fromBook ? 'book' : 'seed',
			seed: town.seed,
			contentVersion: town.contentVersion ?? 1,
			name: town.name,
			tier: town.tier,
			region: town.region ?? 'heartland',
			population: town.population,
			description: town.description ?? null,
			shopTotals: json(town.shopTotals),
			trades: json(town.trades),
			dmNotes: town.notes ?? null,
			contentKeys: usedKeys(town),
			createdAt: new Date(town.createdAt)
		},
		shops: [],
		keepers: [],
		rumours: [],
		stock: []
	};

	town.shops.forEach((shop, position) => {
		const { slot } = parseShopKey(shop.id);
		const shopId = newId();
		rows.shops.push({
			id: shopId,
			townId,
			type: shop.type,
			slot,
			position,
			name: shop.name,
			nameFixed: Boolean(shop.fixedName),
			orderable: json(
				shop.specialOrders.map((o) => ({ name: o.name, priceCp: toCp(o.price), wait: o.wait }))
			)
		});

		const keeper = shop.keeper;
		const keeperId = newId();
		rows.keepers.push({
			id: keeperId,
			campaignId,
			shopId,
			familyRole: keeper.familyId,
			firstName: keeper.firstName,
			surname: keeper.surname ?? null,
			age: keeper.age,
			greeting: keeper.greeting,
			quirks: keeper.quirks,
			quirkKeys: keeper.quirkKeys ?? [],
			bargaining: keeper.bargaining.label,
			bargainMod: keeper.bargaining.modifier
		});

		const rumour = keeper.rumour;
		if (rumour) {
			const bankId = rumour.key?.startsWith(CUSTOM_RUMOUR_PREFIX)
				? rumour.key.slice(CUSTOM_RUMOUR_PREFIX.length)
				: undefined;
			rows.rumours.push({
				id: newId(),
				campaignId,
				keeperId,
				text: rumour.text,
				truth: TRUTH_TO_DB[rumour.truth],
				contentKey: rumour.key ?? null,
				bankRumourId: bankId && opts.bankRumourIds?.has(bankId) ? bankId : null,
				...(rumour.places && { places: json(rumour.places) }),
				edited: Boolean(rumour.edited)
			});
		}

		shop.stock.forEach((item, itemPosition) => {
			rows.stock.push({
				id: newId(),
				shopId,
				position: itemPosition,
				name: item.name,
				category: item.category,
				priceCp: toCp(item.price),
				qty: item.qty < 0 ? null : item.qty,
				sold: item.sold ?? 0,
				note: item.note ?? null,
				rarity: item.rarity ?? null,
				source: stockSource(item)
			});
		});
	});
	return rows;
}

// ── A party's record out of a town ─────────────────────────────────────────

export interface PartyRows {
	/** Set when the party knows the town at all. */
	town?: Prisma.PartyTownCreateManyInput;
	keepers: Prisma.PartyKeeperCreateManyInput[];
	rumours: Prisma.PartyRumourCreateManyInput[];
	purchases: Prisma.PurchaseCreateManyInput[];
	orders: Prisma.SpecialOrderCreateManyInput[];
}

export interface PartyRowsOptions {
	partyId: string;
	/** Whether standing changes prices in this campaign (for what purchases cost). */
	standingPrices?: boolean;
	/** The party is in this town now, so they know it even if they've done nothing. */
	here?: boolean;
	/** When things happened, where the old record doesn't say. */
	now?: Date;
	newId?: () => string;
}

/**
 * What one party did in a town, from a town saved by the browser-only app
 * (where there was a single party). Use the `rows` `townToRows` made from the
 * same town, so the ids line up.
 */
export function partyRows(town: Settlement, rows: TownRows, opts: PartyRowsOptions): PartyRows {
	const newId = opts.newId ?? (() => uuid7());
	const now = opts.now ?? new Date();
	const { partyId } = opts;
	const out: PartyRows = { keepers: [], rumours: [], purchases: [], orders: [] };

	town.shops.forEach((shop, i) => {
		const shopId = rows.shops[i].id;
		const keeperId = rows.keepers[i].id;
		const { keeper } = shop;

		if (shop.visited || keeper.relation || keeper.note) {
			out.keepers.push({
				partyId,
				keeperId,
				metAt: shop.visited ? now : null,
				standing: keeper.relation ?? null,
				note: keeper.note ?? null
			});
		}

		if (keeper.rumour?.told) {
			const rumourId = rows.rumours.find((r) => r.keeperId === keeperId)!.id;
			out.rumours.push({ partyId, rumourId, heardAt: now });
		}

		const { factor } = partyPrices(shop, opts.standingPrices ?? true);
		for (const item of shop.stock) {
			if (!item.sold) continue;
			out.purchases.push({
				id: newId(),
				partyId,
				shopId,
				keeperId,
				itemName: item.name,
				qty: item.sold,
				unitPriceCp: toCp(item.price * factor),
				createdAt: now
			});
		}

		for (const offer of shop.specialOrders) {
			if (!offer.order) continue;
			const placedAt = fromDay(offer.order.at, now);
			out.orders.push({
				id: newId(),
				partyId,
				shopId,
				keeperId,
				itemName: offer.name,
				priceCp: toCp(offer.price),
				wait: offer.wait,
				placedAt,
				collectedAt: offer.order.collected ? now : null
			});
		}
	});

	const known =
		opts.here ||
		out.keepers.length ||
		out.rumours.length ||
		out.purchases.length ||
		out.orders.length;
	if (known) out.town = { partyId, townId: rows.town.id, revealedAt: now };
	return out;
}

// ── Rows back to a town ────────────────────────────────────────────────────

/** What to load for a town: its shops in order with their current keeper, rumour and stock. */
export const townInclude = {
	shops: {
		orderBy: { position: 'asc' },
		include: {
			stock: { orderBy: { position: 'asc' } },
			keepers: {
				where: { replacedAt: null },
				include: { rumours: { where: { replacedAt: null } } }
			}
		}
	}
} satisfies Prisma.TownInclude;

export type TownWithShops = Prisma.TownGetPayload<{ include: typeof townInclude }>;
type ShopRow = TownWithShops['shops'][number];
type KeeperRow = ShopRow['keepers'][number];

/** One party's record for the keepers, rumours and orders in a town. */
export interface PartyView {
	keepers: Pick<PartyKeeper, 'keeperId' | 'metAt' | 'standing' | 'note'>[];
	/** Ids of the rumours they've heard. */
	heard: string[];
	orders: Pick<SpecialOrder, 'shopId' | 'itemName' | 'placedAt' | 'collectedAt'>[];
}

const NO_PARTY: PartyView = { keepers: [], heard: [], orders: [] };

function stockView(row: ShopRow['stock'][number]): StockView {
	const item: StockView = {
		name: row.name,
		category: row.category,
		price: fromCp(row.priceCp),
		qty: row.qty ?? -1
	};
	if (row.sold) item.sold = row.sold;
	if (row.note) item.note = row.note;
	if (row.rarity) item.rarity = row.rarity as StockView['rarity'];
	if (row.source === 'must_have') item.mustHave = true;
	if (row.source === 'added') item.added = true;
	return item;
}

function rumourView(row: KeeperRow['rumours'][number], told: boolean): RumourView {
	const rumour: RumourView = { text: row.text, truth: TRUTH_FROM_DB[row.truth] };
	if (row.contentKey) rumour.key = row.contentKey;
	if (row.contentKey?.startsWith(CUSTOM_RUMOUR_PREFIX)) rumour.custom = true;
	if (told) rumour.told = true;
	if (row.edited) rumour.edited = true;
	if (row.places) rumour.places = row.places as unknown as RumourPlace[];
	return rumour;
}

/** The order to show for an item: the one waiting, else the latest collected. */
function orderFor(orders: PartyView['orders'], shopId: string, name: string): OrderView['order'] {
	const mine = orders
		.filter((o) => o.shopId === shopId && o.itemName === name)
		.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
	const order = mine.find((o) => !o.collectedAt) ?? mine[0];
	if (!order) return undefined;
	return order.collectedAt
		? { at: day(order.placedAt), collected: true }
		: { at: day(order.placedAt) };
}

/**
 * A town as one party sees it (or as no party has touched it), in the shape
 * the app's pure functions and pages use.
 */
export function rowsToSettlement(town: TownWithShops, party: PartyView = NO_PARTY): Settlement {
	const met = new Map(party.keepers.map((k) => [k.keeperId, k]));
	const heard = new Set(party.heard);

	const shops = town.shops.map((row): ShopView => {
		const keeperRow = row.keepers[0];
		if (!keeperRow) throw new Error(`Shop ${row.id} has no current keeper`);
		const record = met.get(keeperRow.id);
		const rumourRow = keeperRow.rumours[0];

		const keeper: Shopkeeper = {
			familyId: keeperRow.familyRole as FamilyRole,
			firstName: keeperRow.firstName,
			age: keeperRow.age,
			quirks: keeperRow.quirks,
			quirkKeys: keeperRow.quirkKeys,
			greeting: keeperRow.greeting,
			bargaining: { label: keeperRow.bargaining, modifier: keeperRow.bargainMod }
		};
		if (keeperRow.surname) keeper.surname = keeperRow.surname;
		if (rumourRow) keeper.rumour = rumourView(rumourRow, heard.has(rumourRow.id));
		if (record?.standing) keeper.relation = record.standing;
		if (record?.note) keeper.note = record.note;

		const offers = row.orderable as unknown as { name: string; priceCp: number; wait: string }[];
		const shop: ShopView = {
			id: shopKey(row.type, row.slot),
			type: row.type as ShopType,
			name: row.name,
			keeper,
			stock: row.stock.map(stockView),
			specialOrders: offers.map((o) => {
				const offer: OrderView = { name: o.name, price: fromCp(o.priceCp), wait: o.wait };
				const order = orderFor(party.orders, row.id, o.name);
				if (order) offer.order = order;
				return offer;
			})
		};
		if (row.nameFixed) shop.fixedName = true;
		if (record?.metAt) shop.visited = true;
		return shop;
	});

	const settlement: Settlement = {
		id: town.id,
		seed: town.seed,
		contentVersion: town.contentVersion,
		campaignId: town.campaignId,
		name: town.name,
		tier: town.tier as TierId,
		region: town.region as RegionId,
		population: town.population,
		createdAt: town.createdAt.toISOString(),
		shops,
		shopTotals: town.shopTotals as Settlement['shopTotals'],
		trades: town.trades as unknown as TradeCount[]
	};
	if (town.dmNotes) settlement.notes = town.dmNotes;
	if (town.origin === 'book') settlement.fromBook = true;
	if (town.description) settlement.description = town.description;
	return settlement;
}
