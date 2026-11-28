import { catalogFor, SPECIAL_ORDER_WAIT } from '#lib/data/catalog.ts';
import { HAIR_COLORS } from '#lib/data/families.ts';
import { AGES, BARGAINING, settlementName } from '#lib/data/names.ts';
import { getRegion, regionsAt } from '#lib/data/regions.ts';
import {
	DIRECTIONS,
	LOCAL_NAMES,
	LOCAL_TRADES,
	MONSTERS,
	ROLE_RUMOURS,
	TRUTH_WEIGHTS
} from '#lib/data/rumours.ts';
import { SHOP_RULES, TIERS, TRADES, getTier, type Tier } from '#lib/data/tiers.ts';
import { contentKey, usedKeys } from '#lib/content/keys.ts';
import { at, CONTENT_VERSION, normalizeVersion } from '#lib/content/versioned.ts';
import { roundPrice } from '#lib/money.ts';
import { createRng, hashString, randomSeed, type Rng } from '#lib/rng.ts';
import { fillTemplate } from '#lib/template.ts';
import type {
	CatalogItem,
	CustomRumour,
	Family,
	FamilyRole,
	MustHave,
	Region,
	RegionId,
	Rumour,
	RumourMode,
	Settlement,
	Shop,
	ShopType,
	Shopkeeper,
	StockItem,
	TierId
} from '#lib/types.ts';

/*
 * How seeds stay stable (see CONTENT.md):
 *
 * 1. Every table is read `at(table, version)`, so a town built at content
 *    version 1 only ever sees version-1 content.
 * 2. Every decision rolls on its own stream, forked from the seed by a
 *    label ("shop:inn:0/keeper/name"). New rolls added in one place never
 *    shift the rolls anywhere else.
 * 3. `pick`/`sample` use one roll whatever the list length and score lines
 *    by position, so even at the newest version, adding a line only changes
 *    picks that the new line wins.
 *
 * When changing generator LOGIC (not content), keep the old behavior for
 * old versions: `if (ctx.version >= 2) { ...new rule... }`, and use new
 * fork labels for new rolls. The golden tests fail if an old version's
 * towns change.
 */

/** What a campaign brings to generation: its families and its history. */
export interface CampaignInput {
	families: Family[];
	/** Content keys already used in the campaign; picks skip these while others are left. */
	avoid?: Iterable<string>;
	/** The DM's own rumours to spread through the shops. */
	customRumours?: CustomRumour[];
	rumourMode?: RumourMode;
	/** Items every town in the campaign has somewhere (see `stockMustHaves`). */
	mustHaves?: MustHave[];
}

export interface GenerateOptions extends CampaignInput {
	seed?: string;
	/** Leave out to pick a size at random (weighted toward small places, like real life). */
	tier?: TierId;
	/** Leave out to pick a region at random. */
	region?: RegionId;
	name?: string;
	/** Content version to build with. Defaults to the newest. */
	contentVersion?: number;
	/** Campaign the town belongs to (part of its id). */
	campaignId?: string;
}

/** Everything the shop builders need, passed around as one bundle. */
interface Ctx {
	version: number;
	/** The town being built, so rumours don't name it as somewhere else. */
	townName?: string;
	tier: Tier;
	region: Region;
	families: Family[];
	/** Content keys used in the campaign or already in this town. */
	taken: Set<string>;
	customRumours: CustomRumour[];
	rumourMode: RumourMode;
}

function newCtx(
	input: CampaignInput,
	version: number,
	tier: Tier,
	region: Region,
	alsoTaken: string[] = []
): Ctx {
	return {
		version,
		tier,
		region,
		families: input.families,
		taken: new Set([...(input.avoid ?? []), ...alsoTaken]),
		customRumours: (input.customRumours ?? []).filter((r) => r.text.trim()),
		rumourMode: input.rumourMode ?? 'first'
	};
}

const ROLES: FamilyRole[] = ['inn', 'general', 'weapons', 'armor', 'potions', 'magic'];

export function familyForShop(type: ShopType): FamilyRole {
	return type === 'smithy' ? 'weapons' : type;
}

