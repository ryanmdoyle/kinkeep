import type { CatalogItem, ShopType } from '#lib/types.ts';

/*
 * Item lists use SRD 5.1 names and prices (CC-BY-4.0) plus a few homebrew
 * flavour items. minTier: 0 thorp, 1 hamlet, 2 village, 3 small town,
 * 4 large town, 5 small city, 6 large city, 7 metropolis.
 */

const i = (
	name: string,
	price: number,
	minTier: number,
	category: string,
	extra: Partial<CatalogItem> = {}
): CatalogItem => ({ name, price, minTier, category, ...extra });

export const GENERAL_GOODS: CatalogItem[] = [
	// Everyday staples
	i('Torch', 0.01, 0, 'Light', { staple: true }),
	i('Candle', 0.01, 0, 'Light', { staple: true }),
	i('Rations (1 day)', 0.5, 0, 'Food', { staple: true }),
	i('Waterskin', 0.2, 0, 'Gear', { staple: true }),
	i('Hempen rope (50 ft)', 1, 0, 'Gear', { staple: true }),
	i('Sack', 0.01, 0, 'Containers', { staple: true }),
	i('Tinderbox', 0.5, 0, 'Gear', { staple: true }),
	i('Bedroll', 1, 0, 'Camping'),
	i('Blanket', 0.5, 0, 'Camping'),
	i('Common clothes', 0.5, 0, 'Clothing'),
	i('Soap', 0.02, 0, 'Gear'),
	i('Whetstone', 0.01, 0, 'Gear'),
	i('Flask of oil', 0.1, 1, 'Light'),
	i('Lamp', 0.5, 1, 'Light'),
	i('Backpack', 2, 1, 'Containers', { staple: true }),
	i('Pouch', 0.5, 1, 'Containers'),
	i('Mess kit', 0.2, 1, 'Camping'),
	i('Fishing tackle', 1, 1, 'Gear'),
	i('Hammer', 1, 1, 'Tools'),
	i('Shovel', 2, 1, 'Tools'),
	i('Chalk (1 piece)', 0.01, 1, 'Gear'),
	i('Piton', 0.05, 1, 'Gear'),
	i('Crowbar', 2, 2, 'Tools'),
	i('Grappling hook', 2, 2, 'Gear'),
	i('Tent, two-person', 2, 2, 'Camping'),
	i('Lantern, hooded', 5, 2, 'Light'),
	i('Hunting trap', 5, 2, 'Gear'),
	i("Traveler's clothes", 2, 2, 'Clothing'),
	i("Healer's kit", 5, 2, 'Gear', { note: '10 uses, stabilise a creature' }),
	i('Caltrops (bag of 20)', 1, 2, 'Gear'),
	i('Chain (10 ft)', 5, 3, 'Gear'),
	i('Manacles', 2, 3, 'Gear'),
	i('Ball bearings (bag of 1,000)', 1, 3, 'Gear'),
	i('Lantern, bullseye', 10, 3, 'Light'),
	i('Silk rope (50 ft)', 10, 3, 'Gear'),
	i('Parchment (1 sheet)', 0.1, 3, 'Writing'),
	i('Ink (1 oz bottle)', 10, 3, 'Writing'),
	i('Ink pen', 0.02, 3, 'Writing'),
	i('Map or scroll case', 1, 3, 'Containers'),
	i('Holy symbol (amulet)', 5, 3, 'Focus'),
	i("Climber's kit", 25, 3, 'Gear'),
	i('Mirror, steel', 5, 3, 'Gear'),
	i('Lock', 10, 4, 'Gear'),
	i('Paper (1 sheet)', 0.2, 4, 'Writing'),
	i('Fine clothes', 15, 4, 'Clothing'),
	i('Component pouch', 25, 4, 'Focus'),
	i('Arcane focus (crystal)', 10, 4, 'Focus'),
	i('Hourglass', 25, 4, 'Gear'),
	i("Thieves' tools", 25, 4, 'Tools'),
	i('Disguise kit', 25, 4, 'Tools'),
	i('Herbalism kit', 5, 2, 'Tools'),
	i('Book (blank)', 25, 5, 'Writing'),
	i("Navigator's tools", 25, 5, 'Tools'),
	i('Signet ring', 5, 5, 'Gear'),
	i('Magnifying glass', 100, 5, 'Gear'),
	i('Spyglass', 1000, 6, 'Gear')
];

