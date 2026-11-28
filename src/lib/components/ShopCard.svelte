<script lang="ts">
	import { resolve } from '$app/paths';
	import RumourText from '#lib/components/RumourText.svelte';
	import { keeperName, type NamePatch } from '#lib/edit.ts';
	import { SHOP_RULES } from '#lib/data/tiers.ts';
	import { formatPrice, roundPrice } from '#lib/money.ts';
	import {
		partyPrices,
		purchases,
		remaining,
		type OrderAction,
		RELATIONS,
		relationOf,
		returningGreeting,
		wordOfKin,
		type Kin
	} from '#lib/tracking.ts';
	import type { Family, RegionId, Relation, Rumour, Shop, StockItem, Truth } from '#lib/types.ts';

	const TRUTHS: Truth[] = ['true', 'partly true', 'false'];

	/**
	 * `onVisited`, `onTold`, `onRelation` and `onNote` turn on tracking what the
	 * party has actually done here; leave them out for a read-only card.
	 * `standingPrices` says whether standing changes this keeper's prices.
	 */
	let {
		shop,
		family,
		kin = [],
		standingPrices = true,
		region,
		onReroll,
		onRumour,
		onVisited,
		onTold,
		onRelation,
		onNote,
		onEditRumour,
		onSell,
		onOrder,
		onRestock,
		onRename,
		onRemove
	}: {
		shop: Shop;
		family: Family;
		kin?: Kin[];
		standingPrices?: boolean;
		/** The town's region, so rumour places are built in the same part of the world. */
		region?: RegionId;
		onReroll?: () => void;
		onRumour?: () => void;
		onVisited?: (visited: boolean) => void;
		onTold?: (told: boolean) => void;
		onRelation?: (relation: Relation) => void;
		onNote?: (note: string) => void;
		onEditRumour?: (patch: Partial<Pick<Rumour, 'text' | 'truth'>>) => void;
		/** Rename the shop or its keeper (see `renameShop`). */
		onRename?: (patch: NamePatch) => void;
		onRemove?: () => void;
		/** The party bought one (1) or the DM undid a sale (-1). */
		onSell?: (itemName: string, delta: number) => void;
		onOrder?: (name: string, action: OrderAction) => void;
		onRestock?: () => void;
	} = $props();

	const bought = $derived(purchases(shop));
	const formatDay = (day: string) =>
		new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

	let editingRumour = $state(false);
	let editing = $state(false);

	function removeThis() {
		const tracked = shop.visited ? ' and everything you tracked there' : '';
		if (!confirm(`Remove ${shop.name}? Its keeper and stock${tracked} go with it.`)) return;
		onRemove?.();
	}

	const relation = $derived(relationOf(shop));
	const relationLabel = (r: Relation) => RELATIONS.find((x) => x.value === r)?.label ?? r;
	const returning = $derived(returningGreeting(shop));
	const word = $derived(wordOfKin(shop, kin));
	const prices = $derived(partyPrices(shop, standingPrices));
	/** A listed price as this keeper would charge the party. */
	const price = (gp: number) => (prices.factor === 1 ? gp : roundPrice(gp * prices.factor));

	let noteOpen = $state(false);
	/** Focus the note box only when it's opened by hand, not on page load. */
	let focusNote = false;
	function openNote() {
		focusNote = true;
		noteOpen = true;
	}
	function focusIfOpened(el: HTMLElement) {
		if (focusNote) el.focus();
		focusNote = false;
	}

	function reroll() {
		if (
			shop.visited &&
			!confirm(
				`The party has been to ${shop.name}. Reroll it anyway? The new keeper won't remember them.`
			)
		)
			return;
		onReroll?.();
	}

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

<article
	class="card shop"
	id="shop-{shop.id}"
	class:visited={shop.visited}
	style:--family={family.color}
