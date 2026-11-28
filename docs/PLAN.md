# Wares & Whispers: from sandbox to live app

The plan for moving Wares & Whispers from a static, browser-only app to a hosted app with
accounts, a database, multiple parties per campaign and a player view.

All of this work happens on the `claude/app-architecture-schema-n851fx` branch. `main` keeps
deploying the current static site to GitHub Pages (the workflow only runs on `main`), so nothing
here touches the live site until the branch is merged at cutover.

## Decisions

| Question     | Decision                                                                       |
| ------------ | ------------------------------------------------------------------------------ |
| Framework    | Keep SvelteKit + Svelte 5                                                      |
| Auth         | Supabase Auth: email/password, plus Discord and Google                         |
| Database     | Supabase Postgres, accessed only from the server with Prisma                   |
| Hosting      | Cloudflare Workers (`adapter-cloudflare`), Postgres reached through Hyperdrive |
| Live updates | Supabase Realtime **broadcast** (a "something changed" ping; no data in it)    |
| Generator    | Stays public: anyone can build towns from seeds and links without an account   |
| Players      | Start with a read-only link per party (no player accounts); accounts later     |
| Parties      | A campaign (the world) can have several parties; it starts with one            |

## Architecture in one page

**Code owns the content; the database owns the campaign.** Item lists, sizes, regions, built-in
families and rumour tables stay as versioned TypeScript tables (seed stability depends on it).
The database stores only what a DM made or what a party did.

**Three kinds of logic:**

1. _Pure rules_ (`src/lib`): the generator, prices, standing, must-haves, word of kin, search,
   templates. Unchanged, runs in the browser (public generator) and on the server.
2. _Sync code_ that exists only because data is copied (renaming surnames across towns, scanning
   every town for used names, walking every town for the Party page). Replaced by references
   (surname placeholders, foreign keys) and queries.
3. _User actions_ (`src/lib/server`): one thin function per action. It checks access, loads,
   runs the pure function, writes in a transaction and pings the party's players.

**Surnames are stored as placeholders.** Generated text stores `{fam_weapons}` where the
weapons family's surname goes and fills it in for display, so renaming a family is a one-row
update. DM-typed text gets the same treatment when it's saved.

**What players see is built on the server.** Rumour truth, quirks, bargaining, notes and anything
the party hasn't seen are never sent to a player's browser.

**World state vs party state.** Towns, shops, keepers, stock and rumours belong to the campaign.
Who met whom, standing, notes about keepers, rumours heard, purchases, orders, revealed towns and
current location belong to a party. Stock is shared: if one party buys the last longsword, it's
gone for everyone.

The schema is in [`prisma/schema.prisma`](../prisma/schema.prisma).

## Ground rules

- `npm test`, `npm run check` and `npm run build` pass after every step.
- The golden seed tests never change for a released content version.
- Schema changes only through Prisma migrations. RLS is on for every table, with no policies: the
  server (Prisma) bypasses it and the browser's Supabase key can read nothing.
- Prices are whole copper pieces in the database (`priceCp`), gold pieces in the app.
- DM-only fields are stripped on the server, never hidden with CSS for players.

## Steps

Legend: 🧑 needs you (accounts, keys, clicks in a dashboard) · 🤖 code on this branch

### Phase 1: Groundwork (pure code, nothing external)

- [x] 🤖 1.1 This plan
- [x] 🤖 1.2 Surname placeholders: `src/lib/render.ts` (`tokenFamilies`, `renderText`,
      `tokenizeText`, `renderSettlement`, `tokenizeSettlement`, `renderFamily`,
      `tokenizeFamily`). Test: for every golden seed, building with placeholders and filling them
      in gives exactly today's town.
- [x] 🤖 1.3 Copper-piece helpers for the database boundary

### Phase 2: Schema

- [x] 🤖 2.1 Prisma 7, `prisma/schema.prisma`, `prisma.config.ts`
- [x] 🤖 2.2 Initial migration SQL (generated, plus RLS on every table, checked by a test)
- [x] 🤖 2.3 Mapping layer (`src/lib/server/rows.ts`): a `Settlement` to rows and back, with a
      party's state merged in, so the existing UI and pure functions keep working. Round-trip
      tests, plus `npm run test:db` against a real Postgres.

### Phase 3: Platform

- [ ] 🧑 3.1 Supabase project. Collect: project URL, anon (publishable) key, service role
      (secret) key, session pooler and direct connection strings.
- [ ] 🧑 3.2 Supabase Auth settings (details under "Setting up Supabase" below)
- [ ] 🧑 3.3 Cloudflare: Hyperdrive and a Worker (details under "Setting up Cloudflare" below)
- [ ] 🧑 3.4 Run the first migration from your machine: `npm run db:migrate` (with `DIRECT_URL`
      in `.env`)
- [x] 🤖 3.5 `adapter-cloudflare`, `wrangler.jsonc` (Hyperdrive binding, `nodejs_compat`),
      Prisma client opened per request, `/api/health` that runs a query. Checked in workerd
      locally against Postgres through the Hyperdrive binding: concurrent requests work and no
      connections are left open. The Worker is about 1.6 MB gzipped (Prisma's query engine is
      most of it), under the 3 MB free-plan limit.
- [x] 🤖 3.6 Supabase auth in `hooks.server.ts` (`locals.supabase`, `locals.user` checked with
      `getClaims`), profile row created on first sign-in, `/login` (email and password, Discord,
      Google), `/auth/callback`, `/logout`, account menu in the header. Checked locally up to the
      redirect to Supabase; signing in for real needs 3.1 and 3.2.