/**
 * Realistic-ish weighting when the size is random: most settlements in a
 * medieval landscape are tiny.
 */
const RANDOM_TIER_WEIGHTS = [6, 10, 12, 8, 5, 3, 1.5, 0.5];

function pickTier(rng: Rng): Tier {
	const total = RANDOM_TIER_WEIGHTS.reduce((a, b) => a + b, 0);
	let roll = rng.next() * total;
	for (let idx = 0; idx < TIERS.length; idx++) {
		roll -= RANDOM_TIER_WEIGHTS[idx];
		if (roll <= 0) return TIERS[idx];
	}
	return TIERS[0];
}

/** Population skewed toward the low end of the tier's range. */
function rollPopulation(rng: Rng, tier: Tier): number {
	const t = Math.pow(rng.next(), 1.6);
	return Math.round(tier.min + (tier.max - tier.min) * t);
}

/** pop / supportValue, with the fractional part rolled as a chance. */
function realisticCount(rng: Rng, pop: number, supportValue: number): number {
	const expected = pop / supportValue;
	const whole = Math.floor(expected);
	return whole + (rng.chance(expected - whole) ? 1 : 0);
}

/**
 * Fills {place}, {person}, {monster}, {direction} and {kin} in a rumour line,
 * and notes the town {place} named so the party can go there.
 */
function fillRumour(
	ctx: Ctx,
	rng: Rng,
	family: Family,
	template: string
): Pick<Rumour, 'text' | 'places'> {
	const { version: v, region } = ctx;
	const fill = rng.fork('fill');
	const others = ctx.families.filter((f) => f.id !== family.id);
	// A rumour about "the caravan from Oakford" shouldn't be told in Oakford.
	let place = '';
	let placeTier = 0;
	for (let attempt = 0; attempt < 6; attempt++) {
		const roll = fill.fork(attempt ? `place:${attempt}` : 'place');
		placeTier = roll.int(0, 4);
		place = settlementName(roll, placeTier, v, region);
		if (place !== ctx.townName) break;
	}
	const text = fillTemplate(template, {
		place,
		person: `${fill.fork('person').pick(at(LOCAL_NAMES, v))} ${fill.fork('trade').pick(at(LOCAL_TRADES, v))}`,
		monster: fill.fork('monster').pick(at(MONSTERS, v)),
		direction: fill.fork('direction').pick(at(DIRECTIONS, v)),
		kin: others.length ? fill.fork('kin').pick(others).surname : 'other'
	});
	if (!template.includes('{place}')) return { text };
	return { text, places: [{ name: place, tier: TIERS[placeTier].id }] };
}

/** One of the campaign's own rumours that this shopkeeper could tell, if any. */
function customRumour(ctx: Ctx, rng: Rng, family: Family): Rumour | undefined {
	const mine = ctx.customRumours.filter((r) => !r.roles.length || r.roles.includes(family.id));
	const told = (r: CustomRumour) => ctx.taken.has(contentKey.customRumour(r.id));
	const untold = mine.some((r) => !told(r));
	const use =
		mine.length > 0 &&
		(ctx.rumourMode === 'only' ||
			(ctx.rumourMode === 'first' && untold) ||
			(ctx.rumourMode === 'mix' && untold && rng.fork('custom').chance(0.5)));
	if (!use) return undefined;
	const chosen = rng.fork('custom-line').pick(mine, told);
	const key = contentKey.customRumour(chosen.id);
	ctx.taken.add(key);
	return {
		...fillRumour(ctx, rng, family, chosen.text),
		truth: chosen.truth,
		key,
		custom: true
	};
}

