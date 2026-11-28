# Wares & Whispers

A settlement and shopkeeper generator for tabletop RPGs (built with D&D 5e in mind).

- **Realistic sizes.** Eight settlement sizes from thorp (20–80 people) to metropolis (25,000+),
  based on the ranges in S. John Ross's _Medieval Demographics Made Easy_. The number of each kind
  of shop comes from population ÷ "support value" (e.g. one blacksmith per ~1,500 people), so a
  village has a smith and a general store while a city has a dozen weaponsmiths. A few of each are
  written up in full, and "+ Detail one" writes up another when the party goes looking.
- **Shops that scale.** Hamlets may have an alehouse; villages and up always have an inn. Hamlets
  get a general store. Villages add a smithy that sells both weapons
  and armor. Towns split that into a weaponsmith and an armorer and add an apothecary. Magic shops
  appear in larger towns. Bigger places stock rarer items and charge a little less. Items they don't
  carry can be ordered in, with a wait.
- **Recurring shopkeeping families.** Every shop of a type is run by the same family everywhere in
  your world, so players recognize them on sight:
  - 🍺 Inns & taverns: **Clan Hearthscale** (dragonborn, booming hosts)
  - 🧺 General stores: the **Pennywhistles** (halflings, gossips)
  - ⚔️ Weapons & smithies: **Clan Emberforge** (dwarves, gruff)
  - 🛡️ Armor: the **Thornhide clan** (half-orcs, gentle giants)
  - ⚗️ Potions: the **Mosswick cousins** (gnomes, reckless alchemists)
  - 🔮 Magic: **House Veyl** (elves, cryptic)

  Each keeper gets their own name, a greeting, quirks, a bargaining style and a **rumor**, tagged
  for the DM as true, partly true or false (with an "Another rumor" button). Towns a rumor names
  are links: open the saved town, or build it in the same region if the party heads there. Everything about the
  families is editable on the **Families** page.

- **Regions.** Heartland, coastal, mountain, northern, desert, forest or swamp. Each changes
  prices (cheap metal in the mountains, dear water in the desert), moves some goods into smaller
  places (a desert village smith sells scimitars), adds local goods (fur cloaks, oilskin coats,
  seasickness tonic), and flavors town names, the inn's house special and rumors. The app
  remembers your last region.
- **Seeds that keep working.** The same seed + size + region always rebuilds the same town. The URL
  holds the seed and the content version, so bookmarks and shared links keep working as new names,
  quirks and rumors are added. See [CONTENT.md](CONTENT.md) for how to add content safely.
- **Towns from books.** Running a published adventure? "Town from a book" takes the town's name,
  size, region, description and exactly which shops it has (with their names from the book, if you
  like). Your families run them, with keepers, rumors and stock as usual, and nothing else is
  added. Rerolling a keeper keeps the book's shop name. Add or remove shops later, and use **Edit**
  on any shop to rename it or its keeper: change just the first name ("Sildar Emberforge") or give
  them their own surname too ("Sildar Hallwinter"); either way they stay one of the family.
- **Party page.** One page for the whole campaign: where the party is now, every family's standing
  and the keepers they've met (with your notes and what they bought), the rumors they've heard
  sorted into true, partly true and false, special orders they're waiting on, and a "Where can we
  buy…?" search across every saved town.
- **Your own rumors.** Running a published adventure? Paste its rumor table into the **Rumors**
  page. Shopkeepers in that campaign spread them (yours first, mixed in, or only yours), optionally
  only from certain shop types, and the page shows who has each one and which the party has heard.
- **Campaigns.** Each campaign has its own saved towns and families, and avoids reusing town names,
  shopkeepers, quirks and rumors from its saved towns until nothing fresh is left.