>
	<header>
		<div class="emblem" aria-hidden="true">{family.emblem}</div>
		<div class="titles">
			<p class="type">
				{typeLabel}
				{#if shop.visited && !onVisited}<span class="stamp dm-only">Visited</span>{/if}
			</p>
			<h3>{shop.name}</h3>
		</div>
		{#if onVisited || onReroll || onRename}
			<div class="head-actions no-print">
				{#if onVisited}
					<button
						class="btn small visit"
						type="button"
						aria-pressed={!!shop.visited}
						onclick={() => onVisited(!shop.visited)}
						title={shop.visited ? 'Mark as not visited' : 'The party has been here'}
					>
						{shop.visited ? '✓ Visited' : 'Not visited'}
					</button>
				{/if}
				<div class="row-actions">
					{#if onReroll}
						<button
							class="btn small"
							type="button"
							onclick={reroll}
							title="New shopkeeper and stock"
						>
							Reroll
						</button>
					{/if}
					{#if onRename}
						<button
							class="btn small"
							type="button"
							aria-expanded={editing}
							onclick={() => (editing = !editing)}
							title="Rename the shop or keeper, or remove the shop"
						>
							Edit
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</header>

	{#if editing && onRename}
		<div class="edit-names no-print">
			<label class="wide">
				<span>Shop name</span>
				<input
					value={shop.name}
					onchange={(e) => onRename({ shopName: e.currentTarget.value })}
					autocomplete="off"
				/>
			</label>
			<label>
				<span>First name</span>
				<input
					value={shop.keeper.firstName}
					onchange={(e) => onRename({ firstName: e.currentTarget.value })}
					autocomplete="off"
				/>
			</label>
			<label>
				<span>Surname</span>
				<input
					value={shop.keeper.surname ?? ''}
					placeholder={family.surname}
					onchange={(e) => onRename({ surname: e.currentTarget.value })}
					autocomplete="off"
				/>
			</label>
			<p class="edit-hint muted wide">
				Leave the surname blank to use the family's ({family.surname}). Either way they're one of
				{family.groupName}, for kin and standing.
			</p>
			<div class="edit-actions wide">
				{#if onRemove}
					<button class="link danger" type="button" onclick={removeThis}>Remove this shop</button>
				{/if}
				<button class="btn small" type="button" onclick={() => (editing = false)}>Done</button>
			</div>
		</div>
	{/if}

	<section class="keeper">
		<p class="who">
			<strong>{keeperName(shop.keeper, family)}</strong>
			<span class="muted">
				· {shop.keeper.age}
				{family.race.toLowerCase()} of {family.groupName}
			</span>
		</p>
		{#if relation}
			{#if onRelation}
				<div
					class="standing no-print"
					role="radiogroup"
					aria-label="How the party stands with them"
				>
					<span class="muted">Party standing:</span>
					{#each RELATIONS as r (r.value)}
						<label class="pill {r.value}" class:on={relation === r.value}>
							<input
								type="radio"
								name="relation-{shop.id}"
								value={r.value}
								checked={relation === r.value}
								onchange={() => onRelation(r.value)}
							/>
							<span aria-hidden="true">{r.symbol}</span>
							{r.label}
						</label>
					{/each}
				</div>
			{/if}
			<p class="standing-print dm-only" class:print-only={!!onRelation}>
				<span class="muted">Party standing:</span>
				<span class="rel {relation}">{relationLabel(relation)}</span>
			</p>
		{/if}
		{#if returning && relation}
			<blockquote class="said dm-only {relation}">
				<span class="said-label">Returning</span>
				“{returning}”
			</blockquote>
			{#if shop.keeper.greeting}
				<p class="first-greeting muted dm-only">First visit: “{shop.keeper.greeting}”</p>
			{/if}
		{:else}
			{#if shop.keeper.greeting}
				<blockquote class="dm-only">“{shop.keeper.greeting}”</blockquote>
			{/if}
			{#if word}
				<blockquote class="said dm-only {word.relation}">
					<span class="said-label">Has heard of the party</span>
					“{word.text}”
				</blockquote>
			{/if}
		{/if}
		<ul class="quirks dm-only">
			{#each shop.keeper.quirks as quirk (quirk)}
				<li>{quirk}</li>
			{/each}
			<li class="bargain"><span class="muted">Bargaining:</span> {shop.keeper.bargaining.label}</li>
			{#if prices.reasons.length}
				<li class="bargain party-price">
					<span class="muted">Prices for the party:</span>
					{prices.reasons.join(', ')} <span class="muted">(already in the prices below)</span>
				</li>
			{/if}
		</ul>
		{#if shop.keeper.rumour}
			<div class="rumour dm-only" class:told={shop.keeper.rumour.told}>
				{#if editingRumour && onEditRumour}
					<label class="rumour-edit">
						<span class="label">Rumour</span>
						<textarea
							rows="3"
							value={shop.keeper.rumour.text}
							onchange={(e) => onEditRumour({ text: e.currentTarget.value })}
							{@attach (el) => el.focus()}></textarea>
					</label>
				{:else}
					<p>
						<span class="label">Rumour</span>
						{#if shop.keeper.rumour.custom}<span class="mine">yours</span>{/if}
						{#if shop.keeper.rumour.edited}<span class="mine">edited</span>{/if}
						<RumourText
							text={shop.keeper.rumour.text}
							places={shop.keeper.rumour.places}
							{region}
						/>
					</p>
				{/if}
				<p class="truth-row">
					{#if editingRumour && onEditRumour}
						<select
							class="truth {shop.keeper.rumour.truth.replace(' ', '-')}"
							aria-label="Is it true?"
							value={shop.keeper.rumour.truth}
							onchange={(e) => onEditRumour({ truth: e.currentTarget.value as Truth })}
						>
							{#each TRUTHS as t (t)}<option value={t}>DM: {t}</option>{/each}
						</select>
					{:else}
						<span class="truth {shop.keeper.rumour.truth.replace(' ', '-')}">
							DM: {shop.keeper.rumour.truth}
						</span>
					{/if}
					<span class="rumour-actions">
						{#if onTold}
							<label class="told-toggle no-print">
								<input
									type="checkbox"
									checked={!!shop.keeper.rumour.told}
									onchange={(e) => onTold(e.currentTarget.checked)}
								/>
								Told to the party
							</label>
						{:else if shop.keeper.rumour.told}
							<span class="muted">Told to the party</span>
						{/if}
						{#if onEditRumour}
							<button
								class="link no-print"
								type="button"
								onclick={() => (editingRumour = !editingRumour)}
							>
								{editingRumour ? 'Done' : 'Edit'}
							</button>
						{/if}
						{#if onRumour && !shop.keeper.rumour.told && !editingRumour}
							<button class="link no-print" type="button" onclick={onRumour}>Another rumour</button>
						{/if}
					</span>
				</p>
			</div>
		{/if}
		{#if kin.length}
			<p class="kin dm-only">
				<span class="muted">Kin the party has met:</span>
				{#each kin as k, i (`${k.townId}:${k.shop}`)}
					{i ? ', ' : ''}{k.firstName}
					(<!-- -->{#if k.here}{k.shop}, here{:else}<a
							href="{resolve('/towns')}?id={encodeURIComponent(k.townId)}"
							title={k.shop}
						>
							{k.town}
						</a>{/if}{#if k.relation !== 'neutral'}, <span class="rel {k.relation}">
							{relationLabel(k.relation).toLowerCase()}
						</span>{/if})
				{/each}
			</p>
		{/if}
		{#if onNote && (shop.keeper.note || noteOpen)}
			<label class="note-field no-print">
				<span class="muted">DM note</span>
				<textarea
					rows="2"
					value={shop.keeper.note ?? ''}
					placeholder="Promised to bring back the hammer. Owes them 5 gp."
					onchange={(e) => onNote(e.currentTarget.value)}
					{@attach focusIfOpened}></textarea>
			</label>
		{:else if onNote}
			<button class="link add-note no-print" type="button" onclick={openNote}>+ Add a note</button>
		{/if}
		{#if shop.keeper.note}
			<p class="keeper-note dm-only" class:print-only={!!onNote}>
				<span class="muted">DM note:</span>
				{shop.keeper.note}
			</p>
		{/if}
		<details class="family-traits dm-only">
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
		{#if bought.length || onRestock}
			<div class="stock-tools dm-only">
				{#if bought.length}
					<p class="bought">
						<span class="muted">The party bought:</span>
						{bought.map((b) => `${b.count}× ${b.name}`).join(', ')}
					</p>
				{/if}
				{#if onRestock}
					<button
						class="link no-print"
						type="button"
						onclick={onRestock}
						title="Time passes: new stock, same keeper. Special orders stay."
					>
						Restock
					</button>
				{/if}
			</div>
		{/if}
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
							{@const left = remaining(item)}
							<tr class:sold-out={left === 0}>
								<td>
									{item.name}
									{#if item.rarity}<span class="rarity {item.rarity.replace(' ', '-')}">
											{item.rarity}
										</span>{/if}
									{#if item.note}<span class="note">{item.note}</span>{/if}
								</td>
								<td class="num qty">
									{#if left < 0}
										—
									{:else if onSell}
										<span class="stepper">
											<button
												class="step no-print"
												type="button"
												disabled={left === 0}
												onclick={() => onSell(item.name, 1)}
												aria-label="The party buys one {item.name}"
												title="The party buys one"
											>
												−
											</button>
											<span class="left">{left === 0 ? 'sold out' : left}</span>
											{#if item.sold}
												<button
													class="step no-print"
													type="button"
													onclick={() => onSell(item.name, -1)}
													aria-label="Undo selling one {item.name}"
													title="Undo a sale"
												>
													+
												</button>
											{:else}
												<span class="no-print" aria-hidden="true"></span>
											{/if}
										</span>
									{:else}
										<span class="left">{left === 0 ? 'sold out' : left}</span>
									{/if}
								</td>
								<td class="num price">{formatPrice(price(item.price))}</td>
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
						<li class:ordered={order.order && !order.order.collected}>
							<span>
								{order.name}: <span class="price">{formatPrice(price(order.price))}</span>
								<span class="muted">({order.wait})</span>
							</span>
							{#if order.order?.collected}
								<span class="order-state done">✓ Collected</span>
							{:else if order.order}
								<span class="order-state">
									Ordered {formatDay(order.order.at)}
									{#if onOrder}
										<button
											class="link no-print"
											type="button"
											onclick={() => onOrder(order.name, 'collect')}
										>
											Collected
										</button>
										<button
											class="link no-print"
											type="button"
											onclick={() => onOrder(order.name, 'cancel')}
										>
											Cancel
										</button>
									{/if}
								</span>
							{:else if onOrder}
								<button
									class="link no-print"
									type="button"
									onclick={() => onOrder(order.name, 'order')}
								>
									Order
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</details>
</article>

<style>
	.shop {
		--frame: var(--family);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	/* Same red small caps and fading rule as other container headings. */
	header,
	.stock > summary {
		background: linear-gradient(to right, var(--frame), transparent) no-repeat left bottom / 100%
			2px;
	}
	header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		/*
		 * Space the rule evenly: emblem-to-rule and rule-to-name both match the
		 * card's 1rem top padding (the 2px rule sits inside this padding, and the
		 * card's 0.75rem gap plus the margin make up the space below).
		 */
		padding-bottom: calc(1rem + 2px);
		margin-bottom: 0.25rem;
	}
	.head-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.35rem;
	}
	.row-actions {
		display: flex;
		gap: 0.35rem;
	}
	.edit-names {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem 0.75rem;
		padding: 0.75rem;
		border: 1px dashed var(--line);
		font-size: 0.88rem;
	}
	.edit-names .wide {
		grid-column: 1 / -1;
	}
	.edit-names label span {
		display: block;
		font-weight: 600;
		margin-bottom: 0.2rem;
	}
	.edit-hint {
		margin: 0;
		font-size: 0.8rem;
	}
	.edit-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.edit-actions .btn {
		margin-left: auto;
	}
	.link.danger {
		color: var(--danger);
		padding-left: 0;
	}
	.visit[aria-pressed='true'] {
		color: var(--good);
		border-color: var(--good);
		background: color-mix(in srgb, var(--good) 10%, transparent);
	}
	.stamp {
		margin-left: 0.4rem;
		color: var(--good);
		border: 1px solid currentColor;
		padding: 0 0.35rem;
		letter-spacing: 0.04em;
	}
	.standing {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.1rem 0.5rem;
		border: 1px solid var(--line);
		cursor: pointer;
	}
	.pill input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.pill:has(input:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	.pill.on {
		font-weight: 600;
		border-color: currentColor;
	}
	.pill.positive.on,
	.rel.positive {
		color: var(--good);
	}
	.pill.neutral.on {
		color: var(--ink);
	}
	.pill.negative.on,
	.rel.negative {
		color: var(--danger);
	}
	.pill.on.positive {
		background: color-mix(in srgb, var(--good) 10%, transparent);
	}
	.pill.on.negative {
		background: color-mix(in srgb, var(--danger) 10%, transparent);
	}
	.standing-print {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
	}
	.rel {
		font-weight: 600;
	}
	.print-only {
		display: none;
	}
	@media print {
		.print-only {
			display: block;
		}
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
	h3,
	.stock > summary {
		font-family: var(--serif);
		font-variant: small-caps;
		letter-spacing: 0.02em;
		color: var(--accent);
	}
	h3 {
		margin: 0;
		font-size: 1.4rem;
		overflow-wrap: anywhere;
	}
	.stock > summary {
		padding-bottom: 0.35rem;
		margin-bottom: 0.5rem;
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
	}
	.said {
		border-left-color: var(--muted);
	}
	.said.positive {
		border-left-color: var(--good);
		background: color-mix(in srgb, var(--good) 8%, transparent);
	}
	.said.negative {
		border-left-color: var(--danger);
		background: color-mix(in srgb, var(--danger) 8%, transparent);
	}
	.said-label {
		display: block;
		font-family: var(--sans);
		font-style: normal;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	.first-greeting {
		margin: -0.25rem 0 0.5rem;
		font-size: 0.85rem;
		font-style: italic;
	}
	.party-price {
		margin-top: 0.1rem;
	}
	.note-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-top: 0.5rem;
		font-size: 0.85rem;
	}
	.note-field textarea {
		font-size: 0.9rem;
		resize: vertical;
	}
	.add-note {
		display: block;
		margin-top: 0.35rem;
		padding-left: 0;
	}
	.keeper-note {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
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
		font-size: 0.92rem;
	}
	.rumour p {
		margin: 0;
	}
	.rumour-edit {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.rumour-edit textarea {
		font-size: 0.92rem;
		resize: vertical;
	}
	.truth-row select {
		width: auto;
		padding: 0 0.3rem;
		font-size: 0.8rem;
		background: transparent;
	}
	.rumour.told {
		border-style: solid;
		border-color: var(--good);
	}
	.rumour-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.told-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.told-toggle input {
		width: auto;
		margin: 0;
	}
	.rumour .label {
		font-weight: 700;
		margin-right: 0.25rem;
	}
	.mine {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent);
		border: 1px solid currentColor;
		padding: 0 0.4rem;
		margin-right: 0.3rem;
		vertical-align: 1px;
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
	.stock-tools {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
		font-size: 0.88rem;
	}
	.stock-tools .link {
		margin-left: auto;
	}
	.bought {
		margin: 0;
	}
	.qty {
		white-space: nowrap;
	}
	.stepper {
		display: inline-grid;
		grid-template-columns: 1.35rem minmax(1.8rem, auto) 1.35rem;
		align-items: center;
		justify-items: center;
		gap: 0.15rem;
	}
	.step {
		width: 1.35rem;
		height: 1.35rem;
		padding: 0;
		line-height: 1;
		font-size: 0.85rem;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--action);
		cursor: pointer;
		vertical-align: 1px;
	}
	.step:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.sold-out td:first-child,
	.sold-out .price {
		color: var(--muted);
		text-decoration: line-through;
	}
	.sold-out .left {
		color: var(--muted);
		font-size: 0.72rem;
	}
	/* Without the DM's buttons, the count is just a number. */
	:global(:root[data-view='players']) .stepper {
		display: inline;
	}
	@media print {
		.stepper {
			display: inline;
		}
	}
	.orders li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0 0.5rem;
	}
	.orders li.ordered {
		font-weight: 600;
	}
	.order-state {
		font-size: 0.85rem;
		color: var(--warn);
	}
	.order-state.done {
		color: var(--good);
	}
	.orders .link {
		font-size: 0.82rem;
		padding: 0 0.2rem;
	}
	.orders h4 {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.95rem;
	}
	.orders ul {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.9rem;
	}
	.orders li {
		padding: 0.1rem 0;
		border-bottom: 1px dashed var(--line);
	}
	.orders li:last-child {
		border-bottom: 0;
	}
	@media print {
		.stock:not([open]) {
			display: block;
		}
	}
</style>
