<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SettlementView from '#lib/components/SettlementView.svelte';
	import { TIERS } from '#lib/data/tiers.ts';
	import { generateSettlement, rerollShop } from '#lib/generator.ts';
	import { randomSeed } from '#lib/rng.ts';
	import { families } from '#lib/stores/families.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { Settlement, TierId } from '#lib/types.ts';

	const params = page.url.searchParams;
	let size = $state<TierId | ''>((params.get('size') as TierId) ?? '');
	let name = $state(params.get('name') ?? '');
	let seed = $state(params.get('seed') ?? '');
	let settlement = $state<Settlement | null>(null);
	let copied = $state(false);

	const saved = $derived(settlement ? towns.has(settlement.id) : false);

	function generate(newSeed: boolean) {
		if (newSeed || !seed.trim()) seed = randomSeed();
		const fresh = generateSettlement({
			seed,
			tier: size || undefined,
			name,
			families: families.list
		});
		// If this town is saved, show the saved copy (keeps rerolls and notes).
		settlement = towns.get(fresh.id) ?? fresh;
		const query = new URLSearchParams({ seed });
		if (size) query.set('size', size);
		if (name.trim()) query.set('name', name.trim());
		goto(`${resolve('/')}?${query}`, { replace: true, shallow: true });
	}

	function reroll(shopId: string) {
		if (!settlement) return;
		settlement = rerollShop(settlement, shopId, families.list);
		if (towns.has(settlement.id)) towns.put(settlement);
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
		<span class="muted seed">Seed: <code>{settlement.seed}</code></span>
	</div>
	<SettlementView {settlement} onReroll={reroll} />
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