const WEAPON_LIST: CatalogItem[] = [
	// Simple
	i('Club', 0.1, 0, 'Simple melee', { note: '1d4 bludgeoning, light', staple: true }),
	i('Dagger', 2, 0, 'Simple melee', { note: '1d4 piercing, finesse, light, thrown', staple: true }),
	i('Quarterstaff', 0.2, 0, 'Simple melee', { note: '1d6 bludgeoning, versatile (1d8)' }),
	i('Sickle', 1, 0, 'Simple melee', { note: '1d4 slashing, light' }),
	i('Spear', 1, 0, 'Simple melee', { note: '1d6 piercing, thrown, versatile (1d8)', staple: true }),
	i('Handaxe', 5, 1, 'Simple melee', { note: '1d6 slashing, light, thrown', staple: true }),
	i('Greatclub', 0.2, 1, 'Simple melee', { note: '1d8 bludgeoning, two-handed' }),
	i('Javelin', 0.5, 1, 'Simple melee', { note: '1d6 piercing, thrown' }),
	i('Light hammer', 2, 1, 'Simple melee', { note: '1d4 bludgeoning, light, thrown' }),
	i('Mace', 5, 2, 'Simple melee', { note: '1d6 bludgeoning' }),
	i('Sling', 0.1, 0, 'Simple ranged', { note: '1d4 bludgeoning, ammunition' }),
	i('Dart', 0.05, 1, 'Simple ranged', { note: '1d4 piercing, finesse, thrown' }),
	i('Shortbow', 25, 1, 'Simple ranged', { note: '1d6 piercing, two-handed' }),
	i('Light crossbow', 25, 3, 'Simple ranged', { note: '1d8 piercing, loading, two-handed' }),
	// Martial
	i('Shortsword', 10, 2, 'Martial melee', { note: '1d6 piercing, finesse, light' }),
	i('Battleaxe', 10, 2, 'Martial melee', { note: '1d8 slashing, versatile (1d10)' }),
	i('Pike', 5, 2, 'Martial melee', { note: '1d10 piercing, heavy, reach, two-handed' }),
	i('Longsword', 15, 3, 'Martial melee', { note: '1d8 slashing, versatile (1d10)', staple: true }),
	i('Warhammer', 15, 3, 'Martial melee', { note: '1d8 bludgeoning, versatile (1d10)' }),
	i('War pick', 5, 3, 'Martial melee', { note: '1d8 piercing' }),
	i('Flail', 10, 3, 'Martial melee', { note: '1d8 bludgeoning' }),
	i('Morningstar', 15, 3, 'Martial melee', { note: '1d8 piercing' }),
	i('Maul', 10, 3, 'Martial melee', { note: '2d6 bludgeoning, heavy, two-handed' }),
	i('Greataxe', 30, 3, 'Martial melee', { note: '1d12 slashing, heavy, two-handed' }),
	i('Halberd', 20, 3, 'Martial melee', { note: '1d10 slashing, heavy, reach, two-handed' }),
	i('Glaive', 20, 3, 'Martial melee', { note: '1d10 slashing, heavy, reach, two-handed' }),
	i('Trident', 5, 3, 'Martial melee', { note: '1d6 piercing, thrown, versatile (1d8)' }),
	i('Whip', 2, 3, 'Martial melee', { note: '1d4 slashing, finesse, reach' }),
	i('Greatsword', 50, 4, 'Martial melee', { note: '2d6 slashing, heavy, two-handed' }),
	i('Rapier', 25, 4, 'Martial melee', { note: '1d8 piercing, finesse' }),
	i('Scimitar', 25, 4, 'Martial melee', { note: '1d6 slashing, finesse, light' }),
	i('Lance', 10, 4, 'Martial melee', { note: '1d12 piercing, reach, special' }),
	i('Net', 1, 2, 'Martial ranged', { note: 'Special, thrown' }),
	i('Longbow', 50, 3, 'Martial ranged', { note: '1d8 piercing, heavy, two-handed' }),
	i('Heavy crossbow', 50, 4, 'Martial ranged', { note: '1d10 piercing, heavy, loading' }),
	i('Blowgun', 10, 5, 'Martial ranged', { note: '1 piercing, loading' }),
	i('Hand crossbow', 75, 5, 'Martial ranged', { note: '1d6 piercing, light, loading' }),
	// Ammunition
	i('Arrows (20)', 1, 1, 'Ammunition', { staple: true }),
	i('Sling bullets (20)', 0.04, 0, 'Ammunition'),
	i('Crossbow bolts (20)', 1, 3, 'Ammunition'),
	i('Blowgun needles (50)', 1, 5, 'Ammunition'),
	// Specials
	i('Silvered dagger', 102, 4, 'Special', { note: 'Overcomes resistance of some monsters' }),
	i('Silvered longsword', 115, 5, 'Special', { note: 'Overcomes resistance of some monsters' }),
	i('Silvered arrows (10)', 100, 5, 'Special'),
	i('Weapon, +1 (your choice)', 1000, 6, 'Special', {
		rarity: 'uncommon',
		note: '+1 to attack and damage'
	})
];

