# Learnings

## 2026-10-08: Style Dictionary v4 to v5

**What changed:** CLAUDE.md now says "Style Dictionary (latest stable)" instead of "v4". The project moved from `style-dictionary@^4.4.0` to `^5.6.0`.

**Why it was safe:** The 5.0 breaking changes don't affect this repo:

- Node 22 or later is required. We run Node 24
- The reference syntax is fixed to DTCG `{group.token}`. Figma's DTCG export already uses this
- References must point at tokens, not groups. CLAUDE.md already forbids a token name that is also a group

The custom transform API (`registerTransform`, `filter`/`transform`) is the same as in v4. The planned transforms for modes, `color-mix()`, opacity decimals and typography are unaffected. Running `npm run tokens` with a test alias still outputs `var(--testds-...)`.

**What v5 makes easier:**

- 5.3 reads the DTCG 2025.10 structured colour object (`colorSpace` / `components`), which newer Figma exports can produce
- 5.4 supports the object form for dimensions (`{ "value": 4, "unit": "px" }`)

**What didn't carry over:** When there are no tokens, v4 skipped `tokens.css`, but v5 writes an empty `:root {}`. This happens because with no file `filter`, the empty-file check gets the unfiltered dictionary and doesn't treat it as empty. The config now checks for tokens itself and writes the "No tokens exported from Figma yet" placeholder. It no longer depends on Style Dictionary's empty-file behaviour. v5.5's `emitEmptyFiles` option was considered, but it controls the opposite case.

## 2026-10-08: First token export from Figma

See [token-export.md](token-export.md) for the export process and file format.

**Colour with opacity has no DTCG equivalent.** Figma lets a colour variable combine a colour alias and an opacity alias (`{ color, opacity }`). DTCG has no standard way to do this, so the export keeps Figma's shape as an object in `$value`. This isn't valid DTCG for `$type: color`, and it needs a custom Style Dictionary transform to output `color-mix()`.

**Inter "Medium" isn't weight 500 in Figma.** The text styles use Inter as a variable font. Figma's `variationSettings` show the actual `wght` axis: `headline/300` and `headline/200` use 590, `headline/100` uses 510. Both `body` styles use 400. CLAUDE.md mapped `Medium` to 500, which didn't match the weight Figma renders. **Resolved:** CLAUDE.md now says to output the exact rendered weight and never map from the style name. The export reads `fontName.variationSettings.wght`, and Storybook loads Inter's full variable weight range (`wght@100..900`) instead of the static 400 and 500 instances. With only static instances, the browser would render 510 and 590 at the nearest available weight.

**Typography values don't fit DTCG's typography type.** Figma stores line height in px and letter spacing as a percentage of the font size. DTCG wants a unitless line height multiplier and a px or rem letter spacing. The export keeps Figma's units and leaves conversion to the build.

**Text style names have no `testds` prefix.** Variables are named `testds/<level>/...`, but text styles are named `headline/300`. The export mirrors Figma, so typography tokens sit at `headline.300`. The build has to add the `--testds-typography-` prefix.

**Figma FLOAT variables have no unit.** The export types them by the category segment of the name: `opacity` is a number, `space` and `border` are px dimensions.

**Variable scopes are broad.** All primitive colours have `ALL_SCOPES`, and every `space` primitive is scoped to corner radius as well as gap and width/height. This doesn't affect the export, but it means designers can apply space tokens to radii in Figma.

## 2026-10-08: Building tokens.css

See [token-build.md](token-build.md) for the build and the Figma check.

**Modes need one Style Dictionary instance each.** The light and dark files share token paths, and Style Dictionary treats that as a collision. The build runs one instance per CSS block (`:root`, `[data-theme="dark"]`) and joins the output. Style Dictionary's built-in reference output warns when a reference points at a token outside the output (the dark block referencing primitives), so a small custom format writes `var()` for references instead.

**File-level metadata collides on merge.** The export puts a `$extensions` block at the root of each token file, recording the Figma collection and mode. Style Dictionary merges all source files into one tree, so these blocks collided (4 collisions). A custom parser drops them on read. The metadata stays in the files for people and tools that read them directly.