function makeRumour(ctx: Ctx, rng: Rng, family: Family): Rumour | undefined {
	const own = customRumour(ctx, rng, family);
	if (own) return own;
	// "Only mine": keepers with none of the DM's rumours to tell stay quiet.
	if (ctx.rumourMode === 'only' && ctx.customRumours.length) return undefined;

	const { version: v, region } = ctx;
	const pools = rng.fork('pool');
	let pool = at(ROLE_RUMOURS[family.id] ?? ROLE_RUMOURS.general, v);
	const regional = at(region.rumours, v);
	if (pools.chance(0.35) && regional.length) {
		pool = regional;
	} else if (family.id === 'inn' && pools.chance(0.5)) {
		// Innkeepers hear a bit of everything.
		pool = at(ROLE_RUMOURS[pools.pick(ROLES)], v);
	}

	// If a campaign has used every line in that pool, borrow from the
	// shopkeeper's own pool, then the region's, then any shop's, before
	// repeating anything.
	const isTaken = (t: string) => ctx.taken.has(contentKey.rumour(t));
	const fallbacks = [
		pool,
		at(ROLE_RUMOURS[family.id] ?? ROLE_RUMOURS.general, v),
		regional,
		ROLES.flatMap((r) => at(ROLE_RUMOURS[r], v))
	];
	const source = fallbacks.find((p) => p.some((t) => !isTaken(t))) ?? pool;
	const template = rng.fork('line').pick(source, isTaken);
	const key = contentKey.rumour(template);
	ctx.taken.add(key);

	const total = TRUTH_WEIGHTS.reduce((a, b) => a + b.weight, 0);
	let roll = rng.fork('truth').next() * total;
	const truth = TRUTH_WEIGHTS.find((t) => (roll -= t.weight) <= 0)?.truth ?? 'true';
	return { ...fillRumour(ctx, rng, family, template), truth, key };
}

function makeKeeper(ctx: Ctx, rng: Rng, family: Family): Shopkeeper {
	const { version: v, taken } = ctx;
	const firstName =
		rng.fork('name').pick(family.firstNames, (n) => taken.has(contentKey.keeper(family.id, n))) ??
		'Unnamed';
	taken.add(contentKey.keeper(family.id, firstName));

	const q = rng.fork('quirks');
	const quirkCount = q.chance(0.35) ? 2 : 1;
	const templates = q.sample(family.quirks, quirkCount, (t) =>
		taken.has(contentKey.quirk(family.id, t))
	);
	const quirkKeys = templates.map((t) => contentKey.quirk(family.id, t));
	for (const key of quirkKeys) taken.add(key);
	const quirks = templates.map((t, n) =>
		fillTemplate(t, {
			color: q.fork(`color:${n}`).pick(at(HAIR_COLORS, v)),
			surname: family.surname
		})
	);

	return {
		familyId: family.id,
		firstName,
		age: rng.fork('age').pick(at(AGES, v)),
		quirks,
		quirkKeys,
		greeting: fillTemplate(rng.fork('greeting').pick(family.greetings) ?? '', {
			surname: family.surname
		}),
		bargaining: rng.fork('bargaining').pick(at(BARGAINING, v)),
		rumour: makeRumour(ctx, rng.fork('rumour'), family)
	};
}

/** The shop's catalog with the region's local goods added and tiers shifted. */
function regionalCatalog(type: ShopType, region: Region, version: number): CatalogItem[] {
	const extra = region.extraItems[type];
	const base = [...catalogFor(type, version), ...(extra ? at(extra, version) : [])];
	const seen = new Set<string>();
	return base
		.filter((item) => !seen.has(item.name) && seen.add(item.name))
		.map((item) => ({
			...item,
			minTier: Math.max(0, item.minTier + (region.tierShift[item.name] ?? 0))
		}));
}

function regionalPrice(item: CatalogItem, region: Region): number {
	return (
		item.price * (region.priceByCategory[item.category] ?? 1) * (region.priceByItem[item.name] ?? 1)
	);
}

function maxQuantity(item: CatalogItem, type: ShopType): number {
	const forged = type === 'smithy' || type === 'weapons' || type === 'armor';
	if (item.category === 'Ammunition') return 10;
	if (item.category === 'Lodging') return 6;
	if (item.price >= 100) return 1;
	if (item.price >= 20 || (forged && item.category.includes('armor'))) return 2;
	if (forged) return 4;
	return item.price >= 1 ? 8 : 20;
}

