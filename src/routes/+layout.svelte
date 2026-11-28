<script lang="ts">
	import '../app.css';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { campaigns } from '#lib/stores/campaigns.svelte.ts';
	import { theme } from '#lib/stores/theme.svelte.ts';
	import { view } from '#lib/stores/view.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Player view is a flag on <html> so the stylesheet can hide DM-only parts anywhere.
	$effect(() => {
		document.documentElement.dataset.view = view.players ? 'players' : 'dm';
	});

	// A pinned theme sets color-scheme on <html>; with none, the system setting decides.
	$effect(() => {
		const root = document.documentElement;
		if (theme.chosen) root.dataset.theme = theme.chosen;
		else delete root.dataset.theme;
	});

	const links = [
		{ href: resolve('/'), label: 'Generate', match: '/' },
		{ href: resolve('/towns'), label: 'Saved towns', match: '/towns' },
		{ href: resolve('/party'), label: 'Party', match: '/party' },
		{ href: resolve('/families'), label: 'Families', match: '/families' },
		{ href: resolve('/rumors'), label: 'Rumors', match: '/rumors' },
		{ href: resolve('/campaigns'), label: 'Campaigns', match: '/campaigns' }
	];
</script>

<svelte:head>
	<link rel="icon" href={asset('favicon.svg')} />
	<title>Wares & Whispers: towns, shops and shopkeepers</title>
</svelte:head>

<header class="site-header no-print">
	<div class="inner">
		<a class="brand" href={resolve('/')}>
			<img src={asset('favicon.svg')} alt="" width="28" height="28" />
			<span>Wares &amp; Whispers</span>
		</a>
		<nav aria-label="Main">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.route.id === link.match ? 'page' : undefined}>
					{link.label}
				</a>
			{/each}
		</nav>
		<div class="tools">
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
			<button
				class="theme-toggle"
				type="button"
				onclick={() => theme.toggle()}
				aria-label={theme.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				title={theme.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if theme.current === 'dark'}
					<!-- Sun: shown in dark mode, switches to light. -->
					<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
						<circle cx="12" cy="12" r="4.5" fill="currentColor" />
						<g stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
							<path d="M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
						</g>
					</svg>
				{:else}
					<!-- Moon: shown in light mode, switches to dark. -->
					<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
						<path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
					</svg>
				{/if}
			</button>
			{#if data.user}
				<form class="account" method="POST" action={resolve('/logout')}>
					<span class="who" title={data.user.email}>{data.user.email}</span>
					<button class="btn small" type="submit">Sign out</button>
				</form>
			{:else if data.accounts}
				<a class="btn small" href={resolve('/login')}>Sign in</a>
			{/if}
		</div>
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
	.tools {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}
	.theme-toggle:hover {
		background: var(--surface-2);
		color: var(--ink);
	}
	.account {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.who {
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--muted);
		font-size: 0.88rem;
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
