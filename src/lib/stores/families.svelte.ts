import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import type { Family, FamilyRole } from '#lib/types.ts';
import { load, save } from './storage.ts';

const KEY = 'kinkeep:families';

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/** Merges saved families over the defaults so new fields get filled in. */
function initial(): Family[] {
	const saved = load<Family[]>(KEY, []);
	return DEFAULT_FAMILIES.map((def) => ({ ...clone(def), ...saved.find((f) => f.id === def.id) }));
}

class FamilyStore {
	list = $state<Family[]>(initial());

	get(id: FamilyRole): Family {
		return this.list.find((f) => f.id === id) ?? DEFAULT_FAMILIES.find((f) => f.id === id)!;
	}

	update(id: FamilyRole, patch: Partial<Family>) {
		this.list = this.list.map((f) => (f.id === id ? { ...f, ...patch, id } : f));
		save(KEY, this.list);
	}

	reset(id?: FamilyRole) {
		this.list = this.list.map((f) =>
			!id || f.id === id ? clone(DEFAULT_FAMILIES.find((d) => d.id === f.id)!) : f
		);
		save(KEY, this.list);
	}

	replaceAll(list: Family[]) {
		this.list = DEFAULT_FAMILIES.map((def) => ({
			...clone(def),
			...list.find((f) => f.id === def.id)
		}));
		save(KEY, this.list);
	}
}

export const families = new FamilyStore();
