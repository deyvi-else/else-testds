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