function makeStock(ctx: Ctx, rng: Rng, type: ShopType, keeper: Shopkeeper, peddler: boolean) {
	const { tier, region, version: v } = ctx;
	const catalog = regionalCatalog(type, region, v);
	const stock: StockItem[] = [];
	const priceMod = tier.priceMod * (1 + keeper.bargaining.modifier);

	for (const item of catalog) {
		if (item.minTier > tier.index) continue;
		// Each item rolls on its own stream, so adding an item to a catalog
		// never changes whether (or how many of) the others are in stock.
		const roll = rng.fork(`item:${item.name}`);
		const chance = peddler ? 0.35 : item.staple ? 1 : tier.stockChance;
		if (!roll.chance(chance)) continue;

		const bigTownBonus = tier.index >= 5 ? 2 : 1;
		const max = maxQuantity(item, type);
		const qty = item.unlimited ? -1 : roll.int(1, max > 1 ? max * bigTownBonus : 1);
		const jitter = 0.9 + roll.next() * 0.2;

		stock.push({
			name: item.name,
			category: item.category,
			price: roundPrice(regionalPrice(item, region) * priceMod * jitter),
			qty,
			note: item.note,
			rarity: item.rarity
		});
	}

	const dishes = at(region.dishes, v);
	if (type === 'inn' && dishes.length) {
		stock.unshift({
			name: `House special: ${rng.fork('house-special').pick(dishes)}`,
			category: 'Meals',
			price: roundPrice(0.4 * priceMod * (region.priceByCategory.Meals ?? 1)),
			qty: -1
		});
	}

	const specialOrders =
		peddler || type === 'inn'
			? []
			: catalog
					.filter((item) => item.minTier > tier.index && item.minTier <= tier.index + 3)
					.filter((item) => rng.fork(`order:${item.name}`).chance(0.5))
					.slice(0, 6)
					.map((item) => ({
						name: item.name,
						// Ordering from afar costs extra.
						price: roundPrice(regionalPrice(item, region) * priceMod * 1.25),
						wait: SPECIAL_ORDER_WAIT[item.minTier - tier.index]
					}));

	return { stock, specialOrders };
}

function makeShop(ctx: Ctx, rng: Rng, type: ShopType, idx: number, peddler = false): Shop {
	const family = ctx.families.find((f) => f.id === familyForShop(type));
	if (!family) throw new Error(`No family for shop type ${type}`);
	const keeper = makeKeeper(ctx, rng.fork('keeper'), family);

	let name = '';
	for (let attempt = 0; attempt < 6; attempt++) {
		const roll = rng.fork(`name:${attempt}`);
		const template = peddler
			? "{first} {surname}'s Peddler Cart"
			: type === 'smithy'
				? "{first} {surname}'s Smithy"
				: roll.pick(family.shopNames);
		name = fillTemplate(template ?? '{surname}', {
			surname: family.surname,
			first: keeper.firstName,
			adj: roll.fork('adj').pick(family.adjectives) ?? ''
		});
		if (!ctx.taken.has(contentKey.shop(name))) break;
	}
	ctx.taken.add(contentKey.shop(name));

	const { stock, specialOrders } = makeStock(ctx, rng.fork('stock'), type, keeper, peddler);
	return { id: `${type}-${idx}`, type, name, keeper, stock, specialOrders };
}