**Colour with opacity can't use Style Dictionary's reference output.** For object values, Style Dictionary puts references back by searching the output for each referenced token's resolved value. That's fragile: the opacity `0.05` could match inside another number. The `color-mix()` transform builds the `var()` references from the original token value instead.

**A fully transparent colour loses its hue in the browser.** `border/invisible` is black at 0% in light mode and white at 0% in dark mode. Browsers resolve both to `color(srgb 0 0 0 / 0)`. They look identical, and the CSS still references the right primitives, but the Figma check can only compare alpha for these.

**The font fallback stack isn't in Figma.** CLAUDE.md originally asked for a system sans-serif fallback stack without saying which. The build chose `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. **Resolved:** CLAUDE.md now specifies that exact stack, and that Inter loads as a variable font covering the full weight range (already the case: `wght@100..900`). `tokens:check` now compares the full stack, not just the final `sans-serif`.

**Typography order differs from Figma.** Figma lists `headline/300`, `200`, `100`. Style names ending in numbers become integer-like JSON keys, which JavaScript always orders numerically, so the CSS lists 100, 200, 300. Only the order changes, not the values.

**Checking the CSS in a browser confirmed the Node check.** Computed styles in Storybook matched Figma for every semantic colour in both modes, and for typography (`headline/300` renders at 40px / 44px / weight 590 with Inter's variable font loaded). Borders computed as 0.8px at the test display's scaling. That's the browser snapping to device pixels, not the token.

## 2026-10-08: Token documentation pages

The foundation pages are in `src/stories/foundations/`. `tokens.ts` reads every file in `tokens/` with `import.meta.glob`, so token lists, names and references always come from the latest export. Everything drawn on the pages uses the custom properties from `tokens.css`, and every "CSS" value is read back from the browser with `getComputedStyle`. If a token's CSS name isn't defined in `tokens.css`, the page shows a warning instead of a value.

**Light values can't be shown inside a dark page.** Light semantic values are only defined on `:root`, and dark values override them when `<html>` has `data-theme="dark"`. Nothing inside the page can get the light values back. The "Semantic: light and dark" story fixes the page to light mode (it locks the toolbar), and gives the dark column `data-theme="dark"`. Adding `[data-theme="light"]` next to `:root` in the build would allow light inside dark, but CLAUDE.md says light outputs on `:root` only, so the build wasn't changed.

**Transparent colours are drawn on primitives, not on the semantic background.** To show transparency, each transparent swatch is drawn on the background colour of every mode. For the same reason as above, the light background isn't reachable from a dark page, so the pages paint these backdrops with the primitive each mode's `background/primary` references (worked out from the JSON). Only opaque `background` tokens are used as backdrops.

**Typography order can't be read from the JSON.** Style names end in numbers, and JavaScript orders integer-like keys numerically, so `headline/100` comes before `headline/300` however the file is written. The page keeps the groups in JSON order (`headline`, then `body`, which matches Figma) and sorts each group by font size, largest first. This matches Figma today. To follow Figma's order exactly, the export would need to record each style's position (for example in `$extensions`).

**The CSS naming logic is duplicated.** `tokens.ts` repeats the kebab-case naming from `style-dictionary.config.mjs`, because the config builds the CSS when it's imported. If they drift, the pages show "Not in tokens.css" for the affected tokens.

**Fully transparent colours show as "transparent".** `border/invisible` is black at 0% in light mode and white at 0% in dark mode. Browsers drop the channels of a colour with 0 alpha, so the computed colour is always black. The pages show "transparent (0%)" rather than a hex that disagrees with Figma.

**Borders render at 0.8px at 125% display scaling.** The computed `border-width` is `0.8px` on a 1.25 device pixel ratio, while the token is `1px`. This is the browser snapping to device pixels, as noted when the CSS was first checked.

**Some documentation-only values have no token.** The swatch size, palette column width and the monospace font for token names are hard-coded in `docs.module.css`. They're page layout, not design decisions, so no token was invented for them.
