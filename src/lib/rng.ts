import { hashString } from '#lib/hash.ts';

export { hashString };

/**
 * Seeded randomness built so that growing the content tables doesn't
 * reshuffle everything else.
 *
 * - `fork(label)` gives an independent stream for one decision ("shop:inn:0",
 *   "keeper", "rumour"...). Extra rolls in one stream never shift another.
 * - `pick`, `sample` and `shuffle` use exactly ONE roll whatever the list's
 *   length. Each entry gets a score from hash(roll, its position) and the
 *   best score wins. Lines added to the end of a list keep every older
 *   line's score, so a pick only changes when a new line beats it, and
 *   rewording a line never changes which line is picked.
 */
export interface Rng {
	/** The seed path of this stream, e.g. "mossy-otter-412/shop:inn:0". */
	readonly seed: string;
	/** Float in [0, 1). */
	next(): number;
	/** Integer in [min, max], inclusive. */
	int(min: number, max: number): number;
	/** True with the given probability. */
	chance(p: number): boolean;
	/** One entry. Entries `avoid` rejects are skipped unless nothing else is left. */
	pick<T>(items: readonly T[], avoid?: (item: T) => boolean): T;
	/** `n` distinct entries (or fewer if the list is shorter), avoided ones last. */
	sample<T>(items: readonly T[], n: number, avoid?: (item: T) => boolean): T[];
	shuffle<T>(items: readonly T[], avoid?: (item: T) => boolean): T[];
	/** An independent child stream. Same parent seed + label, same stream. */
	fork(label: string): Rng;
}

export function createRng(seed: string | number): Rng {
	const seedText = String(seed);
	let a = typeof seed === 'number' ? seed >>> 0 : hashString(seed);

	const next = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	/** The list ordered best-score first, with avoided entries moved to the end. */
	const ordered = <T>(items: readonly T[], avoid?: (item: T) => boolean): T[] => {
		const salt = Math.floor(next() * 4294967296);
		const ranked = items
			.map((item, index) => ({ item, score: hashString(`${salt}|${index}`) }))
			.sort((x, y) => y.score - x.score)
			.map((x) => x.item);
		if (!avoid) return ranked;
		return [...ranked.filter((x) => !avoid(x)), ...ranked.filter((x) => avoid(x))];
	};

	return {
		seed: seedText,
		next,
		int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
		chance: (p) => next() < p,
		pick: (items, avoid) => ordered(items, avoid)[0],
		sample: (items, n, avoid) => ordered(items, avoid).slice(0, Math.max(0, n)),
		shuffle: ordered,
		fork: (label) => createRng(`${seedText}/${label}`)
	};
}

/** A short, readable random seed like "amber-fox-412". */
export function randomSeed(): string {
	const a = [
		'amber',
		'ashen',
		'brisk',
		'copper',
		'dusky',
		'elder',
		'frosty',
		'gilded',
		'hollow',
		'iron',
		'jade',
		'misty',
		'mossy',
		'quiet',
		'rusty',
		'silver',
		'stormy',
		'sunny',
		'velvet',
		'wild'
	];
	const b = [
		'badger',
		'bell',
		'crow',
		'fox',
		'gate',
		'hare',
		'heron',
		'kettle',
		'lantern',
		'mill',
		'oak',
		'otter',
		'pike',
		'raven',
		'stag',
		'thistle',
		'toad',
		'wagon',
		'well',
		'wren'
	];
	const r = () => Math.floor(Math.random() * 20);
	return `${a[r()]}-${b[r()]}-${Math.floor(Math.random() * 900) + 100}`;
}
