import { at, CONTENT_VERSION, table, type Versioned } from '#lib/content/versioned.ts';
import type { Family, FamilyDef, FamilyRole } from '#lib/types.ts';

/**
 * The default shopkeeping families. Like a certain nurse who runs every
 * healing centre in the land, each family runs the same kind of shop
 * everywhere, so players recognise them on sight. All of these are editable
 * in the app.
 */
const FAMILY_DEFS: FamilyDef[] = [
	{
		id: 'inn',
		surname: 'Hearthscale',
		groupName: 'Clan Hearthscale',
		race: 'Dragonborn',
		emblem: '🍺',
		color: '#b5651d',
		signature:
			'Copper-scaled and broad, with a stained leather apron, and a habit of lighting the hearth (and the odd pipe) with a polite little puff of flame.',
		personality:
			'Big-hearted, booming hosts who remember every guest. They love a full common room, a good song and a better story, and they hear everything.',
		voice:
			'Loud and warm. Laugh at your own jokes, call everyone "friend" and slap the bar for emphasis.',
		greetings: table({
			1: [
				"Friends! Come in out of the cold. Sit, sit, I'll light the fire. *puff*",
				'Welcome to the finest hall in town! Also the only hall in town. Ha!',
				"You look like you've walked a long road. First drink's on the {surname}s.",
				'Boots off the table, weapons by the door, and tell me everything.'
			]
		}),
		quirks: table({
			1: [
				"Remembers every guest's drink order, even from years ago.",
				'Will give a free room for a song, a story or a good fight story (no actual fighting).',
				'Keeps a "trouble jar" of coins: anyone who starts a brawl pays into it.',
				'Has a bard-in-residence who is terrible, and is fiercely loyal to them.',
				"Sneezes sparks when they laugh too hard. There's a scorch mark on the ceiling.",
				'Keeps a wall of tankards for regulars, and one hook that is always left empty.',
				'Writes to the other {surname} inns, so they often know the party is coming.',
				'Brews a secret family ale and will only say it contains "a bit of dragon".',
				'Runs a betting book on local events and will take bets on the party.',
				'Insists every guest signs the guest book. It goes back two hundred years.'
			]
		}),
		firstNames: table({
			1: [
				'Rhogar',
				'Kava',
				'Torinn',
				'Surina',
				'Medrash',
				'Biri',
				'Arjhan',
				'Farideh',
				'Ghesh',
				'Nala',
				'Heskan',
				'Thava',
				'Pandjed',
				'Uadjit',
				'Balasar',
				'Mishann'
			]
		}),
		shopNames: table({
			1: [
				'The {adj} Flagon',
				'The {adj} Hearth',
				'The {adj} Wyrm',
				"{first}'s Rest",
				'{surname} Hall',
				'The {adj} Tankard'
			]
		}),
		adjectives: table({
			1: ['Copper', 'Smoking', 'Sleeping', 'Merry', 'Roaring', 'Laughing', 'Golden', 'Crooked']
		})
	},
	{
		id: 'general',
		surname: 'Pennywhistle',
		groupName: 'the Pennywhistle family',
		race: 'Halfling',
		emblem: '🧺',
		color: '#c98a2b',
		signature:
			'Every Pennywhistle wears a sprig of dried lavender tucked behind one ear and a patched apron with far too many pockets.',
		personality:
			'Warm, nosy and endlessly chatty. They trade in gossip as much as goods, and always know who just arrived in town.',
		voice: 'Talk fast, answer questions with questions, and always end on a bit of gossip.',
		greetings: table({
			1: [
				"Come in, come in! Mind the cat. Now, what's the news from the road?",
				'Ooh, new faces! You look like folk who need rope. Everyone needs rope.',
				"Welcome, welcome! If we haven't got it, my cousin in the next town does.",
				'Wipe your boots, dears. Now then, what can a {surname} do for you?'
			]
		}),
		quirks: table({
			1: [
				'Will knock a few coppers off for a juicy rumour.',
				'Keeps a ledger of every traveller who has ever passed through.',
				'Is convinced one of the adventurers is secretly royalty.',
				'Has an ancient, enormous cat that sleeps on the counter.',
				'Is feuding (politely) with the baker next door.',
				'Insists on wrapping every purchase in brown paper and string.',
				'Hums the same tune constantly and does not realise it.',
				'Offers everyone a sticky homemade toffee.',
				'Writes letters to every other {surname} shop weekly and will happily pass messages along.',
				'Has a "lucky" item they refuse to sell at any price.'
			]
		}),
		firstNames: table({
			1: [
				'Posy',
				'Wendel',
				'Hettie',
				'Cobb',
				'Dilly',
				'Fenwick',
				'Tamsin',
				'Orrin',
				'Nettie',
				'Barnaby',
				'Lula',
				'Pip',
				'Marigold',
				'Tobias',
				'Clover',
				'Jory',
				'Mabel',
				'Osgood'
			]
		}),
		shopNames: table({
			1: [
				"{surname}'s Provisions",
				"{surname}'s Sundries & Supplies",
				"{first} {surname}'s General Goods",
				'The {adj} Basket',
				'{surname} & Kin Trading Post'
			]
		}),
		adjectives: table({
			1: ['Overflowing', 'Busy', 'Handy', 'Cosy', 'Patchwork', 'Bottomless', 'Honest']
		})
	},
	{
		id: 'weapons',
		surname: 'Emberforge',
		groupName: 'Clan Emberforge',
		race: 'Dwarf',
		emblem: '⚔️',
		color: '#b8432f',
		signature:
			'Soot-black forearms, a braided beard (or braids) threaded with a single iron ring for every blade they have made, and a burn scar they will tell you about at length.',
		personality:
			"Gruff, blunt and proud. They judge customers by how they hold a weapon and won't sell a good blade to someone who'll mistreat it.",
		voice: 'Short sentences. Long pauses. Grunt approvingly when someone picks a good weapon.',
		greetings: table({
			1: [
				"Hold it like you mean it, or don't hold it at all.",
				'Hmph. Show me your hands. ...Calluses. Good. Come in.',
				"Don't touch the edge. Everyone touches the edge.",
				'{surname} steel. Best this side of the mountains. Best the other side too.'
			]
		}),
		quirks: table({
			1: [
				'Tests every blade on a ham hanging from the ceiling.',
				'Refuses to sell to anyone who calls a sword "pointy".',
				'Will sharpen your current weapon for free if you tell a good battle story.',
				"Keeps a grudge list nailed to the wall. It's very long.",
				'Names every weapon they forge and is sad to see them go.',
				'Is secretly a soft touch for children and gives them wooden swords.',
				'Has a rival smith in town and badmouths their work constantly.',
				'Insists on a firm handshake to seal every sale.',
				'Hums old forge-songs in a deep rumble while working.',
				'Has never once smiled in front of a customer. Probably.'
			]
		}),
		firstNames: table({
			1: [
				'Brunna',
				'Dorgan',
				'Hilde',
				'Korrin',
				'Bardek',
				'Ysolde',
				'Grimma',
				'Holt',
				'Dagna',
				'Rurik',
				'Vonna',
				'Tormund',
				'Ilsa',
				'Barra',
				'Kael',
				'Magda',
				'Odvar',
				'Sigrun'
			]
		}),
		shopNames: table({
			1: [
				'{surname} Arms',
				"{first}'s Forge",
				'The {adj} Anvil',
				'{surname} Blades & Bows',
				'{first} {surname}, Weaponsmith'
			]
		}),
		adjectives: table({ 1: ['Ringing', 'Glowing', 'Iron', 'Hammered', 'Red', 'Stubborn', 'Sharp'] })
	},
	{
		id: 'armor',
		surname: 'Thornhide',
		groupName: 'the Thornhide clan',
		race: 'Half-orc',
		emblem: '🛡️',
		color: '#4f7a5a',
		signature:
			"Huge and broad-shouldered, with a tailor's measuring cord always draped around their neck and a tiny pair of spectacles perched on a big nose.",
		personality:
			'Gentle giants. Soft-spoken, patient and fiercely protective. They see armor as care made of steel and insist it fits perfectly.',
		voice: 'Speak softly and slowly. Fuss over the customer like a worried grandparent.',
		greetings: table({
			1: [
				"Arms up, please. Let's see what we're protecting.",
				'Oh dear, who fitted that for you? Come here, come here.',
				"Welcome, little one. ...Yes, you're all little ones to me.",
				"Every dent tells a story. I'd rather you had fewer stories."
			]
		}),
		quirks: table({
			1: [
				'Will not let a customer leave in badly fitted armor, even if they bought it elsewhere.',
				'Knits chainmail-patterned scarves in their spare time.',
				'Remembers the measurements of every customer they have ever had.',
				'Gets teary when someone comes back with armor that saved their life.',
				'Offers a free repair if you bring back a dented piece with a good story.',
				'Keeps a jar of honey sweets for nervous customers.',
				'Tests shields by having customers hit them as hard as they can. Is never impressed.',
				'Is surprisingly good at poetry and recites some during fittings.',
				'Talks to the armor stands as if they were old friends.',
				'Has a pet tortoise named after a famous general.'
			]
		}),
		firstNames: table({
			1: [
				'Ugra',
				'Marsk',
				'Dolla',
				'Brek',
				'Sorsha',
				'Gant',
				'Vella',
				'Throk',
				'Imma',
				'Karsh',
				'Oona',
				'Grell',
				'Hessa',
				'Mott',
				'Ruga',
				'Dask'
			]
		}),
		shopNames: table({
			1: [
				'{surname} Armory',
				"{first}'s Fittings",
				'The {adj} Shield',
				'{surname} & Kin, Armorers',
				"{first} {surname}'s Mail & Plate"
			]
		}),
		adjectives: table({
			1: ['Sturdy', 'Steadfast', 'Patient', 'Gentle', 'Dented', 'Faithful', 'Unbroken']
		})
	},
	{
		id: 'potions',
		surname: 'Mosswick',
		groupName: 'the Mosswick cousins',
		race: 'Gnome',
		emblem: '⚗️',
		color: '#3f8f9b',
		signature:
			'Brass goggles pushed up on the forehead, and hair dyed a different impossible color in every shop (side effects of "testing").',
		personality:
			'Excitable, brilliant and slightly reckless. They test everything on themselves and treat customers as fascinating research subjects.',
		voice:
			'Speak fast and excitedly, go off on tangents, and take notes on everything the customer says.',
		greetings: table({
			1: [
				"Don't touch the blue one. Or, actually, go ahead, I need the data.",
				'Customers! Wonderful! Any allergies? Any extra limbs? No? Pity.',
				"Welcome! Ignore the smoke, that's normal. Mostly normal.",
				'Ah! You look tired. And injured. And slightly cursed? Let me see...'
			]
		}),
		quirks: table({
			1: [
				"Their hair is currently bright {color} and they don't know why.",
				'Offers a discount if you try an experimental potion. Results vary.',
				'Has a small explosion every hour or so and does not react to it.',
				'Keeps a frog familiar that "tastes-tests" ingredients.',
				'Constantly corrects the spelling on their own labels.',
				'Sends letters to the other {surname}s comparing notes on customers.',
				'Pays well for rare monster parts. Very well. Suspiciously well.',
				'Is missing an eyebrow. Do not ask about the eyebrow.',
				'Labels everything with dates in a calendar nobody else uses.',
				'Gets distracted mid-sentence by a new idea and scribbles it down.'
			]
		}),
		firstNames: table({
			1: [
				'Nimsy',
				'Quillon',
				'Tibbet',
				'Zanna',
				'Orryn',
				'Bixby',
				'Pell',
				'Wizzle',
				'Mabry',
				'Fenna',
				'Dabble',
				'Sprocket',
				'Lilt',
				'Ebba',
				'Nock',
				'Tansy'
			]
		}),
		shopNames: table({
			1: [
				'{surname} Remedies',
				"{first}'s Curious Concoctions",
				'The {adj} Cauldron',
				'{surname} & {surname}, Apothecaries',
				"{first} {surname}'s Tonics & Tinctures"
			]
		}),
		adjectives: table({
			1: ['Bubbling', 'Fizzing', 'Smoking', 'Glittering', 'Crooked', 'Peculiar', 'Wobbly']
		})
	},
	{
		id: 'magic',
		surname: 'Veyl',
		groupName: 'House Veyl',
		race: 'Elf',
		emblem: '🔮',
		color: '#7a5cb8',
		signature:
			'Violet eyes, long silver-streaked hair, and a single silver earring shaped like a tiny key.',
		personality:
			'Aloof, cryptic and very old. They seem to know what you want before you do, and they enjoy that far too much.',
		voice: 'Speak slowly and quietly, answer questions with riddles, and smile knowingly.',
		greetings: table({
			1: [
				'You were expected. Well... someone was.',
				'Ah. The bell did not ring, and yet here you are.',
				'Welcome. Please do not make eye contact with the mirror.',
				'Everything here has a price. Not everything has a price in gold.'
			]
		}),
		quirks: table({
			1: [
				"Always seems to know the party members' names already.",
				'Will only sell certain items to people they find "interesting".',
				"Their shop is bigger on the inside, and they won't discuss it.",
				'Has a raven that repeats the last thing a customer said.',
				'Speaks of the other {surname}s as if they were all the same person.',
				'Sometimes asks for a memory, a secret or a favour instead of coin.',
				'Never seems to blink.',
				'Keeps a cat that is definitely a polymorphed something.',
				'Wraps every item in black silk and a sprig of rosemary.',
				'Tells each customer a cryptic fortune at checkout. It is always true, eventually.'
			]
		}),
		firstNames: table({
			1: [
				'Ilyra',
				'Saevel',
				'Thessaly',
				'Corvin',
				'Myrael',
				'Aelith',
				'Vaelan',
				'Sorrel',
				'Nyxa',
				'Eredan',
				'Liriel',
				'Caelum',
				'Ysmae',
				'Orrel'
			]
		}),
		shopNames: table({
			1: [
				'House {surname} Curios',
				"{first}'s Emporium of the Arcane",
				'The {adj} Key',
				'{surname} Antiquities',
				"{first} {surname}'s Wonders"
			]
		}),
		adjectives: table({
			1: ['Silver', 'Hidden', 'Whispering', 'Last', 'Seventh', 'Locked', 'Gleaming']
		})
	}
];

/** The built-in families as they were at a content version. */
export function defaultFamiliesAt(version: number): Family[] {
	const list = (t: Versioned<string>) => [...at(t, version)];
	return FAMILY_DEFS.map((def) => ({
		...def,
		greetings: list(def.greetings),
		quirks: list(def.quirks),
		firstNames: list(def.firstNames),
		shopNames: list(def.shopNames),
		adjectives: list(def.adjectives)
	}));
}

/** The built-in families with all current content. */
export const DEFAULT_FAMILIES: Family[] = defaultFamiliesAt(CONTENT_VERSION);

export function defaultFamily(id: FamilyRole, version = CONTENT_VERSION): Family {
	return defaultFamiliesAt(version).find((f) => f.id === id)!;
}

export const FAMILY_ROLE_LABELS: Record<FamilyRole, string> = {
	inn: 'Inns & taverns',
	general: 'General stores',
	weapons: 'Weapons & smithies',
	armor: 'Armor',
	potions: 'Potions & remedies',
	magic: 'Magic items'
};

export const HAIR_COLORS = table({
	1: ['green', 'violet', 'teal', 'tangerine', 'sky blue', 'pink', 'silver', 'gold']
});
