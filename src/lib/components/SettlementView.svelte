<script lang="ts">
	import ShopCard from '#lib/components/ShopCard.svelte';
	import { SHOP_RULES, getTier } from '#lib/data/tiers.ts';
	import { getRegion } from '#lib/data/regions.ts';
	import {
		addBookShop,
		detailAnotherShop,
		familyForShop,
		itemForShop,
		missingMustHaves,
		rerollRumour,
		rerollShop,
		restock,
		stockMustHaves
	} from '#lib/generator.ts';
	import { families } from '#lib/stores/families.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import { addStockItem, removeShop, removeStockItem, renameShop } from '#lib/edit.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import {
		editRumour,
		sell,
		setNote,
		setOrder,
		setRelation,
		setRumourTold,
		setVisited,
		townProgress
	} from '#lib/tracking.ts';
	import type { Settlement, ShopType } from '#lib/types.ts';
	import { tick, type Snippet } from 'svelte';

	/**
	 * Pass `onChange` to allow rerolling shops and rumours, `onTrack` to record
	 * what the party has done (visits, rumours told, standing; defaults to
	 * `onChange`), and `actions` to put buttons in a column to the right of the
	 * town's name and description.
	 */
	let {
		settlement,
		onChange,
		onTrack = onChange,
		actions
	}: {
		settlement: Settlement;
		onChange?: (next: Settlement) => void;
		onTrack?: (next: Settlement) => void;
		actions?: Snippet;
	} = $props();

	const progress = $derived(townProgress(settlement));

	/** Writes up one more shop of a type, then scrolls to it. */
	async function detailAnother(type: ShopType) {
		if (!onChange) return;
		const before = new Set(settlement.shops.map((s) => s.id));
		const next = detailAnotherShop(settlement, type, towns.inputFor(undefined, settlement.id));
		onChange(next);
		const added = next.shops.find((s) => !before.has(s.id));
		await tick();
		if (added) document.getElementById(`shop-${added.id}`)?.scrollIntoView();
	}

	let newShopType = $state<ShopType>('inn');
	let newShopName = $state('');

	/** Adds a shop to a town from a book, then scrolls to it. */
	async function addShop(event: SubmitEvent) {
		event.preventDefault();
		if (!onChange) return;
		const before = new Set(settlement.shops.map((s) => s.id));
		const next = addBookShop(
			settlement,
			newShopType,
			towns.inputFor(undefined, settlement.id),
			newShopName
		);
		onChange(next);
		newShopName = '';
		const added = next.shops.find((s) => !before.has(s.id));
		await tick();
		if (added) document.getElementById(`shop-${added.id}`)?.scrollIntoView();
	}

	/** Time passes: new stock in one shop, or all of them. */
	function restockShops(shopId?: string) {
		if (!onChange) return;
		const sold = settlement.shops.some(
			(s) => (!shopId || s.id === shopId) && s.stock.some((i) => i.sold)
		);
		const what = shopId ? 'this shop' : 'every shop in town';
		if (sold && !confirm(`Restock ${what}? What the party bought is cleared.`)) return;
		onChange(restock(settlement, towns.inputFor(undefined, settlement.id), shopId));
	}

	/** Must-haves this town lacks (a town saved before they were added). */
	const missing = $derived(missingMustHaves(settlement, campaigns.active.mustHaves));

	const tier = $derived(getTier(settlement.tier));
	const region = $derived(getRegion(settlement.region));

	const totals = $derived(
		SHOP_RULES.filter((r) => settlement.shopTotals[r.type]).map((r) => {
			const total = settlement.shopTotals[r.type] ?? 0;
			const shown = settlement.shops.filter((s) => s.type === r.type).length;
			return { type: r.type, label: r.label, total, shown };
		})
	);
</script>

