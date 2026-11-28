import { load, save } from './storage.ts';

// app.html reads this key before the page paints, so keep the two in step.
export const THEME_KEY = 'kinkeep:theme';

export type Theme = 'light' | 'dark';

/**
 * Light or dark palette. With nothing saved the page follows the system
 * setting; once the header toggle is used, that choice sticks.
 */
class ThemeStore {
	chosen = $state<Theme | null>(load<Theme | null>(THEME_KEY, null));
	#systemDark = $state(false);

	constructor() {
		if (typeof matchMedia === 'undefined') return;
		const mq = matchMedia('(prefers-color-scheme: dark)');
		this.#systemDark = mq.matches;
		mq.addEventListener('change', (e) => (this.#systemDark = e.matches));
	}

	/** The palette actually on screen. */
	get current(): Theme {
		return this.chosen ?? (this.#systemDark ? 'dark' : 'light');
	}

	toggle() {
		this.chosen = this.current === 'dark' ? 'light' : 'dark';
		save(THEME_KEY, this.chosen);
	}
}

export const theme = new ThemeStore();
