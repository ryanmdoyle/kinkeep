/**
 * A version 7 UUID: the first 48 bits are the time, so ids made together sort
 * together and new rows land at the end of an index instead of all over it.
 */
export function uuid7(now = Date.now()): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	// ToInt32 in `&` keeps the low 32 bits, so each byte comes out right.
	for (let i = 0; i < 6; i++) bytes[i] = Math.floor(now / 2 ** (8 * (5 - i))) & 0xff;
	bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
