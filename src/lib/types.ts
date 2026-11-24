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
	dishes: string[];
	/** Extra name parts mixed into settlement names. */
	namePrefixes: string[];
	nameSuffixes: string[];
	/** Price multipliers by item category (e.g. "Heavy armor": 1.2). */
	priceByCategory: Record<string, number>;
	/** Price multipliers by exact item name. */
	priceByItem: Record<string, number>;
	/** Shifts an item's minimum tier (negative = found in smaller places here). */
	tierShift: Record<string, number>;
	/** Regional goods added to shop catalogs. */
	extraItems: Partial<Record<ShopType, CatalogItem[]>>;
	/** Region-flavoured rumours. */
	rumours: string[];
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
	note?: string;
	rarity?: CatalogItem['rarity'];
}

export interface Shopkeeper {
	familyId: FamilyRole;
	firstName: string;
	age: string;
	quirks: string[];
	greeting: string;
	/** Haggling stance shown to the DM. */
	bargaining: { label: string; modifier: number };
	/** Something they'll tell the party, and whether it's true (DM's eyes only). */
	rumour?: Rumour;
}

export interface Rumour {
	text: string;
	truth: 'true' | 'partly true' | 'false';
}

export interface Shop {
	id: string;
	type: ShopType;
	name: string;
	keeper: Shopkeeper;
	stock: StockItem[];
	/** Things they can order in from a bigger town, with a wait. */
	specialOrders: { name: string; price: number; wait: string }[];
}

export interface TradeCount {
	label: string;
	count: number;
}

export interface Settlement {
	id: string;
	seed: string;
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
}
