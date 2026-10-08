# Token build

How `tokens/` becomes `src/styles/tokens.css`, and how the result is checked against Figma. For how `tokens/` is exported from Figma, see [token-export.md](token-export.md).

## Running it

After every export:

```bash
npm run tokens
```

```bash
npm run tokens:check
```

`tokens` builds the CSS. `tokens:check` compares every value in the CSS with the Figma snapshot, in light, dark and light-inside-dark, and exits with an error if anything doesn't match.

## Output

```
:root                          Primitives, typography
:root, [data-theme="light"]    Semantics (light)
[data-theme="dark"]            Semantics (dark)
```

The light and dark files share token paths, so one Style Dictionary instance can't load both. [`style-dictionary.config.mjs`](../style-dictionary.config.mjs) builds each block with its own instance and joins them into one file. The semantics instances also load the primitives so their references resolve, but only output their own mode.

Light is the default on `:root`, and also on `[data-theme="light"]` so a light section can sit inside a dark one.

Token names come from [`scripts/token-names.mjs`](../scripts/token-names.mjs). The build, `tokens:check` and the Storybook foundation pages all use it, so naming is defined once (CLAUDE.md).

The token files are listed in the config. If a new collection or mode adds a file to `tokens/`, the build stops until the config says where it goes.

Each token file starts with a `$extensions` block describing its Figma collection and mode. Style Dictionary merges files, so these blocks would collide. A custom parser drops them on read. They describe the file, not a token.

## Conversions

| Token | Figma | CSS |
| --- | --- | --- |
| Colour | 0–1 sRGB channels | Hex |
| Colour alias | Alias | `var(--testds-...)` |
| Colour with opacity | Colour alias + opacity alias | `color-mix(in srgb, var(<colour>) calc(var(<opacity>) * 100%), transparent)` |
| Opacity | Percentage (`8`) | Decimal (`0.08`) |
| Space | px | rem (16px base) |
| Border width and radius | px | px |
| Font family primitive | `Inter` | `"Inter"` + system sans-serif fallback stack |
| Text style font family | Bound variable | `var(--testds-primitive-font-family-sans)` |
| Font size, line height | px | rem |
| Font weight | `wght` axis value | Same number (`590`) |
| Letter spacing | % of font size | em (`2%` → `0.02em`) |

Every conversion is chosen by token type and category, and anything without a defined conversion stops the build. The build uses only its own transforms, not Style Dictionary's `css` transform group, so nothing is converted that CLAUDE.md doesn't ask for.

The fallback stack (`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) is specified in CLAUDE.md, not Figma. `tokens:check` fails if the CSS uses a different one.

## The Figma check

[`scripts/figma-export/check-css.mjs`](../scripts/figma-export/check-css.mjs) reads only `tokens.css` and `scripts/figma-export/figma-raw.json`. It shares no value logic with the export or the build, so a conversion bug in either can't hide itself. It does share naming (`scripts/token-names.mjs`), because CLAUDE.md requires one source for it. A naming bug would affect the build and the check the same way, so the check can't catch one.

For each case (light, dark, and a light section inside a dark page) it:

1. Parses the three blocks and applies them in cascade order. Dark mode applies the light block and then the dark block on top, because `<html>` matches `:root` too. Light inside dark applies the light block again on top of dark
2. Works out the final value of every custom property: following `var()` references, evaluating `calc()`, and mixing `color-mix()` as CSS Color 5 defines it
3. Works out Figma's value for the same token in the same mode, following aliases and applying opacity to colours
4. Compares them. Converted units count as matching when they're equivalent (`0.5rem` = `8px`, `0.08` = `8%`, `0em` = `0%`). Colours may differ by half an 8-bit step, because hex rounds each channel

It also fails if:

- A Figma alias was output as a resolved value instead of `var()` to the right token
- A token uses the wrong unit, even if the value is equivalent (spacing in px, for example)
- A token is missing, or the CSS has a token Figma doesn't
- The light or dark block is missing a semantic token, contains a token from a collection without that mode, or repeats a token that's also in the `:root`-only block
- A selector appears more than once
- A text style's font family isn't bound to a variable in Figma, or isn't output as exactly `var()` to that variable

A fully transparent colour (opacity `0`) is only compared on alpha. Its channels aren't visible, and browsers don't keep them.
