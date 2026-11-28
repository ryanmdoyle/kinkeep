<script lang="ts">
	/**
	 * Pick a family emblem without hunting for an emoji keyboard. A hand-picked
	 * set of fantasy-shop emoji in tabs, plus a box for pasting any other one.
	 */
	let {
		value,
		labelledby,
		onpick
	}: { value: string; labelledby?: string; onpick: (emoji: string) => void } = $props();

	// Space-separated. Kept to emoji from Unicode 13 or earlier so they show on older devices too.
	const GROUPS: { name: string; icon: string; emoji: string }[] = [
		{
			name: 'Food & drink',
			icon: '🍺',
			emoji: '🍺 🍻 🍷 🍶 🥃 🍵 ☕ 🍞 🥖 🥨 🧀 🍖 🍗 🥩 🍲 🥧 🍰 🍯 🍎 🍐 🍇 🥕 🧅 🧄 🍄 🥚 🐟 🦪'
		},
		{
			name: 'Goods & trade',
			icon: '🧺',
			emoji:
				'🧺 🪣 🧶 🧵 🪡 🕯️ 🪔 🏺 ⚱️ 🪵 🧱 🧳 👜 🎒 ' +
				'👢 👒 🎩 🧥 💍 💎 📿 🪞 🗝️ 🔑 ⚖️ 🪙 💰 📜 ' +
				'📖 📚 🖋️ 🗺️ 🧭 ⏳ 🔔 🎻 🪕 🥁 🎲 🃏'
		},
		{
			name: 'Tools & smithing',
			icon: '⚒️',
			emoji: '⚒️ 🔨 🪓 ⛏️ 🔧 🪛 ⚙️ 🔩 ⛓️ 🪝 🧲 🔥 🪚 🧰 ⚓ 🛠️ 🪜 🧹'
		},
		{
			name: 'Weapons & armor',
			icon: '⚔️',
			emoji: '⚔️ 🗡️ 🏹 🛡️ 🪃 🔱 🪖 🏰 🐎 🎯 💣 🧨'
		},
		{
			name: 'Potions & magic',
			icon: '🔮',
			emoji: '⚗️ 🧪 🔮 🪄 ✨ 🌟 ⭐ 🌙 ☀️ 🌀 💫 🧿 🕸️ 💀 ☠️ 🦴 🧙 🐉 🧚 👁️ 🔯 ☯️ ♾️ ⚡ 🌈 💧'
		},
		{
			name: 'Nature & herbs',
			icon: '🌿',
			emoji: '🌿 🍀 ☘️ 🌱 🌾 🌲 🌳 🍁 🍂 🍃 🌸 🌹 🌻 🌷 🌵 🪴 🐚 ❄️ 🌊 ⛰️ 🌋 🪨'
		},
		{
			name: 'Animals',
			icon: '🦉',
			emoji: '🐻 🐺 🦊 🦉 🦅 🐍 🐸 🐢 🦎 🐗 🐂 🐐 🐑 🐓 🦆 🐈 🐕 🐀 🦇 🐝 🦋 🐌 🕷️ 🦀 🐙 🐋 🦄 🦌'
		},
		{
			name: 'Symbols',
			icon: '⚜️',
			emoji: '⚜️ 👑 ❤️ 🖤 💚 💙 💜 🤍 🔺 🔷 🔶 ⚫ ⚪ 🟤 ♠️ ♥️ ♦️ ♣️ 🏳️ 🏴 🚩 ☮️ ✴️'
		}
	];

	const uid = $props.id();
	let open = $state(false);
	let tab = $state(0);
	let custom = $state('');
	let root = $state<HTMLDivElement>();
	let trigger = $state<HTMLButtonElement>();

	function toggle() {
		if (!open) {
			// Start on the tab holding the current emblem, if any.
			const found = GROUPS.findIndex((g) => g.emoji.split(' ').includes(value));
			tab = found >= 0 ? found : 0;
			custom = '';
		}
		open = !open;
	}

	function pick(emoji: string) {
		const clean = emoji.trim();
		if (!clean) return;
		onpick(clean);
		close();
	}

	function close() {
		open = false;
		trigger?.focus();
	}
</script>

<svelte:window
	onpointerdown={(e) => {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}}
