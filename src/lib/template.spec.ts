import { describe, expect, it } from 'vitest';
import { article, fillTemplate, plural } from '#lib/template.ts';

describe('article', () => {
	it('picks a or an by sound', () => {
		expect(article('owlbear')).toBe('an');
		expect(article('wyvern')).toBe('a');
		expect(article('unicorn')).toBe('a');
		expect(article('hour')).toBe('an');
		expect(article('ettin', true)).toBe('An');
	});
});

describe('plural', () => {
	it('pluralizes names', () => {
		expect(plural('Emberforge')).toBe('Emberforges');
		expect(plural('Marsh')).toBe('Marshes');
		expect(plural('Veyl')).toBe('Veyls');
		expect(plural('Dandy')).toBe('Dandys');
	});
	it('pluralizes words', () => {
		expect(plural('harpy')).toBe('harpies');
		expect(plural('dire wolf')).toBe('dire wolves');
		expect(plural('basilisk')).toBe('basilisks');
		expect(plural('fox')).toBe('foxes');
	});
});

describe('fillTemplate', () => {
	it('fixes articles and plurals around placeholders', () => {
		expect(fillTemplate('A {monster} took a sheep.', { monster: 'owlbear' })).toBe(
			'An owlbear took a sheep.'
		);
		expect(fillTemplate('off a {monster}, then an {monster}', { monster: 'troll' })).toBe(
			'off a troll, then a troll'
		);
		expect(fillTemplate('the {surname}s trade here', { surname: 'Marsh' })).toBe(
			'the Marshes trade here'
		);
		expect(fillTemplate("{surname}'s Sundries", { surname: 'Marsh' })).toBe("Marsh's Sundries");
		expect(fillTemplate('A {surname} never forgets', { surname: 'Ashford' })).toBe(
			'An Ashford never forgets'
		);
	});
	it('leaves unknown placeholders and other words alone', () => {
		expect(fillTemplate('a {Place} near {place}', { place: 'Oakford' })).toBe(
			'a {Place} near Oakford'
		);
		expect(fillTemplate('Oma {monster}', { monster: 'ogre' })).toBe('Oma ogre');
	});
});
