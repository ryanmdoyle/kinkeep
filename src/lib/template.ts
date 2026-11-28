/**
 * Fills `{placeholders}` in content lines, fixing up the grammar around them:
 * "a {monster}" becomes "an owlbear", and "{surname}s" becomes "the Marshes"
 * rather than "the Marshs". Unknown placeholders are left as they are.
 */

const VOWEL_SOUND = /^[aeiou]/i;
/** Vowel letters that sound like a consonant ("a unicorn", "a one-eyed..."). */
const CONSONANT_SOUND = /^(uni|use|usu|ure|eu|one|once)/i;
/** A silent h ("an hour"). */
const SILENT_H = /^(hour|honest|honou?r|heir)/i;

/** "a" or "an" for a word, keeping the capital if the original article had one. */
export function article(word: string, capital = false): string {
	const an = (VOWEL_SOUND.test(word) && !CONSONANT_SOUND.test(word)) || SILENT_H.test(word);
	const a = an ? 'an' : 'a';
	return capital ? a[0].toUpperCase() + a.slice(1) : a;
}

const IRREGULAR: Record<string, string> = {
	wolf: 'wolves',
	elf: 'elves',
	dwarf: 'dwarves',
	thief: 'thieves',
	knife: 'knives'
};

/**
 * The plural of a word or name. Names (capitalised) only take "es" after a
 * hissing sound ("the Marshes", but "the Dandys"); other words follow the
 * usual rules ("harpies", "dire wolves").
 */
export function plural(word: string): string {
	if (/(s|sh|ch|x|z)$/i.test(word)) return `${word}es`;
	if (/^\p{Lu}/u.test(word)) return `${word}s`;
	const last = word.split(' ').pop() ?? word;
	if (IRREGULAR[last]) return word.slice(0, -last.length) + IRREGULAR[last];
	if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
	return `${word}s`;
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
	return (
		template
			// "{surname}s" (but not "{surname}'s")
			.replace(/\{(\w+)\}s(?!\p{L})/gu, (match, key: string) =>
				key in vars ? plural(vars[key]) : match
			)
			// "a {monster}" / "An {monster}"
			.replace(/(?<!\p{L})(a|an|A|An) \{(\w+)\}/gu, (match, a: string, key: string) =>
				key in vars ? `${article(vars[key], a[0] === 'A')} ${vars[key]}` : match
			)
			.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match)
	);
}
