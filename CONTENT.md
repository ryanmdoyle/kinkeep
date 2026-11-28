# Adding content without breaking seeds

Every shared link holds a seed and a **content version** (`?seed=mossy-otter-412&v=1`). A link
rebuilds the same town forever, because a town only reads the table entries that existed in its
version.

## Adding names, quirks, rumors, items...

Every random table is written in numbered blocks:

```ts
export const MONSTERS = table({
	1: ['wyvern', 'owlbear', 'ghoul'],
	2: ['bulette', 'cockatrice'] // new in version 2
});
```

1. In `src/lib/content/versioned.ts`, bump `CONTENT_VERSION` (e.g. `1` → `2`) the first time you
   add something after a release.
2. Put the new lines in a block with that number. Add a `2: [...]` block to any table you're
   adding to: family quirks, names, rumors, regional dishes, catalog items, regions...
3. Run `npm test`. It writes `src/lib/content/__golden__/content-v2.json` for the new version.

Keep adding to the `2:` blocks until you deploy. Once version 2 is live, its blocks are frozen and
the next additions go in `3:` blocks.

## The rules

- **Never add to, reorder or delete from a block that's already live.** Add a new block instead.
- **Fixing a typo is fine.** The same line is still picked; only its wording changes.
- **To remove a line**, wrap it instead of deleting it: `retired(3, 'old line')`. Version 3 and
  later no longer use it; older links still do.
- **Changing what a line means** (an item's price, say) changes old towns too. To keep old links
  exact, retire the old entry and add a new one.

## Safety net

`npm test` rebuilds a fixed set of towns at every content version and compares them with the
files in `src/lib/content/__golden__/`. If a live version's file changes, a rule above was broken.
Only the newest, not-yet-deployed version's file should ever change (update it with
`npm test -- -u`). A test also fails if a block's number is higher than `CONTENT_VERSION`.

## Changing the generator itself

Content tables are covered by the version blocks. For changes to the rules in `generator.ts`
(new shop types, new price logic), keep the old behavior for old versions with
`if (ctx.version >= N)`. Give any new random roll its own stream with `rng.fork('new-label')`, so
it doesn't shift existing rolls. The golden tests show whether old towns moved.

## Why it works

- Each decision (each shop, keeper, rumour, stock item) rolls on its own random stream, named
  after what it is. Extra rolls in one place can't shift rolls anywhere else.
- Picking from a list uses one roll whatever the list length. Each line gets a score from
  hash(roll, position) and the best score wins. Lines added to the end leave the older lines'
  scores alone, so even with the newest content, a town only changes where a new line wins.
