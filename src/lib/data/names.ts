import { at, table } from '#lib/content/versioned.ts';
import type { Rng } from '#lib/rng.ts';
import type { Region } from '#lib/types.ts';

const PREFIXES = table({
	1: [
		'Oak',
		'Ash',
		'Elm',
		'Thorn',
		'Bram',
		'Mill',
		'Stone',
		'Wolf',
		'Raven',
		'Crow',
		'Hollow',
		'Fen',
		'Marsh',
		'Black',
		'White',
		'Red',
		'Green',
		'Gold',
		'Silver',
		'Iron',
		'Elder',
		'Willow',
		'Briar',
		'Hart',
		'Hawk',
		'Fox',
		'Sheep',
		'Barley',
		'Rye',
		'Apple',
		'Cold',
		'Long',
		'High',
		'Low',
		'Deep',
		'Ember',
		'Holly',
		'Lark',
		'Moss',
		'Salt',
		'Stag',
		'Swan',
		'Wick',
		'Dun',
		'Ald',
		'Bex',
		'Cran'
	]
});

const SMALL_SUFFIXES = table({
	1: [
		'thorpe',
		'stead',
		'wick',
		'ley',
		'field',
		'hollow',
		'well',
		'brook',
		'combe',
		'den',
		'hurst',
		'ham',
		'by',
		'cote',
		'mere',
		'moor'
	]
});

const TOWN_SUFFIXES = table({
	1: [
		'ford',
		'ton',
		'bridge',
		'cross',
		'dale',
		'vale',
		'ham',
		'wick',
		'stow',
		'march',
		'ridge',
		'worth'
	]
});

const CITY_SUFFIXES = table({
	1: ['bury', 'burgh', 'port', 'haven', 'gate', 'minster', 'chester', 'crown', 'fort']
});

const CITY_FORMS = table({
	1: ['{name}', '{name}', '{name}', 'Old {name}', 'Kings{lower}', '{name}-on-the-River']
});
const SMALL_FORMS = table({
	1: ['{name}', '{name}', '{name}', '{name}', 'Little {name}', '{name} End', 'Upper {name}']
});

export function settlementName(rng: Rng, tierIndex: number, version: number, region?: Region) {
	const suffixes = tierIndex <= 2 ? SMALL_SUFFIXES : tierIndex <= 4 ? TOWN_SUFFIXES : CITY_SUFFIXES;
	const regionPrefixes = region ? at(region.namePrefixes, version) : [];
	const regionSuffixes = region ? at(region.nameSuffixes, version) : [];
	// Regional name parts show up often enough to give an area its own feel.
	// Each part has its own stream, so new name parts never shift the others.
	const p = rng.fork('prefix');
	const s = rng.fork('suffix');
	let prefix =
		p.chance(0.6) && regionPrefixes.length ? p.pick(regionPrefixes) : p.pick(at(PREFIXES, version));
	let suffix =
		s.chance(0.5) && regionSuffixes.length ? s.pick(regionSuffixes) : s.pick(at(suffixes, version));
	// Avoid doubled letters like "Millley" reading badly.
	if (prefix.at(-1) === suffix[0]) suffix = suffix.slice(1);
	if (prefix.endsWith('e') && suffix.startsWith('e')) prefix = prefix.slice(0, -1);
	const name = prefix + suffix;
	const form = rng.fork('form').pick(at(tierIndex <= 2 ? SMALL_FORMS : CITY_FORMS, version));
	return form.replace('{name}', name).replace('{lower}', name.toLowerCase());
}

export const AGES = table({
	1: ['young', 'young', 'middle-aged', 'middle-aged', 'middle-aged', 'older', 'old', 'ancient']
});

export const BARGAINING = table<{ label: string; modifier: number }>({
	1: [
		{ label: 'Fair and firm (no haggling)', modifier: 0 },
		{ label: 'Loves to haggle (DC 12 Persuasion for 10% off)', modifier: 0.05 },
		{ label: 'Drives a hard bargain (+10%)', modifier: 0.1 },
		{ label: 'Soft-hearted (−5% for a sad story)', modifier: -0.05 },
		{ label: 'Gives regulars a discount (−10% on return visits)', modifier: 0 },
		{ label: 'Slightly desperate for sales (−10%)', modifier: -0.1 }
	]
});
