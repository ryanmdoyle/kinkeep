-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'dm', 'player');

-- CreateEnum
CREATE TYPE "RumourMode" AS ENUM ('first', 'mix', 'only');

-- CreateEnum
CREATE TYPE "Truth" AS ENUM ('true', 'partly true', 'false');

-- CreateEnum
CREATE TYPE "TownOrigin" AS ENUM ('seed', 'book');

-- CreateEnum
CREATE TYPE "StockSource" AS ENUM ('generated', 'must_have', 'added');

-- CreateEnum
CREATE TYPE "Standing" AS ENUM ('positive', 'neutral', 'negative');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "prefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "avoidRepeats" BOOLEAN NOT NULL DEFAULT true,
    "rumourMode" "RumourMode" NOT NULL DEFAULT 'first',
    "standingPrices" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "campaignId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("campaignId","userId")
);

-- CreateTable
CREATE TABLE "FamilyOverride" (
    "campaignId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FamilyOverride_pkey" PRIMARY KEY ("campaignId","role")
);

-- CreateTable
CREATE TABLE "BankRumour" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "truth" "Truth" NOT NULL,
    "roles" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankRumour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MustHave" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "priceCp" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MustHave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Town" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "origin" "TownOrigin" NOT NULL,
    "seed" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "description" TEXT,
    "shopTotals" JSONB NOT NULL,
    "trades" JSONB NOT NULL,
    "dmNotes" TEXT,
    "contentKeys" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Town_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" UUID NOT NULL,
    "townId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameFixed" BOOLEAN NOT NULL DEFAULT false,
    "orderable" JSONB NOT NULL,
    "restockedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keeper" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "familyRole" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "surname" TEXT,
    "age" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "quirks" TEXT[],
    "quirkKeys" TEXT[],
    "bargaining" TEXT NOT NULL,
    "bargainMod" DOUBLE PRECISION NOT NULL,
    "replacedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Keeper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rumour" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "keeperId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "truth" "Truth" NOT NULL,
    "contentKey" TEXT,
    "bankRumourId" UUID,
    "places" JSONB,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "replacedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rumour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceCp" INTEGER NOT NULL,
    "qty" INTEGER,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "rarity" TEXT,
    "source" "StockSource" NOT NULL DEFAULT 'generated',

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "currentTownId" UUID,
    "playerToken" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyTown" (
    "partyId" UUID NOT NULL,
    "townId" UUID NOT NULL,
    "revealedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyTown_pkey" PRIMARY KEY ("partyId","townId")
);

-- CreateTable
CREATE TABLE "PartyKeeper" (
    "partyId" UUID NOT NULL,
    "keeperId" UUID NOT NULL,
    "metAt" TIMESTAMPTZ(3),
    "standing" "Standing" NOT NULL DEFAULT 'neutral',
    "note" TEXT,

    CONSTRAINT "PartyKeeper_pkey" PRIMARY KEY ("partyId","keeperId")
);

