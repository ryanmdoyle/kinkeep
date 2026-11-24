/** localStorage helpers that never throw (private mode, blocked storage, SSR). */
export function load<T>(key: string, fallback: T): T {
	try {
		if (typeof localStorage === 'undefined') return fallback;
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

export function save(key: string, value: unknown): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or blocked; the app still works for this session.
	}
}
