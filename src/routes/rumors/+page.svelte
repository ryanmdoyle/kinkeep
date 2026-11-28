<script lang="ts">
	import { resolve } from '$app/paths';
	import { FAMILY_ROLE_LABELS } from '#lib/data/families.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { families } from '#lib/stores/families.svelte.ts';
	import { towns } from '#lib/stores/towns.svelte.ts';
	import type { CustomRumour, FamilyRole, RumourMode, Truth } from '#lib/types.ts';

	const ROLES = Object.keys(FAMILY_ROLE_LABELS) as FamilyRole[];
	const TRUTHS: Truth[] = ['true', 'partly true', 'false'];
	const MODES: { value: RumourMode; label: string; hint: string }[] = [
		{
			value: 'first',
			label: 'Tell mine first',
			hint: 'Each new shopkeeper tells one of yours that hasn’t been placed yet. Once all are placed, built-in rumors fill in.'
		},
		{
			value: 'mix',
			label: 'Mix them in',
			hint: 'About half the shopkeepers tell one of yours (while some are unplaced); the rest tell built-in rumors.'
		},
		{
			value: 'only',
			label: 'Only mine',
			hint: 'No built-in rumors at all. Yours repeat once they’re all placed, and shops none of yours suit stay quiet.'
		}
	];

	let draft = $state('');
	let draftTruth = $state<Truth>('true');
	let draftRoles = $state<FamilyRole[]>([]);
	let added = $state('');

	const campaign = $derived(campaigns.active);
	const bank = $derived(campaign.rumours ?? []);
	const mode = $derived(campaign.rumourMode ?? 'first');
	const placements = $derived(towns.rumourPlacements(campaign.id));
	const placedCount = $derived(bank.filter((r) => placements.has(r.id)).length);
	const toldCount = $derived(bank.filter((r) => placements.get(r.id)?.some((p) => p.told)).length);
	const draftLines = $derived(draft.split('\n').filter((l) => l.trim()).length);

	function add(event: SubmitEvent) {
		event.preventDefault();
		const count = campaigns.addRumours(draft.split('\n'), draftTruth, draftRoles);
		added = count ? `Added ${count} ${count === 1 ? 'rumor' : 'rumors'}.` : '';
		draft = '';
	}

	function toggle(list: FamilyRole[], role: FamilyRole): FamilyRole[] {
		return list.includes(role) ? list.filter((r) => r !== role) : [...list, role];
	}

	function remove(rumour: CustomRumour) {
		if (confirm('Delete this rumor? Towns that already have it keep it.')) {
			campaigns.removeRumour(rumour.id);
		}
	}
</script>

<header class="head">
	<h1>Rumors in {campaign.name}</h1>
	<p class="muted">
		Running a published adventure, or have hooks you want the party to hear? Add them here and the
		shopkeepers in this campaign's towns will spread them. Saved towns remember who told which one.
	</p>
</header>