<section class="settlement">
	<div class="top">
		<header class="head">
			<p class="tier">
				{tier.label} · {region.label} · population {settlement.population.toLocaleString('en-US')}
			</p>
			<h1>{settlement.name}</h1>
			{#if settlement.description}
				<p class="blurb description">{settlement.description}</p>
			{:else}
				<p class="muted blurb">{tier.blurb} {region.blurb}</p>
			{/if}
			<p class="known-for"><strong>Known for:</strong> {region.specialities.join(', ')}</p>
			{#if progress.visited || progress.told}
				<p class="progress dm-only">
					The party has visited {progress.visited} of {progress.shops}
					{progress.shops === 1 ? 'shop' : 'shops'} and heard {progress.told} of {progress.rumours}
					{progress.rumours === 1 ? 'rumour' : 'rumours'}.
				</p>
			{/if}
		</header>
		{#if actions}
			<div class="actions no-print">{@render actions()}</div>
		{/if}
	</div>

	<div class="summary">
		<div class="card box">
			<h2>Shops in town</h2>
			{#if totals.length === 0}
				<p class="muted">
					No shops at all. Folk here trade with each other, or wait for market day in the next town.
				</p>
			{:else}
				<ul>
					{#each totals as t (t.label)}
						<li>
							<span>{t.label}</span>
							<span class="count">
								{t.total}
								{#if t.total > t.shown}
									<span class="muted">{`(${t.shown} detailed)`}</span>
									{#if onChange}
										<button
											class="link no-print"
											type="button"
											onclick={() => detailAnother(t.type)}
											title="Write up another {t.label.toLowerCase()} the party can visit"
										>
											+ Detail one
										</button>
									{/if}
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
			{#if settlement.fromBook && onChange}
				<form class="add-shop no-print" onsubmit={addShop}>
					<select bind:value={newShopType} aria-label="Kind of shop to add">
						{#each SHOP_RULES as rule (rule.type)}
							<option value={rule.type}>{rule.label}</option>
						{/each}
					</select>
					<input
						bind:value={newShopName}
						placeholder="Name from the book (optional)"
						aria-label="Shop name"
						autocomplete="off"
					/>
					<button class="btn small" type="submit">Add shop</button>
				</form>
			{/if}
		</div>
		{#if settlement.trades.length}
			<div class="card box">
				<h2>Also around town (approx.)</h2>
				<ul>
					{#each settlement.trades as trade (trade.label)}
						<li>
							<span>{trade.label}</span><span class="count">
								{trade.count.toLocaleString('en-US')}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	{#if onChange && settlement.shops.length}
		<div class="shops-bar no-print">
			<button class="btn small" type="button" onclick={() => restockShops()}>
				Restock every shop
			</button>
			<span class="muted">
				Time passes: new stock everywhere, same keepers. Special orders stay.
			</span>
		</div>
		{#if missing.length}
			<div class="shops-bar no-print">
				<button
					class="btn small"
					type="button"
					onclick={() => onChange(stockMustHaves(settlement, campaigns.active.mustHaves))}
				>
					Add must-haves
				</button>
				<span class="muted">
					Not in town yet: {missing.map((m) => m.name).join(', ')}.
					<a href="/campaigns">Edit the list</a>
				</span>
			</div>
		{/if}
	{/if}
	<div class="shops">
		{#each settlement.shops as shop (shop.id)}
			{@const familyId = familyForShop(shop.type)}
			<ShopCard
				{shop}
				family={families.get(familyId)}
				kin={towns.kinOf(familyId, settlement.id, shop.id)}
				standingPrices={campaigns.active.standingPrices ?? true}
				region={settlement.region}
				onReroll={onChange
					? () =>
							onChange(rerollShop(settlement, shop.id, towns.inputFor(undefined, settlement.id)))
					: undefined}
				onRumour={onChange
					? () =>
							onChange(rerollRumour(settlement, shop.id, towns.inputFor(undefined, settlement.id)))
					: undefined}
				onVisited={onTrack ? (v) => onTrack(setVisited(settlement, shop.id, v)) : undefined}
				onTold={onTrack ? (v) => onTrack(setRumourTold(settlement, shop.id, v)) : undefined}
				onRelation={onTrack ? (r) => onTrack(setRelation(settlement, shop.id, r)) : undefined}
				onNote={onTrack ? (n) => onTrack(setNote(settlement, shop.id, n)) : undefined}
				onEditRumour={onTrack ? (p) => onTrack(editRumour(settlement, shop.id, p)) : undefined}
				onSell={onTrack ? (item, d) => onTrack(sell(settlement, shop.id, item, d)) : undefined}
				onOrder={onTrack ? (name, a) => onTrack(setOrder(settlement, shop.id, name, a)) : undefined}
				onRestock={onChange ? () => restockShops(shop.id) : undefined}
				onRename={onTrack ? (p) => onTrack(renameShop(settlement, shop.id, p)) : undefined}
				onRemove={onChange ? () => onChange(removeShop(settlement, shop.id)) : undefined}
				itemFor={(name, qty) => itemForShop(settlement, shop, name, qty)}
				onAddItem={onTrack ? (item) => onTrack(addStockItem(settlement, shop.id, item)) : undefined}
				onRemoveItem={onTrack
					? (name) => onTrack(removeStockItem(settlement, shop.id, name))
					: undefined}
			/>
		{/each}
	</div>
</section>

<style>
	.top {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: 1rem 2rem;
		margin-bottom: 1rem;
	}
	@media (max-width: 700px) {
		.top {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.tier {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.8rem;
		color: var(--accent);
		font-weight: 600;
	}
	h1 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin: 0.1rem 0 0.2rem;
		overflow-wrap: anywhere;
	}
	.blurb {
		margin: 0;
		max-width: 70ch;
	}
	.description {
		white-space: pre-line;
		font-family: var(--serif);
		font-style: italic;
	}
	.known-for,
	.progress {
		margin: 0.35rem 0 0;
	}
	.progress {
		color: var(--good);
		font-weight: 600;
	}
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
	.box {
		padding: 0.85rem 1rem;
	}
	.box ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.box li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.2rem 0;
		border-bottom: 1px dashed var(--line);
	}
	.box li:last-child {
		border-bottom: 0;
	}
	.count {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		text-align: right;
	}
	.link {
		background: none;
		border: 0;
		padding: 0 0 0 0.35rem;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 500;
	}
	.add-shop {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.6rem;
		border-top: 1px dashed var(--line);
	}
	.add-shop select {
		flex: 1 1 9rem;
		min-width: 0;
	}
	.add-shop input {
		flex: 2 1 10rem;
		min-width: 0;
	}
	.shops-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.75rem;
		margin-bottom: 0.75rem;
		font-size: 0.88rem;
	}
	.shops {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
		gap: 1rem;
		align-items: start;
	}
</style>
