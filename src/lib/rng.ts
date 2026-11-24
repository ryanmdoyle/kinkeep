/**
 * Small seeded random number generator so the same seed always rebuilds the
 * same settlement. mulberry32 is fast, tiny and plenty random for dice.
 */
export interface Rng {
	/** Float in [0, 1). */
	next(): number;
	/** Integer in [min, max], inclusive. */
	int(min: number, max: number): number;
	/** True with the given probability. */
	chance(p: number): boolean;
	pick<T>(items: readonly T[]): T;
	/** Picks `n` distinct items (or fewer if the list is shorter). */
	sample<T>(items: readonly T[], n: number): T[];
	shuffle<T>(items: readonly T[]): T[];
}

/** Hashes any string to a 32-bit unsigned integer (cyrb53, truncated). */
export function hashString(str: string): number {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (h1 ^ h2) >>> 0;
}

export function createRng(seed: string | number): Rng {
	let a = typeof seed === 'number' ? seed >>> 0 : hashString(seed);

	const next = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;

	const shuffle = <T>(items: readonly T[]): T[] => {
		const out = items.slice();
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(next() * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	};

	return {
		next,
		int,
		chance: (p) => next() < p,
		pick: (items) => items[Math.floor(next() * items.length)],
		sample: (items, n) => shuffle(items).slice(0, Math.max(0, n)),
		shuffle
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
