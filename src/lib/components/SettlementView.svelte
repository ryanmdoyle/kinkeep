<script lang="ts">
	import ShopCard from '#lib/components/ShopCard.svelte';
	import { SHOP_RULES, getTier } from '#lib/data/tiers.ts';
	import { getRegion } from '#lib/data/regions.ts';
	import { familyForShop, rerollRumour, rerollShop } from '#lib/generator.ts';
	import { families } from '#lib/stores/families.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { Settlement } from '#lib/types.ts';

	/** Pass `onChange` to allow rerolling shops and rumours. */
	let { settlement, onChange }: { settlement: Settlement; onChange?: (next: Settlement) => void } =
		$props();

	const tier = $derived(getTier(settlement.tier));
	const region = $derived(getRegion(settlement.region));

	const totals = $derived(
		SHOP_RULES.filter((r) => settlement.shopTotals[r.type]).map((r) => {
			const total = settlement.shopTotals[r.type] ?? 0;
			const shown = settlement.shops.filter((s) => s.type === r.type).length;
			return { label: r.label, total, shown };
		})
	);
</script>

<section class="settlement">
	<header class="head">
		<p class="tier">
			{tier.label} · {region.label} · population {settlement.population.toLocaleString('en-US')}
		</p>
		<h1>{settlement.name}</h1>
		<p class="muted blurb">{tier.blurb} {region.blurb}</p>
		<p class="known-for"><strong>Known for:</strong> {region.specialities.join(', ')}</p>
	</header>

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
								{/if}
							</span>
						</li>
					{/each}
				</ul>
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

	<div class="shops">
		{#each settlement.shops as shop (shop.id)}
			{@const familyId = familyForShop(shop.type)}
			<ShopCard
				{shop}
				family={families.get(familyId)}
				kin={towns.kinOf(familyId, settlement.id)}
				onReroll={onChange
					? () => onChange(rerollShop(settlement, shop.id, families.list))
					: undefined}
				onRumour={onChange
					? () => onChange(rerollRumour(settlement, shop.id, families.list))
					: undefined}
			/>
		{/each}
	</div>
</section>

<style>
	.head {
		margin-bottom: 1rem;
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
	.known-for {
		margin: 0.35rem 0 0;
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
	.box h2 {
		font-size: 1.05rem;
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
	.shops {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
		gap: 1rem;
		align-items: start;
	}
</style>
