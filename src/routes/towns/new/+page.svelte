<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { REGIONS } from '#lib/data/regions.ts';
	import { SHOP_RULES, TIERS } from '#lib/data/tiers.ts';
	import { generateBookTown } from '#lib/generator.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { load } from '#lib/stores/storage.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { RegionId, ShopType, TierId } from '#lib/types.ts';

	let name = $state('');
	let tier = $state<TierId>('village');
	const lastRegion = load<RegionId | 'random'>('wares-whispers:region', 'heartland');
	let region = $state<RegionId>(lastRegion === 'random' ? 'heartland' : lastRegion);
	let population = $state<number | undefined>();
	let description = $state('');
	/** How many of each shop, and the book's name for each one (blank = let the family name it). */
	let counts = $state<Record<ShopType, number>>(typicalCounts('village'));
	let names = $state<Record<ShopType, string[]>>({
		inn: [],
		general: [],
		smithy: [],
		weapons: [],
		armor: [],
		potions: [],
		magic: []
	});
	/** Until the DM changes a count, picking a size fills in the usual shops for it. */
	let countsTouched = $state(false);

	const tierInfo = $derived(TIERS.find((t) => t.id === tier)!);
	const total = $derived(Object.values(counts).reduce((a, b) => a + b, 0));

	function typicalCounts(id: TierId): Record<ShopType, number> {
		const index = TIERS.findIndex((t) => t.id === id);
		const out = {} as Record<ShopType, number>;
		for (const rule of SHOP_RULES) out[rule.type] = Math.max(0, rule.minByTier[index]);
		return out;
	}

	function pickTier(id: TierId) {
		tier = id;
		if (!countsTouched) counts = typicalCounts(id);
	}

	function setCount(type: ShopType, value: number) {
		countsTouched = true;
		counts[type] = Math.max(0, Math.min(20, Math.floor(value) || 0));
	}

	function create(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		const shops = SHOP_RULES.flatMap((rule) =>
			Array.from({ length: counts[rule.type] }, (_, i) => ({
				type: rule.type,
				name: names[rule.type][i]?.trim() || undefined
			}))
		);
		const town = generateBookTown({
			...towns.inputFor(),
			name,
			tier,
			region,
			population,
			description,
			shops,
			campaignId: campaigns.active.id
		});
		towns.put(town);
		goto(`${resolve('/towns')}?id=${encodeURIComponent(town.id)}`);
	}
</script>

<header class="head">
	<h1>A town from a book</h1>
	<p class="muted">
		Running a published adventure? Set up its town here, with the book's name and the shops it has,
		and your families will run them: keepers, rumors and stock as usual, with nothing else added.
		It's saved to “{campaigns.active.name}” straight away.
	</p>
</header>

<form class="card panel" onsubmit={create}>
	<div class="fields">
		<div class="field wide">
			<label for="book-name">Town name</label>
			<input
				id="book-name"
				bind:value={name}
				placeholder="e.g. Phandalin"
				autocomplete="off"
				required
			/>
		</div>
		<div class="field">
			<label for="book-size">Size</label>
			<select
				id="book-size"
				value={tier}
				onchange={(e) => pickTier(e.currentTarget.value as TierId)}
			>
				{#each TIERS as t (t.id)}
					<option value={t.id}>
						{t.label} ({t.min.toLocaleString('en-US')}–{t.max.toLocaleString('en-US')})
					</option>
				{/each}
			</select>
			<p class="hint muted">Sets prices and how rare the stock gets.</p>
		</div>
		<div class="field">
			<label for="book-region">Region</label>
			<select id="book-region" bind:value={region}>
				{#each REGIONS as r (r.id)}
					<option value={r.id}>{r.label}</option>
				{/each}
			</select>
			<p class="hint muted">Local goods, prices and rumors.</p>
		</div>
		<div class="field">
			<label for="book-pop">Population <span class="muted">(optional)</span></label>
			<input
				id="book-pop"
				type="number"
				min="1"
				bind:value={population}
				placeholder="{tierInfo.min.toLocaleString('en-US')}–{tierInfo.max.toLocaleString('en-US')}"
			/>
		</div>
		<div class="field wide">
			<label for="book-desc">Description <span class="muted">(optional)</span></label>
			<textarea
				id="book-desc"
				rows="3"
				bind:value={description}
				placeholder="A few lines from the book, shown at the top of the town."></textarea>
		</div>
	</div>

	<fieldset class="shops">
		<legend>
			Shops <span class="muted">({total})</span>
			<small class="muted">
				How many of each. Name any you know from the book; leave the rest blank and the family names
				them.
			</small>
		</legend>
		{#each SHOP_RULES as rule (rule.type)}
			<div class="shop-row">
				<label class="count">
					<span>{rule.label}</span>
					<input
						type="number"
						min="0"
						max="20"
						value={counts[rule.type]}
						oninput={(e) => setCount(rule.type, e.currentTarget.valueAsNumber)}
					/>
				</label>
				{#if counts[rule.type] > 0}
					<div class="names">
						{#each Array.from({ length: counts[rule.type] }, (_, i) => i) as i (i)}
							<input
								aria-label="{rule.label} {i + 1} name"
								value={names[rule.type][i] ?? ''}
								oninput={(e) => (names[rule.type][i] = e.currentTarget.value)}
								placeholder={i === 0 ? 'Name from the book (optional)' : 'Name (optional)'}
								autocomplete="off"
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</fieldset>

	<div class="actions">
		<button class="btn primary" type="submit" disabled={!name.trim()}>
			Create {name.trim() || 'town'}
		</button>
		<a href={resolve('/')}>Cancel</a>
	</div>
</form>

<style>
	.head {
		margin-bottom: 1rem;
	}
	.head p {
		max-width: 68ch;
		margin: 0;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem 1rem;
	}
	.field.wide {
		grid-column: 1 / -1;
	}
	@media (max-width: 640px) {
		.fields {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.field label,
	.count span {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}
	.hint {
		margin: 0.3rem 0 0;
		font-size: 0.8rem;
	}
	.shops {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		min-width: 0;
	}
	legend {
		font-family: var(--serif);
		font-size: 1.15rem;
		font-weight: 700;
		padding: 0;
		margin-bottom: 0.4rem;
	}
	legend small {
		display: block;
		font-family: var(--sans);
		font-size: 0.82rem;
		font-weight: 400;
	}
	.shop-row {
		display: grid;
		grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
		gap: 0.5rem 1rem;
		align-items: start;
		padding-bottom: 0.6rem;
		border-bottom: 1px dashed var(--line);
	}
	@media (max-width: 640px) {
		.shop-row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.count {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.count span {
		margin: 0;
	}
	.count input {
		width: 4.5rem;
		flex: none;
	}
	.names {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
		gap: 0.4rem 0.6rem;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
</style>
