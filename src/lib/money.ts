/**
 * Prices are stored in gold pieces (gp) as plain numbers, e.g. 0.05 = 5 cp.
 */

/** Rounds a price to something a shopkeeper would actually ask for. */
export function roundPrice(gp: number): number {
	if (gp >= 100) return Math.round(gp / 5) * 5;
	if (gp >= 10) return Math.round(gp);
	if (gp >= 1) return Math.round(gp * 10) / 10; // nearest silver
	return Math.max(0.01, Math.round(gp * 100) / 100); // nearest copper
}

/** 2.5 -> "2 gp 5 sp", 0.04 -> "4 cp", 1500 -> "1,500 gp". */
export function formatPrice(gp: number): string {
	const totalCp = Math.round(gp * 100);
	const g = Math.floor(totalCp / 100);
	const s = Math.floor((totalCp % 100) / 10);
	const c = totalCp % 10;
	const parts: string[] = [];
	if (g) parts.push(`${g.toLocaleString('en-US')} gp`);
	if (s) parts.push(`${s} sp`);
	if (c) parts.push(`${c} cp`);
	return parts.length ? parts.join(' ') : '0 cp';
}