export function generateSettlement(opts: GenerateOptions): Settlement {
	const seed = opts.seed?.trim() || randomSeed();
	const version = normalizeVersion(opts.contentVersion ?? CONTENT_VERSION);
	const root = createRng(seed);
	const tier = opts.tier ? getTier(opts.tier) : pickTier(root.fork('tier'));
	const region = opts.region
		? getRegion(opts.region)
		: root.fork('region').pick(regionsAt(version));

	const ctx = newCtx(opts, version, tier, region);

	const population = rollPopulation(root.fork('population'), tier);
	// A typed-in name is kept as is; a generated one skips names the campaign has used.
	let name = opts.name?.trim() ?? '';
	for (let attempt = 0; !opts.name?.trim() && attempt < 6; attempt++) {
		name = settlementName(root.fork(`name:${attempt}`), tier.index, version, region);
		if (!ctx.taken.has(contentKey.town(name))) break;
	}
	ctx.taken.add(contentKey.town(name));
	ctx.townName = name;

	const shops: Shop[] = [];
	const shopTotals: Partial<Record<ShopType, number>> = {};

	for (const rule of SHOP_RULES) {
		const min = rule.minByTier[tier.index];
		if (min < 0) continue;

		// A thorp has no store, but sometimes a peddler is passing through.
		if (rule.type === 'general' && tier.index === 0) {
			if (root.fork('peddler').chance(0.5)) {
				shops.push(makeShop(ctx, root.fork('shop:peddler'), 'general', 0, true));
				shopTotals.general = 1;
			}
			continue;
		}

		const counted = realisticCount(root.fork(`count:${rule.type}`), population, rule.supportValue);
		const total = Math.max(min, counted);
		if (total === 0) continue;
		shopTotals[rule.type] = total;
		const featured = Math.min(total, tier.featuredCap);
		for (let n = 0; n < featured; n++) {
			shops.push(makeShop(ctx, root.fork(`shop:${rule.type}:${n}`), rule.type, n));
		}
	}

	const trades = TRADES.filter((t) => tier.index >= t.minTier).map((t) => ({
		label: t.label,
		count: Math.max(1, realisticCount(root.fork(`trade:${t.label}`), population, t.supportValue))
	}));

	const town: Settlement = {
		// Built from the inputs only (not from anything avoid-repeats can change),
		// so reopening a seed in the same campaign finds the saved copy.
		id: hashString(
			`${opts.campaignId ?? ''}|${seed}|${version}|${tier.id}|${region.id}|${opts.name?.trim() ?? ''}`
		).toString(36),
		seed,
		contentVersion: version,
		campaignId: opts.campaignId,
		name,
		tier: tier.id,
		region: region.id,
		population,
		createdAt: new Date().toISOString(),
		shops,
		shopTotals,
		trades
	};
	return stockMustHaves(town, opts.mustHaves);
}

/** A thorp's "general store" is a passing peddler, unless the DM set the town up by hand. */
function isPeddler(settlement: Settlement, ctx: Ctx, type: ShopType): boolean {
	return !settlement.fromBook && ctx.tier.index === 0 && type === 'general';
}

export interface BookTownOptions extends CampaignInput {
	name: string;
	tier: TierId;
	region: RegionId;
	/** Leave out for a typical population for the size. */
	population?: number;
	description?: string;
	/** Every shop the town has, in order, with its name from the book if given. */
	shops: { type: ShopType; name?: string }[];
	campaignId?: string;
}

/**
 * A town from a published adventure: the DM's name, size, region and exact
 * shops, run by the campaign's families. Nothing else is added. It gets a
 * random seed so rerolls work, but it's saved rather than rebuilt from a link.
 */
export function generateBookTown(opts: BookTownOptions): Settlement {
	const seed = randomSeed();
	const version = CONTENT_VERSION;
	const root = createRng(seed);
	const tier = getTier(opts.tier);
	const region = getRegion(opts.region);
	const ctx = newCtx(opts, version, tier, region);
	const name = opts.name.trim() || 'Unnamed town';
	ctx.taken.add(contentKey.town(name));
	ctx.townName = name;
	const population =
		opts.population && opts.population > 0
			? Math.round(opts.population)
			: rollPopulation(root.fork('population'), tier);

	// Book names first, so a family-named shop never takes one of them.
	for (const s of opts.shops) if (s.name?.trim()) ctx.taken.add(contentKey.shop(s.name.trim()));
	const counts: Partial<Record<ShopType, number>> = {};
	const shops = opts.shops.map((s) => {
		const idx = counts[s.type] ?? 0;
		counts[s.type] = idx + 1;
		const shop = makeShop(ctx, root.fork(`shop:${s.type}:${idx}`), s.type, idx);
		const bookName = s.name?.trim();
		return bookName ? { ...shop, name: bookName, fixedName: true } : shop;
	});

	const trades = TRADES.filter((t) => tier.index >= t.minTier).map((t) => ({
		label: t.label,
		count: Math.max(1, realisticCount(root.fork(`trade:${t.label}`), population, t.supportValue))
	}));

	const town: Settlement = {
		id: hashString(`${opts.campaignId ?? ''}|book|${name}|${seed}`).toString(36),
		seed,
		contentVersion: version,
		campaignId: opts.campaignId,
		name,
		tier: tier.id,
		region: region.id,
		population,
		createdAt: new Date().toISOString(),
		shops,
		shopTotals: counts,
		trades,
		fromBook: true,
		description: opts.description?.trim() || undefined
	};
	return stockMustHaves(town, opts.mustHaves);
}

