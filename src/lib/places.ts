import { CONTENT_VERSION } from '#lib/content/versioned.ts';
import type { RegionId, RumourPlace } from '#lib/types.ts';

/** Splits rumour text so each named place can be shown as a link. */
export function splitPlaces(
	text: string,
	places: RumourPlace[] = []
): { text: string; place?: RumourPlace }[] {
	const parts: { text: string; place?: RumourPlace }[] = [{ text }];
	for (const place of places) {
		if (!place.name) continue;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.place) continue;
			const at = part.text.indexOf(place.name);
			if (at < 0) continue;
			const pieces = [
				{ text: part.text.slice(0, at) },
				{ text: place.name, place },
				{ text: part.text.slice(at + place.name.length) }
			].filter((p) => p.text);
			parts.splice(i, 1, ...pieces);
			i += pieces.length - 1;
		}
	}
	return parts;
}

/**
 * The Generate page query that builds a rumour's place: same name, the size
 * it was named as, the region of the town where the rumour was heard, and a
 * seed from the name so the same rumour always leads to the same town.
 */
export function placeQuery(place: RumourPlace, region: RegionId = 'heartland'): string {
	const seed = place.name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	return new URLSearchParams({
		seed: seed || 'somewhere',
		v: String(CONTENT_VERSION),
		size: place.tier,
		region,
		name: place.name
	}).toString();
}
