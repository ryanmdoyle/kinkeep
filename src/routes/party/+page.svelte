<script lang="ts">
	import { resolve } from '$app/paths';
	import RumourText from '#lib/components/RumourText.svelte';
	import { FAMILY_ROLE_LABELS } from '#lib/data/families.ts';
	import { formatPrice, roundPrice } from '#lib/money.ts';
	import {
		findItems,
		heardRumours,
		keepersByFamily,
		pendingOrders,
		standingCounts
	} from '#lib/party.ts';
	import { keeperName } from '#lib/edit.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { families } from '#lib/stores/families.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import { familyStanding, RELATIONS, townProgress } from '#lib/tracking.ts';
	import type { FamilyRole, Relation, Truth } from '#lib/types.ts';

	let query = $state('');

	const campaign = $derived(campaigns.active);
	const list = $derived(towns.list);
	const standingPrices = $derived(campaign.standingPrices ?? true);
	const here = $derived(towns.partyTown);
	const byFamily = $derived(keepersByFamily(list));
	const heard = $derived(heardRumours(list));
	const orders = $derived(pendingOrders(list, standingPrices));
	const matches = $derived(findItems(list, query, standingPrices).slice(0, 40));
	const visitedTowns = $derived(list.filter((t) => townProgress(t).visited > 0));
	const metCount = $derived(
		[...byFamily.values()].reduce((n, keepers) => n + keepers.filter((k) => k.visited).length, 0)
	);

	const TRUTH_GROUPS: { truth: Truth; title: string; hint: string }[] = [
		{ truth: 'true', title: 'True', hint: 'They can act on these.' },
		{
			truth: 'partly true',
			title: 'Partly true',
			hint: 'Right about something, wrong about some of it.'
		},
		{ truth: 'false', title: 'False', hint: 'What the party wrongly believes.' }
	];

	const townLink = (townId: string, shopId?: string) =>
		`${resolve('/towns')}?id=${encodeURIComponent(townId)}${shopId ? `#shop-${shopId}` : ''}`;
	const price = (gp: number) => formatPrice(roundPrice(gp));
	const relationLabel = (r: Relation) => RELATIONS.find((x) => x.value === r)?.label ?? r;
	const formatDay = (day: string) =>
		new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	const fullName = (familyId: FamilyRole, first: string, surname?: string) =>
		keeperName({ firstName: first, surname }, families.get(familyId));
	const ROLES = Object.keys(FAMILY_ROLE_LABELS) as FamilyRole[];
</script>

<header class="head">
	<h1>The party in {campaign.name}</h1>
	<p class="muted">
		Everything the party has done in this campaign's saved towns: who they've met and how it went,
		what they've heard, what they're waiting on, and where to find what they need.
	</p>
</header>