const ARMOR_LIST: CatalogItem[] = [
	i('Shield', 10, 1, 'Shield', { note: '+2 AC', staple: true }),
	i('Padded armor', 5, 1, 'Light armor', { note: 'AC 11 + Dex, stealth disadvantage' }),
	i('Leather armor', 10, 1, 'Light armor', { note: 'AC 11 + Dex', staple: true }),
	i('Hide armor', 10, 1, 'Medium armor', { note: 'AC 12 + Dex (max 2)' }),
	i('Studded leather', 45, 3, 'Light armor', { note: 'AC 12 + Dex' }),
	i('Ring mail', 30, 2, 'Heavy armor', { note: 'AC 14, stealth disadvantage' }),
	i('Chain shirt', 50, 3, 'Medium armor', { note: 'AC 13 + Dex (max 2)', staple: true }),
	i('Scale mail', 50, 3, 'Medium armor', { note: 'AC 14 + Dex (max 2), stealth disadvantage' }),
	i('Chain mail', 75, 3, 'Heavy armor', { note: 'AC 16, Str 13, stealth disadvantage' }),
	i('Breastplate', 400, 4, 'Medium armor', { note: 'AC 14 + Dex (max 2)' }),
	i('Splint armor', 200, 4, 'Heavy armor', { note: 'AC 17, Str 15, stealth disadvantage' }),
	i('Half plate', 750, 5, 'Medium armor', { note: 'AC 15 + Dex (max 2), stealth disadvantage' }),
	i('Plate armor', 1500, 5, 'Heavy armor', { note: 'AC 18, Str 15, stealth disadvantage' }),
	i('Mithral chain shirt', 850, 6, 'Special', {
		rarity: 'uncommon',
		note: 'No stealth disadvantage'
	}),
	i('Adamantine chain mail', 575, 6, 'Special', {
		rarity: 'uncommon',
		note: 'Crits against you become normal hits'
	}),
	i('Shield, +1', 500, 6, 'Special', { rarity: 'uncommon', note: '+3 AC total' }),
	i('Armor, +1 (your choice)', 1500, 7, 'Special', {
		rarity: 'rare',
		note: 'Price plus base armor cost'
	})
];

