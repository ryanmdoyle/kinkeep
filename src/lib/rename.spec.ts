import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { generateSettlement } from '#lib/generator.ts';
import { renameFamilyText, renameInTown, renameText } from '#lib/rename.ts';

describe('renameText', () => {
	const ember = [{ from: 'Emberforge', to: 'Ironhand' }];

	it('renames possessives and plurals', () => {
		expect(renameText("Brunna Emberforge's Smithy", ember)).toBe("Brunna Ironhand's Smithy");
		expect(renameText('Every town the Emberforges trade in.', ember)).toBe(
			'Every town the Ironhands trade in.'
		);
	});

	it('leaves other words alone', () => {
		expect(renameText('Emberforged steel, not Emberforgery', ember)).toBe(
			'Emberforged steel, not Emberforgery'
		);
		expect(renameText('Veylstar and Veyl', [{ from: 'Veyl', to: 'Moon' }])).toBe(
			'Veylstar and Moon'
		);
	});

	it('swaps two names at once', () => {
		const swap = [
			{ from: 'Mosswick', to: 'Veyl' },
			{ from: 'Veyl', to: 'Mosswick' }
		];
		expect(renameText('The Mosswick family owes the Veyls', swap)).toBe(
			'The Veyl family owes the Mosswicks'
		);
	});

	it('ignores empty and unchanged names', () => {
		expect(renameText('Hello', [{ from: '', to: 'X' }])).toBe('Hello');
		expect(renameText('Veyl', [{ from: 'Veyl', to: 'Veyl' }])).toBe('Veyl');
	});
});

describe('renameInTown', () => {
	const families = DEFAULT_FAMILIES;
	const town = generateSettlement({ seed: 'rename-1', tier: 'large-city', families });

	it('renames a family everywhere it was written into the town', () => {
		const renames = families.map((f) => ({ from: f.surname, to: `New${f.id}` }));
		const next = renameInTown(town, renames);
		const text = JSON.stringify(
			next.shops.map((s) => [s.name, s.keeper.greeting, s.keeper.quirks, s.keeper.rumour?.text])
		);
		for (const f of families) expect(text).not.toMatch(new RegExp(`\\b${f.surname}s?\\b`));
		expect(next.shops.map((s) => s.stock)).toEqual(town.shops.map((s) => s.stock));
	});

	it('returns the same town when nothing changes', () => {
		expect(renameInTown(town, [{ from: 'Nobodyhere', to: 'X' }])).toBe(town);
	});
});

describe('renameFamilyText', () => {
	it("renames the family's own name and descriptions", () => {
		const ember = DEFAULT_FAMILIES.find((f) => f.id === 'weapons')!;
		const next = renameFamilyText(ember, [{ from: ember.surname, to: 'Ironhand' }]);
		expect(next.groupName).toContain('Ironhand');
		expect(JSON.stringify({ ...next, surname: '' })).not.toMatch(
			new RegExp(`\\b${ember.surname}s?\\b`)
		);
		expect(next.surname).toBe(ember.surname);
	});
});
