<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SettlementView from '#lib/components/SettlementView.svelte';
	import TownMinimums from '#lib/components/TownMinimums.svelte';
	import { CONTENT_VERSION, normalizeVersion } from '#lib/content/versioned.ts';
	import { REGIONS } from '#lib/data/regions.ts';
	import { TIERS } from '#lib/data/tiers.ts';
	import { generateSettlement } from '#lib/generator.ts';
	import { randomSeed } from '#lib/rng.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { load, save } from '#lib/stores/storage.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import { view } from '#lib/stores/view.svelte.ts';
	import type { RegionId, Settlement, TierId } from '#lib/types.ts';

	const params = page.url.searchParams;
	let size = $state<TierId | ''>((params.get('size') as TierId) ?? '');
	// Most campaigns stay in one region for a while, so remember the last choice.
	let region = $state<RegionId | 'random'>(
		(params.get('region') as RegionId | 'random') ??
			load<RegionId | 'random'>('wares-whispers:region', 'heartland')
	);
	let name = $state(params.get('name') ?? '');
	let seedInput = $state(params.get('seed') ?? '');
	let seedError = $state('');
	let settlement = $state<Settlement | null>(null);
	let copied = $state(false);

	const saved = $derived(settlement ? towns.has(settlement.id) : false);

	/**
	 * Builds (or reopens) a town. `version` is the content version: links carry
	 * the one they were made with, so they keep rebuilding the same town after
	 * new names, quirks and rumours are added.
	 */
	function build(seed: string, version: number) {
		const fresh = generateSettlement({
			...towns.inputFor(version),
			seed,
			tier: size || undefined,
			region: region === 'random' ? undefined : region,
			name,
			contentVersion: version,
			campaignId: campaigns.active.id
		});
		// If this town is saved, show the saved copy (keeps rerolls and notes).
		settlement = towns.get(fresh.id) ?? fresh;
		const query = new URLSearchParams({ seed, v: String(version) });
		if (size) query.set('size', size);
		query.set('region', region);
		save('wares-whispers:region', region);
		if (name.trim()) query.set('name', name.trim());
		// Update the address bar in place (works at / and under a base path like /wares-whispers/).
		const url = new URL(location.href);
		url.search = query.toString();
		goto(url, { replace: true, shallow: true });
	}

	function generateNew() {
		build(randomSeed(), CONTENT_VERSION);
	}

	/** Builds from the seed box, which takes a bare seed or a whole shared link. */
	function useSeed() {
		seedError = '';
		const text = seedInput.trim();
		if (!text) return;
		if (!text.includes('seed=')) {
			// Keep the shown town's content version when rebuilding its own seed.
			const sameTown = settlement && settlement.seed === text;
			build(text, sameTown ? (settlement?.contentVersion ?? 1) : CONTENT_VERSION);
			return;
		}
		let query: URLSearchParams;
		try {
			query = new URL(text, location.href).searchParams;
		} catch {
			seedError = "That doesn't look like a Wares & Whispers link.";
			return;
		}
		const linkSeed = query.get('seed');
		if (!linkSeed) {
			seedError = "That link doesn't include a seed.";
			return;
		}
		const linkSize = query.get('size');
		size = TIERS.some((t) => t.id === linkSize) ? (linkSize as TierId) : '';
		const linkRegion = query.get('region');
		if (linkRegion === 'random' || REGIONS.some((r) => r.id === linkRegion)) {
			region = linkRegion as RegionId | 'random';
		}
		name = query.get('name') ?? '';
		seedInput = linkSeed;
		build(linkSeed, query.get('v') ? normalizeVersion(query.get('v')) : CONTENT_VERSION);
	}

	function update(next: Settlement) {
		settlement = next;
		if (towns.has(next.id)) towns.put(next);
	}

	/** Recording a visit or a told rumour saves the town, so the record isn't lost. */
	function track(next: Settlement) {
		settlement = next;
		towns.put(next);
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(location.href);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard blocked; the URL bar still has the link.
		}
	}

	// Rebuild a shared link (?seed=...) on first load.
	const linkSeed = params.get('seed');
	if (linkSeed)
		build(linkSeed, params.get('v') ? normalizeVersion(params.get('v')) : CONTENT_VERSION);

	/**
	 * Links to this page from this page (a town named in a rumour, the back
	 * button) don't reload it, so build whatever town the new address names.
	 */
	afterNavigate(({ type, to }) => {
		if (type === 'enter' || !to) return;
		const query = to.url.searchParams;
		const seed = query.get('seed');
		if (!seed) return;
		const nextName = query.get('name') ?? '';
		// Our own address-bar update after building.
		if (settlement?.seed === seed && nextName.trim() === name.trim()) return;
		const linkSize = query.get('size');
		size = TIERS.some((t) => t.id === linkSize) ? (linkSize as TierId) : '';
		const linkRegion = query.get('region');
		if (linkRegion === 'random' || REGIONS.some((r) => r.id === linkRegion)) {
			region = linkRegion as RegionId | 'random';
		}
		name = nextName;
		seedInput = seed;
		build(seed, query.get('v') ? normalizeVersion(query.get('v')) : CONTENT_VERSION);
		window.scrollTo(0, 0);
	});
</script>

