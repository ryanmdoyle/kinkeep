import { fillTemplate, plural } from '#lib/template.ts';
import type { Family, FamilyRole, Settlement, Shop } from '#lib/types.ts';

/**
 * Surname placeholders.
 *
 * A family's surname ends up in a lot of text: shop names ("Emberforge
 * Arms"), greetings, quirks and other families' rumours ("The Thornhide family
 * booked my whole upstairs"). Saved towns store a placeholder instead,
 * `{fam_weapons}`, and fill it in for display, so renaming a family changes
 * one record instead of every town.
 *
 * - Building a town to save: give the generator `tokenFamilies(families)`.
 *   Their surnames are the placeholders, so those land in the text unfilled.
 *   No roll depends on a surname's text, so it's the same town.
 * - Showing it: `renderSettlement(town, families)`. `fillTemplate` fills the
 *   placeholders and fixes plurals and "a"/"an" around them. Render before
 *   anything else reads the text: returning greetings and word of kin seed
 *   their rolls from the shop's name.
 * - Saving text the DM typed: `tokenizeText` / `tokenizeSettlement` turn the
 *   surnames they find back into placeholders.
 *
 * Inside a family's own data, its own surname is `{surname}` (the template
 * the families page already uses) and other families' are placeholders, so
 * `renderFamily` / `tokenizeFamily` handle those.
 */

type Surnames = readonly Pick<Family, 'id' | 'surname'>[];

const PREFIX = 'fam_';

/** The placeholder stored where a family's surname goes: `{fam_weapons}`. */
export function familyToken(role: FamilyRole): string {
	return `{${PREFIX}${role}}`;
}

/** Families whose surnames are their placeholders, for building towns to store. */
export function tokenFamilies<T extends Family>(families: readonly T[]): T[] {
	return families.map((f) => ({ ...f, surname: familyToken(f.id) }));
}

/** Template values filling every family's placeholder with its surname. */
export function surnameValues(families: Surnames): Record<string, string> {
	return Object.fromEntries(families.map((f) => [`${PREFIX}${f.id}`, f.surname]));
}

/** Text with every family placeholder filled in. */
export function renderText(text: string, families: Surnames): string {
	return fillTemplate(text, surnameValues(families));
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces whole-word names (and their plurals: "the Pennywhistles", "the
 * Marshes") with the given placeholders. A plural becomes the placeholder
 * plus "s", which `fillTemplate` turns back into the right plural.
 */
function replaceNames(text: string, tokens: Map<string, string>): string {
	if (!tokens.size) return text;
	// Longest first, so "Veyl" never wins over "Veylstar".
	const names = [...tokens.keys()].sort((a, b) => b.length - a.length).map(escape);
	const pattern = new RegExp(`(?<!\\p{L})(${names.join('|')})(es|s)?(?!\\p{L})`, 'gu');
	return text.replace(pattern, (match, name: string, suffix: string | undefined) => {
		const token = tokens.get(name)!;
		if (!suffix) return token;
		return plural(name) === name + suffix ? `${token}s` : match;
	});
}

/** Real surnames only (not empty, not already placeholders). */
function usableName(surname: string): boolean {
	return Boolean(surname.trim()) && !surname.includes('{');
}

/**
 * Text the DM typed, with the families' surnames turned into placeholders.
 * Pass every name the DM might have used: the families as they were shown,
 * and any new surnames being saved at the same time.
 *
 * It matches whole words, so a surname that's also an ordinary word ("Marsh")
 * also catches that word where it starts a sentence. It only runs on text as
 * it's saved, so the DM sees the result.
 */
export function tokenizeText(text: string, families: Surnames): string {
	const tokens = new Map<string, string>();
	for (const f of families) if (usableName(f.surname)) tokens.set(f.surname, familyToken(f.id));
	return replaceNames(text, tokens);
}

/** The shop with `fn` applied to the text that can name a family. */
function mapShopText(shop: Shop, fn: (text: string) => string): Shop {
	const { keeper } = shop;
	return {
		...shop,
		name: fn(shop.name),
		keeper: {
			...keeper,
			greeting: fn(keeper.greeting),
			quirks: keeper.quirks.map(fn),
			...(keeper.rumour && { rumour: { ...keeper.rumour, text: fn(keeper.rumour.text) } })
		}
	};
}

/** A stored town as it's shown: every family placeholder filled in. */
export function renderSettlement(town: Settlement, families: Surnames): Settlement {
	const values = surnameValues(families);
	const fill = (text: string) => fillTemplate(text, values);
	return { ...town, shops: town.shops.map((shop) => mapShopText(shop, fill)) };
}

/**
 * A town built with real surnames (an imported backup, say) as it's stored:
 * the surnames in its shop names, greetings, quirks and rumours turned into
 * placeholders.
 */
export function tokenizeSettlement(town: Settlement, families: Surnames): Settlement {
	const tokenize = (text: string) => tokenizeText(text, families);
	return { ...town, shops: town.shops.map((shop) => mapShopText(shop, tokenize)) };
}

const DESCRIPTIONS = ['groupName', 'signature', 'personality', 'voice'] as const;
const TEMPLATES = ['greetings', 'quirks', 'shopNames'] as const;

/**
 * A family as the DM sees it: its descriptions ("Clan {surname}") with its own
 * and other families' surnames filled in, and other families' surnames filled
 * in its templates (its own stays `{surname}` there, as the families page
 * shows it).
 */
export function renderFamily(family: Family, families: Surnames): Family {
	const others = surnameValues(families);
	const own = { ...others, surname: family.surname };
	const next = { ...family };
	for (const key of DESCRIPTIONS) next[key] = fillTemplate(family[key], own);
	for (const key of TEMPLATES) next[key] = family[key].map((t) => fillTemplate(t, others));
	return next;
}

/**
 * A family as it's stored: surnames in its descriptions and templates become
 * `{surname}` (its own) or other families' placeholders. Pass the families as
 * the DM saw them; the family's new surname is included automatically, so
 * renaming "Emberforge" to "Ironhand" while also editing "Clan Emberforge"
 * stores "Clan {surname}" either way.
 */
export function tokenizeFamily(family: Family, shownWith: Surnames): Family {
	const tokens = new Map<string, string>();
	for (const f of [...shownWith, family]) {
		if (!usableName(f.surname)) continue;
		tokens.set(f.surname, f.id === family.id ? '{surname}' : familyToken(f.id));
	}
	const r = (text: string) => replaceNames(text, tokens);
	const next = { ...family };
	for (const key of DESCRIPTIONS) next[key] = r(family[key]);
	for (const key of TEMPLATES) next[key] = family[key].map(r);
	return next;
}