- **Saved towns.** Save towns in your browser, reroll individual shops, keep DM notes, and see which
  relatives of a shopkeeper the party has already met in this campaign ("Kin the party has met:
  Brunna (Oakford, negative)"). Export/import a JSON backup (all campaigns) to move between devices.
- **Track the party.** Mark which shops the party has actually visited, which rumors they were
  told, and whether they left on positive, neutral or negative terms with each keeper, and keep a
  note on any keeper. Doing any of this saves the town. The towns list shows how much of each town
  they've seen.
- **Shopping that sticks.** Click − on an item when the party buys one: stock runs down, sells out,
  and the card lists what they bought. Place special orders and mark them collected when they
  arrive. "Restock" (one shop or the whole town) brings in fresh stock when time passes, keeping
  the keepers and any orders.
- **Your own stock.** "Edit stock" on any shop lets you add an item (from the item lists, priced for
  that keeper and town, or your own at your price) or take one off the shelves. Items you add stay
  through restocks and rerolls.
- **Town minimums.** List items on the **Campaigns** page that every town in the campaign should
  have somewhere, like a healing potion or two. Even a hamlet keeps them, in a shop that would sell them
  or the back of the general store, for a quarter more where the town is too small to stock them.
  New towns and restocks get them on their own, and one click adds them to towns already saved.
  While a campaign has any, the Generate and Saved towns pages say so; click the note to see them.
- **Keepers remember.** Returning parties get a greeting that matches how things were left, and
  keepers they haven't met yet have heard about them from relatives they have ("I've had a letter
  from Magda in Oakford. Several pages. Mostly about you."). Standing changes prices (10% off for
  friends, 20% more for enemies; can be turned off per campaign), and keepers who promise regulars
  a discount actually give it.
- **Player view.** One click hides rumors, quirks, bargaining, notes and the DM's buttons, leaving
  shop names, keepers, stock and prices to show the players at the table or print as a handout.
- **Print-friendly**, mobile-friendly, light and dark mode. No server and no account needed.

Item names and prices come from the D&D 5e SRD 5.1 (CC-BY-4.0), plus a few homebrew items marked as
such.

## Development

> This branch is moving the app to Cloudflare Workers with Supabase (accounts) and Postgres.
> [docs/PLAN.md](docs/PLAN.md) has the plan, the setup steps and how to run it locally. The
> deploy notes below are for the current static site on `main`.

```sh
npm install
npm run dev        # start the dev server (Cloudflare Workers runtime)
npm test           # unit tests (Vitest)
npm run test:db    # database tests (needs TEST_DATABASE_URL)
npm run check      # type-check
npm run build      # build the Worker
npm run db:migrate # apply database migrations (needs DIRECT_URL)
```

## Deploying

### GitHub Pages (set up in this repo)

`.github/workflows/deploy.yml` type-checks, tests, builds and publishes the site on every push to
`main` (or when run by hand from the Actions tab).

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main` (or run the "Deploy to GitHub Pages" workflow manually).
3. The site appears at `https://<your-user>.github.io/<repo-name>/`.

The workflow sets `BASE_PATH=/<repo name>` because GitHub Pages serves the site from a sub-folder.

### Cloudflare Pages (alternative)

Connect the repo in Cloudflare Pages with:

- Build command: `npm run build`
- Build output directory: `build`
- No `BASE_PATH` needed (the site is served from the root).

## Where things live

| Path                         | What                                            |
| ---------------------------- | ----------------------------------------------- |
| `src/lib/data/tiers.ts`      | Settlement sizes, shop rules and support values |
| `src/lib/data/families.ts`   | The default shopkeeping families                |
| `src/lib/data/catalog.ts`    | Item lists and prices per shop type             |
| `src/lib/data/names.ts`      | Settlement name parts, ages, bargaining styles  |
| `src/lib/data/regions.ts`    | Regions: prices, local goods, names, rumors     |
| `src/lib/data/rumours.ts`    | Rumor tables for each family                    |
| `src/lib/generator.ts`       | Builds a settlement from a seed                 |
| `src/lib/content/`           | Versioned tables, content keys, golden tests    |
| `src/lib/stores/*.svelte.ts` | Campaigns, saved towns, families (localStorage) |
| `src/lib/tracking.ts`        | What the party did: visits, standing, purchases |
| `src/lib/party.ts`           | Campaign-wide summaries for the Party page      |
| `src/routes/`                | Pages: generate, towns, families, campaigns     |
