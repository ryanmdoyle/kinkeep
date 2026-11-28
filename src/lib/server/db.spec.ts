import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_FAMILIES } from '#lib/data/families.ts';
import { generateSettlement } from '#lib/generator.ts';
import { renderSettlement, tokenFamilies } from '#lib/render.ts';
import { sell, setNote, setOrder, setRelation, setRumourTold, setVisited } from '#lib/tracking.ts';
import { uuid7 } from './ids.ts';
import { PrismaClient } from './prisma-node/client.ts';
import { partyRows, rowsToSettlement, townInclude, townToRows } from './rows.ts';

/*
 * Database tests. They need a Postgres with the migrations applied, e.g. a
 * local one:
 *
 *   TEST_DATABASE_URL=postgresql://postgres@localhost:5432/ww_test npm run test:db
 *
 * Each test makes its own campaign and deletes it afterwards. Without
 * TEST_DATABASE_URL they're skipped.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('database', () => {
	let db: PrismaClient;
	const userId = uuid7();

	beforeAll(async () => {
		db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
		await db.profile.create({ data: { id: userId, displayName: 'Test DM' } });
	});

	afterAll(async () => {
		await db.profile.delete({ where: { id: userId } });
		await db.$disconnect();
	});

	async function newCampaign() {
		return db.campaign.create({
			data: {
				name: 'Test campaign',
				members: { create: { userId, role: 'owner' } },
				parties: { create: { name: 'The party' } }
			},
			include: { parties: true }
		});
	}

	it('saves a played town and reads it back as the party sees it', async () => {
		let town = generateSettlement({
			seed: 'db-trip',
			tier: 'small-city',
			families: tokenFamilies(DEFAULT_FAMILIES)
		});
		const [a, b, c, d] = town.shops;
		town = setVisited(town, a.id, true);
		town = setRelation(town, a.id, 'negative');
		town = setNote(town, b.id, 'Note before meeting them');
		town = setRumourTold(town, c.id, true);
		town = sell(town, d.id, d.stock.find((i) => i.qty > 1)!.name, 1);
		const o = town.shops.find((s) => s.specialOrders.length)!;
		town = setOrder(town, o.id, o.specialOrders[0].name, 'order', '2026-11-20');

		const campaign = await newCampaign();
		const party = campaign.parties[0];
		try {
			const rows = townToRows(town, { campaignId: campaign.id });
			const record = partyRows(town, rows, { partyId: party.id, here: true });
			await db.$transaction([
				db.town.create({ data: rows.town }),
				db.shop.createMany({ data: rows.shops }),
				db.keeper.createMany({ data: rows.keepers }),
				db.rumour.createMany({ data: rows.rumours }),
				db.stockItem.createMany({ data: rows.stock }),
				db.partyTown.create({ data: record.town! }),
				db.partyKeeper.createMany({ data: record.keepers }),
				db.partyRumour.createMany({ data: record.rumours }),
				db.purchase.createMany({ data: record.purchases }),
				db.specialOrder.createMany({ data: record.orders }),
				db.party.update({ where: { id: party.id }, data: { currentTownId: rows.town.id } })
			]);

			const read = await db.town.findUniqueOrThrow({
				where: { id: rows.town.id },
				include: townInclude
			});
			const [keepers, heard, orders] = await Promise.all([
				db.partyKeeper.findMany({ where: { partyId: party.id } }),
				db.partyRumour.findMany({ where: { partyId: party.id } }),
				db.specialOrder.findMany({ where: { partyId: party.id } })
			]);
			const back = rowsToSettlement(read, {
				keepers,
				heard: heard.map((h) => h.rumourId),
				orders
			});
			expect(back).toEqual({ ...town, id: rows.town.id, campaignId: campaign.id });
			expect(
				renderSettlement(back, DEFAULT_FAMILIES)
					.shops.map((s) => s.name)
					.join()
			).not.toMatch(/\{fam_/);

			// One current keeper per shop.
			await expect(
				db.keeper.create({ data: { ...rows.keepers[0], id: uuid7() } })
			).rejects.toThrow();
		} finally {
			await db.campaign.delete({ where: { id: campaign.id } });
		}
		// Deleting the campaign took everything in it.
		expect(await db.keeper.count({ where: { campaignId: campaign.id } })).toBe(0);
		expect(await db.purchase.count({ where: { partyId: party.id } })).toBe(0);
	});
});
