import { CATALOGS, SPECIAL_ORDER_WAIT } from '#lib/data/catalog.ts';
import { HAIR_COLORS } from '#lib/data/families.ts';
import { AGES, BARGAINING, settlementName } from '#lib/data/names.ts';
import { REGIONS, getRegion } from '#lib/data/regions.ts';
import {
	DIRECTIONS,
	LOCAL_NAMES,
	LOCAL_TRADES,
	MONSTERS,
	ROLE_RUMOURS,
	TRUTH_WEIGHTS
} from '#lib/data/rumours.ts';
import { SHOP_RULES, TIERS, TRADES, getTier, type Tier } from '#lib/data/tiers.ts';
import { roundPrice } from '#lib/money.ts';
import { createRng, hashString, randomSeed, type Rng } from '#lib/rng.ts';
import type {
	CatalogItem,
	Family,
	FamilyRole,
	Region,
	RegionId,
	Rumour,
	Settlement,
	Shop,
	ShopType,
	Shopkeeper,
	StockItem,
	TierId
} from '#lib/types.ts';

export interface GenerateOptions {
	seed?: string;
	/** Leave out to pick a size at random (weighted toward small places, like real life). */
	tier?: TierId;
	/** Leave out to pick a region at random. */
	region?: RegionId;
	name?: string;
	families: Family[];
}

/** Everything the shop builders need, passed around as one bundle. */
interface Ctx {
	rng: Rng;
	tier: Tier;
	region: Region;
	families: Family[];
	/** "familyId:FirstName" already used in this town. */
	usedNames: Set<string>;
	usedShopNames: Set<string>;
}

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

