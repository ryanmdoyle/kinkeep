# Kinkeep

A settlement and shopkeeper generator for tabletop RPGs (built with D&D 5e in mind).

- **Realistic sizes.** Eight settlement sizes from thorp (20–80 people) to metropolis (25,000+),
  based on the ranges in S. John Ross's _Medieval Demographics Made Easy_. The number of each kind
  of shop comes from population ÷ "support value" (e.g. one blacksmith per ~1,500 people), so a
  village has a smith and a general store while a city has a dozen weaponsmiths. A few of each are
  written up in full.
- **Shops that scale.** Hamlets get a general store. Villages add a smithy that sells both weapons
  and armor. Towns split that into a weaponsmith and an armorer and add an apothecary. Magic shops
  appear in larger towns. Bigger places stock rarer items and charge a little less. Items they don't
  carry can be ordered in, with a wait.
- **Recurring shopkeeping families.** Every shop of a type is run by the same family everywhere in
  your world, so players recognise them on sight:
  - 🧺 General stores: the **Pennywhistles** (halflings, gossips)
  - ⚔️ Weapons & smithies: **Clan Emberforge** (dwarves, gruff)
  - 🛡️ Armor: the **Thornhide clan** (half-orcs, gentle giants)
  - ⚗️ Potions: the **Mosswick cousins** (gnomes, reckless alchemists)
  - 🔮 Magic: **House Veyl** (elves, cryptic)

  Each keeper gets their own name, a greeting, quirks and a bargaining style. Everything about the
  families is editable on the **Families** page.

- **Seeds.** The same seed + size always rebuilds the same town, and the URL holds the seed, so you
  can bookmark or share a town.
- **Saved towns.** Save towns in your browser, reroll individual shops, keep DM notes, and see which
  relatives of a shopkeeper the party has already met ("Kin the party has met: Brunna (Oakford)").
  Export/import a JSON backup to move between devices.
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

Built with SvelteKit (static adapter, client-side only). The `build/` folder can be hosted
anywhere that serves static files (Cloudflare Pages, Netlify, GitHub Pages, etc.).

## Where things live

| Path                         | What                                            |
| ---------------------------- | ----------------------------------------------- |
| `src/lib/data/tiers.ts`      | Settlement sizes, shop rules and support values |
| `src/lib/data/families.ts`   | The default shopkeeping families                |
| `src/lib/data/catalog.ts`    | Item lists and prices per shop type             |
| `src/lib/data/names.ts`      | Settlement name parts, ages, bargaining styles  |
| `src/lib/generator.ts`       | Builds a settlement from a seed                 |
| `src/lib/stores/*.svelte.ts` | Saved towns and edited families (localStorage)  |
| `src/routes/`                | Pages: generate (`/`), saved towns, families    |