/** Rerolls are meant to be fresh, so they use the newest content and a random stream. */
function contextFor(settlement: Settlement, input: CampaignInput): Ctx {
	const ctx = newCtx(
		input,
		CONTENT_VERSION,
		getTier(settlement.tier),
		getRegion(settlement.region),
		usedKeys(settlement)
	);
	ctx.townName = settlement.name;
	return ctx;
}

const freshRng = (settlement: Settlement, label: string) =>
	createRng(`${settlement.seed}/${label}/${Math.random()}`);

/**
 * Rerolls one shop (new keeper from the same family, new stock). Other shops
 * keep their names, quirks and rumours reserved so we don't get two Brunnas
 * in town.
 */
export function rerollShop(
	settlement: Settlement,
	shopId: string,
	input: CampaignInput
): Settlement {
	const target = settlement.shops.find((s) => s.id === shopId);
	if (!target) return settlement;
	const ctx = contextFor(settlement, input);
	const peddler = isPeddler(settlement, ctx, target.type);
	const fresh = makeShop(ctx, freshRng(settlement, shopId), target.type, 0, peddler);
	// A shop the DM named (from a book) keeps its name; only the keeper and stock change.
	const named = target.fixedName ? { name: target.name, fixedName: true } : {};
	const shop = { ...fresh, ...named, id: shopId, stock: keepAdded(target.stock, fresh.stock) };
	return stockMustHaves(
		{ ...settlement, shops: settlement.shops.map((s) => (s.id === shopId ? shop : s)) },
		input.mustHaves
	);
}

/** New stock with the items the DM added by hand put back (back to full). */
function keepAdded(old: StockItem[], fresh: StockItem[]): StockItem[] {
	const kept = old.filter((i) => i.added).map(({ sold: _sold, ...item }) => item);
	const names = new Set(kept.map((i) => i.name.toLowerCase()));
	return [...fresh.filter((i) => !names.has(i.name.toLowerCase())), ...kept];
}

/**
 * Time passes: fresh stock for one shop, or every shop if `shopId` is left
 * out. Keepers stay the same, what the party bought is forgotten, and special
 * orders (and any the party placed) are kept.
 */
export function restock(settlement: Settlement, input: CampaignInput, shopId?: string): Settlement {
	const ctx = contextFor(settlement, input);
	const restocked = {
		...settlement,
		shops: settlement.shops.map((shop) => {
			if (shopId && shop.id !== shopId) return shop;
			const peddler = isPeddler(settlement, ctx, shop.type);
			const rng = freshRng(settlement, `${shop.id}:restock`);
			const { stock } = makeStock(ctx, rng, shop.type, shop.keeper, peddler);
			return { ...shop, stock: keepAdded(shop.stock, stock) };
		})
	};
	return stockMustHaves(restocked, input.mustHaves);
}

const SHOP_TYPES: ShopType[] = ['inn', 'general', 'smithy', 'weapons', 'armor', 'potions', 'magic'];

/** Kept in stock from further afield (or above the town's size): a quarter more, like an order. */
const FROM_AFAR = 1.25;

const allItems = new Map<number, CatalogItem[]>();

/**
 * Every item any shop in any region sells, once each, for picking what to
 * add to a shop or keep in every town.
 */