function fillTemplate(template: string, vars: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

function makeRumour(ctx: Ctx, family: Family): Rumour {
	const { rng, region } = ctx;
	let pool = ROLE_RUMOURS[family.id] ?? ROLE_RUMOURS.general;
	if (region.rumours.length && rng.chance(0.35)) {
		pool = region.rumours;
	} else if (family.id === 'inn' && rng.chance(0.5)) {
		// Innkeepers hear a bit of everything.
		pool = ROLE_RUMOURS[rng.pick(Object.keys(ROLE_RUMOURS) as FamilyRole[])];
	}

	const others = ctx.families.filter((f) => f.id !== family.id);
	const text = fillTemplate(rng.pick(pool), {
		place: settlementName(rng, rng.int(0, 4), region),
		person: `${rng.pick(LOCAL_NAMES)} ${rng.pick(LOCAL_TRADES)}`,
		monster: rng.pick(MONSTERS),
		direction: rng.pick(DIRECTIONS),
		kin: others.length ? rng.pick(others).surname : 'other'
	});

	const total = TRUTH_WEIGHTS.reduce((a, b) => a + b.weight, 0);
	let roll = rng.next() * total;
	const truth = TRUTH_WEIGHTS.find((t) => (roll -= t.weight) <= 0)?.truth ?? 'true';
	return { text, truth };
}

function makeKeeper(ctx: Ctx, family: Family): Shopkeeper {
	const { rng, usedNames } = ctx;
	const available = family.firstNames.filter((n) => !usedNames.has(`${family.id}:${n}`));
	const firstName = rng.pick(available.length ? available : family.firstNames) ?? 'Unnamed';
	usedNames.add(`${family.id}:${firstName}`);

	const quirkCount = rng.chance(0.35) ? 2 : 1;
	const quirks = rng
		.sample(family.quirks, quirkCount)
		.map((q) => fillTemplate(q, { color: rng.pick(HAIR_COLORS), surname: family.surname }));

	return {
		familyId: family.id,
		firstName,
		age: rng.pick(AGES),
		quirks,
		greeting: fillTemplate(rng.pick(family.greetings) ?? '', { surname: family.surname }),
		bargaining: rng.pick(BARGAINING),
		rumour: makeRumour(ctx, family)
	};
}

/** The shop's catalog with the region's local goods added and tiers shifted. */
function regionalCatalog(type: ShopType, region: Region): CatalogItem[] {
	const base = [...CATALOGS[type], ...(region.extraItems[type] ?? [])];
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

function makeStock(ctx: Ctx, type: ShopType, keeper: Shopkeeper, peddler: boolean) {
	const { rng, tier, region } = ctx;
	const catalog = regionalCatalog(type, region);
	const stock: StockItem[] = [];
	const priceMod = tier.priceMod * (1 + keeper.bargaining.modifier);

	for (const item of catalog) {
		if (item.minTier > tier.index) continue;
		const chance = peddler ? 0.35 : item.staple ? 1 : tier.stockChance;
		if (!rng.chance(chance)) continue;

		const bigTownBonus = tier.index >= 5 ? 2 : 1;
		const max = maxQuantity(item, type);
		const qty = item.unlimited ? -1 : rng.int(1, max > 1 ? max * bigTownBonus : 1);
		const jitter = 0.9 + rng.next() * 0.2;

		stock.push({
			name: item.name,
			category: item.category,
			price: roundPrice(regionalPrice(item, region) * priceMod * jitter),
			qty,
			note: item.note,
			rarity: item.rarity
		});
	}

	if (type === 'inn' && region.dishes.length) {
		stock.unshift({
			name: `House special: ${rng.pick(region.dishes)}`,
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
					.filter(() => rng.chance(0.5))
					.slice(0, 6)
					.map((item) => ({
						name: item.name,
						// Ordering from afar costs extra.
						price: roundPrice(regionalPrice(item, region) * priceMod * 1.25),
						wait: SPECIAL_ORDER_WAIT[item.minTier - tier.index]
					}));

	return { stock, specialOrders };
}

function makeShop(ctx: Ctx, type: ShopType, idx: number, peddler = false): Shop {
	const { rng } = ctx;
	const family = ctx.families.find((f) => f.id === familyForShop(type));
	if (!family) throw new Error(`No family for shop type ${type}`);
	const keeper = makeKeeper(ctx, family);

	let name = '';
	for (let attempt = 0; attempt < 6; attempt++) {
		const template = peddler
			? "{first} {surname}'s Peddler Cart"
			: type === 'smithy'
				? "{first} {surname}'s Smithy"
				: rng.pick(family.shopNames);
		name = fillTemplate(template ?? '{surname}', {
			surname: family.surname,
			first: keeper.firstName,
			adj: rng.pick(family.adjectives) ?? ''
		});
		if (!ctx.usedShopNames.has(name)) break;
	}
	ctx.usedShopNames.add(name);

	const { stock, specialOrders } = makeStock(ctx, type, keeper, peddler);
	return { id: `${type}-${idx}`, type, name, keeper, stock, specialOrders };
}

export function generateSettlement(opts: GenerateOptions): Settlement {
	const seed = opts.seed?.trim() || randomSeed();
	const rng = createRng(seed);
	// Roll size and region with their own streams so picking one by hand
	// doesn't change everything else about a seed.
	const tier = opts.tier ? getTier(opts.tier) : pickTier(createRng(`${seed}:tier`));
	const region = opts.region ? getRegion(opts.region) : createRng(`${seed}:region`).pick(REGIONS);

	const population = rollPopulation(rng, tier);
	const generatedName = settlementName(rng, tier.index, region);
	const name = opts.name?.trim() || generatedName;

	const ctx: Ctx = {
		rng,
		tier,
		region,
		families: opts.families,
		usedNames: new Set(),
		usedShopNames: new Set()
	};
	const shops: Shop[] = [];
	const shopTotals: Partial<Record<ShopType, number>> = {};

	for (const rule of SHOP_RULES) {
		const min = rule.minByTier[tier.index];
		if (min < 0) continue;
		const total = Math.max(min, realisticCount(rng, population, rule.supportValue));

		// A thorp has no store, but sometimes a peddler is passing through.
		if (rule.type === 'general' && tier.index === 0) {
			if (rng.chance(0.5)) {
				shops.push(makeShop(ctx, 'general', 0, true));
				shopTotals.general = 1;
			}
			continue;
		}

		if (total === 0) continue;
		shopTotals[rule.type] = total;
		const featured = Math.min(total, tier.featuredCap);
		for (let n = 0; n < featured; n++) shops.push(makeShop(ctx, rule.type, n));
	}

	const trades = TRADES.filter((t) => tier.index >= t.minTier).map((t) => ({
		label: t.label,
		count: Math.max(1, realisticCount(rng, population, t.supportValue))
	}));

	return {
		// Same seed + size + region + name always gives the same id, so saving twice updates.
		id: hashString(`${seed}|${tier.id}|${region.id}|${name}`).toString(36),
		seed,
		name,
		tier: tier.id,
		region: region.id,
		population,
		createdAt: new Date().toISOString(),
		shops,
		shopTotals,
		trades
	};
}

function contextFor(settlement: Settlement, families: Family[], salt: string): Ctx {
	return {
		rng: createRng(`${settlement.seed}:${salt}:${Math.random()}`),
		tier: getTier(settlement.tier),
		region: getRegion(settlement.region),
		families,
		usedNames: new Set(settlement.shops.map((s) => `${s.keeper.familyId}:${s.keeper.firstName}`)),
		usedShopNames: new Set(settlement.shops.map((s) => s.name))
	};
}

/**
 * Rerolls one shop (new keeper from the same family, new stock). Other shops
 * keep their keepers' names reserved so we don't get two Brunnas in town.
 */
export function rerollShop(settlement: Settlement, shopId: string, families: Family[]): Settlement {
	const target = settlement.shops.find((s) => s.id === shopId);
	if (!target) return settlement;
	const ctx = contextFor(settlement, families, shopId);
	const peddler = ctx.tier.index === 0 && target.type === 'general';
	const fresh = makeShop(ctx, target.type, 0, peddler);
	return {
		...settlement,
		shops: settlement.shops.map((s) => (s.id === shopId ? { ...fresh, id: shopId } : s))
	};
}

/** Gives one shopkeeper a new rumour, leaving everything else alone. */
export function rerollRumour(
	settlement: Settlement,
	shopId: string,
	families: Family[]
): Settlement {
	const ctx = contextFor(settlement, families, `${shopId}:rumour`);
	return {
		...settlement,
		shops: settlement.shops.map((s) => {
			if (s.id !== shopId) return s;
			const family = families.find((f) => f.id === s.keeper.familyId);
			return family ? { ...s, keeper: { ...s.keeper, rumour: makeRumour(ctx, family) } } : s;
		})
	};
}
