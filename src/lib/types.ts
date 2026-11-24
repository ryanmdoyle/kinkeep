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
export type ShopType = 'general' | 'smithy' | 'weapons' | 'armor' | 'potions' | 'magic';

/** Which family runs which shop type. The smithy is run by the weapons family. */
export type FamilyRole = 'general' | 'weapons' | 'armor' | 'potions' | 'magic';

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
	rarity?: 'common' | 'uncommon' | 'rare' | 'very rare';
}

export interface StockItem {
	name: string;
	category: string;
	price: number;
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
	population: number;
	createdAt: string;
	shops: Shop[];
	/** How many of each shop type really exist (only some are detailed). */
	shopTotals: Partial<Record<ShopType, number>>;
	/** Other realistic tradespeople and institutions, for flavour. */
	trades: TradeCount[];
	notes?: string;
}
