<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SettlementView from '#lib/components/SettlementView.svelte';
	import { getRegion } from '#lib/data/regions.ts';
	import { getTier } from '#lib/data/tiers.ts';
	import { familyForShop } from '#lib/generator.ts';
	import { families } from '#lib/stores/families.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { Family, Settlement } from '#lib/types.ts';

	const selectedId = $derived(page.url.searchParams.get('id'));
	const selected = $derived(selectedId ? towns.get(selectedId) : undefined);
	let importError = $state('');

	function open(id: string | null) {
		goto(id ? `${resolve('/towns')}?id=${encodeURIComponent(id)}` : resolve('/towns'));
	}

	function remove(town: Settlement) {
		if (!confirm(`Forget ${town.name}? This can't be undone.`)) return;
		towns.remove(town.id);
		if (selectedId === town.id) open(null);
	}

	function exportAll() {
		const data = { app: 'kinkeep', version: 1, towns: towns.list, families: families.list };
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `kinkeep-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	async function importAll(event: Event) {
		importError = '';
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const data = JSON.parse(await file.text()) as { towns?: Settlement[]; families?: Family[] };
			if (!Array.isArray(data.towns)) throw new Error('No towns found in that file.');
			const proceed = confirm(
				`Import ${data.towns.length} towns? OK merges them with your current towns.`
			);
			if (!proceed) return;
			for (const town of data.towns) towns.put(town);
			if (
				Array.isArray(data.families) &&
				confirm('Also replace your families with the ones in the file?')
			) {
				families.replaceAll(data.families);
			}
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not read that file.';
		} finally {
			input.value = '';
		}
	}
</script>

{#if selected}
	<div class="toolbar no-print">
		<button class="btn" type="button" onclick={() => open(null)}>← All towns</button>
		<button class="btn" type="button" onclick={() => window.print()}>Print</button>
		<button class="btn danger" type="button" onclick={() => remove(selected)}>Forget town</button>
	</div>
	<SettlementView settlement={selected} onChange={(next) => towns.put(next)} />
	<section class="card notes">
		<label for="notes"><h2>DM notes</h2></label>
		<textarea
			id="notes"
			rows="5"
			placeholder="What did the party buy? Who did they annoy? Which rumours did they hear?"
			value={selected.notes ?? ''}
			onchange={(e) => towns.put({ ...selected, notes: e.currentTarget.value })}></textarea>
	</section>
{:else if selectedId}
	<p>That town isn't saved in this browser. <a href={resolve('/towns')}>See all saved towns</a>.</p>
{:else}
	<header class="list-head">
		<div>
			<h1>Saved towns</h1>
			<p class="muted">Saved in this browser. Export a backup to move them to another device.</p>
		</div>
		<div class="io no-print">
			<button class="btn" type="button" onclick={exportAll}>Export backup</button>
			<label class="btn">
				Import backup
				<input
					class="visually-hidden"
					type="file"
					accept="application/json,.json"
					onchange={importAll}
				/>
			</label>
		</div>
	</header>
	{#if importError}<p class="error" role="alert">{importError}</p>{/if}

	{#if towns.list.length === 0}
		<div class="card empty">
			<p>No saved towns yet.</p>
			<a class="btn primary" href={resolve('/')}>Generate one</a>
		</div>
	{:else}
		<ul class="town-list">
			{#each towns.list as town (town.id)}
				<li class="card">
					<a href="{resolve('/towns')}?id={encodeURIComponent(town.id)}">
						<span class="tier">{getTier(town.tier).label} · {getRegion(town.region).label}</span>
						<strong>{town.name}</strong>
						<span class="muted">
							Pop. {town.population.toLocaleString('en-US')} · {town.shops.length}
							{town.shops.length === 1 ? 'shop' : 'shops'}
						</span>
						<span class="emblems" aria-hidden="true">
							{#each town.shops as shop (shop.id)}{families.get(familyForShop(shop.type))
									.emblem}{/each}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.notes {
		margin-top: 1.25rem;
		padding: 1rem;
	}
	.notes h2 {
		font-size: 1.1rem;
	}
	.list-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.list-head p {
		margin: 0;
	}
	.io {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.error {
		color: var(--danger);
	}
	.empty {
		padding: 2rem;
		text-align: center;
	}
	.town-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
		gap: 0.75rem;
	}
	.town-list a {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.9rem 1rem;
		color: var(--ink);
		text-decoration: none;
		border-radius: var(--radius);
	}
	.town-list a:hover {
		background: var(--surface-2);
	}
	.town-list strong {
		font-family: var(--serif);
		font-size: 1.2rem;
	}
	.tier {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent);
		font-weight: 600;
	}
	.emblems {
		letter-spacing: 0.15em;
		margin-top: 0.25rem;
	}
</style>