<div class="controls no-print">
	<form
		class="card panel"
		aria-labelledby="new-town-title"
		onsubmit={(e) => {
			e.preventDefault();
			generateNew();
		}}
	>
		<h2 id="new-town-title">New town</h2>
		<div class="fields">
			<div class="field">
				<label for="size">Size</label>
				<select id="size" bind:value={size}>
					<option value="">Random (realistic odds)</option>
					{#each TIERS as tier (tier.id)}
						<option value={tier.id}>
							{tier.label} ({tier.min.toLocaleString('en-US')}–{tier.max.toLocaleString('en-US')})
						</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<label for="region">Region</label>
				<select id="region" bind:value={region}>
					{#each REGIONS as r (r.id)}
						<option value={r.id}>{r.label}</option>
					{/each}
					<option value="random">Random</option>
				</select>
			</div>
			<div class="field wide">
				<label for="name">Name <span class="muted">(optional)</span></label>
				<input
					id="name"
					bind:value={name}
					placeholder="Leave blank to generate"
					autocomplete="off"
				/>
			</div>
		</div>
		<button class="btn primary" type="submit">Generate new town</button>
	</form>

	<form
		class="card panel"
		aria-labelledby="seed-title"
		onsubmit={(e) => {
			e.preventDefault();
			useSeed();
		}}
	>
		<h2 id="seed-title">From a seed or link</h2>
		<div class="field">
			<label for="seed">Seed or shared link</label>
			<input
				id="seed"
				bind:value={seedInput}
				placeholder="e.g. mossy-otter-412"
				autocomplete="off"
				aria-describedby="seed-hint"
			/>
			<p id="seed-hint" class="hint muted">
				Same seed, same town. A bare seed uses the size and region from New town; a link brings its
				own.
			</p>
		</div>
		{#if seedError}<p class="error" role="alert">{seedError}</p>{/if}
		<button class="btn" type="submit" disabled={!seedInput.trim()}>Build this town</button>
	</form>
</div>
<p class="book-link no-print">
	Running a published adventure? <a href={resolve('/towns/new')}>Set up a town from the book</a>
	with its own name and shops, run by your families.
</p>
<TownMinimums />

{#if settlement}
	{#if (settlement.contentVersion ?? 1) < CONTENT_VERSION}
		<p class="card notice no-print">
			This link was made with content version {settlement.contentVersion ?? 1}, so it uses only the
			names, quirks and rumors that existed then.
			<button
				class="link"
				type="button"
				onclick={() => settlement && build(settlement.seed, CONTENT_VERSION)}
			>
				Rebuild with the newest content
			</button>
		</p>
	{/if}
	<SettlementView {settlement} onChange={update} onTrack={track}>
		{#snippet actions()}
			<div class="toolbar">
				<div class="buttons">
					<button
						class="btn"
						type="button"
						onclick={() =>
							settlement && (saved ? towns.remove(settlement.id) : towns.put(settlement))}
						aria-pressed={saved}
					>
						{saved ? '★ Saved' : '☆ Save town'}
					</button>
					<button class="btn" type="button" onclick={copyLink}>
						{copied ? 'Copied!' : 'Copy link'}
					</button>
					<button class="btn" type="button" onclick={() => window.print()}>Print</button>
					<button
						class="btn"
						type="button"
						onclick={() => view.toggle(true)}
						title="Hide rumors, quirks and other DM details to show or print for the players"
					>
						Player view
					</button>
				</div>
				<span class="muted seed">
					Seed: <code>{settlement?.seed}</code> · content v{settlement?.contentVersion ?? 1}
				</span>
			</div>
		{/snippet}
	</SettlementView>
{:else}
	<section class="empty">
		<h1>Who keeps the shops in the next town?</h1>
		<p class="muted">
			Pick a size and generate a settlement sized like a real medieval one. Every shop is run by a
			member of the same family everywhere in your world, so your players will recognize the dwarf
			at the forge, the halfling behind the counter and the gnome surrounded by smoke.
		</p>
		<button class="btn primary" type="button" onclick={generateNew}> Generate a settlement </button>
	</section>
{/if}

<style>
	.book-link {
		margin: -0.5rem 0 1.25rem;
		font-size: 0.9rem;
	}
	.controls {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	@media (max-width: 760px) {
		.controls {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
	}
	.panel h2 {
		margin: 0;
	}
	.panel .btn {
		align-self: flex-start;
		margin-top: auto;
	}
	/* Size and region side by side, name on its own row underneath. */
	.fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem 1rem;
	}
	.field.wide {
		grid-column: 1 / -1;
	}
	@media (max-width: 420px) {
		.fields {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.field label {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}
	.hint {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
	}
	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.9rem;
	}
	/* Sits in the column to the right of the town's name (stacks below on phones). */
	.toolbar {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.6rem;
		padding-top: 0.25rem;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.5rem;
	}
	.seed {
		font-size: 0.85rem;
		text-align: right;
	}
	@media (max-width: 700px) {
		.toolbar {
			align-items: flex-start;
		}
		.buttons {
			justify-content: flex-start;
		}
		.seed {
			text-align: left;
		}
	}
	.notice {
		padding: 0.6rem 0.9rem;
		margin: 0 0 1rem;
		font-size: 0.92rem;
	}
	.link {
		background: none;
		border: 0;
		padding: 0;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
	}
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		max-width: 620px;
		margin: 0 auto;
	}
	.empty h1 {
		font-size: clamp(1.6rem, 5vw, 2.2rem);
	}
	.empty p {
		margin-bottom: 1.5rem;
	}
</style>