<section class="card block" aria-labelledby="mode-title">
	<h2 id="mode-title">How shopkeepers use your rumors</h2>
	<div class="modes" role="radiogroup" aria-labelledby="mode-title">
		{#each MODES as m (m.value)}
			<label class="mode" class:selected={mode === m.value}>
				<input
					type="radio"
					name="mode"
					value={m.value}
					checked={mode === m.value}
					onchange={() => campaigns.setRumourMode(m.value)}
				/>
				<span>
					<strong>{m.label}</strong>
					<small class="muted">{m.hint}</small>
				</span>
			</label>
		{/each}
	</div>
</section>

<form class="card block" onsubmit={add} aria-labelledby="add-title">
	<h2 id="add-title">Add rumors</h2>
	<label class="stack">
		<span>
			Rumors <small class="muted">One per line. Paste a whole rumor table if you like.</small>
		</span>
		<textarea
			rows="5"
			bind:value={draft}
			placeholder={'The old mill is haunted by a weeping ghost.\nA cult meets in the ruins to the {direction}.'}
		></textarea>
	</label>
	<p class="hint muted">
		Optional fill-ins, typed in lowercase exactly as shown: <code>{'{place}'}</code> another town
		nearby, <code>{'{person}'}</code> a local (e.g. “Agnes the cooper”), <code>{'{monster}'}</code>,
		<code>{'{direction}'}</code>, <code>{'{kin}'}</code> another shop family's surname (“the
		{'{kin}'} family”). “a {'{monster}'}” becomes “an owlbear” when it should. Anything else in
		braces is left as typed. You can reword any rumor on its shop card once it's placed.
	</p>
	<div class="row">
		<label class="stack truth-pick">
			<span>These are</span>
			<select bind:value={draftTruth}>
				{#each TRUTHS as t (t)}<option value={t}>{t}</option>{/each}
			</select>
		</label>
		<fieldset class="stack">
			<legend>Who might tell them <small class="muted">None ticked = anyone</small></legend>
			<div class="chips">
				{#each ROLES as role (role)}
					<label class="chip" class:on={draftRoles.includes(role)}>
						<input
							type="checkbox"
							checked={draftRoles.includes(role)}
							onchange={() => (draftRoles = toggle(draftRoles, role))}
						/>
						<span aria-hidden="true">{families.get(role).emblem}</span>
						{FAMILY_ROLE_LABELS[role]}
					</label>
				{/each}
			</div>
		</fieldset>
	</div>
	<div class="row actions">
		<button class="btn primary" type="submit" disabled={!draftLines}>
			Add {draftLines > 1 ? `${draftLines} rumors` : 'rumor'}
		</button>
		{#if added}<span class="muted" role="status">{added}</span>{/if}
	</div>
</form>

<section aria-labelledby="bank-title">
	<h2 id="bank-title" class="bank-title">
		Your rumors
		<span class="muted">
			({bank.length}, {placedCount} placed in saved towns, {toldCount} told to the party)
		</span>
	</h2>
	{#if bank.length === 0}
		<p class="card empty muted">None yet. Until you add some, shopkeepers tell built-in rumors.</p>
	{:else}
		<ul class="bank">
			{#each bank as rumour (rumour.id)}
				{@const placed = placements.get(rumour.id) ?? []}
				<li class="card rumour">
					<textarea
						rows="2"
						aria-label="Rumor text"
						value={rumour.text}
						onchange={(e) =>
							e.currentTarget.value.trim() &&
							campaigns.updateRumour(rumour.id, { text: e.currentTarget.value.trim() })}></textarea>
					<div class="row">
						<select
							class="truth {rumour.truth.replace(' ', '-')}"
							aria-label="Is it true?"
							value={rumour.truth}
							onchange={(e) =>
								campaigns.updateRumour(rumour.id, { truth: e.currentTarget.value as Truth })}
						>
							{#each TRUTHS as t (t)}<option value={t}>{t}</option>{/each}
						</select>
						<div class="chips small" role="group" aria-label="Who might tell it">
							{#each ROLES as role (role)}
								<label
									class="chip"
									class:on={rumour.roles.includes(role)}
									title={FAMILY_ROLE_LABELS[role]}
								>
									<input
										type="checkbox"
										checked={rumour.roles.includes(role)}
										onchange={() =>
											campaigns.updateRumour(rumour.id, { roles: toggle(rumour.roles, role) })}
									/>
									<span aria-hidden="true">{families.get(role).emblem}</span>
									<span class="visually-hidden">{FAMILY_ROLE_LABELS[role]}</span>
								</label>
							{/each}
							{#if !rumour.roles.length}<span class="muted any">anyone</span>{/if}
						</div>
						<button class="btn small danger" type="button" onclick={() => remove(rumour)}>
							Delete
						</button>
					</div>
					<p class="placed muted">
						{#if placed.length}
							Placed with
							{#each placed as p, i (p.townId + p.keeper)}
								{i ? ', ' : ''}<a href="{resolve('/towns')}?id={encodeURIComponent(p.townId)}">
									{p.keeper} in {p.town}
								</a>{#if p.told}<span class="told">✓ told</span>{/if}
							{/each}
						{:else}
							Not placed in a saved town yet.
						{/if}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.told {
		color: var(--good);
		font-weight: 600;
		margin-left: 0.3rem;
	}
	.head {
		margin-bottom: 1rem;
	}
	.head p {
		max-width: 68ch;
		margin: 0;
	}
	.bank-title {
		font-size: 1.1rem;
		margin: 0 0 0.6rem;
	}
	.block {
		padding: 1rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.block h2 {
		margin: 0;
	}
	.modes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
		gap: 0.6rem;
	}
	.mode {
		display: flex;
		gap: 0.55rem;
		align-items: flex-start;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--line);
		cursor: pointer;
	}
	.mode.selected {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}
	.mode input {
		width: auto;
		margin-top: 0.25rem;
	}
	.mode small {
		display: block;
		font-size: 0.85rem;
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		border: 0;
		margin: 0;
		padding: 0;
	}
	.stack > span,
	legend {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0;
		margin-bottom: 0.25rem;
	}
	.stack small,
	legend small {
		font-weight: 400;
	}
	.hint {
		margin: -0.35rem 0 0;
		font-size: 0.82rem;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1rem;
	}
	.truth-pick {
		flex: 0 0 auto;
	}
	.actions {
		align-items: center;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.6rem;
		border: 1px solid var(--line);
		font-size: 0.85rem;
		cursor: pointer;
		user-select: none;
	}
	.chip input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.chip:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.chip.on {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		font-weight: 600;
	}
	.chips.small .chip {
		padding: 0.15rem 0.4rem;
		font-size: 1rem;
	}
	.chips.small .chip:not(.on) {
		opacity: 0.55;
	}
	.any {
		font-size: 0.8rem;
	}
	.bank-title {
		margin-top: 1.5rem;
	}
	.bank-title .muted {
		font-weight: 400;
		font-size: 0.9rem;
	}
	.empty {
		padding: 1rem;
		margin: 0;
	}
	.bank {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.rumour {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.rumour .row {
		align-items: center;
	}
	.rumour .row .btn {
		margin-left: auto;
	}
	select.truth {
		width: auto;
		font-size: 0.85rem;
		padding: 0.2rem 2rem 0.2rem 0.4rem;
		background-position:
			right 0.85rem center,
			right calc(0.85rem - 5px) center;
	}
	select.truth.true {
		color: var(--good);
	}
	select.truth.partly-true {
		color: var(--warn);
	}
	select.truth.false {
		color: var(--danger);
	}
	.placed {
		margin: 0;
		font-size: 0.85rem;
	}
</style>
