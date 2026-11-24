<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SettlementView from '#lib/components/SettlementView.svelte';
	import { CONTENT_VERSION, normalizeVersion } from '#lib/content/versioned.ts';
	import { REGIONS } from '#lib/data/regions.ts';
	import { TIERS } from '#lib/data/tiers.ts';
	import { generateSettlement } from '#lib/generator.ts';
	import { randomSeed } from '#lib/rng.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { load, save } from '#lib/stores/storage.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { RegionId, Settlement, TierId } from '#lib/types.ts';

	const params = page.url.searchParams;
	let size = $state<TierId | ''>((params.get('size') as TierId) ?? '');
	// Most campaigns stay in one region for a while, so remember the last choice.
	let region = $state<RegionId | 'random'>(
		(params.get('region') as RegionId | 'random') ??
			load<RegionId | 'random'>('kinkeep:region', 'heartland')
	);
	let name = $state(params.get('name') ?? '');
	let seed = $state(params.get('seed') ?? '');
	// Links carry the content version they were made with, so they keep
	// rebuilding the same town after new names, quirks and rumours are added.
	let version = $state(params.get('v') ? normalizeVersion(params.get('v')) : CONTENT_VERSION);
	let settlement = $state<Settlement | null>(null);
	let copied = $state(false);

	const saved = $derived(settlement ? towns.has(settlement.id) : false);

	function generate(newSeed: boolean) {
		if (newSeed || !seed.trim()) {
			seed = randomSeed();
			version = CONTENT_VERSION;
		}
		const campaign = campaigns.active;
		const fresh = generateSettlement({
			seed,
			tier: size || undefined,
			region: region === 'random' ? undefined : region,
			name,
			contentVersion: version,
			campaignId: campaign.id,
			families: campaigns.familiesFor(campaign, version),
			avoid: towns.avoidFor()
		});
		// If this town is saved, show the saved copy (keeps rerolls and notes).
		settlement = towns.get(fresh.id) ?? fresh;
		const query = new URLSearchParams({ seed, v: String(version) });
		if (size) query.set('size', size);
		query.set('region', region);
		save('kinkeep:region', region);
		if (name.trim()) query.set('name', name.trim());
		// Update the address bar in place (works at / and under a base path like /kinkeep/).
		const url = new URL(location.href);
		url.search = query.toString();
		goto(url, { replace: true, shallow: true });
	}

	function update(next: Settlement) {
		settlement = next;
		if (towns.has(next.id)) towns.put(next);
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
	if (params.get('seed')) generate(false);
</script>

<form
	class="card generator no-print"
	onsubmit={(e) => {
		e.preventDefault();
		generate(true);
	}}
>
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
	<div class="field">
		<label for="name">Name <span class="muted">(optional)</span></label>
		<input id="name" bind:value={name} placeholder="Leave blank to generate" autocomplete="off" />
	</div>
	<div class="field">
		<label for="seed">Seed <span class="muted">(same seed, same town)</span></label>
		<input id="seed" bind:value={seed} placeholder="e.g. mossy-otter-412" autocomplete="off" />
	</div>
	<div class="actions">
		<button class="btn primary" type="submit">Generate new</button>
		<button class="btn" type="button" onclick={() => generate(false)} disabled={!seed.trim()}>
			Use this seed
		</button>
	</div>
</form>

{#if settlement}
	<div class="toolbar no-print">
		<button
			class="btn"
			type="button"
			onclick={() => settlement && (saved ? towns.remove(settlement.id) : towns.put(settlement))}
			aria-pressed={saved}
		>
			{saved ? '★ Saved' : '☆ Save town'}
		</button>
		<button class="btn" type="button" onclick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
		<button class="btn" type="button" onclick={() => window.print()}>Print</button>
		<span class="muted seed">
			Seed: <code>{settlement.seed}</code> · content v{settlement.contentVersion ?? 1}
		</span>
	</div>
	{#if version < CONTENT_VERSION && settlement.seed === seed}
		<p class="card notice no-print">
			This link was made with content version {version}, so it uses only the names, quirks and
			rumours that existed then.
			<button
				class="link"
				type="button"
				onclick={() => {
					version = CONTENT_VERSION;
					generate(false);
				}}
			>
				Rebuild with the newest content
			</button>
		</p>
	{/if}
	<SettlementView {settlement} onChange={update} />
{:else}
	<section class="empty">
		<h1>Who keeps the shops in the next town?</h1>
		<p class="muted">
			Pick a size and generate a settlement sized like a real medieval one. Every shop is run by a
			member of the same family everywhere in your world, so your players will recognise the dwarf
			at the forge, the halfling behind the counter and the gnome surrounded by smoke.
		</p>
		<button class="btn primary" type="button" onclick={() => generate(true)}>
			Generate a settlement
		</button>
	</section>
{/if}

<style>
	.generator {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem 1rem;
		padding: 1rem;
		margin-bottom: 1.25rem;
		align-items: end;
	}
	.field label {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.seed {
		font-size: 0.85rem;
		margin-left: auto;
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