{#if list.length === 0}
	<div class="card empty">
		<p>No saved towns in this campaign yet. Save a town and mark the shops the party visits.</p>
		<a class="btn primary" href={resolve('/')}>Generate a town</a>
	</div>
{:else}
	<section class="card block where">
		<label class="where-pick">
			<span>The party is in</span>
			<select
				value={here?.id ?? ''}
				onchange={(e) => campaigns.setPartyTown(e.currentTarget.value || undefined)}
			>
				<option value="">Nowhere in particular</option>
				{#each list as town (town.id)}
					<option value={town.id}>{town.name}</option>
				{/each}
			</select>
		</label>
		{#if here}
			<a class="btn" href={townLink(here.id)}>Open {here.name} →</a>
		{/if}
		<ul class="stats">
			<li><strong>{visitedTowns.length}</strong> of {list.length} towns visited</li>
			<li><strong>{metCount}</strong> keepers met</li>
			<li>
				<strong>{heard.length}</strong>
				{heard.length === 1 ? 'rumor' : 'rumors'} heard
				{#if heard.some((h) => h.rumour.truth === 'false')}
					<span class="muted">
						({heard.filter((h) => h.rumour.truth === 'false').length} false)
					</span>
				{/if}
			</li>
			<li><strong>{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'} waiting</li>
		</ul>
	</section>

	<section class="card block" aria-labelledby="find-title">
		<h2 id="find-title">Where can we buy…?</h2>
		<input
			type="search"
			bind:value={query}
			placeholder="longsword, healing, rope…"
			aria-labelledby="find-title"
			autocomplete="off"
		/>
		{#if query.trim().length >= 2}
			{#if matches.length === 0}
				<p class="muted">Nobody in your saved towns has that, or can order it in.</p>
			{:else}
				<table class="finds">
					<thead>
						<tr>
							<th scope="col">Item</th>
							<th scope="col">Where</th>
							<th scope="col" class="num">Price</th>
						</tr>
					</thead>
					<tbody>
						{#each matches as m (`${m.townId}:${m.shopId}:${m.name}:${m.wait ?? ''}`)}
							<tr class:order={m.wait}>
								<td>
									{m.name}
									{#if m.wait}
										<span class="note">Order in: {m.wait}</span>
									{:else if m.left && m.left > 0}
										<span class="note">{m.left} left</span>
									{/if}
								</td>
								<td>
									<span aria-hidden="true">{families.get(m.familyId).emblem}</span>
									<a href={townLink(m.townId, m.shopId)}>{m.shop}</a>
									<span class="muted">· {m.town}</span>
									{#if m.townId === here?.id}<span class="here">here</span>{/if}
								</td>
								<td class="num price">{price(m.price)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="muted small">
					Prices are what each keeper would charge the party{standingPrices
						? ', standing included'
						: ''}.
				</p>
			{/if}
		{/if}
	</section>

	{#if orders.length}
		<section class="card block" aria-labelledby="orders-title">
			<h2 id="orders-title">Waiting on orders</h2>
			<ul class="plain">
				{#each orders as o (`${o.townId}:${o.shopId}:${o.name}`)}
					<li>
						<strong>{o.name}</strong>
						<span class="price">{price(o.price)}</span>
						<span class="muted">
							from {fullName(o.familyId, o.keeper, o.surname)},
							<a href={townLink(o.townId, o.shopId)}>{o.shop}</a>
							in {o.town}. Ordered {formatDay(o.at)}, takes {o.wait}.
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section aria-labelledby="families-title">
		<h2 id="families-title" class="section-title">Families</h2>
		<div class="families">
			{#each ROLES as role (role)}
				{@const family = families.get(role)}
				{@const keepers = byFamily.get(role) ?? []}
				{@const met = keepers.filter((k) => k.visited)}
				{@const unmet = keepers.filter((k) => !k.visited)}
				{@const counts = standingCounts(met)}
				{@const overall = familyStanding(met.map((k) => ({ relation: k.relation ?? 'neutral' })))}
				<article class="card family" style:--family={family.color}>
					<header>
						<span class="emblem" aria-hidden="true">{family.emblem}</span>
						<div>
							<h3>{family.groupName}</h3>
							<p class="muted">
								{#if overall}
									Overall <span class="rel {overall}">{relationLabel(overall).toLowerCase()}</span>
									<span class="counts">
										({counts.positive} positive, {counts.neutral} neutral, {counts.negative} negative)
									</span>
								{:else}
									Not met yet
								{/if}
							</p>
						</div>
					</header>
					{#if met.length}
						<ul class="plain members">
							{#each met as k (`${k.townId}:${k.shopId}`)}
								<li>
									<strong>{fullName(role, k.firstName, k.surname)}</strong>
									{#if k.relation && k.relation !== 'neutral'}
										<span class="rel {k.relation}">{relationLabel(k.relation)}</span>
									{/if}
									<span class="muted">
										<a href={townLink(k.townId, k.shopId)}>{k.shop}</a>, {k.town}
									</span>
									{#if k.note}<span class="note">“{k.note}”</span>{/if}
									{#if k.bought.length}
										<span class="note">
											Bought: {k.bought.map((b) => `${b.count}× ${b.name}`).join(', ')}
										</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
					{#if unmet.length}
						<p class="unmet muted">
							{met.length ? 'Not met yet:' : 'In your towns:'}
							{#each unmet as k, i (`${k.townId}:${k.shopId}`)}
								{i ? ', ' : ''}<a href={townLink(k.townId, k.shopId)}>{k.firstName}</a> ({k.town})
							{/each}
						</p>
					{/if}
				</article>
			{/each}
		</div>
	</section>

	<section aria-labelledby="heard-title">
		<h2 id="heard-title" class="section-title">Rumors the party has heard</h2>
		{#if heard.length === 0}
			<p class="card empty muted">
				None yet. Tick “Told to the party” on a rumor when a keeper tells it.
			</p>
		{:else}
			<div class="truths">
				{#each TRUTH_GROUPS as group (group.truth)}
					{@const items = heard.filter((h) => h.rumour.truth === group.truth)}
					<div class="card block truth-group {group.truth.replace(' ', '-')}">
						<h3>{group.title} <span class="muted">({items.length})</span></h3>
						<p class="muted small">{group.hint}</p>
						{#if items.length}
							<ul class="plain">
								{#each items as h (`${h.townId}:${h.shopId}`)}
									<li>
										<RumourText
											text={h.rumour.text}
											places={h.rumour.places}
											region={towns.get(h.townId)?.region}
										/>
										<span class="note">
											{families.get(h.familyId).emblem}
											{fullName(h.familyId, h.keeper, h.surname)},
											<a href={townLink(h.townId, h.shopId)}>{h.shop}</a>, {h.town}
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.head {
		margin-bottom: 1rem;
	}
	.head p {
		max-width: 68ch;
		margin: 0;
	}
	.empty {
		padding: 1.5rem;
		text-align: center;
	}
	.block {
		padding: 1rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.block h2,
	.block h3 {
		margin: 0;
	}
	.where {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1rem;
	}
	.where-pick {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 0 1 260px;
		min-width: 0;
	}
	.where-pick span {
		font-size: 0.85rem;
		font-weight: 600;
	}
	.stats {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		flex: 1 1 100%;
		font-size: 0.92rem;
	}
	.stats strong {
		font-family: var(--serif);
		font-size: 1.15rem;
		color: var(--accent);
	}
	.section-title {
		font-size: 1.25rem;
		margin: 1.25rem 0 0.6rem;
	}
	.plain {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.plain li {
		padding: 0.35rem 0;
		border-bottom: 1px dashed var(--line);
	}
	.plain li:last-child {
		border-bottom: 0;
	}
	.note {
		display: block;
		font-size: 0.82rem;
		color: var(--muted);
	}
	.small {
		margin: 0;
		font-size: 0.82rem;
	}
	.finds {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	.finds th,
	.finds td {
		text-align: left;
		padding: 0.35rem 0.25rem;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}
	.finds thead th {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	.finds tr.order td:first-child {
		font-style: italic;
	}
	.num {
		text-align: right !important;
		white-space: nowrap;
	}
	.price {
		font-variant-numeric: tabular-nums;
	}
	.here {
		margin-left: 0.3rem;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--accent);
	}
	.families {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
		gap: 0.75rem;
	}
	.family {
		--frame: var(--family);
		padding: 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}
	.family header {
		display: flex;
		gap: 0.65rem;
		align-items: center;
	}
	.family h3 {
		margin: 0;
		font-size: 1.1rem;
	}
	.family header p {
		margin: 0;
		font-size: 0.88rem;
	}
	.emblem {
		font-size: 1.3rem;
		width: 2.3rem;
		height: 2.3rem;
		flex: none;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: color-mix(in srgb, var(--family) 18%, transparent);
		border: 2px solid var(--family);
	}
	.counts {
		font-size: 0.8rem;
	}
	.members {
		font-size: 0.92rem;
	}
	.unmet {
		margin: 0;
		font-size: 0.85rem;
	}
	.rel {
		font-weight: 600;
	}
	.rel.positive {
		color: var(--good);
	}
	.rel.negative {
		color: var(--danger);
	}
	.truths {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
		gap: 0.75rem;
		align-items: start;
	}
	.truth-group.true {
		--frame: var(--good);
	}
	.truth-group.partly-true {
		--frame: var(--warn);
	}
	.truth-group.false {
		--frame: var(--danger);
	}
	.truth-group li {
		font-size: 0.92rem;
	}
</style>
