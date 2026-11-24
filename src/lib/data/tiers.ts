import type { ShopType, TierId } from '#lib/types.ts';

/**
 * Settlement sizes based on the classic "Medieval Demographics Made Easy"
 * ranges (S. John Ross), which in turn lean on real population studies of
 * medieval Europe. Most medieval people lived in villages of a few hundred;
 * a "city" of 10,000 was a big deal and 25,000+ was rare.
 */
export interface Tier {
	id: TierId;
	index: number;
	label: string;
	min: number;
	max: number;
	blurb: string;
	/** Price multiplier: small places charge more for things they rarely see. */
	priceMod: number;
	/** Fraction of eligible non-staple items a shop has on the shelf. */
	stockChance: number;
	/** Max shops of a single type we write up in detail. */
	featuredCap: number;
}

export const TIERS: Tier[] = [
	{
		id: 'thorp',
		index: 0,
		label: 'Thorp',
		min: 20,
		max: 80,
		blurb: 'A cluster of farmsteads. No real shops, but a peddler might be passing through.',
		priceMod: 1.3,
		stockChance: 0.5,
		featuredCap: 1
	},
	{
		id: 'hamlet',
		index: 1,
		label: 'Hamlet',
		min: 81,
		max: 400,
		blurb:
			'A handful of families around a mill or a crossroads. One store that sells a bit of everything.',
		priceMod: 1.2,
		stockChance: 0.55,
		featuredCap: 1
	},
	{
		id: 'village',
		index: 2,
		label: 'Village',
		min: 401,
		max: 900,
		blurb: 'A church, a green, a tavern and a smith who makes ploughshares and the odd spear.',
		priceMod: 1.1,
		stockChance: 0.6,
		featuredCap: 1
	},
	{
		id: 'small-town',
		index: 3,
		label: 'Small town',
		min: 901,
		max: 2000,
		blurb: 'A weekly market and specialised craftsmen. The first place with a real armorer.',
		priceMod: 1.05,
		stockChance: 0.65,
		featuredCap: 1
	},
	{
		id: 'large-town',
		index: 4,
		label: 'Large town',
		min: 2001,
		max: 5000,
		blurb: 'Walls, guilds and a market square. Magic is for sale here, if you know where to look.',
		priceMod: 1,
		stockChance: 0.7,
		featuredCap: 2
	},
	{
		id: 'small-city',
		index: 5,
		label: 'Small city',
		min: 5001,
		max: 12000,
		blurb: 'A regional capital with a cathedral, a garrison, and several of every shop.',
		priceMod: 0.95,
		stockChance: 0.75,
		featuredCap: 2
	},
	{
		id: 'large-city',
		index: 6,
		label: 'Large city',
		min: 12001,
		max: 25000,
		blurb: 'One of the great cities of the realm. Rare goods flow through its docks and gates.',
		priceMod: 0.95,
		stockChance: 0.8,
		featuredCap: 3
	},
	{
		id: 'metropolis',
		index: 7,
		label: 'Metropolis',
		min: 25001,
		max: 80000,
		blurb: 'A city of legend. If it can be bought anywhere, it can be bought here.',
		priceMod: 0.9,
		stockChance: 0.85,
		featuredCap: 4
	}
];

export function getTier(id: TierId): Tier {
	const tier = TIERS.find((t) => t.id === id);
	if (!tier) throw new Error(`Unknown tier: ${id}`);
	return tier;
}

export function tierForPopulation(pop: number): Tier {
	return TIERS.find((t) => pop <= t.max) ?? TIERS[TIERS.length - 1];
}

/**
 * Shop rules per type.
 *
 * `supportValue` is how many people it takes to keep one such business going
 * (the MDME idea: e.g. one blacksmith per ~1,500 people). Expected count is
 * population / supportValue; the fractional part becomes a chance.
 *
 * `minByTier[i]` guarantees at least that many at tier i so the game stays
 * playable (every town has somewhere to buy a sword), and `-1` means the shop
 * type does not exist at that tier at all.
 */
export interface ShopRule {
	type: ShopType;
	label: string;
	supportValue: number;
	minByTier: number[];
}

export const SHOP_RULES: ShopRule[] = [
	{
		type: 'general',
		label: 'General store',
		supportValue: 700,
		// Thorps rely on a passing peddler (handled in the generator).
		minByTier: [0, 1, 1, 1, 1, 1, 1, 1]
	},
	{
		type: 'smithy',
		label: 'Smithy (weapons & armor)',
		supportValue: 1500,
		minByTier: [-1, 0, 1, -1, -1, -1, -1, -1]
	},
	{
		type: 'weapons',
		label: 'Weaponsmith',
		supportValue: 2300,
		minByTier: [-1, -1, -1, 1, 1, 1, 1, 1]
	},
	{
		type: 'armor',
		label: 'Armorer',
		supportValue: 2500,
		minByTier: [-1, -1, -1, 1, 1, 1, 1, 1]
	},
	{
		type: 'potions',
		label: 'Apothecary',
		supportValue: 1700,
		minByTier: [-1, -1, 0, 1, 1, 1, 1, 1]
	},
	{
		type: 'magic',
		label: 'Magic shop',
		supportValue: 2800,
		minByTier: [-1, -1, -1, 0, 1, 1, 1, 1]
	}
];

/** Other trades and institutions with MDME-style support values, for flavour. */
export const TRADES: { label: string; supportValue: number; minTier: number }[] = [
	{ label: 'Taverns', supportValue: 400, minTier: 1 },
	{ label: 'Inns', supportValue: 2000, minTier: 2 },
	{ label: 'Blacksmiths', supportValue: 1500, minTier: 2 },
	{ label: 'Bakers', supportValue: 800, minTier: 2 },
	{ label: 'Healers & physicians', supportValue: 1700, minTier: 3 },
	{ label: 'Clergy', supportValue: 40, minTier: 1 },
	{ label: 'Guards & watchmen', supportValue: 150, minTier: 2 },
	{ label: 'Noble households', supportValue: 200, minTier: 3 }
];
