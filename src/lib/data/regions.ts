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
				1: [
					'Mutton and barley stew',
					'Fresh bread with honey butter',
					'Pork pie and pickles',
					'Roast chicken with sage stuffing',
					'Cheese and onion pasty',
					'Pease pudding with ham hock',
					'Plum tart with clotted cream',
					'Rabbit stew with turnips',
					'Beef and ale pie',
					'Leek and potato soup'
				]
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
					'The new reeve in {place} is taxing ale by the sip.',
					"The miller's daughter has been grinding at midnight, and the flour comes out grey.",
					'A field to the {direction} has a ring of dead wheat in the middle. Perfect circle, and it grows a little every night.',
					"Every sheep at {place} was shorn overnight. The wool's gone, and so is whoever sheared them.",
					"The lord's steward has been measuring fields with a rope and a strange brass gauge. Nobody asked him to.",
					"{person} ploughed up a stone with writing on it. The priest took it away and won't say what it said.",
					"The cows in the {direction} pasture are giving blue milk. Tastes fine, they say. I'm not trying it.",
					'The fair at {place} has a tent that nobody hired. It only opens after dark.',
					'Someone is buying up the old orchards and felling every tree but one in each.',
					"The scarecrow on the {kin} family's plot wears a different hat every morning. Nobody's lending it hats.",
					'A plough horse at {place} cut its furrow in a perfect spiral, then lay down in the middle.',
					"The hedges along the {direction} lane grew a foot overnight, and they're thickest on the side facing the manor.",
					"The mill weir's holding back more water than it should. Something's blocking the river upstream.",
					"The harvest queen goes missing for a day each year and comes back with a basket of fruit nobody can name. It's nearly time.",
					'A shepherd swears one ram leads his whole flock up to the old hill fort at night.',
					"The tithe barn was locked when the steward left for the winter. Now there's lamplight under the doors.",
					"Hay carts coming from {place} are being stopped and searched by men who don't wear the lord's colours."
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
				1: [
					'Salt-fish chowder',
					'Grilled eel with lemon',
					'Mussels steamed in ale',
					'Crab and samphire tart',
					'Smoked mackerel on toast',
					'Oysters with black pepper',
					'Cockle and leek broth',
					'Baked cod with parsley sauce',
					'Lobster with garlic butter',
					'Fried whitebait and tartare'
				]
			}),
			namePrefixes: table({
				1: [
					'Salt',
					'Gull',
					'Tide',
					'Brine',
					'Anchor',
					'Kelp',
					'Shell',
					'Sea',
					'Harbor',
					'Pearl',
					'Wrack',
					'Herring',
					'Cockle',
					'Crab',
					'Spray'
				]
			}),
			nameSuffixes: table({
				1: ['port', 'haven', 'mouth', 'cove', 'strand', 'sands', 'bay', 'ness', 'quay', 'head']
			}),
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
					'Something big has been bumping the hulls in the harbour at night.',
					'A bottle washed up with a map inside. Three people have already tried to buy it off the fishwife who found it.',
					'The lighthouse keeper on the point has started lighting the lamp at noon.',
					"Gulls won't land on the {direction} jetty. Not one, not even for bread.",
					'A foreign captain is paying good coin for anyone who knows the reefs off {place}.',
					"The tide went out further than anyone's ever seen and showed a stone road running out to sea.",
					"There are lanterns in the caves under the cliffs again, but nobody's landed any goods in months.",
					'{person} hauled a brass diving helm out of the shallows. There was a note inside it, dry as a bone.',
					'Pirates have been sighted to the {direction}, flying the flag of a ship that sank twenty years ago.',
					"A whale beached itself near {place} with a ship's figurehead lodged in its jaw.",
					'The herring have gone {direction}, every last one, in a single night. Something chased them.',
					"{person} found a mermaid's comb on the strand. Every night since, someone's been singing under their window.",
					'Ships from the islands have stopped coming. The last one in had claw marks along the waterline.',
					'A press gang has been working the docks, but none of the men they took have turned up on any ship.',
					'The {kin} family bought a share in a ship that has never once come into harbour.',
					'The old sea wall is cracking from the landward side. Something under the town is pushing out.',
					'Wreckers have been lighting false beacons on the cliffs to the {direction}. Two ships lost this season.'
				]
			})
		},
		{
			id: 'mountain',
			label: 'Mountain / mining',
			blurb: 'Mines, forges and steep roads. Metal goods are cheap and plentiful; food costs more.',
			specialities: ['Iron and silver ore', 'Fine metalwork', 'Goat cheese'],
			dishes: table({
				1: [
					'Goat stew with dumplings',
					'Smoked mountain trout',
					'Black bread and strong cheese',
					"Miner's pasty with swede",
					'Roast kid with rosemary',
					'Oatcakes with blue cheese',
					'Venison and juniper hotpot',
					'Lentil and smoked bacon soup',
					'Mountain herb omelette',
					'Chestnut porridge with goat butter'
				]
			}),
			namePrefixes: table({
				1: [
					'Stone',
					'Iron',
					'Crag',
					'Grey',
					'Granite',
					'Eagle',
					'Copper',
					'Flint',
					'Slate',
					'Anvil',
					'Cairn',
					'Scree',
					'Tin',
					'Coal'
				]
			}),
			nameSuffixes: table({
				1: ['peak', 'fell', 'hold', 'crag', 'pass', 'delve', 'scar', 'tor', 'pike', 'spur', 'shaft']
			}),
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
					'Lights have been seen on the peak where nobody has lived for a hundred years.',
					'The ore carts have been coming up the shaft at night with nobody pushing them.',
					'A dwarf came down from the {direction} peaks, bought every barrel of lamp oil in town, and went straight back up.',
					"The mine canaries at {place} have stopped singing. Nobody's going below until they start again.",
					'{person} found a vein of blue crystal in the lower gallery. The foreman had it walled up the same day.',
					"Someone keeps cutting the rope bridge to the {direction}. It's been mended three times this month.",
					'Goats keep vanishing from the high pastures. The herders found tracks going straight up a cliff face.',
					'The old dwarven road is open again. Somebody cleared the rockfall from the inside.',
					"The {kin} family's silver from {place} arrived lighter than it left, and the seals weren't broken.",
					'The echoes in the {direction} gorge answer a moment too late. Sometimes they say something different.',
					"A miner came up holding a gem he says was handed to him in the dark, by a hand smaller than a child's.",
					'Goats from {place} came down the mountain with gold dust caught in their coats.',
					'Every forge in town burned green on the same night. The old smiths call that a warning from below.',
					"There's a giant's bootprint in the snowfield above the pass. It's facing towards town.",
					"The mine owner's hired a dowser from {place}. She walks the tunnels with a hazel rod and won't say what she's after.",
					'Rockslides keep blocking the same stretch of road, always at night, always just after the ore wagons pass.',
					'{person} heard hammering behind solid rock in the deep shaft. Next morning every pick in the camp was gone.'
				]
			})
		},
		{
			id: 'northern',
			label: 'Northern / frozen',
			blurb: 'Long winters and short days. Furs are cheap; food and lamp oil are dear.',
			specialities: ['Furs and pelts', 'Whale oil', 'Amber'],
			dishes: table({
				1: [
					'Reindeer stew',
					'Smoked herring on rye',
					'Hot spiced mead',
					'Elk sausage with lingonberries',
					'Barley porridge with cloudberries',
					'Hare and juniper stew',
					'Fish soup with cream and dill',
					'Salt cod with melted butter',
					'Cardamom buns',
					'Mutton smoked over birch'
				]
			}),
			namePrefixes: table({
				1: [
					'Frost',
					'Snow',
					'Wolf',
					'White',
					'Rime',
					'Winter',
					'Bear',
					'Elk',
					'Skald',
					'Hail',
					'Sleet',
					'Storm',
					'Seal',
					'Pine'
				]
			}),
			nameSuffixes: table({
				1: ['heim', 'fjord', 'holm', 'gard', 'vik', 'mark', 'berg', 'stad', 'lund', 'sund']
			}),
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
					"The old jarl's barrow has been opened from the inside.",
					'The ice on the fjord cracked in a straight line last night, mile after mile, as if something cut it.',
					'Hunters to the {direction} found a mammoth frozen in the glacier. Its eyes are open, and they swear it blinked.',
					"The sun didn't rise over {place} yesterday. Everywhere else, it did.",
					'A sled came in with no dogs and no driver, just a chest of amber lashed to it.',
					'{person} heard singing under the snow on the way home, dug down, and found a door.',
					"The whalers won't sail. Their old harpooner dreamt of something with a crown waiting on the sea floor.",
					"The {kin} family's reindeer herd vanished overnight. The tracks lead {direction} and simply stop.",
					'Every year the lights in the sky burn red, someone in town goes missing. They burned red last night.',
					'The ice-fishers at {place} pulled up a fish with gold coins in its belly. Old coins, from the south.',
					"Someone's building a snow fort on the {direction} ridge. It's bigger every night, and nobody's seen the builders.",
					'A skald came through singing of a hall under the glacier where the feast never ends. He was hiring guides.',
					'The hot spring outside town has gone cold. The elders say something is drinking the warmth.',
					'{person} traded a pelt to a stranger in white for a knife that never dulls. Now the stranger wants it back.',
					"Ravens follow the {kin} family's sledges wherever they go. Waiting, folk say.",
					'Avalanche bells rang on a still night with no snow falling, down by the old pass to the {direction}.',
					'A ship frozen in the ice past the point has had smoke rising from it since midwinter.'
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
				1: [
					'Spiced lamb with dates',
					'Flatbread and chickpea mash',
					'Mint tea, very sweet',
					'Saffron rice with almonds',
					'Slow-roast goat with cumin',
					'Date and walnut pastries',
					'Grilled kofta with yoghurt',
					'Stuffed peppers with pine nuts',
					'Pomegranate and lentil salad',
					'Honey-glazed quail'
				]
			}),
			namePrefixes: table({
				1: [
					'Sand',
					'Sun',
					'Dune',
					'Amber',
					'Dust',
					'Mirage',
					'Scorpion',
					'Red',
					'Palm',
					'Spice',
					'Ochre',
					'Jackal',
					'Glass',
					'Saffron'
				]
			}),
			nameSuffixes: table({
				1: ['well', 'spring', 'reach', 'rest', 'oasis', 'sands', 'stone', 'rock', 'wadi', 'haze']
			}),
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
					'A caravan master is paying triple for guards. She will not say what she carries.',
					'A caravan came in from {place} with every camel shaved bald. The drivers say they woke up that way.',
					'The old well to the {direction} is running clear again after fifty dry years. Someone opened something down there.',
					"A glassblower found a bead in the sand that won't cool. A collector is riding three hundred miles to see it.",
					"Sandstorms keep stopping dead at the edge of the salt flats, as though they've hit a wall.",
					"{person} bought a lamp off a nomad that won't light. Every night it's moved to a different shelf.",
					"The {kin} family's spice caravan was robbed, but the thieves only took the saffron and left a gold bar in its place.",
					"Bones of something huge have surfaced in the dunes to the {direction}. The vultures won't touch them.",
					"The nomads say the stars over the great dune are wrong this month. They're moving their camp.",
					"A traveller walked in from the {direction} with no water and not a drop of sweat on him. He's asking for the oldest map in town.",
					'A caravan on the old road was swallowed by a sinkhole. The guards say the sand opened like a mouth.',
					'Nomads sold a scroll they found in a jar under a fallen pillar. Half the town is bidding for it.',
					"A new stall at the night market sells water that never warms. The trader won't say where she draws it.",
					'Scorpions are marching through the streets in lines, all heading for the old tomb to the {direction}.',
					'{person} saw a city on the horizon at sunset. Bells, towers, the lot. Nothing there by morning.',
					'The {kin} family hired a guide who claims he can find the lost road across the salt flats. He wants a lot of rope.',
					"A sand-diviner says the next big storm will bring something up from under the dunes. It's due within the week."
				]
			})
		},
		{
			id: 'forest',
			label: 'Forest / frontier',
			blurb: 'Woodcutters, hunters and old trees. Bows and traps are cheap; heavy armor is rare.',
			specialities: ['Timber', 'Furs', 'Wild honey'],
			dishes: table({
				1: [
					'Venison pie',
					'Mushroom and wild garlic broth',
					'Roast boar with apples',
					'Rabbit and chestnut stew',
					'Blackberry and apple pie',
					'Trout baked in clay',
					'Pigeon pie with juniper',
					'Hazelnut bread with wild honey',
					'Nettle and mushroom tart',
					'Roast pheasant with bramble jelly'
				]
			}),
			namePrefixes: table({
				1: [
					'Oak',
					'Fern',
					'Elm',
					'Briar',
					'Moss',
					'Deer',
					'Thorn',
					'Green',
					'Birch',
					'Hazel',
					'Rowan',
					'Yew',
					'Beech',
					'Badger'
				]
			}),
			nameSuffixes: table({
				1: ['wood', 'glade', 'holt', 'shaw', 'dell', 'grove', 'wold', 'lea', 'copse', 'brake']
			}),
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
					'Someone is leaving carved wooden dolls on doorsteps. They look like the people inside.',
					'Every bird in the {direction} wood went silent at noon yesterday, all at once, for as long as it takes to say a prayer.',
					"The charcoal burners found a ring of mushrooms big enough to stand in. One of them did, and he's not been right since.",
					'A trapper came back with a pelt that still changes colour with the seasons. He wants a fortune for it.',
					'{person} felled an old oak to the {direction} and has found acorns in their boots every morning since.',
					"Someone's marking trees for felling with a sign none of the foresters use.",
					"A girl from the {kin} family was lost in the woods all night. She came home wearing a crown of woven ivy and won't say who made it.",
					"The bandits in the forest have started leaving a share of their takings at the old shrine. Something's frightened them.",
					'The stream that runs through {place} flows the other way after sundown.',
					'Woodsmen keep finding tiny doors carved into tree roots. Ankle high, with brass hinges.',
					'The forester at {place} has stopped marking trees for felling. He says the trees asked him to.',
					'An archer in a green cloak has been shooting the hats off travellers on the {direction} road. Never misses, never robs.',
					"The {kin} family's woodpile walked off in the night, logs and kindling, in a trail towards the old hollow.",
					'Owls have taken over the abandoned watchtower. Hundreds of them, and they all go quiet when people pass.',
					"A boy came out of the deep wood speaking a language nobody knows. He'd been gone a year by our count, a day by his.",
					'Honey from the wild hives to the {direction} makes folk fall asleep where they stand. The bees seem fine.',
					"{person} found a circle of white stones in a clearing that wasn't there last week. One stone is missing."
				]
			})
		},
		{
			id: 'swamp',
			label: 'Swamp / marsh',
			blurb: 'Boardwalks, reeds and fever. Antitoxins are cheap; metal armor is miserable here.',
			specialities: ['Eels', 'Peat', 'Rare herbs'],
			dishes: table({
				1: [
					'Eel pie',
					'Frog legs in garlic',
					'Crawfish boil',
					'Catfish stew with peppers',
					'Pike dumplings in broth',
					'Snail and nettle soup',
					'Roast wild duck with rice',
					'Fried smelt and mustard',
					'Smoked eel with horseradish',
					'Watercress and potato soup'
				]
			}),
			namePrefixes: table({
				1: [
					'Fen',
					'Bog',
					'Reed',
					'Mire',
					'Murk',
					'Toad',
					'Heron',
					'Sedge',
					'Eel',
					'Newt',
					'Peat',
					'Silt',
					'Rush',
					'Mist'
				]
			}),
			nameSuffixes: table({
				1: ['mire', 'marsh', 'fen', 'water', 'pool', 'bottom', 'carr', 'wash', 'slough', 'flats']
			}),
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
					'A sunken chapel rose out of the water after the flood, bells and all.',
					'A boardwalk to the {direction} was found pulled up and stacked neatly, plank by plank, a mile into the reeds.',
					"The peat cutters dug up a bronze cauldron that's still warm to the touch.",
					'{person} rows out to the drowned church every night with a lantern and a spade.',
					'Out past {place} the frogs have started croaking a word. Just the one, over and over.',
					'The eel traps keep coming up full of keys. Old, rusted keys, hundreds of them.',
					'A heron the size of a horse has been seen stalking the shallows to the {direction}.',
					'The {kin} family are selling their stilt-house cheap. Something keeps knocking from underneath.',
					"The mist hasn't lifted over {place} in nine days. Boats go in. Some come out.",
					'The boatman on the {direction} channel has a new face every month, but always the same hat.',
					'A lizardfolk trader came to the boardwalk market with a golden crown to swap for salt. Just salt.',
					'Marsh lights have been seen in the middle of {place}, not out in the reeds. Hovering over one house.',
					"The flood marks on the old church say the water's never been this low. Something is draining the marsh.",
					'The river mussels have black pearls in them now, cold to the touch even in summer.',
					'{person} went fishing in the deep pool and swears something bit through the line and spat the hook back.',
					'From the bell tower you can see the bog cotton has grown in a pattern. It looks like writing.',
					'A barge from {place} drifted downriver with no crew and a cargo of sealed jars. The jars are humming.'
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