export function allCatalogItems(version = CONTENT_VERSION): CatalogItem[] {
	const cached = allItems.get(version);
	if (cached) return cached;
	const items = new Map<string, CatalogItem>();
	const add = (item: CatalogItem) => {
		const key = item.name.toLowerCase();
		if (!items.has(key)) items.set(key, item);
	};
	for (const type of SHOP_TYPES) catalogFor(type, version).forEach(add);
	for (const region of regionsAt(version)) {
		for (const extra of Object.values(region.extraItems))
			if (extra) at(extra, version).forEach(add);
	}
	const list = [...items.values()];
	allItems.set(version, list);
	return list;
}

/** A catalog item as this region sells it, and which shop types do (none for another region's goods). */
function findCatalogItem(name: string, region: Region, version: number) {
	const key = name.trim().toLowerCase();
	const types: ShopType[] = [];
	let item: CatalogItem | undefined;
	for (const type of SHOP_TYPES) {
		const found = regionalCatalog(type, region, version).find((i) => i.name.toLowerCase() === key);
		if (!found) continue;
		types.push(type);
		item ??= found;
	}
	item ??= allCatalogItems(version).find((i) => i.name.toLowerCase() === key);
	return item && { item, types };
}

/**
 * An item as a shop sells it: the region's price with the town's and the
 * keeper's mark-up, and a quarter more if it comes from afar (the town is
 * too small to stock it, or it's another region's goods).
 */
function toStock(
	settlement: Settlement,
	shop: Shop,
	item: CatalogItem,
	afar: boolean,
	qty: number
): StockItem {
	const tier = getTier(settlement.tier);
	const region = getRegion(settlement.region);
	const price =
		regionalPrice(item, region) *
		tier.priceMod *
		(1 + shop.keeper.bargaining.modifier) *
		(afar ? FROM_AFAR : 1);
	const stocked: StockItem = {
		name: item.name,
		category: item.category,
		price: roundPrice(price),
		qty: item.unlimited ? -1 : Math.max(1, Math.round(qty) || 1)
	};
	if (item.note) stocked.note = item.note;
	if (item.rarity) stocked.rarity = item.rarity;
	return stocked;
}

/** A catalog item as this shop would sell it, or undefined if it isn't in the catalog. */
export function itemForShop(
	settlement: Settlement,
	shop: Shop,
	name: string,
	qty = 1
): StockItem | undefined {
	const tier = getTier(settlement.tier);
	const found = findCatalogItem(name, getRegion(settlement.region), CONTENT_VERSION);
	if (!found) return undefined;
	const afar = !found.types.length || found.item.minTier > tier.index;
	return toStock(settlement, shop, found.item, afar, qty);
}

/** A shop that normally sells it, else the back of the general store, else any shop. */
function mustHaveShop(shops: Shop[], types: ShopType[]): Shop | undefined {
	return (
		shops.find((s) => types.includes(s.type)) ??
		shops.find((s) => s.type === 'general') ??
		shops.find((s) => s.type !== 'inn') ??
		shops[0]
	);
}

/** The must-haves a town has on none of its shelves. */
export function missingMustHaves(settlement: Settlement, mustHaves: MustHave[] = []): MustHave[] {
	const have = new Set(settlement.shops.flatMap((s) => s.stock.map((i) => i.name.toLowerCase())));
	return mustHaves.filter((m) => m.name.trim() && !have.has(m.name.trim().toLowerCase()));
}

/**
 * Makes sure a town has each of the campaign's must-haves somewhere. One
 * already on a shelf counts (even if the party bought them all). A missing
 * one goes to a shop that would sell it, or the back of the general store,
 * at that keeper's prices: a quarter more if the town is too small to stock
 * it. Returns the same town when nothing was missing.
 */
