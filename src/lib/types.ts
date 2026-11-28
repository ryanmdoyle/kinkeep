import type { Versioned } from '#lib/content/versioned.ts';

export type TierId =
	| 'thorp'
	| 'hamlet'
	| 'village'
	| 'small-town'
	| 'large-town'
	| 'small-city'
	| 'large-city'
	| 'metropolis';

/**
 * The kinds of shop a settlement can have. Small places get a single `smithy`
 * that sells both weapons and armor; towns and up split it into two shops.
 */
export type ShopType = 'inn' | 'general' | 'smithy' | 'weapons' | 'armor' | 'potions' | 'magic';

/** Which family runs which shop type. The smithy is run by the weapons family. */
export type FamilyRole = Exclude<ShopType, 'smithy'>;

export type RegionId =
	'heartland' | 'coastal' | 'mountain' | 'northern' | 'desert' | 'forest' | 'swamp';

export interface Region {
	id: RegionId;
	label: string;
	blurb: string;
	/** What the place is known for; shown on the settlement. */
	specialities: string[];
	/** House specials served at inns. */
	dishes: Versioned<string>;
	/** Extra name parts mixed into settlement names. */
	namePrefixes: Versioned<string>;
	nameSuffixes: Versioned<string>;
	/** Price multipliers by item category (e.g. "Heavy armor": 1.2). */
	priceByCategory: Record<string, number>;
	/** Price multipliers by exact item name. */
	priceByItem: Record<string, number>;
	/** Shifts an item's minimum tier (negative = found in smaller places here). */
	tierShift: Record<string, number>;
	/** Regional goods added to shop catalogs. */
	extraItems: Partial<Record<ShopType, Versioned<CatalogItem>>>;
	/** Region-flavoured rumours. */
	rumours: Versioned<string>;
}

export interface Family {
	/** Stable id; also the role it fills. */
	id: FamilyRole;
	/** Family / clan name, e.g. "Pennywhistle". */
	surname: string;
	/** What players call the group, e.g. "the Pennywhistle family". */
	groupName: string;
	race: string;
	/** Single emoji or character used as the family's sign on every shop. */
	emblem: string;
	/** Accent color (CSS color) so the family is recognisable at a glance. */
	color: string;
	/** The look every member shares. */
	signature: string;
	/** The shared personality. */
	personality: string;
	/** A one-line tip for how to voice them at the table. */
	voice: string;
	/** `{surname}` is replaced with the family name. */
	greetings: string[];
	/** Individual quirks; each shopkeeper gets one or two. `{surname}` and `{color}` work here. */
	quirks: string[];
	firstNames: string[];
	/**
	 * Shop name templates. `{surname}`, `{first}` and `{adj}` are replaced.
	 */
	shopNames: string[];
	adjectives: string[];
}

type FamilyListKey = 'greetings' | 'quirks' | 'firstNames' | 'shopNames' | 'adjectives';

/** A built-in family as written in the data files: its lists are versioned tables. */
export type FamilyDef = Omit<Family, FamilyListKey> & Record<FamilyListKey, Versioned<string>>;

export interface CatalogItem {
	name: string;
	/** Base price in gp. */
	price: number;
	/** Lowest settlement tier index (0 = thorp) that stocks it. */
	minTier: number;
	category: string;
	/** Short rules note, e.g. damage or AC. */
	note?: string;
	/** Always in stock if the tier allows it. */
	staple?: boolean;
	/** Sold by the serving, not counted (drinks, meals, services). */
	unlimited?: boolean;
	rarity?: 'common' | 'uncommon' | 'rare' | 'very rare';
}

export interface StockItem {
	name: string;
	category: string;
	price: number;
	/** -1 means "as much as you like" (meals, drinks, services). */
	qty: number;
	/** How many the party has bought since the last restock. */
	sold?: number;
	note?: string;
	rarity?: CatalogItem['rarity'];
}

