/**
 * Versioned content tables: how Kinkeep grows its tables without breaking
 * old seeds.
 *
 * Every random table is split into blocks keyed by the content version that
 * added them:
 *
 *     const MONSTERS = table({
 *       1: ['wyvern', 'owlbear', 'ghoul'],
 *       2: ['bulette', 'cockatrice']        // added in content version 2
 *     });
 *
 * `at(MONSTERS, 1)` is exactly the version-1 list, forever, so a link made
 * with `?v=1` rebuilds the same town no matter how much is added later.
 * `at(MONSTERS, 2)` is both blocks.
 *
 * Rules for editing content (see CONTENT.md):
 * - Once a version is live, never add to, reorder or delete from its block.
 * - New entries go in a block for the next version, and CONTENT_VERSION is
 *   bumped to match.
 * - To remove an entry, wrap it in `retired(version, ...)` instead of
 *   deleting it. It disappears from that version on.
 * - Fixing a typo in place is fine; it only changes that wording.
 */

/** The newest content version. New towns and links use this. */
export const CONTENT_VERSION = 1;

const RETIRED = Symbol('retired');

export interface Retired<T> {
	readonly [RETIRED]: number;
	readonly value: T;
}

export type Entry<T> = T | Retired<T>;

/** Blocks of entries keyed by the content version that added them. */
export type Versioned<T> = Readonly<Record<number, readonly Entry<T>[]>>;

let highestDeclared = 0;

/** The highest version block declared by any table (checked by the tests). */
export function highestDeclaredVersion(): number {
	return highestDeclared;
}

/** Declares a versioned table. Use version keys 1, 2, 3... */
export function table<T>(blocks: Versioned<T>): Versioned<T> {
	for (const key of Object.keys(blocks)) {
		const version = Number(key);
		if (!Number.isInteger(version) || version < 1) {
			throw new Error(`Content block key "${key}" must be a version number (1, 2, 3...)`);
		}
		highestDeclared = Math.max(highestDeclared, version);
	}
	return blocks;
}

/** Marks an entry as removed from `version` onward. Older versions still see it. */
export function retired<T>(version: number, value: T): Retired<T> {
	highestDeclared = Math.max(highestDeclared, version);
	return { [RETIRED]: version, value };
}

function isRetired<T>(entry: Entry<T>): entry is Retired<T> {
	return typeof entry === 'object' && entry !== null && RETIRED in entry;
}

const cache = new WeakMap<object, Map<number, readonly unknown[]>>();

/** The table's entries as they were at content version `version`. */
export function at<T>(blocks: Versioned<T>, version: number = CONTENT_VERSION): readonly T[] {
	let byVersion = cache.get(blocks);
	if (!byVersion) cache.set(blocks, (byVersion = new Map()));
	const hit = byVersion.get(version);
	if (hit) return hit as readonly T[];

	const out: T[] = [];
	// Integer keys iterate in ascending order, so older blocks come first.
	for (const [key, entries] of Object.entries(blocks)) {
		if (Number(key) > version) continue;
		for (const entry of entries as readonly Entry<T>[]) {
			if (!isRetired(entry)) out.push(entry);
			else if (entry[RETIRED] > version) out.push(entry.value);
		}
	}
	const frozen = Object.freeze(out);
	byVersion.set(version, frozen);
	return frozen;
}

/** Clamps a version from a URL or old save to one this build knows. */
export function normalizeVersion(value: unknown): number {
	const n = Math.floor(Number(value));
	if (!Number.isFinite(n) || n < 1) return 1;
	return Math.min(n, CONTENT_VERSION);
}
