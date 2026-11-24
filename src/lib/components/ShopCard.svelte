<script lang="ts">
	import { SHOP_RULES } from '#lib/data/tiers.ts';
	import { formatPrice } from '#lib/money.ts';
	import type { Family, Shop, StockItem } from '#lib/types.ts';

	interface Kin {
		firstName: string;
		town: string;
		townId: string;
	}

	let {
		shop,
		family,
		kin = [],
		onReroll,
		onRumour
	}: {
		shop: Shop;
		family: Family;
		kin?: Kin[];
		onReroll?: () => void;
		onRumour?: () => void;
	} = $props();

	const typeLabel = $derived(
		shop.name.includes('Peddler')
			? 'Traveling peddler'
			: (SHOP_RULES.find((r) => r.type === shop.type)?.label ?? shop.type)
	);

	const grouped = $derived.by(() => {
		const groups: Record<string, StockItem[]> = {};
		for (const item of shop.stock) (groups[item.category] ??= []).push(item);
		return Object.entries(groups);
	});
</script>

<article class="card shop" style:--family={family.color}>
	<header>
		<div class="emblem" aria-hidden="true">{family.emblem}</div>
		<div class="titles">
			<p class="type">{typeLabel}</p>
			<h3>{shop.name}</h3>
		</div>
		{#if onReroll}
			<button
				class="btn small no-print"
				type="button"
				onclick={onReroll}
				title="New shopkeeper and stock"
			>
				Reroll
			</button>
		{/if}
	</header>

	<section class="keeper">
		<p class="who">
			<strong>{shop.keeper.firstName} {family.surname}</strong>
			<span class="muted">
				· {shop.keeper.age}
				{family.race.toLowerCase()} of {family.groupName}
			</span>
		</p>
		{#if shop.keeper.greeting}
			<blockquote>“{shop.keeper.greeting}”</blockquote>
		{/if}
		<ul class="quirks">
			{#each shop.keeper.quirks as quirk (quirk)}
				<li>{quirk}</li>
			{/each}
			<li class="bargain"><span class="muted">Bargaining:</span> {shop.keeper.bargaining.label}</li>
		</ul>
		{#if shop.keeper.rumour}
			<div class="rumour">
				<p>
					<span class="label">Rumour</span>
					{shop.keeper.rumour.text}
				</p>
				<p class="truth-row">
					<span class="truth {shop.keeper.rumour.truth.replace(' ', '-')}">
						DM: {shop.keeper.rumour.truth}
					</span>
					{#if onRumour}
						<button class="link no-print" type="button" onclick={onRumour}>Another rumour</button>
					{/if}
				</p>
			</div>
		{/if}
		{#if kin.length}
			<p class="kin">
				<span class="muted">Kin the party has met:</span>
				{kin.map((k) => `${k.firstName} (${k.town})`).join(', ')}
			</p>
		{/if}
		<details class="family-traits">
			<summary>Family traits: {family.groupName}</summary>
			<dl>
				<dt>Look</dt>
				<dd>{family.signature}</dd>
				<dt>Personality</dt>
				<dd>{family.personality}</dd>
				<dt>Voice tip</dt>
				<dd>{family.voice}</dd>
			</dl>
		</details>
	</section>

	<details class="stock" open>
		<summary>Stock ({shop.stock.length} items)</summary>
		{#if shop.stock.length === 0}
			<p class="muted">The shelves are bare today.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th scope="col">Item</th>
						<th scope="col" class="num">Qty</th>
						<th scope="col" class="num">Price</th>
					</tr>
				</thead>
				{#each grouped as [category, items] (category)}
					<tbody>
						<tr class="cat"><th colspan="3" scope="colgroup">{category}</th></tr>
						{#each items as item (item.name)}
							<tr>
								<td>
									{item.name}
									{#if item.rarity}<span class="rarity {item.rarity.replace(' ', '-')}">
											{item.rarity}
										</span>{/if}
									{#if item.note}<span class="note">{item.note}</span>{/if}
								</td>
								<td class="num">{item.qty < 0 ? '—' : item.qty}</td>
								<td class="num price">{formatPrice(item.price)}</td>
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		{/if}
		{#if shop.specialOrders.length}
			<div class="orders">
				<h4>Can be ordered in</h4>
				<ul>
					{#each shop.specialOrders as order (order.name)}
						<li>
							{order.name}: <span class="price">{formatPrice(order.price)}</span>
							<span class="muted">({order.wait})</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</details>
</article>

<style>
	.shop {
		border-top: 5px solid var(--family);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.emblem {
		font-size: 1.6rem;
		width: 2.75rem;
		height: 2.75rem;
		flex: none;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: color-mix(in srgb, var(--family) 18%, transparent);
		border: 2px solid var(--family);
	}
	.titles {
		flex: 1;
		min-width: 0;
	}
	.type {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	h3 {
		margin: 0;
		font-size: 1.25rem;
		overflow-wrap: anywhere;
	}
	.who {
		margin: 0 0 0.35rem;
	}
	blockquote {
		margin: 0 0 0.5rem;
		padding: 0.4rem 0.75rem;
		border-left: 3px solid var(--family);
		background: color-mix(in srgb, var(--family) 8%, transparent);
		font-family: var(--serif);
		font-style: italic;
		border-radius: 0 6px 6px 0;
	}
	.quirks {
		margin: 0;
		padding-left: 1.1rem;
	}
	.quirks li {
		margin-bottom: 0.15rem;
	}
	.bargain {
		list-style: none;
		margin-left: -1.1rem;
		margin-top: 0.3rem;
		font-size: 0.9rem;
	}
	.rumour {
		margin-top: 0.6rem;
		padding: 0.5rem 0.65rem;
		border: 1px dashed var(--line);
		border-radius: 8px;
		font-size: 0.92rem;
	}
	.rumour p {
		margin: 0;
	}
	.rumour .label {
		font-weight: 700;
		margin-right: 0.25rem;
	}
	.truth-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.3rem !important;
		font-size: 0.8rem;
	}
	.truth {
		padding: 0 0.45rem;
		border-radius: 999px;
		border: 1px solid currentColor;
	}
	.truth.true {
		color: var(--good);
	}
	.truth.partly-true {
		color: var(--warn);
	}
	.truth.false {
		color: var(--danger);
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
	.kin {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
	}
	details summary {
		cursor: pointer;
		font-weight: 600;
		padding: 0.25rem 0;
	}
	.family-traits {
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}
	.family-traits summary {
		font-weight: 500;
		color: var(--muted);
	}
	dl {
		margin: 0.25rem 0 0;
	}
	dt {
		font-weight: 600;
		margin-top: 0.35rem;
	}
	dd {
		margin: 0;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.3rem 0.25rem;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}
	thead th {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	.cat th {
		background: var(--surface-2);
		font-family: var(--serif);
		font-size: 0.85rem;
		padding-top: 0.25rem;
	}
	.num {
		text-align: right;
		white-space: nowrap;
	}
	.price {
		font-variant-numeric: tabular-nums;
	}
	.note {
		display: block;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.rarity {
		font-size: 0.7rem;
		padding: 0 0.35rem;
		margin-left: 0.25rem;
		border-radius: 999px;
		border: 1px solid currentColor;
		white-space: nowrap;
	}
	.rarity.common {
		color: var(--muted);
	}
	.rarity.uncommon {
		color: var(--good);
	}
	.rarity.rare {
		color: var(--rare);
	}
	.rarity.very-rare {
		color: var(--very-rare);
	}
	.orders h4 {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.95rem;
	}
	.orders ul {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.9rem;
	}
	@media print {
		.stock:not([open]) {
			display: block;
		}
	}
</style>
