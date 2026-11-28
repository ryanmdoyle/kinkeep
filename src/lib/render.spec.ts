import { describe, expect, it } from 'vitest';
import { usedKeys } from '#lib/content/keys.ts';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { REGIONS } from '#lib/data/regions.ts';
import { TIERS } from '#lib/data/tiers.ts';
import { detailAnotherShop, generateSettlement } from '#lib/generator.ts';
import {
	familyToken,
	renderFamily,
	renderSettlement,
	renderText,
	tokenFamilies,
	tokenizeFamily,
	tokenizeSettlement,
	tokenizeText
} from '#lib/render.ts';
import { renameInTown } from '#lib/rename.ts';
import type { Family, Settlement, ShopType } from '#lib/types.ts';

const families = DEFAULT_FAMILIES;
const tokens = tokenFamilies(families);
const strip = (town: Settlement) => ({ ...town, createdAt: '' });

/** Every size in every region, a few seeds each. */
const SEEDS = TIERS.flatMap((tier) =>
	REGIONS.flatMap((region) =>
		[1, 2].map((n) => ({
			seed: `render-${tier.id}-${region.id}-${n}`,
			tier: tier.id,
			region: region.id
		}))
	)
);

function textOf(town: Settlement): string {
	return JSON.stringify(
		town.shops.map((s) => [s.name, s.keeper.greeting, s.keeper.quirks, s.keeper.rumour?.text])
	);
}

describe('building with surname placeholders', () => {
	it('builds the same town, with placeholders where surnames go', () => {
		let placeholders = 0;
		for (const opts of SEEDS) {
			const plain = generateSettlement({ ...opts, families });
			const stored = generateSettlement({ ...opts, families: tokens });
			expect(textOf(stored)).not.toMatch(
				/Hearthscale|Pennywhistle|Emberforge|Thornhide|Mosswick|Veyl/
			);
			if (textOf(stored).includes('{fam_')) placeholders++;
			expect(strip(renderSettlement(stored, families))).toEqual(strip(plain));
		}
		expect(placeholders).toBeGreaterThan(SEEDS.length / 2);
	});

	it('keeps avoiding repeats the same way across a campaign', () => {
		let plainAvoid = new Set<string>();
		let storedAvoid = new Set<string>();
		for (let n = 0; n < 12; n++) {
			const opts = { seed: `campaign-${n}`, tier: 'large-town' as const };
			const plain = generateSettlement({ ...opts, families, avoid: plainAvoid });
			const stored = generateSettlement({ ...opts, families: tokens, avoid: storedAvoid });
			expect(strip(renderSettlement(stored, families))).toEqual(strip(plain));
			plainAvoid = new Set([...plainAvoid, ...usedKeys(plain)]);
			storedAvoid = new Set([...storedAvoid, ...usedKeys(stored)]);
		}
	});

	it('details extra shops the same way', () => {
		const opts = { seed: 'render-city', tier: 'large-city' as const };
		let plain = generateSettlement({ ...opts, families });
		let stored = generateSettlement({ ...opts, families: tokens });
		for (const type of ['weapons', 'inn', 'magic'] as ShopType[]) {
			plain = detailAnotherShop(plain, type, { families });
			stored = detailAnotherShop(stored, type, { families: tokens });
		}
		expect(strip(renderSettlement(stored, families))).toEqual(strip(plain));
	});
});

