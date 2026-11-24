import type { FamilyRole } from '#lib/types.ts';

/*
 * Placeholders:
 *   {place}     a nearby settlement name
 *   {person}    a local, e.g. "old Tam the cooper"
 *   {monster}   a monster
 *   {direction} north, east, ...
 *   {kin}       the surname of another shopkeeping family
 */

export const ROLE_RUMOURS: Record<FamilyRole, string[]> = {
	inn: [
		"A cloaked stranger paid for a room for a week and hasn't once come out of it.",
		'Two merchants nearly came to blows over a map last night. One left without his hat. Or the map.',
		'The caravan from {place} is three days overdue.',
		"There's a cellar under the old mill with a door that wasn't there last year.",
		"{person} bet the whole room they could spend a night in the old chapel. They haven't come back to collect.",
		"Smugglers use the {direction} road after dark. Pay them no mind and they'll pay you none.",
		'A minstrel came through singing a song about a hoard in {place}. The song names the guards.'
	],
	general: [
		'{person} is sweet on a stranger who only comes into town on moonless nights.',
		"{person} hasn't paid their tab in three months, and nobody knows where their money went.",
		'Salt prices doubled overnight. Someone in {place} is buying it all up.',
		"A wagon came in from {place} with every crate empty, and the driver won't say a word.",
		'The old well behind the chapel has started whispering. Only at noon, mind.',
		'{person} is selling off family heirlooms in a hurry. Debts, or something worse.',
		"There's a reward posted for a lost dog. Fifty gold! For a dog!",
		"The tax collector is a week late. Nobody's complaining, but everyone's nervous."
	],
	weapons: [
		"Bandits on the {direction} road have new steel. Good steel. Someone's arming them.",
		'A {monster} took three sheep near {place}. Bit clean through a pitchfork.',
		"The garrison captain ordered fifty spears and won't say what for.",
		"An old battlefield to the {direction} turned up a sword that won't rust.",
		'Someone has been buying silvered blades. Lots of them. Ask yourself why.',
		'The {kin} folk say the shipments from {place} have stopped coming.'
	],
	armor: [
		"The lord's guard came in for refitting. Every shield had the same claw marks.",
		'A knight in mourning black passed through asking the way to {place}.',
		'Mercenaries are hiring in {place}. Good pay, no questions, short lives.',
		'Somebody fished a breastplate out of the river with a hole punched right through it. From the inside.',
		'{person} ordered child-sized armor. Twelve sets. Paid in advance.'
	],
	potions: [
		'There is a cough going round {place}. Not natural. Smells of copper.',
		'Nightcap mushrooms are fruiting early in the woods to the {direction}. Bad sign.',
		'Someone ordered enough sleeping draught to fell a giant. Paid in very old coins.',
		'The temple healer is buying every antitoxin I make. Every single one.',
		"I'll pay well for {monster} parts. A colleague says one was seen near {place}.",
		'The {kin} family have been asking me for something to stop bad dreams. All of them.'
	],
	magic: [
		'A star fell to the {direction} three nights ago. Something walked away from it.',
		'The tower at {place} has been dark for a month. Its wizard owes me a book.',
		'Someone has been selling maps that redraw themselves. Do not buy one.',
		'An heirloom of our house went missing a century ago. It has been seen again, near {place}.',
		'The dead in the old barrow have started keeping time. Listen for the drums.',
		'{person} came in asking how to break a curse. They would not say whose.'
	]
};

export const MONSTERS = [
	'wyvern',
	'owlbear',
	'ghoul',
	'troll',
	'giant spider',
	'basilisk',
	'harpy',
	'ogre',
	'manticore',
	'dire wolf',
	'wraith',
	'hag',
	'gelatinous cube',
	'griffon',
	'ankheg'
];

export const DIRECTIONS = ['north', 'south', 'east', 'west', 'north', 'east'];

export const LOCAL_NAMES = [
	'Tam',
	'Agnes',
	'Hal',
	'Bess',
	'Wat',
	'Joan',
	'Piers',
	'Maud',
	'Gil',
	'Edith',
	'Rafe',
	'Alys',
	'Hob',
	'Cecily',
	'Simkin',
	'Nell'
];

export const LOCAL_TRADES = [
	'the cooper',
	'the miller',
	'the reeve',
	'the tanner',
	'the chandler',
	'the shepherd',
	"the priest's nephew",
	'the ferryman',
	'the widow up the hill',
	'the watch captain'
];

export const TRUTH_WEIGHTS: { truth: 'true' | 'partly true' | 'false'; weight: number }[] = [
	{ truth: 'true', weight: 5 },
	{ truth: 'partly true', weight: 3 },
	{ truth: 'false', weight: 2 }
];
