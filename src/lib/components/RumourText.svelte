<script lang="ts">
	import { resolve } from '$app/paths';
	import { getTier } from '#lib/data/tiers.ts';
	import { placeQuery, splitPlaces } from '#lib/places.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { RegionId, RumourPlace } from '#lib/types.ts';

	/**
	 * Rumour text with the towns it names as links: to the saved town if the
	 * party has one by that name, otherwise to build it on the Generate page.
	 */
	let {
		text,
		places = [],
		region = 'heartland'
	}: { text: string; places?: RumourPlace[]; region?: RegionId } = $props();

	const parts = $derived(splitPlaces(text, places));

	function link(place: RumourPlace) {
		const saved = towns.list.find((t) => t.name === place.name);
		if (saved) {
			return {
				href: `${resolve('/towns')}?id=${encodeURIComponent(saved.id)}`,
				title: `Open ${place.name}`
			};
		}
		return {
			href: `${resolve('/')}?${placeQuery(place, region)}`,
			title: `Build ${place.name} (${getTier(place.tier).label.toLowerCase()})`
		};
	}
</script>

<!-- prettier-ignore -->
{#each parts as part, i (i)}{#if part.place}{@const l = link(part.place)}<a class="place" href={l.href} title={l.title}>{part.text}</a>{:else}{part.text}{/if}{/each}

<style>
	.place {
		text-decoration-style: dotted;
	}
</style>
