<script lang="ts">
	import { resolve } from '$app/paths';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';

	/**
	 * A one-line notice that the campaign has town minimums, which opens a
	 * popup listing them. Shows nothing when the campaign has none.
	 */
	const uid = $props.id();
	const popupId = `town-minimums-${uid}`;
	const list = $derived(campaigns.active.mustHaves ?? []);
</script>

{#if list.length}
	<p class="notice no-print">
		<button class="trigger" type="button" popovertarget={popupId}>
			<span class="icon" aria-hidden="true">i</span>
			Town minimums are active for this campaign
		</button>
	</p>
	<div class="popup" id={popupId} popover="auto" aria-labelledby="{popupId}-title">
		<h2 id="{popupId}-title">Town minimums</h2>
		<p>
			Every town in {campaigns.active.name} keeps these somewhere, even one too small to sell them:
		</p>
		<ul>
			{#each list as item (item.name)}
				<li><strong>{item.name}</strong> × {item.qty}</li>
			{/each}
		</ul>
		<p class="muted small">
			They go to a shop that would sell them, or the back of the general store, for a quarter more
			where the town is too small to stock them. On the shop they're marked "kept in the back".
		</p>
		<div class="actions">
			<a class="btn small" href="{resolve('/campaigns')}#town-minimums">Change them</a>
			<button class="btn small" type="button" popovertarget={popupId} popovertargetaction="hide">
				Close
			</button>
		</div>
	</div>
{/if}

<style>
	.notice {
		margin: 0 0 1rem;
	}
	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		background: none;
		border: 0;
		padding: 0.2rem 0;
		color: var(--muted);
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.trigger:hover {
		color: var(--ink);
	}
	.icon {
		display: inline-grid;
		place-items: center;
		width: 1.15rem;
		height: 1.15rem;
		border: 1.5px solid var(--accent);
		border-radius: 50%;
		color: var(--accent);
		font-family: var(--serif);
		font-style: italic;
		font-weight: 700;
		font-size: 0.8rem;
		line-height: 1;
	}
	.popup {
		width: min(26rem, calc(100vw - 2rem));
		padding: 1rem 1.1rem;
		background: var(--surface);
		color: var(--ink);
		border: 0;
		border-top: 4px solid var(--accent);
		border-bottom: 4px solid var(--accent);
		box-shadow: var(--shadow);
	}
	.popup::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	h2 {
		margin: 0 0 0.5rem;
		font-family: var(--serif);
		font-variant: small-caps;
		color: var(--accent);
		font-size: 1.2rem;
	}
	p {
		margin: 0 0 0.5rem;
	}
	ul {
		margin: 0 0 0.6rem;
		padding-left: 1.2rem;
	}
	.small {
		font-size: 0.85rem;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
</style>