const POTION_LIST: CatalogItem[] = [
	i('Herbal poultice', 0.1, 2, 'Remedy', {
		note: 'Homebrew: soothes bruises and minor ailments',
		staple: true
	}),
	i('Smelling salts', 0.5, 2, 'Remedy', {
		note: 'Homebrew: wakes an unconscious (not dying) creature'
	}),
	i('Sleeping draught', 0.2, 2, 'Remedy', { note: 'Homebrew: a long, deep, dreamless sleep' }),
	i('Potion of healing', 50, 2, 'Potion', {
		rarity: 'common',
		note: 'Regain 2d4 + 2 HP',
		staple: true
	}),
	i('Antitoxin (vial)', 50, 2, 'Alchemical', { note: 'Advantage on saves vs poison for 1 hour' }),
	i('Acid (vial)', 25, 3, 'Alchemical', { note: '2d6 acid, thrown' }),
	i("Alchemist's fire (flask)", 50, 3, 'Alchemical', { note: '1d4 fire per turn, thrown' }),
	i('Holy water (flask)', 25, 3, 'Alchemical', { note: '2d6 radiant vs fiends and undead' }),
	i('Perfume (vial)', 5, 3, 'Alchemical'),
	i('Potion of climbing', 75, 3, 'Potion', { rarity: 'common', note: 'Climb speed for 1 hour' }),
	i('Basic poison (vial)', 100, 4, 'Alchemical', {
		note: 'Under the counter. 1d4 poison on a weapon'
	}),
	i('Potion of greater healing', 150, 4, 'Potion', {
		rarity: 'uncommon',
		note: 'Regain 4d4 + 4 HP'
	}),
	i('Potion of animal friendship', 100, 4, 'Potion', { rarity: 'uncommon' }),
	i('Potion of water breathing', 180, 4, 'Potion', { rarity: 'uncommon' }),
	i('Potion of fire breath', 150, 5, 'Potion', { rarity: 'uncommon' }),
	i('Potion of resistance (choose type)', 300, 5, 'Potion', { rarity: 'uncommon' }),
	i('Potion of hill giant strength', 300, 5, 'Potion', { rarity: 'uncommon' }),
	i('Potion of growth', 270, 5, 'Potion', { rarity: 'uncommon' }),
	i('Potion of diminution', 270, 6, 'Potion', { rarity: 'rare' }),
	i('Potion of heroism', 180, 6, 'Potion', { rarity: 'rare' }),
	i('Potion of superior healing', 450, 6, 'Potion', { rarity: 'rare', note: 'Regain 8d4 + 8 HP' }),
	i('Potion of gaseous form', 300, 6, 'Potion', { rarity: 'rare' }),
	i('Potion of clairvoyance', 960, 6, 'Potion', { rarity: 'rare' }),
	i('Potion of supreme healing', 1350, 7, 'Potion', {
		rarity: 'very rare',
		note: 'Regain 10d4 + 20 HP'
	}),
	i('Potion of flying', 2500, 7, 'Potion', { rarity: 'very rare' }),
	i('Potion of speed', 2000, 7, 'Potion', { rarity: 'very rare' })
];