**Milestone:** a preview URL where you can sign up, sign in, and see your name come back from
Postgres.

#### Setting up Supabase (3.1, 3.2)

1. Create a project. From **Project Settings → API** take the project URL and the publishable
   (anon) key. From **Connect** take the **session pooler** and **direct** connection strings.
2. **Authentication → Sign In / Providers:** email on. Add Discord (discord.com/developers →
   OAuth2) and Google (Google Cloud console → OAuth client). Each provider's callback URL is
   `https://<project>.supabase.co/auth/v1/callback`.
3. **Authentication → URL Configuration:** Site URL is the app's address. Redirect URLs:
   `http://localhost:5173/**`, `https://*.workers.dev/**` (or the exact preview URL) and the final
   domain with `/**`.
4. **Authentication → Emails → Confirm signup:** so confirmation links work even when opened in
   a different browser, change the link to
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.
5. **Authentication → Emails → SMTP:** Supabase's built-in sender is for testing only. Add
   Resend or Postmark before real people sign up.
6. **Project Settings → Data API:** optional belt and braces. Every table already has RLS on
   with no policies, so the publishable key can't read anything.

#### Setting up Cloudflare (3.3)

1. **Hyperdrive:** `npx wrangler hyperdrive create wares-and-whispers --connection-string="<session pooler string>"`
   and put the id it prints in `wrangler.jsonc`.
2. **Worker:** Workers & Pages → Create → Import a repository → this repo. Build command
   `npm run build`, deploy command `npx wrangler deploy`. Set the production branch to
   `claude/app-architecture-schema-n851fx` for now so it becomes the preview of the new app;
   switch it to `main` at cutover.
3. **Variables:** set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both public)
   in `wrangler.jsonc` or the dashboard.
4. Open `/api/health` on the deployed Worker. It should list the `init` migration.

#### Running it locally

1. Copy `.env.example` to `.env` and fill it in. A local Postgres (or the Supabase CLI's) works
   for `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` and `DIRECT_URL`.
2. `npm install`, `npm run db:migrate`, `npm run dev`, then open
   `http://localhost:5173/api/health`.

### Phase 4: The DM's data on the server

- [ ] 🤖 4.1 `src/lib/server/access.ts`: `requireUser`, `requireDm(campaignId)`,
      `partyFromToken(token)`
- [ ] 🤖 4.2 Campaign actions: create, rename, settings (avoid repeats, rumour mode, standing
      prices), delete
- [ ] 🤖 4.3 Family actions: update (text tokenized on save), reset. No more rename sweep.
- [ ] 🤖 4.4 Rumour bank and must-haves actions
- [ ] 🤖 4.5 Town actions: save from seed (server rebuilds it from the seed, size, region and
      name), save a town from a book, reroll shop, another rumour, restock (shop or town), detail
      one, add/remove shop, rename shop/keeper, edit stock, notes, apply must-haves
- [ ] 🤖 4.6 Routes under `/c/[campaignId]/…` (towns, families, rumors, settings) and a campaigns
      list. Pages load from the server instead of the localStorage stores.
- [ ] 🤖 4.7 Generator page: unchanged when signed out; signed in, it builds with the campaign's
      families and history and offers "Save to campaign".
- [ ] 🤖 4.8 Import a backup file (the existing JSON export). Surnames are turned into
      placeholders and each campaign gets one party holding its tracking. (The new site is on a
      different domain from GitHub Pages, so it can't read the old site's localStorage: the path
      is Export on the old site, Import on the new one.)

**Milestone:** everything except party tracking works from any device.

### Phase 5: Parties and tracking

- [ ] 🤖 5.1 Parties: create, rename, delete; a party picker that only appears with two or more
- [ ] 🤖 5.2 Party actions: meet keeper (visit), standing, keeper note, rumour told, buy/undo,
      order/collect/cancel, move party, reveal/hide town
- [ ] 🤖 5.3 Rerolls keep any keeper a party has met and any rumour a party has heard
- [ ] 🤖 5.4 Party page built from queries (keepers met, standing by family, rumours heard,
      orders waiting, purchases, "Where can we buy…?")

**Milestone:** everything the current app does, saved online, with more than one party.

### Phase 6: Player view

- [ ] 🤖 6.1 Player link per party: create, replace (cuts off the old link), turn off
- [ ] 🤖 6.2 `playerTown()` and friends in `src/lib/server/views.ts`. Tests that DM-only fields
      never appear in what's sent.
- [ ] 🤖 6.3 `/play/[token]`: where the party is, towns they know, shops they've visited with
      stock and _their_ prices, rumours heard (no truth), orders, purchases, "Where can we buy…?"
- [ ] 🧑 6.4 Supabase Realtime: nothing to set up beyond the service role key from 3.1
- [ ] 🤖 6.5 Every write pings `party:<id>` (and `campaign:<id>`) over Realtime broadcast; open
      player pages fetch again

**Milestone:** players follow along on their phones while you run the session.

### Phase 7: Cutover

- [ ] 🤖 7.1 README, CONTENT.md and this plan updated; GitHub Pages workflow removed
- [ ] 🤖 7.2 A last update to the old site: a banner pointing to the new one, with steps to
      Export and Import
- [ ] 🧑 7.3 Custom domain on the Worker; Workers Builds production branch switched to `main`
- [ ] 🧑 7.4 Merge the branch into `main`

### Later

- In-game calendar: "Advance time" makes orders ready and restocks shops
- Activity log for session recaps (and undo)
- Campaign homebrew items the generator can stock
- One family running several shop types (temples, stables, rival inns)
- Player accounts (invites), player notes and wishlists