export function stockMustHaves(settlement: Settlement, mustHaves: MustHave[] = []): Settlement {
	const missing = missingMustHaves(settlement, mustHaves);
	if (!missing.length || !settlement.shops.length) return settlement;
	const tier = getTier(settlement.tier);
	const region = getRegion(settlement.region);
	let shops = settlement.shops;
	for (const mustHave of missing) {
		const found = findCatalogItem(mustHave.name, region, CONTENT_VERSION);
		// The DM's own item, at the DM's price.
		const own: CatalogItem | undefined =
			mustHave.price === undefined
				? undefined
				: { name: mustHave.name.trim(), price: mustHave.price, minTier: 0, category: 'Other' };
		const item = found?.item ?? own;
		const shop = item && mustHaveShop(shops, found?.types ?? []);
		if (!item || !shop) continue;
		const afar = !!found && (!found.types.length || found.item.minTier > tier.index);
		const stocked = { ...toStock(settlement, shop, item, afar, mustHave.qty), mustHave: true };
		shops = shops.map((s) => (s.id === shop.id ? { ...s, stock: [...s.stock, stocked] } : s));
	}
	return shops === settlement.shops ? settlement : { ...settlement, shops };
}

/**
 * Writes up one more of a shop type the town has more of than are detailed
 * (a city's third weaponsmith, say). It goes after the others of its type.
 * Each extra shop rolls on the stream it would have had if the town had
 * detailed it to begin with, so the same town always gets the same extras.
 */
export function detailAnotherShop(
	settlement: Settlement,
	type: ShopType,
	input: CampaignInput
): Settlement {
	const same = settlement.shops.filter((s) => s.type === type);
	if (same.length >= (settlement.shopTotals[type] ?? 0)) return settlement;
	const ctx = contextFor(settlement, input);
	const idx = Math.max(-1, ...same.map((s) => Number(s.id.split('-').pop()) || 0)) + 1;
	const shop = makeShop(ctx, createRng(settlement.seed).fork(`shop:${type}:${idx}`), type, idx);
	const last = settlement.shops.lastIndexOf(same.at(-1)!);
	const shops = [...settlement.shops];
	shops.splice(last + 1, 0, shop);
	return { ...settlement, shops };
}

/**
 * Adds a shop to a town from a book, with the book's name if given. Unlike
 * `detailAnotherShop` there's no limit: the DM says what the town has.
 */
export function addBookShop(
	settlement: Settlement,
	type: ShopType,
	input: CampaignInput,
	name?: string
): Settlement {
	const ctx = contextFor(settlement, input);
	const same = settlement.shops.filter((s) => s.type === type);
	const idx = Math.max(-1, ...same.map((s) => Number(s.id.split('-').pop()) || 0)) + 1;
	const bookName = name?.trim();
	if (bookName) ctx.taken.add(contentKey.shop(bookName));
	let shop = makeShop(ctx, createRng(settlement.seed).fork(`shop:${type}:${idx}`), type, idx);
	if (bookName) shop = { ...shop, name: bookName, fixedName: true };
	// After the others of its type, or where its type comes in the usual order.
	const order = SHOP_RULES.map((r) => r.type);
	let at = settlement.shops.findIndex((s) => order.indexOf(s.type) > order.indexOf(type));
	if (same.length) at = settlement.shops.lastIndexOf(same.at(-1)!) + 1;
	if (at < 0) at = settlement.shops.length;
	const shops = [...settlement.shops];
	shops.splice(at, 0, shop);
	const shopTotals = { ...settlement.shopTotals, [type]: (settlement.shopTotals[type] ?? 0) + 1 };
	return { ...settlement, shops, shopTotals };
}

/** Gives one shopkeeper a new rumour, leaving everything else alone. */
export function rerollRumour(
	settlement: Settlement,
	shopId: string,
	input: CampaignInput
): Settlement {
	const ctx = contextFor(settlement, input);
	const rng = freshRng(settlement, `${shopId}:rumour`);
	return {
		...settlement,
		shops: settlement.shops.map((s) => {
			if (s.id !== shopId) return s;
			const family = input.families.find((f) => f.id === s.keeper.familyId);
			return family ? { ...s, keeper: { ...s.keeper, rumour: makeRumour(ctx, rng, family) } } : s;
		})
	};
}
