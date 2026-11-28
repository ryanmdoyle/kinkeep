<script lang="ts">
	import '../app.css';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { view } from '#lib/stores/view.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Player view is a flag on <html> so the stylesheet can hide DM-only parts anywhere.
	$effect(() => {
		document.documentElement.dataset.view = view.players ? 'players' : 'dm';
	});

	const links = [
		{ href: resolve('/'), label: 'Generate', match: '/' },
		{ href: resolve('/towns'), label: 'Saved towns', match: '/towns' },
		{ href: resolve('/party'), label: 'Party', match: '/party' },
		{ href: resolve('/families'), label: 'Families', match: '/families' },
		{ href: resolve('/rumours'), label: 'Rumours', match: '/rumours' },
		{ href: resolve('/campaigns'), label: 'Campaigns', match: '/campaigns' }
	];
</script>

<svelte:head>
	<link rel="icon" href={asset('favicon.svg')} />
	<title>Kinkeep: settlements & shopkeepers</title>
</svelte:head>

<header class="site-header no-print">
	<div class="inner">
		<a class="brand" href={resolve('/')}>
			<img src={asset('favicon.svg')} alt="" width="28" height="28" />
			<span>Kinkeep</span>
		</a>
		<nav aria-label="Main">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.route.id === link.match ? 'page' : undefined}>
					{link.label}
				</a>
			{/each}
		</nav>
		<label class="campaign">
			<span class="visually-hidden">Campaign</span>
			<select
				value={campaigns.active.id}
				onchange={(e) => campaigns.select(e.currentTarget.value)}
				title="Towns, families and used content belong to the campaign"
			>
				{#each campaigns.list as c (c.id)}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
		</label>
	</div>
</header>

{#if view.players}
	<div class="view-bar" role="status">
		<span><strong>Player view</strong> · only what the party can see</span>
		<span class="view-actions">
			<button class="btn small" type="button" onclick={() => window.print()}>Print</button>
			<button class="btn small primary" type="button" onclick={() => view.toggle(false)}>
				Back to DM view
			</button>
		</span>
	</div>
{/if}

<main>
	{@render children()}
</main>

<style>
	.site-header {
		border-bottom: 1px solid var(--line);
		background: var(--surface);
	}
	.inner {
		max-width: 1100px;
		margin: 0 auto;
		padding: 0.6rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--serif);
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--ink);
		text-decoration: none;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.campaign select {
		max-width: 14rem;
		padding: 0.3rem 2.25rem 0.3rem 0.5rem;
		font-size: 0.9rem;
	}
	nav a {
		padding: 0.4rem 0.7rem;
		color: var(--muted);
		text-decoration: none;
	}
	nav a:hover {
		background: var(--surface-2);
		color: var(--ink);
	}
	nav a[aria-current='page'] {
		background: var(--surface-2);
		color: var(--ink);
		font-weight: 600;
	}
	.view-bar {
		position: sticky;
		top: 0;
		z-index: 5;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		padding: 0.5rem 1rem;
		background: var(--surface-2);
		border-bottom: 2px solid var(--accent);
		font-size: 0.92rem;
	}
	.view-actions {
		display: flex;
		gap: 0.5rem;
	}
	@media print {
		.view-bar {
			display: none;
		}
	}
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.25rem 1rem 4rem;
	}
</style>