-- CreateTable
CREATE TABLE "PartyRumour" (
    "partyId" UUID NOT NULL,
    "rumourId" UUID NOT NULL,
    "heardAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyRumour_pkey" PRIMARY KEY ("partyId","rumourId")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "keeperId" UUID NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCp" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialOrder" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "keeperId" UUID NOT NULL,
    "itemName" TEXT NOT NULL,
    "priceCp" INTEGER NOT NULL,
    "wait" TEXT NOT NULL,
    "placedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" TIMESTAMPTZ(3),

    CONSTRAINT "SpecialOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignMember_userId_idx" ON "CampaignMember"("userId");

-- CreateIndex
CREATE INDEX "BankRumour_campaignId_idx" ON "BankRumour"("campaignId");

-- CreateIndex
CREATE INDEX "MustHave_campaignId_idx" ON "MustHave"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Town_campaignId_lookupKey_key" ON "Town"("campaignId", "lookupKey");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_townId_type_slot_key" ON "Shop"("townId", "type", "slot");

-- CreateIndex
CREATE INDEX "Keeper_shopId_idx" ON "Keeper"("shopId");

-- CreateIndex
CREATE INDEX "Keeper_campaignId_familyRole_idx" ON "Keeper"("campaignId", "familyRole");

-- CreateIndex
CREATE UNIQUE INDEX "Keeper_current_per_shop" ON "Keeper"("shopId") WHERE ("replacedAt" IS NULL);

-- CreateIndex
CREATE INDEX "Rumour_keeperId_idx" ON "Rumour"("keeperId");

-- CreateIndex
CREATE INDEX "Rumour_campaignId_idx" ON "Rumour"("campaignId");

-- CreateIndex
CREATE INDEX "Rumour_bankRumourId_idx" ON "Rumour"("bankRumourId");

-- CreateIndex
CREATE UNIQUE INDEX "Rumour_current_per_keeper" ON "Rumour"("keeperId") WHERE ("replacedAt" IS NULL);

-- CreateIndex
CREATE INDEX "StockItem_shopId_idx" ON "StockItem"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Party_playerToken_key" ON "Party"("playerToken");

-- CreateIndex
CREATE INDEX "Party_campaignId_idx" ON "Party"("campaignId");

-- CreateIndex
CREATE INDEX "PartyTown_townId_idx" ON "PartyTown"("townId");

-- CreateIndex
CREATE INDEX "PartyKeeper_keeperId_idx" ON "PartyKeeper"("keeperId");

-- CreateIndex
CREATE INDEX "PartyRumour_rumourId_idx" ON "PartyRumour"("rumourId");

-- CreateIndex
CREATE INDEX "Purchase_partyId_idx" ON "Purchase"("partyId");

-- CreateIndex
CREATE INDEX "Purchase_shopId_idx" ON "Purchase"("shopId");

-- CreateIndex
CREATE INDEX "Purchase_keeperId_idx" ON "Purchase"("keeperId");

-- CreateIndex
CREATE INDEX "SpecialOrder_partyId_idx" ON "SpecialOrder"("partyId");

-- CreateIndex
CREATE INDEX "SpecialOrder_shopId_idx" ON "SpecialOrder"("shopId");

-- CreateIndex
CREATE INDEX "SpecialOrder_keeperId_idx" ON "SpecialOrder"("keeperId");

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyOverride" ADD CONSTRAINT "FamilyOverride_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankRumour" ADD CONSTRAINT "BankRumour_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MustHave" ADD CONSTRAINT "MustHave_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keeper" ADD CONSTRAINT "Keeper_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keeper" ADD CONSTRAINT "Keeper_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rumour" ADD CONSTRAINT "Rumour_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rumour" ADD CONSTRAINT "Rumour_keeperId_fkey" FOREIGN KEY ("keeperId") REFERENCES "Keeper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rumour" ADD CONSTRAINT "Rumour_bankRumourId_fkey" FOREIGN KEY ("bankRumourId") REFERENCES "BankRumour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_currentTownId_fkey" FOREIGN KEY ("currentTownId") REFERENCES "Town"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyTown" ADD CONSTRAINT "PartyTown_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyTown" ADD CONSTRAINT "PartyTown_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyKeeper" ADD CONSTRAINT "PartyKeeper_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyKeeper" ADD CONSTRAINT "PartyKeeper_keeperId_fkey" FOREIGN KEY ("keeperId") REFERENCES "Keeper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyRumour" ADD CONSTRAINT "PartyRumour_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyRumour" ADD CONSTRAINT "PartyRumour_rumourId_fkey" FOREIGN KEY ("rumourId") REFERENCES "Rumour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_keeperId_fkey" FOREIGN KEY ("keeperId") REFERENCES "Keeper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrder" ADD CONSTRAINT "SpecialOrder_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrder" ADD CONSTRAINT "SpecialOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialOrder" ADD CONSTRAINT "SpecialOrder_keeperId_fkey" FOREIGN KEY ("keeperId") REFERENCES "Keeper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security
--
-- Supabase serves the public schema to browsers through its Data API. With
-- RLS on and no policies, the anon and signed-in roles can read and write
-- nothing there; the server reaches the data through Prisma, which connects as
-- the tables' owner and isn't subject to RLS. Every new table needs the same
-- line in its migration (src/lib/server/migrations.spec.ts checks).
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FamilyOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankRumour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MustHave" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Town" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Keeper" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rumour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Party" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartyTown" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartyKeeper" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartyRumour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SpecialOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