export interface Shopkeeper {
	familyId: FamilyRole;
	firstName: string;
	/** The keeper's own surname, shown instead of the family's (set by the DM). */
	surname?: string;
	age: string;
	quirks: string[];
	greeting: string;
	/** Haggling stance shown to the DM. */
	bargaining: { label: string; modifier: number };
	/** Something they'll tell the party, and whether it's true (DM's eyes only). */
	rumour?: Rumour;
	/** Content keys of the quirk lines used, so a campaign can avoid repeating them. */
	quirkKeys?: string[];
	/** How the party stands with this keeper (missing = neutral). Set once they've visited. */
	relation?: Relation;
	/** The DM's own note about this keeper. */
	note?: string;
}

export type Relation = 'positive' | 'neutral' | 'negative';

export type Truth = 'true' | 'partly true' | 'false';

/** A town named in a rumour that doesn't exist yet (until the party goes there). */
export interface RumourPlace {
	name: string;
	tier: TierId;
}

export interface Rumour {
	text: string;
	truth: Truth;
	/** Content key of the rumour line used (missing on towns saved before campaigns). */
	key?: string;
	/** True when it came from the campaign's own rumour bank. */
	custom?: boolean;
	/** The DM has marked it as actually told to the party. */
	told?: boolean;
	/** The DM has reworded it (or changed whether it's true). */
	edited?: boolean;
	/** Towns the rumour names, and how big they are, so the party can go there. */
	places?: RumourPlace[];
}

/** A rumour the DM wants spread through their campaign's shops. */
export interface CustomRumour {
	id: string;
	/** May use {place}, {person}, {monster}, {direction} and {kin}. */
	text: string;
	truth: Truth;
	/** Shop families that may tell it. Empty means any shopkeeper. */
	roles: FamilyRole[];
}

/**
 * How shopkeepers use the campaign's own rumours:
 * - first: tell each of yours once before any built-in ones
 * - mix: about half yours, half built-in
 * - only: never use built-in rumours
 */
export type RumourMode = 'first' | 'mix' | 'only';

export interface Shop {
	id: string;
	type: ShopType;
	name: string;
	keeper: Shopkeeper;
	stock: StockItem[];
	/** Things they can order in from a bigger town, with a wait. */
	specialOrders: SpecialOrder[];
	/** The DM gave this shop its name (a town from a book): rerolls keep it. */
	fixedName?: boolean;
	/** The party has actually been here. */
	visited?: boolean;
}

/** Something a shop can order in from a bigger town, with a wait. */
export interface SpecialOrder {
	name: string;
	price: number;
	wait: string;
	/** Set once the party orders it: the day they did (YYYY-MM-DD) and whether they've collected it. */
	order?: { at: string; collected?: boolean };
}

export interface TradeCount {
	label: string;
	count: number;
}

export interface Settlement {
	id: string;
	seed: string;
	/** Content version the town was built with (missing = 1). */
	contentVersion?: number;
	/** The campaign the town is saved in. */
	campaignId?: string;
	name: string;
	tier: TierId;
	/** Missing on towns saved before regions existed; treat as heartland. */
	region?: RegionId;
	population: number;
	createdAt: string;
	shops: Shop[];
	/** How many of each shop type really exist (only some are detailed). */
	shopTotals: Partial<Record<ShopType, number>>;
	/** Other realistic tradespeople and institutions, for flavour. */
	trades: TradeCount[];
	notes?: string;
	/** Set up by hand from a published adventure rather than built from a seed. */
	fromBook?: boolean;
	/** The DM's own description, shown instead of the size and region blurbs. */
	description?: string;
}

export interface Campaign {
	id: string;
	name: string;
	createdAt: string;
	/**
	 * Families this campaign has changed. Roles not listed use the built-in
	 * family, so they pick up new built-in names, quirks and greetings.
	 */
	families: Partial<Record<FamilyRole, Family>>;
	/** Skip names, quirks and rumours already used in this campaign's saved towns. */
	avoidRepeats: boolean;
	/** The DM's own rumours to spread through the campaign's shops. */
	rumours?: CustomRumour[];
	rumourMode?: RumourMode;
	/** Whether the party's standing with a keeper changes their prices (missing = yes). */
	standingPrices?: boolean;
	/** The saved town the party is in right now. */
	partyTownId?: string;
}
