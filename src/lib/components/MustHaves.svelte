<script lang="ts">
	import { allCatalogItems, missingMustHaves } from '#lib/generator.ts';
	import { formatPrice } from '#lib/money.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { Campaign, MustHave } from '#lib/types.ts';

	/** A campaign's must-have list: items every one of its towns keeps somewhere. */
	let { campaign }: { campaign: Campaign } = $props();

	const catalog = new Map(allCatalogItems().map((item) => [item.name.toLowerCase(), item]));
	const list = $derived(campaign.mustHaves ?? []);

	let name = $state('');
	let qty = $state(1);
	let price = $state<number | undefined>(undefined);
	/** The catalog item typed in, if it is one. */
	const known = $derived(catalog.get(name.trim().toLowerCase()));

	/** Saved towns that lack a must-have and have a shop to keep it in. */
	const lacking = $derived(
		towns.inCampaign(campaign.id).filter((t) => t.shops.length && missingMustHaves(t, list).length)
	);
	let stockedCount = $state<number | undefined>(undefined);

	function setList(next: MustHave[]) {
		campaigns.update(campaign.id, { mustHaves: next });
		stockedCount = undefined;
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		const itemName = known?.name ?? name.trim();
		if (!itemName || (!known && price === undefined)) return;
		const entry: MustHave = { name: itemName, qty: Math.max(1, Math.round(qty) || 1) };
		if (!known) entry.price = price;
		const others = list.filter((m) => m.name.toLowerCase() !== itemName.toLowerCase());
		setList([...others, entry]);
		name = '';
		qty = 1;
		price = undefined;
	}

	function setQty(mustHave: MustHave, value: number) {
		const next = Math.max(1, Math.round(value) || 1);
		setList(list.map((m) => (m === mustHave ? { ...m, qty: next } : m)));
	}

	function stockSaved() {
		stockedCount = towns.stockMustHaves(campaign.id);
	}
</script>

<section class="must-haves">
	<h3>Must-haves</h3>
	<p class="muted intro">
		Items every town in this campaign keeps somewhere, even one too small to sell them. A shop that
		would sell it gets it, or else it's kept in the back of the general store, for a quarter more in
		towns too small to stock it. If a town already sells it, nothing changes.
	</p>

	{#if list.length}
		<ul class="list">
			{#each list as mustHave (mustHave.name)}
				{@const base = catalog.get(mustHave.name.toLowerCase())?.price ?? mustHave.price}
				<li>
					<span class="name">{mustHave.name}</span>
					<label class="qty">
						<span class="visually-hidden">How many of {mustHave.name}</span>
						×
						<input
							type="number"
							min="1"
							max="99"
							value={mustHave.qty}
							onchange={(e) => setQty(mustHave, e.currentTarget.valueAsNumber)}
						/>
					</label>
					{#if base !== undefined}
						<span class="muted base">{formatPrice(base)} each before town prices</span>
					{/if}
					<button
						class="link danger"
						type="button"
						onclick={() => setList(list.filter((m) => m !== mustHave))}
						aria-label="Remove {mustHave.name}"
					>
						Remove
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<form class="add" onsubmit={add}>
		<label class="item">
			<span>Item</span>
			<input
				bind:value={name}
				list="catalog-items-{campaign.id}"
				placeholder="e.g. Potion of healing"
				autocomplete="off"
			/>
		</label>
		<label class="count">
			<span>How many</span>
			<input type="number" min="1" max="99" bind:value={qty} />
		</label>
		{#if name.trim() && !known}
			<label class="count">
				<span>Base price (gp)</span>
				<input type="number" min="0" step="any" bind:value={price} required />
			</label>
		{/if}
		<button class="btn small" type="submit" disabled={!name.trim()}>Add</button>
		<datalist id="catalog-items-{campaign.id}">
			{#each catalog.values() as item (item.name)}
				<option value={item.name}></option>
			{/each}
		</datalist>
	</form>
	{#if name.trim() && !known}
		<p class="muted hint">Not in the item lists, so it's your own item: give it a price.</p>
	{/if}

	{#if lacking.length}
		<p class="stock-saved">
			<button class="btn small" type="button" onclick={stockSaved}>
				Add to {lacking.length} saved {lacking.length === 1 ? 'town' : 'towns'}
			</button>
			<span class="muted">
				{lacking.map((t) => t.name).join(', ')}
				{lacking.length === 1 ? 'is' : 'are'} missing some. New towns and restocks get them on their own.
			</span>
		</p>
	{:else if stockedCount}
		<p class="muted stock-saved">
			✓ Added to {stockedCount} saved {stockedCount === 1 ? 'town' : 'towns'}.
		</p>
	{/if}
</section>

<style>
	.must-haves {
		border-top: 1px solid var(--line);
		padding-top: 0.6rem;
	}
	h3 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
	}
	.intro {
		margin: 0 0 0.5rem;
		font-size: 0.88rem;
		max-width: 70ch;
	}
	.list {
		list-style: none;
		margin: 0 0 0.6rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.list li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.6rem;
	}
	.name {
		font-weight: 600;
	}
	.qty {
		display: inline-flex;
		align-items: baseline;
		gap: 0.2rem;
	}
	.qty input {
		width: 4rem;
		padding: 0.1rem 0.3rem;
	}
	.base {
		font-size: 0.85rem;
	}
	.link {
		background: none;
		border: 0;
		padding: 0.25rem;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.link.danger {
		color: var(--danger);
	}
	.add {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem 0.75rem;
	}
	.add label > span {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}
	.item {
		flex: 1 1 220px;
		min-width: 0;
	}
	.count input {
		width: 7rem;
	}
	.hint {
		margin: 0.3rem 0 0;
		font-size: 0.85rem;
	}
	.stock-saved {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 0.75rem;
		margin: 0.6rem 0 0;
		font-size: 0.88rem;
	}
</style>
