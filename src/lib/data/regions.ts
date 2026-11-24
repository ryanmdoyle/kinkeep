import { at, CONTENT_VERSION, table } from '#lib/content/versioned.ts';
import type { CatalogItem, Region, RegionId } from '#lib/types.ts';

const item = (
	name: string,
	price: number,
	minTier: number,
	category: string,
	extra: Partial<CatalogItem> = {}
): CatalogItem => ({ name, price, minTier, category, ...extra });

/**
 * Regions nudge prices, move some goods into smaller places (or out of
 * them), add local goods, and flavour names, inn food and rumours.
 */
const REGION_TABLE = table<Region>({
	1: [
		{
			id: 'heartland',
			label: 'Heartland (farmland)',
			blurb: 'Rolling fields, mills and market towns. Nothing unusual on the shelves.',
			specialities: ['Grain and wool', 'Good ale', 'Cheese'],
			dishes: table({
				1: ['Mutton and barley stew', 'Fresh bread with honey butter', 'Pork pie and pickles']
			}),
			namePrefixes: table({ 1: [] }),
			nameSuffixes: table({ 1: [] }),
			priceByCategory: {},
			priceByItem: {},
			tierShift: {},
			extraItems: {},
			rumours: table({
				1: [
					'The harvest came in twice this year. Twice. Nobody is asking how.',
					"A noble's hunting party went into the {direction} woods four days ago and hasn't come out.",
					'Scarecrows on the {direction} farms are being found turned to face the road.',
					'The new reeve in {place} is taxing ale by the sip.'
				]
			})
		},
		{
			id: 'coastal',
			label: 'Coastal / port',
			blurb:
				'Docks, gulls and foreign ships. Sea gear is cheap; heavy armor rusts and few want it.',
			specialities: ['Fresh fish', 'Foreign goods off the ships', 'Salt'],
			dishes: table({
				1: ['Salt-fish chowder', 'Grilled eel with lemon', 'Mussels steamed in ale']
			}),
			namePrefixes: table({
				1: ['Salt', 'Gull', 'Tide', 'Brine', 'Anchor', 'Kelp', 'Shell', 'Sea', 'Harbor']
			}),
			nameSuffixes: table({ 1: ['port', 'haven', 'mouth', 'cove', 'strand', 'sands'] }),
			priceByCategory: { 'Heavy armor': 1.15 },
			priceByItem: {
				'Fishing tackle': 0.6,
				Net: 0.5,
				Trident: 0.6,
				"Navigator's tools": 0.7,
				Spyglass: 0.7,
				'Hempen rope (50 ft)': 0.8,
				'Potion of water breathing': 0.7
			},
			tierShift: {
				Spyglass: -2,
				"Navigator's tools": -2,
				Trident: -2,
				Net: -1,
				'Potion of water breathing': -1,
				'Ring of swimming': -1
			},
			extraItems: {
				general: table({
					1: [
						item('Salted fish (1 day)', 0.3, 0, 'Food'),
						item('Oilskin coat', 3, 1, 'Clothing', { note: 'Keeps you dry in any weather' })
					]
				}),
				weapons: table({
					1: [item('Cutlass', 20, 3, 'Martial melee', { note: 'Use scimitar stats' })]
				}),
				smithy: table({
					1: [item('Boarding hook', 3, 1, 'Simple melee', { note: 'Use sickle stats, reach' })]
				}),
				potions: table({
					1: [
						item('Seasickness tonic', 0.5, 1, 'Remedy', {
							note: 'Homebrew: no seasickness for a day'
						})
					]
				}),
				magic: table({
					1: [item('Cap of water breathing', 500, 4, 'Wondrous', { rarity: 'uncommon' })]
				})
			},
			rumours: table({
				1: [
					'A ghost ship was seen off the point last night, sails full in no wind.',
					'The fishing fleet came back with nets full of black pearls, and one boat came back empty.',
					'The harbourmaster has been taking bribes to let a certain ship dock after dark.',
					'Something big has been bumping the hulls in the harbour at night.'
				]
			})
		},
		{
			id: 'mountain',
			label: 'Mountain / mining',
			blurb: 'Mines, forges and steep roads. Metal goods are cheap and plentiful; food costs more.',
			specialities: ['Iron and silver ore', 'Fine metalwork', 'Goat cheese'],
			dishes: table({
				1: ['Goat stew with dumplings', 'Smoked mountain trout', 'Black bread and strong cheese']
			}),
			namePrefixes: table({
				1: ['Stone', 'Iron', 'Crag', 'Grey', 'Granite', 'Eagle', 'Copper', 'Flint']
			}),
			nameSuffixes: table({ 1: ['peak', 'fell', 'hold', 'crag', 'pass', 'delve', 'scar'] }),
			priceByCategory: {
				'Heavy armor': 0.85,
				'Medium armor': 0.9,
				'Martial melee': 0.9,
				Food: 1.3,
				Meals: 1.2
			},
			priceByItem: { "Climber's kit": 0.6, Piton: 0.5, Crowbar: 0.7, Hammer: 0.7 },
			tierShift: {
				'Plate armor': -1,
				'Splint armor': -1,
				'Half plate': -1,
				'Mithral chain shirt': -1,
				'Adamantine chain mail': -1,
				"Climber's kit": -2,
				'War pick': -2,
				Warhammer: -1
			},
			extraItems: {
				general: table({
					1: [item("Miner's pick", 2, 0, 'Tools'), item('Lamp oil (gallon)', 0.5, 0, 'Light')]
				})
			},
			rumours: table({
				1: [
					"The miners broke into a hall that isn't on any map. They've sealed it up again.",
					'That avalanche at the pass was started on purpose. I heard the horn.',
					'The silver seam ran out, but the mine owner is still hiring. For what?',
					'Lights have been seen on the peak where nobody has lived for a hundred years.'
				]
			})
		},
		{
			id: 'northern',
			label: 'Northern / frozen',
			blurb: 'Long winters and short days. Furs are cheap; food and lamp oil are dear.',
			specialities: ['Furs and pelts', 'Whale oil', 'Amber'],
			dishes: table({ 1: ['Reindeer stew', 'Smoked herring on rye', 'Hot spiced mead'] }),
			namePrefixes: table({
				1: ['Frost', 'Snow', 'Wolf', 'White', 'Rime', 'Winter', 'Bear', 'Elk']
			}),
			nameSuffixes: table({ 1: ['heim', 'fjord', 'holm', 'gard', 'vik', 'mark'] }),
			priceByCategory: { Food: 1.4, Light: 1.2, Meals: 1.2 },
			priceByItem: { Blanket: 0.7, Bedroll: 0.8 },
			tierShift: { 'Warming stone': -1 },
			extraItems: {
				general: table({
					1: [
						item('Fur cloak', 5, 0, 'Clothing', { note: 'Protection against extreme cold' }),
						item('Snowshoes', 2, 0, 'Gear', { note: 'Ignore difficult terrain from snow' })
					]
				}),
				potions: table({
					1: [
						item('Warming draught', 1, 1, 'Remedy', { note: 'Homebrew: ignore cold for 8 hours' })
					]
				}),
				magic: table({ 1: [item('Ring of warmth', 500, 5, 'Ring', { rarity: 'uncommon' })] })
			},
			rumours: table({
				1: [
					'Wolves have been walking into town at night and just... watching.',
					'There is a face under the ice on the lake. It was not there last winter.',
					"The longship that went north for whale oil came back with half its crew, and they won't talk.",
					"The old jarl's barrow has been opened from the inside."
				]
			})
		},
		{
			id: 'desert',
			label: 'Desert / trade road',
			blurb:
				'Caravans, spice and scarce water. Water and food are dear; curved blades are everywhere.',
			specialities: ['Spices', 'Glass', 'Dates and figs'],
			dishes: table({
				1: ['Spiced lamb with dates', 'Flatbread and chickpea mash', 'Mint tea, very sweet']
			}),
			namePrefixes: table({
				1: ['Sand', 'Sun', 'Dune', 'Amber', 'Dust', 'Mirage', 'Scorpion', 'Red']
			}),
			nameSuffixes: table({ 1: ['well', 'spring', 'reach', 'rest', 'oasis', 'sands'] }),
			priceByCategory: { Food: 1.3, 'Heavy armor': 1.3, Drink: 1.3 },
			priceByItem: { Waterskin: 2.5, Scimitar: 0.8, 'Decanter of endless water': 1.5 },
			tierShift: { Scimitar: -3, Blowgun: -2, 'Decanter of endless water': -1 },
			extraItems: {
				general: table({
					1: [
						item('Desert robes', 1, 0, 'Clothing', { note: 'Protection against extreme heat' }),
						item('Sand goggles', 1, 1, 'Gear')
					]
				}),
				potions: table({ 1: [item('Sunburn salve', 0.2, 1, 'Remedy', { note: 'Homebrew' })] })
			},
			rumours: table({
				1: [
					"An oasis has appeared where none should be. Caravans that stop there don't leave.",
					'The last sandstorm uncovered the tip of a buried spire to the {direction}.',
					'Someone is poisoning the wells along the trade road, one by one.',
					'A caravan master is paying triple for guards. She will not say what she carries.'
				]
			})
		},
		{
			id: 'forest',
			label: 'Forest / frontier',
			blurb: 'Woodcutters, hunters and old trees. Bows and traps are cheap; heavy armor is rare.',
			specialities: ['Timber', 'Furs', 'Wild honey'],
			dishes: table({
				1: ['Venison pie', 'Mushroom and wild garlic broth', 'Roast boar with apples']
			}),
			namePrefixes: table({ 1: ['Oak', 'Fern', 'Elm', 'Briar', 'Moss', 'Deer', 'Thorn', 'Green'] }),
			nameSuffixes: table({ 1: ['wood', 'glade', 'holt', 'shaw', 'dell', 'grove'] }),
			priceByCategory: { 'Heavy armor': 1.15 },
			priceByItem: {
				Longbow: 0.8,
				Shortbow: 0.8,
				'Arrows (20)': 0.7,
				'Hunting trap': 0.6,
				'Herbalism kit': 0.7,
				'Potion of healing': 0.9
			},
			tierShift: {
				Longbow: -2,
				'Herbalism kit': -1,
				'Cloak of elvenkind': -1,
				'Boots of elvenkind': -1
			},
			extraItems: {
				general: table({
					1: [item('Trail rations (1 day)', 0.4, 0, 'Food', { note: 'Nuts, dried berries, jerky' })]
				}),
				potions: table({
					1: [item('Bark tea', 0.1, 1, 'Remedy', { note: 'Homebrew: eases pain and fever' })]
				})
			},
			rumours: table({
				1: [
					"The woodcutters won't go past the standing stones any more.",
					'An elk with silver antlers was seen at dusk. That always means fey trouble.',
					'A whole logging camp to the {direction} was found empty, axes still in the stumps.',
					'Someone is leaving carved wooden dolls on doorsteps. They look like the people inside.'
				]
			})
		},
		{
			id: 'swamp',
			label: 'Swamp / marsh',
			blurb: 'Boardwalks, reeds and fever. Antitoxins are cheap; metal armor is miserable here.',
			specialities: ['Eels', 'Peat', 'Rare herbs'],
			dishes: table({ 1: ['Eel pie', 'Frog legs in garlic', 'Crawfish boil'] }),
			namePrefixes: table({ 1: ['Fen', 'Bog', 'Reed', 'Mire', 'Murk', 'Toad', 'Heron', 'Sedge'] }),
			nameSuffixes: table({ 1: ['mire', 'marsh', 'fen', 'water', 'pool', 'bottom'] }),
			priceByCategory: { 'Heavy armor': 1.3 },
			priceByItem: { 'Antitoxin (vial)': 0.6, 'Herbalism kit': 0.7 },
			tierShift: { 'Antitoxin (vial)': -1, 'Basic poison (vial)': -1 },
			extraItems: {
				general: table({
					1: [
						item('Pole (10 ft)', 0.05, 0, 'Gear'),
						item('Waders', 1, 0, 'Clothing'),
						item('Mosquito netting', 0.5, 1, 'Camping')
					]
				}),
				potions: table({
					1: [
						item('Leech-bane ointment', 0.3, 1, 'Remedy', { note: 'Homebrew' }),
						item('Marsh-fever tonic', 2, 2, 'Remedy', {
							note: 'Homebrew: advantage vs disease for a day'
						})
					]
				})
			},
			rumours: table({
				1: [
					'The lights in the marsh are leading people off the boardwalks again.',
					'Something big is eating the crocodiles.',
					'The hag in the {direction} fen will trade a cure for a name. Your name.',
					'A sunken chapel rose out of the water after the flood, bells and all.'
				]
			})
		}
	]
});

/** The regions on offer at a content version (random regions pick from these). */
export function regionsAt(version: number): readonly Region[] {
	return at(REGION_TABLE, version);
}

/** Every current region, for menus. */
export const REGIONS = regionsAt(CONTENT_VERSION);

export function getRegion(id: RegionId | undefined): Region {
	return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}
