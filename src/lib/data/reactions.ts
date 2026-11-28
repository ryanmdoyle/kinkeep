import type { Relation } from '#lib/types.ts';

/**
 * What a keeper says once they know the party, either from a past visit or
 * from family gossip. These are picked when a card is shown, not when a town
 * is built, so they're plain lists rather than versioned tables: adding or
 * rewording lines never changes a town.
 */

/** Said to the party on a return visit, by how things were left. */
export const RETURNING: Record<Relation, string[]> = {
	positive: [
		"Back again! I was hoping you'd come by.",
		"My favourite customers! The good stock's in the back. For you, I'll fetch it.",
		'There they are! Sit, sit. Tell me everything.',
		'Welcome back, friends. I set something aside for you.',
		'Ah! Just the faces I wanted to see.',
		'You again! Good. The day was getting dull.',
		"Friends! Put your coin away a moment, let's have a proper hello first."
	],
	neutral: [
		"Oh, you're back. What'll it be this time?",
		'Back again, are you? Same as before?',
		"I remember you. Don't touch anything you can't afford.",
		"Welcome back. Prices haven't changed. Much.",
		'Ah, the adventurers. Still alive, I see.',
		'You again. Well, your coin spent fine last time.'
	],
	negative: [
		"You. I've told the whole family about you.",
		'Back again? Brave. Or stupid.',
		'Coin on the counter first this time.',
		"I'm watching you. Every second you're in here.",
		"We're closed. ...For you, we're closed. Fine. Be quick.",
		'Oh, wonderful. You.',
		"Whatever it is, it costs more than it did. Don't ask why."
	]
};

/**
 * Said by a keeper the party hasn't met, whose relatives they have.
 * `{cousin}` is the relative's first name; `{where}` is "in Oakford" or
 * "down the street".
 */
export const WORD_OF_KIN: Record<Relation, string[]> = {
	positive: [
		"{cousin} {where} wrote that you're good folk. Come in, come in!",
		"Ah, you're the ones {cousin} {where} keeps going on about. The family's grateful.",
		'{cousin} {where} said to look after you. So I will.',
		'Word travels in this family. {cousin} {where} speaks very well of you.',
		"Friends of {cousin}'s? Then you're friends of mine."
	],
	neutral: [
		'{cousin} {where} mentioned you might come by.',
		"You've met {cousin} {where}, I hear. Well. Let's see what you're like.",
		'Family talks. {cousin} {where} says you paid on time. That will do.',
		"{cousin} {where} wrote about you. Didn't say much. That's something."
	],
	negative: [
		'{cousin} {where} told me all about you. Hands where I can see them.',
		"You're the lot who upset {cousin} {where}. Prices just went up.",
		'Family remembers. {cousin} {where} certainly does.',
		"I've had a letter from {cousin} {where}. Several pages. Mostly about you.",
		"Oh, it's you. {cousin} {where} described you very accurately."
	]
};
