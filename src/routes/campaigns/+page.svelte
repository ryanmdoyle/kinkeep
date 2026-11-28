<script lang="ts">
	import MustHaves from '#lib/components/MustHaves.svelte';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { Campaign } from '#lib/types.ts';

	let newName = $state('');
	let copyFamilies = $state(false);

	function create(event: SubmitEvent) {
		event.preventDefault();
		campaigns.create(newName, copyFamilies ? campaigns.active.families : {});
		newName = '';
		copyFamilies = false;
	}

	function remove(campaign: Campaign) {
		const count = towns.inCampaign(campaign.id).length;
		const warning = count
			? `Delete "${campaign.name}" and its ${count} saved ${count === 1 ? 'town' : 'towns'}? This can't be undone.`
			: `Delete "${campaign.name}"?`;
		if (!confirm(warning)) return;
		towns.removeCampaign(campaign.id);
		campaigns.remove(campaign.id);
	}

	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
</script>

<header class="head">
	<h1>Campaigns</h1>
	<p class="muted">
		A campaign keeps its own saved towns and families, and remembers which town names, shopkeepers,
		quirks and rumors it has already used, so new towns don't repeat them until there's nothing
		fresh left. Forgetting a town frees its content again.
	</p>
</header>

<form class="card create" onsubmit={create}>
	<label class="grow">
		<span>New campaign</span>
		<input bind:value={newName} placeholder="e.g. The Saltmarsh Run" autocomplete="off" />
	</label>
	<label class="check">
		<input type="checkbox" bind:checked={copyFamilies} />
		<span>Copy families from “{campaigns.active.name}”</span>
	</label>
	<button class="btn primary" type="submit">Create and switch</button>
</form>

<ul class="list">
	{#each campaigns.list as campaign (campaign.id)}
		{@const usage = towns.usage(campaign.id)}
		{@const townCount = towns.inCampaign(campaign.id).length}
		{@const isActive = campaign.id === campaigns.active.id}
		{@const customCount = Object.keys(campaign.families).length}
		<li class="card campaign" class:active={isActive}>
			<div class="row">
				<label class="grow">
					<span class="visually-hidden">Campaign name</span>
					<input
						class="name"
						value={campaign.name}
						onchange={(e) =>
							campaigns.update(campaign.id, {
								name: e.currentTarget.value.trim() || campaign.name
							})}
					/>
				</label>
				{#if isActive}
					<span class="badge">Current</span>
				{:else}
					<button class="btn small" type="button" onclick={() => campaigns.select(campaign.id)}>
						Switch to
					</button>
				{/if}
			</div>

			<p class="muted stats">
				{plural(townCount, 'saved town', 'saved towns')} ·
				{plural(usage.keeper, 'shopkeeper', 'shopkeepers')} ·
				{plural(usage.quirk, 'quirk', 'quirks')} and
				{plural(usage.rumour, 'rumor', 'rumors')} used ·
				{customCount
					? plural(customCount, 'custom family', 'custom families')
					: 'built-in families'}
			</p>

			<label class="check">
				<input
					type="checkbox"
					checked={campaign.avoidRepeats}
					onchange={(e) => campaigns.update(campaign.id, { avoidRepeats: e.currentTarget.checked })}
				/>
				<span>
					Avoid repeats
					<small class="muted">
						Skip names, quirks and rumors used in this campaign's saved towns. A seed shared from
						here can differ in those details for someone else.
					</small>
				</span>
			</label>

			<label class="check">
				<input
					type="checkbox"
					checked={campaign.standingPrices ?? true}
					onchange={(e) =>
						campaigns.update(campaign.id, { standingPrices: e.currentTarget.checked })}
				/>
				<span>
					Standing changes prices
					<small class="muted">
						Keepers charge the party 10% less when on positive terms and 20% more when on negative
						terms. Regulars always get any discount their keeper promises.
					</small>
				</span>
			</label>

			<MustHaves {campaign} />

			<div class="actions">
				<button class="btn small danger" type="button" onclick={() => remove(campaign)}>
					Delete campaign
				</button>
			</div>
		</li>
	{/each}
</ul>

<style>
	.head {
		margin-bottom: 1rem;
	}
	.head p {
		max-width: 68ch;
		margin: 0;
	}
	.create {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1rem;
		padding: 1rem;
		margin-bottom: 1.25rem;
	}
	.create label > span {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}
	.grow {
		flex: 1 1 220px;
		min-width: 0;
	}
	.check {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		font-size: 0.92rem;
	}
	.check input {
		width: auto;
		margin-top: 0.2rem;
	}
	.check small {
		display: block;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.campaign {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		--frame: var(--line);
	}
	.campaign.active {
		--frame: var(--accent);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.name {
		font-family: var(--serif);
		font-size: 1.2rem;
		font-weight: 700;
	}
	.badge {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent);
		font-weight: 700;
		white-space: nowrap;
	}
	.stats {
		margin: 0;
		font-size: 0.9rem;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
