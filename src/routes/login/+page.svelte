<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const PROBLEMS: Record<string, string> = {
		'auth-not-configured': "Signing in isn't set up on this server yet.",
		link: "That sign-in link didn't work. It may have expired or been opened in another browser. Try signing in again."
	};

	const message = $derived(
		form && 'message' in form ? form.message : data.problem && PROBLEMS[data.problem]
	);
	let busy = $state(false);
</script>

<svelte:head>
	<title>Sign in · Wares & Whispers</title>
</svelte:head>

<header class="head">
	<h1>Sign in</h1>
	<p class="muted">
		Save your campaigns, towns and parties to your account and pick them up on any device. You don't
		need one to generate towns.
	</p>
</header>

{#if !data.configured}
	<p class="card notice">{PROBLEMS['auth-not-configured']}</p>
{:else if form && 'sent' in form && form.sent}
	<section class="card notice" role="status">
		<h2>Check your email</h2>
		<p>
			We've sent a link to <strong>{form.email}</strong>. Open it to confirm your account and you'll
			be signed in.
		</p>
	</section>
{:else}
	<section class="card auth">
		{#if message}
			<p class="problem" role="alert">{message}</p>
		{/if}

		<!-- A plain form: it leaves for Discord or Google, so no client-side enhancement. -->
		<form method="POST" action="?/oauth" class="providers">
			{#each data.providers as provider (provider.id)}
				<button class="btn" name="provider" value={provider.id}>
					Continue with {provider.label}
				</button>
			{/each}
		</form>

		<p class="or"><span>or with email</span></p>

		<form
			method="POST"
			action="?/signin"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<label>
				<span>Email</span>
				<input
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form && 'email' in form ? form.email : ''}
				/>
			</label>
			<label>
				<span>Password</span>
				<input
					name="password"
					type="password"
					autocomplete="current-password"
					required
					minlength="6"
				/>
			</label>
			<div class="actions">
				<button class="btn primary" disabled={busy}>Sign in</button>
				<button class="btn" formaction="?/signup" disabled={busy}>Create account</button>
			</div>
		</form>
	</section>
{/if}

<style>
	.head,
	.auth,
	.notice {
		max-width: 28rem;
		margin-inline: auto;
	}
	.auth,
	.notice {
		padding: 1rem 1.25rem 1.25rem;
	}
	.auth {
		display: grid;
		gap: 1rem;
	}
	.providers,
	form {
		display: grid;
		gap: 0.6rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
	}
	label span {
		font-weight: 600;
		font-size: 0.92rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.or {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.or::before,
	.or::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--line);
	}
	.problem {
		margin: 0;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid var(--danger);
		background: var(--surface-2);
	}
	.notice h2 {
		margin-top: 0;
	}
</style>
