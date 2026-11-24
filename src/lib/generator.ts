import { CATALOGS, SPECIAL_ORDER_WAIT } from '#lib/data/catalog.ts';
import { HAIR_COLORS } from '#lib/data/families.ts';
import { AGES, BARGAINING, settlementName } from '#lib/data/names.ts';
import { SHOP_RULES, TIERS, TRADES, getTier, type Tier } from '#lib/data/tiers.ts';
import { roundPrice } from '#lib/money.ts';
import { createRng, hashString, randomSeed, type Rng } from '#lib/rng.ts';
import type {
	Family,
	FamilyRole,
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
	name?: string;
	families: Family[];
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
	return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

function makeKeeper(rng: Rng, family: Family, usedNames: Set<string>): Shopkeeper {
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
		bargaining: rng.pick(BARGAINING)
	};
}

function makeStock(rng: Rng, type: ShopType, tier: Tier, keeper: Shopkeeper, peddler: boolean) {
	const catalog = CATALOGS[type];
	const stock: StockItem[] = [];
	const priceMod = tier.priceMod * (1 + keeper.bargaining.modifier);

	for (const item of catalog) {
		if (item.minTier > tier.index) continue;
		const chance = peddler ? 0.35 : item.staple ? 1 : tier.stockChance;
		if (!rng.chance(chance)) continue;

		// Cheap things come by the dozen, magic items one at a time.
		const forged = type === 'smithy' || type === 'weapons' || type === 'armor';
		const maxQty =
			item.category === 'Ammunition'
				? 10
				: item.price >= 100
					? 1
					: item.price >= 20 || (forged && item.category.includes('armor'))
						? 2
						: forged
							? 4
							: item.price >= 1
								? 8
								: 20;
		const bigTownBonus = tier.index >= 5 && maxQty > 1 ? 2 : 1;
		const qty = rng.int(1, Math.max(1, Math.round(maxQty * bigTownBonus)));
		const jitter = 0.9 + rng.next() * 0.2;

		stock.push({
			name: item.name,
			category: item.category,
			price: roundPrice(item.price * priceMod * jitter),
			qty,
			note: item.note,
			rarity: item.rarity
		});
	}

	const specialOrders = peddler
		? []
		: catalog
				.filter((item) => item.minTier > tier.index && item.minTier <= tier.index + 3)
				.filter(() => rng.chance(0.5))
				.slice(0, 6)
				.map((item) => ({
					name: item.name,
					// Ordering from afar costs extra.
					price: roundPrice(item.price * priceMod * 1.25),
					wait: SPECIAL_ORDER_WAIT[item.minTier - tier.index]
				}));

	return { stock, specialOrders };
}

function makeShop(
	rng: Rng,
	type: ShopType,
	tier: Tier,
	families: Family[],
	usedNames: Set<string>,
	usedShopNames: Set<string>,
	idx: number,
	peddler = false
): Shop {
	const family = families.find((f) => f.id === familyForShop(type));
	if (!family) throw new Error(`No family for shop type ${type}`);
	const keeper = makeKeeper(rng, family, usedNames);

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
		if (!usedShopNames.has(name)) break;
	}
	usedShopNames.add(name);

	const { stock, specialOrders } = makeStock(rng, type, tier, keeper, peddler);
	return { id: `${type}-${idx}`, type, name, keeper, stock, specialOrders };
}

export function generateSettlement(opts: GenerateOptions): Settlement {
	const seed = opts.seed?.trim() || randomSeed();
	const rng = createRng(seed);
	// Roll the tier with its own stream so picking a size by hand doesn't
	// change everything else about a seed.
	const tier = opts.tier ? getTier(opts.tier) : pickTier(createRng(`${seed}:tier`));

	const population = rollPopulation(rng, tier);
	const generatedName = settlementName(rng, tier.index);
	const name = opts.name?.trim() || generatedName;

	const shops: Shop[] = [];
	const shopTotals: Partial<Record<ShopType, number>> = {};
	const usedNames = new Set<string>();
	const usedShopNames = new Set<string>();

	for (const rule of SHOP_RULES) {
		const min = rule.minByTier[tier.index];
		if (min < 0) continue;
		const total = Math.max(min, realisticCount(rng, population, rule.supportValue));

		// A thorp has no store, but sometimes a peddler is passing through.
		if (rule.type === 'general' && tier.index === 0) {
			if (rng.chance(0.5)) {
				shops.push(
					makeShop(rng, 'general', tier, opts.families, usedNames, usedShopNames, 0, true)
				);
				shopTotals.general = 1;
			}
			continue;
		}

		if (total === 0) continue;
		shopTotals[rule.type] = total;
		const featured = Math.min(total, tier.featuredCap);
		for (let n = 0; n < featured; n++) {
			shops.push(makeShop(rng, rule.type, tier, opts.families, usedNames, usedShopNames, n));
		}
	}

	const trades = TRADES.filter((t) => tier.index >= t.minTier).map((t) => ({
		label: t.label,
		count: Math.max(1, realisticCount(rng, population, t.supportValue))
	}));

	return {
		// Same seed + size + name always gives the same id, so saving twice updates.
		id: hashString(`${seed}|${tier.id}|${name}`).toString(36),
		seed,
		name,
		tier: tier.id,
		population,
		createdAt: new Date().toISOString(),
		shops,
		shopTotals,
		trades
	};
}

/**
 * Rerolls one shop (new keeper from the same family, new stock). Other shops
 * keep their keepers' names reserved so we don't get two Brunnas in town.
 */
export function rerollShop(settlement: Settlement, shopId: string, families: Family[]): Settlement {
	const target = settlement.shops.find((s) => s.id === shopId);
	if (!target) return settlement;
	const rng = createRng(`${settlement.seed}:${shopId}:${Math.random()}`);
	const tier = getTier(settlement.tier);
	const usedNames = new Set(
		settlement.shops.map((s) => `${s.keeper.familyId}:${s.keeper.firstName}`)
	);
	const usedShopNames = new Set(settlement.shops.map((s) => s.name));
	const peddler = tier.index === 0;
	const fresh = makeShop(rng, target.type, tier, families, usedNames, usedShopNames, 0, peddler);
	return {
		...settlement,
		shops: settlement.shops.map((s) => (s.id === shopId ? { ...fresh, id: shopId } : s))
	};
}