describe('renaming a family', () => {
	const renamed = (id: Family['id'], surname: string) =>
		families.map((f) => (f.id === id ? { ...f, surname } : f));

	it('shows exactly what building the town with the new name would', () => {
		for (const opts of SEEDS.slice(0, 40)) {
			const stored = generateSettlement({ ...opts, families: tokens });
			for (const f of families) {
				for (const surname of ['Ironhand', 'Marsh']) {
					const shown = renderSettlement(stored, renamed(f.id, surname));
					const fresh = generateSettlement({ ...opts, families: renamed(f.id, surname) });
					expect(strip(shown)).toEqual(strip(fresh));
				}
			}
		}
	});

	it('matches renaming saved towns today, and fixes its a/an and plurals', () => {
		const opts = { seed: 'render-rename', tier: 'small-city' as const };
		const plain = generateSettlement({ ...opts, families });
		const stored = generateSettlement({ ...opts, families: tokens });
		const shown = renderSettlement(stored, renamed('weapons', 'Ironhand'));
		const today = renameInTown(plain, [{ from: 'Emberforge', to: 'Ironhand' }]);
		expect(strip(shown)).toEqual(strip(today));
		// Today's rename writes "a Ironhand" and "the Marshs"; placeholders don't.
		expect(renderText('a {fam_inn}, the {fam_inn}s', renamed('inn', 'Ironmarsh'))).toBe(
			'an Ironmarsh, the Ironmarshes'
		);
	});

	it('gets plurals and articles right for the new name', () => {
		const text = `The {fam_weapons}s are a {fam_weapons} sort. A {fam_inn} told me.`;
		expect(renderText(text, renamed('weapons', 'Marsh'))).toBe(
			'The Marshes are a Marsh sort. A Hearthscale told me.'
		);
		expect(renderText(text, renamed('inn', 'Oakbarrel'))).toBe(
			'The Emberforges are an Emberforge sort. An Oakbarrel told me.'
		);
	});
});

describe('turning typed surnames into placeholders', () => {
	it('finds whole names, plurals and possessives', () => {
		expect(tokenizeText("Ask the Pennywhistles, or Brunna Emberforge's cousin.", families)).toBe(
			"Ask the {fam_general}s, or Brunna {fam_weapons}'s cousin."
		);
		const marsh = families.map((f) => (f.id === 'armor' ? { ...f, surname: 'Marsh' } : f));
		expect(tokenizeText('The Marshes are back', marsh)).toBe('The {fam_armor}s are back');
		expect(renderText(tokenizeText('The Marshes are back', marsh), marsh)).toBe(
			'The Marshes are back'
		);
	});

	it('leaves other words alone', () => {
		const text = 'Emberforged steel from the Veylstar mines, for Mosswickians.';
		expect(tokenizeText(text, families)).toBe(text);
		expect(tokenizeText('Nothing to see', families)).toBe('Nothing to see');
	});

	it('round-trips an imported town', () => {
		for (const opts of SEEDS.slice(0, 40)) {
			const plain = generateSettlement({ ...opts, families });
			const stored = tokenizeSettlement(plain, families);
			expect(textOf(stored)).not.toMatch(
				/Hearthscale|Pennywhistle|Emberforge|Thornhide|Mosswick|Veyl/
			);
			expect(renderSettlement(stored, families)).toEqual(plain);
		}
	});

	it('ignores names that are already placeholders', () => {
		expect(tokenizeText('{fam_inn} and Veyl', tokens)).toBe('{fam_inn} and Veyl');
		expect(familyToken('magic')).toBe('{fam_magic}');
	});
});

describe('family descriptions', () => {
	const weapons = families.find((f) => f.id === 'weapons')!;

	it("stores the family's own name as {surname} and shows it filled in", () => {
		const stored = tokenizeFamily(weapons, families);
		expect(stored.groupName).toBe('Clan {surname}');
		expect(renderFamily(stored, families).groupName).toBe('Clan Emberforge');
		const ironhand = { ...stored, surname: 'Ironhand' };
		expect(renderFamily(ironhand, families).groupName).toBe('Clan Ironhand');
	});

	it('catches both the old and new name when renaming and editing at once', () => {
		const edited = {
			...weapons,
			surname: 'Ironhand',
			groupName: 'Clan Emberforge',
			voice: 'Proud to be an Ironhand. Wary of the Pennywhistles.'
		};
		const stored = tokenizeFamily(edited, families);
		expect(stored.groupName).toBe('Clan {surname}');
		expect(stored.voice).toBe('Proud to be an {surname}. Wary of the {fam_general}s.');
		const shown = renderFamily(stored, families);
		expect(shown.voice).toBe('Proud to be an Ironhand. Wary of the Pennywhistles.');
	});

	it('keeps {surname} in templates, ready for the generator', () => {
		const stored = tokenizeFamily(weapons, families);
		expect(stored.greetings).toEqual(weapons.greetings);
		expect(renderFamily(stored, families).greetings).toEqual(weapons.greetings);
	});
});