const MAGIC_LIST: CatalogItem[] = [
	i('Spell scroll (cantrip)', 25, 3, 'Scroll', { rarity: 'common', staple: true }),
	i('Spell scroll (1st level)', 60, 3, 'Scroll', { rarity: 'common', staple: true }),
	i('Everbright lantern', 75, 3, 'Wondrous', {
		rarity: 'common',
		note: 'Homebrew: never needs oil'
	}),
	i('Warming stone', 50, 3, 'Wondrous', {
		rarity: 'common',
		note: 'Homebrew: keeps you warm in the cold'
	}),
	i('Spell scroll (2nd level)', 150, 4, 'Scroll', { rarity: 'uncommon' }),
	i('Spell scroll (3rd level)', 300, 5, 'Scroll', { rarity: 'uncommon' }),
	i('Bag of holding', 400, 4, 'Wondrous', { rarity: 'uncommon' }),
	i('Driftglobe', 300, 4, 'Wondrous', { rarity: 'uncommon' }),
	i('Goggles of night', 300, 4, 'Wondrous', { rarity: 'uncommon' }),
	i('Rope of climbing', 400, 4, 'Wondrous', { rarity: 'uncommon' }),
	i('Wand of secrets', 150, 4, 'Wand', { rarity: 'uncommon' }),
	i('Ammunition, +1 (each)', 50, 4, 'Weapon', { rarity: 'uncommon' }),
	i('Wand of magic missiles', 300, 5, 'Wand', { rarity: 'uncommon' }),
	i('Wand of web', 400, 5, 'Wand', { rarity: 'uncommon' }),
	i('Immovable rod', 500, 5, 'Rod', { rarity: 'uncommon' }),
	i('Cloak of protection', 500, 5, 'Wondrous', { rarity: 'uncommon', note: '+1 AC and saves' }),
	i('Boots of elvenkind', 500, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Cloak of elvenkind', 500, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Hat of disguise', 400, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Gloves of thievery', 400, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Sending stones', 400, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Decanter of endless water', 700, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Alchemy jug', 600, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Ring of swimming', 300, 5, 'Ring', { rarity: 'uncommon' }),
	i('Ring of jumping', 300, 5, 'Ring', { rarity: 'uncommon' }),
	i('Pearl of power', 500, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Lantern of revealing', 500, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Eyes of the eagle', 500, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Necklace of adaptation', 500, 5, 'Wondrous', { rarity: 'uncommon' }),
	i('Slippers of spider climbing', 500, 6, 'Wondrous', { rarity: 'uncommon' }),
	i('Ring of mind shielding', 600, 6, 'Ring', { rarity: 'uncommon' }),
	i('Periapt of wound closure', 600, 6, 'Wondrous', { rarity: 'uncommon' }),
	i('Gauntlets of ogre power', 800, 6, 'Wondrous', { rarity: 'uncommon' }),
	i('Headband of intellect', 800, 6, 'Wondrous', { rarity: 'uncommon' }),
	i('Javelin of lightning', 400, 6, 'Weapon', { rarity: 'uncommon' }),
	i('Winged boots', 900, 6, 'Wondrous', { rarity: 'uncommon' }),
	i('Spell scroll (4th level)', 500, 6, 'Scroll', { rarity: 'rare' }),
	i('Spell scroll (5th level)', 1000, 6, 'Scroll', { rarity: 'rare' }),
	i('Ring of protection', 3500, 6, 'Ring', { rarity: 'rare', note: '+1 AC and saves' }),
	i('Bracers of defense', 3000, 7, 'Wondrous', { rarity: 'rare' }),
	i('Amulet of proof against detection and location', 2500, 7, 'Wondrous', { rarity: 'rare' }),
	i('Wand of fireballs', 5000, 7, 'Wand', { rarity: 'rare' }),
	i('Spell scroll (6th level)', 2500, 7, 'Scroll', { rarity: 'very rare' })
];

/** Peddlers in a thorp carry a tiny, random bag of general goods. */
export const CATALOGS: Record<ShopType, CatalogItem[]> = {
	general: GENERAL_GOODS,
	smithy: [
		...WEAPON_LIST.filter((x) => x.minTier <= 3 && x.category !== 'Special'),
		...ARMOR_LIST.filter((x) => x.minTier <= 3)
	],
	weapons: WEAPON_LIST,
	armor: ARMOR_LIST,
	potions: POTION_LIST,
	magic: MAGIC_LIST
};

/** How long a special order takes, by how far above the town's tier it is. */
export const SPECIAL_ORDER_WAIT = ['', '1–2 weeks', '3–4 weeks', '1–2 months'];
