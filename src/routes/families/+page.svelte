<script lang="ts">
	import EmojiPicker from '#lib/components/EmojiPicker.svelte';
	import { FAMILY_ROLE_LABELS } from '#lib/data/families.ts';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { families } from '#lib/stores/families.svelte.ts';
	import type { Family } from '#lib/types.ts';

	type TextKey =
		'surname' | 'groupName' | 'race' | 'emblem' | 'signature' | 'personality' | 'voice';
	type ListKey = 'greetings' | 'quirks' | 'firstNames' | 'shopNames' | 'adjectives';

	const textFields: { key: TextKey; label: string; long?: boolean }[] = [
		{ key: 'surname', label: 'Family name' },
		{ key: 'groupName', label: 'What folk call them' },
		{ key: 'race', label: 'Race / people' },
		{ key: 'emblem', label: 'Emblem' },
		{ key: 'signature', label: 'Shared look', long: true },
		{ key: 'personality', label: 'Shared personality', long: true },
		{ key: 'voice', label: 'Voice tip for the DM', long: true }
	];

	const listFields: { key: ListKey; label: string; hint: string }[] = [
		{ key: 'greetings', label: 'Greetings', hint: 'One per line. {surname} gets filled in.' },
		{
			key: 'quirks',
			label: 'Personal quirks',
			hint: 'One per line. Each shopkeeper gets 1–2. {surname} gets filled in.'
		},
		{ key: 'firstNames', label: 'First names', hint: 'One per line' },
		{
			key: 'shopNames',
			label: 'Shop names',
			hint: 'One per line. {surname}, {first} and {adj} get filled in.'
		},
		{ key: 'adjectives', label: 'Shop name adjectives', hint: 'One per line, used for {adj}' }
	];

	function setList(family: Family, key: ListKey, value: string) {
		const items = value
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
		families.update(family.id, { [key]: items });
	}
</script>

<header class="head">
	<div>
		<h1>Families in {campaigns.active.name}</h1>
		<p class="muted">
			Each kind of shop is run by the same family everywhere in this campaign. Change anything here
			and every town in the campaign (including saved ones) shows the new details. Unchanged
			families keep picking up new built-in names and quirks; reset a family to get them back after
			editing it. Changes save automatically in this browser.
		</p>
	</div>
	<button
		class="btn danger"
		type="button"
		onclick={() => confirm('Reset every family to the defaults?') && families.reset()}
	>
		Reset all
	</button>
</header>

<div class="families">
	{#each families.list as family (family.id)}
		<details class="card family" style:--family={family.color}>
			<summary>
				<span class="emblem" aria-hidden="true">{family.emblem}</span>
				<span class="titles">
					<span class="role">{FAMILY_ROLE_LABELS[family.id]}</span>
					<strong>
						{family.groupName}
						{#if families.isCustom(family.id)}<span class="custom">customised</span>{/if}
					</strong>
					<span class="muted">{family.race} · {family.personality}</span>
				</span>
			</summary>

			<div class="form">
				{#each textFields as field (field.key)}
					{#if field.key === 'emblem'}
						<div class="field">
							<span id="emblem-{family.id}">{field.label}</span>
							<EmojiPicker
								value={family.emblem}
								labelledby="emblem-{family.id}"
								onpick={(emoji) => families.update(family.id, { emblem: emoji })}
							/>
						</div>
					{:else}
						<label class:wide={field.long}>
							<span>{field.label}</span>
							{#if field.long}
								<textarea
									rows="2"
									value={family[field.key]}
									onchange={(e) =>
										families.update(family.id, { [field.key]: e.currentTarget.value })}></textarea>
							{:else}
								<input
									value={family[field.key]}
									onchange={(e) =>
										families.update(family.id, { [field.key]: e.currentTarget.value })}
								/>
							{/if}
						</label>
					{/if}
				{/each}
				<label>
					<span>Color</span>
					<input
						type="color"
						value={family.color}
						onchange={(e) => families.update(family.id, { color: e.currentTarget.value })}
					/>
				</label>
				{#each listFields as field (field.key)}
					<label class="wide">
						<span>{field.label} <small class="muted">{field.hint}</small></span>
						<textarea
							rows={Math.min(10, Math.max(3, family[field.key].length))}
							value={family[field.key].join('\n')}
							onchange={(e) => setList(family, field.key, e.currentTarget.value)}></textarea>
					</label>
				{/each}
				<div class="wide">
					<button
						class="btn small"
						type="button"
						onclick={() =>
							confirm(`Reset ${family.groupName} to the defaults?`) && families.reset(family.id)}
					>
						Reset this family
					</button>
				</div>
			</div>
		</details>
	{/each}
</div>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.head p {
		max-width: 65ch;
		margin: 0;
	}
	.families {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.family {
		--frame: var(--family);
	}
	summary {
		display: flex;
		gap: 0.85rem;
		align-items: center;
		padding: 0.9rem 1rem;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
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
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.titles strong {
		font-family: var(--serif);
		font-size: 1.2rem;
	}
	.titles .muted {
		font-size: 0.9rem;
	}
	.custom {
		font-family: var(--sans, inherit);
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent);
		margin-left: 0.35rem;
		vertical-align: middle;
	}
	.role {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	.form {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
		gap: 0.75rem 1rem;
		padding: 0 1rem 1rem;
	}
	.form label span,
	.form .field > span {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.2rem;
	}
	.form small {
		font-weight: 400;
	}
	.wide {
		grid-column: 1 / -1;
	}
	input[type='color'] {
		padding: 0.2rem;
		height: 2.5rem;
	}
</style>
