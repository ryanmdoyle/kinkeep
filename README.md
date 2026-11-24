# Kinkeep

A settlement and shopkeeper generator for tabletop RPGs (built with D&D 5e in mind).

- **Realistic sizes.** Eight settlement sizes from thorp (20–80 people) to metropolis (25,000+),
  based on the ranges in S. John Ross's _Medieval Demographics Made Easy_. The number of each kind
  of shop comes from population ÷ "support value" (e.g. one blacksmith per ~1,500 people), so a
  village has a smith and a general store while a city has a dozen weaponsmiths. A few of each are
  written up in full.
- **Shops that scale.** Hamlets may have an alehouse; villages and up always have an inn. Hamlets
  get a general store. Villages add a smithy that sells both weapons
  and armor. Towns split that into a weaponsmith and an armorer and add an apothecary. Magic shops
  appear in larger towns. Bigger places stock rarer items and charge a little less. Items they don't
  carry can be ordered in, with a wait.
- **Recurring shopkeeping families.** Every shop of a type is run by the same family everywhere in
  your world, so players recognise them on sight:
  - 🍺 Inns & taverns: **Clan Hearthscale** (dragonborn, booming hosts)
  - 🧺 General stores: the **Pennywhistles** (halflings, gossips)
  - ⚔️ Weapons & smithies: **Clan Emberforge** (dwarves, gruff)
  - 🛡️ Armor: the **Thornhide clan** (half-orcs, gentle giants)
  - ⚗️ Potions: the **Mosswick cousins** (gnomes, reckless alchemists)
  - 🔮 Magic: **House Veyl** (elves, cryptic)

  Each keeper gets their own name, a greeting, quirks, a bargaining style and a **rumour**, tagged
  for the DM as true, partly true or false (with an "Another rumour" button). Everything about the
  families is editable on the **Families** page.

- **Regions.** Heartland, coastal, mountain, northern, desert, forest or swamp. Each changes
  prices (cheap metal in the mountains, dear water in the desert), moves some goods into smaller
  places (a desert village smith sells scimitars), adds local goods (fur cloaks, oilskin coats,
  seasickness tonic), and flavours town names, the inn's house special and rumours. The app
  remembers your last region.
- **Seeds that keep working.** The same seed + size + region always rebuilds the same town. The URL
  holds the seed and the content version, so bookmarks and shared links keep working as new names,
  quirks and rumours are added. See [CONTENT.md](CONTENT.md) for how to add content safely.
- **Campaigns.** Each campaign has its own saved towns and families, and avoids reusing town names,
  shopkeepers, quirks and rumours from its saved towns until nothing fresh is left.
- **Saved towns.** Save towns in your browser, reroll individual shops, keep DM notes, and see which
  relatives of a shopkeeper the party has already met in this campaign ("Kin the party has met:
  Brunna (Oakford)"). Export/import a JSON backup (all campaigns) to move between devices.
- **Print-friendly**, mobile-friendly, light and dark mode. No server and no account needed.

Item names and prices come from the D&D 5e SRD 5.1 (CC-BY-4.0), plus a few homebrew items marked as
such.

## Development

```sh
npm install
npm run dev        # start the dev server
npm test           # unit tests (Vitest)
npm run check      # type-check
npm run build      # static site in ./build
npm run preview    # serve the built site
```

Built with SvelteKit (static adapter, client-side only). `npm run build` produces a plain static
site in `build/`.

## Deploying

### GitHub Pages (set up in this repo)

`.github/workflows/deploy.yml` type-checks, tests, builds and publishes the site on every push to
`main` (or when run by hand from the Actions tab).

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main` (or run the "Deploy to GitHub Pages" workflow manually).
3. The site appears at `https://<your-user>.github.io/kinkeep/`.

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
| `src/lib/data/regions.ts`    | Regions: prices, local goods, names, rumours    |
| `src/lib/data/rumours.ts`    | Rumour tables for each family                   |
| `src/lib/generator.ts`       | Builds a settlement from a seed                 |
| `src/lib/content/`           | Versioned tables, content keys, golden tests    |
| `src/lib/stores/*.svelte.ts` | Campaigns, saved towns, families (localStorage) |
| `src/routes/`                | Pages: generate, towns, families, campaigns     |