/>

<div class="picker" bind:this={root}>
	<button
		bind:this={trigger}
		type="button"
		class="trigger"
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-labelledby={labelledby ? `${labelledby} ${uid}-current` : undefined}
		onclick={toggle}
	>
		<span class="current" id="{uid}-current">{value || '—'}</span>
		<span class="change">{open ? 'Close' : 'Choose…'}</span>
	</button>

	{#if open}
		<div
			class="panel"
			role="dialog"
			aria-label="Choose an emblem"
			tabindex="-1"
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					e.stopPropagation();
					close();
				}
			}}
		>
			<div class="tabs" role="tablist" aria-label="Emoji groups">
				{#each GROUPS as group, i (group.name)}
					<button
						type="button"
						role="tab"
						id="{uid}-tab-{i}"
						aria-selected={tab === i}
						aria-controls="{uid}-grid"
						title={group.name}
						class:on={tab === i}
						onclick={() => (tab = i)}
					>
						<span aria-hidden="true">{group.icon}</span>
						<span class="visually-hidden">{group.name}</span>
					</button>
				{/each}
			</div>
			<p class="group-name">{GROUPS[tab].name}</p>
			<div class="grid" id="{uid}-grid" role="tabpanel" aria-labelledby="{uid}-tab-{tab}">
				{#each GROUPS[tab].emoji.split(' ') as emoji (emoji)}
					<button
						type="button"
						class="emoji"
						class:chosen={emoji === value}
						aria-pressed={emoji === value}
						onclick={() => pick(emoji)}
					>
						{emoji}
					</button>
				{/each}
			</div>
			<form
				class="custom"
				onsubmit={(e) => {
					e.preventDefault();
					pick(custom);
				}}
			>
				<label for="{uid}-custom">Or paste any emoji</label>
				<div class="custom-row">
					<input id="{uid}-custom" bind:value={custom} autocomplete="off" maxlength="16" />
					<button class="btn small" type="submit" disabled={!custom.trim()}>Use</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	.picker {
		position: relative;
	}
	/* Looks like the other ruled fields. */
	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		min-height: 2.5rem;
		padding: 0.2rem 0.5rem;
		background-color: var(--bg);
		border: 0;
		border-bottom: 2px solid var(--muted);
		box-shadow: inset 0 1px 3px rgb(60 40 20 / 0.15);
		cursor: pointer;
		text-align: left;
	}
	.trigger:hover,
	.trigger[aria-expanded='true'] {
		border-bottom-color: var(--accent);
	}
	.current {
		font-size: 1.5rem;
		line-height: 1;
	}
	.change {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--action);
	}
	.panel {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 20;
		width: min(21rem, calc(100vw - 2rem));
		padding: 0.6rem;
		background: var(--surface);
		border-top: 4px solid var(--accent);
		border-bottom: 4px solid var(--accent);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.22);
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem;
		border-bottom: 1px solid var(--line);
		padding-bottom: 0.35rem;
	}
	.tabs button {
		flex: 1;
		min-width: 2.2rem;
		height: 2.2rem;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		font-size: 1.15rem;
		cursor: pointer;
		opacity: 0.6;
	}
	.tabs button:hover {
		opacity: 1;
	}
	.tabs button.on {
		opacity: 1;
		border-bottom-color: var(--accent);
	}
	.group-name {
		margin: 0.4rem 0 0.3rem;
		font-family: var(--serif);
		font-variant: small-caps;
		color: var(--accent);
		font-weight: 700;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(2.3rem, 1fr));
		gap: 0.15rem;
		max-height: 13rem;
		overflow-y: auto;
	}
	.emoji {
		height: 2.3rem;
		border: 1px solid transparent;
		background: none;
		font-size: 1.35rem;
		line-height: 1;
		cursor: pointer;
	}
	.emoji:hover {
		background: var(--surface-2);
	}
	.emoji.chosen {
		border-color: var(--action);
		background: color-mix(in srgb, var(--action) 14%, transparent);
	}
	.custom {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--line);
	}
	.custom label {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		margin-bottom: 0.2rem;
	}
	.custom-row {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}
	.custom-row input {
		min-height: 2.1rem;
	}
</style>
