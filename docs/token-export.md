# Token export

How the design tokens get from Figma into `tokens/`, and how to run the export again.

## Overview

The export has two steps:

1. **Read Figma.** [`scripts/figma-export/read-figma.js`](../scripts/figma-export/read-figma.js) runs inside Figma through the Plugin API. It reads every local variable collection (all modes), every text style and every effect style, and returns them unchanged. Save the result as [`scripts/figma-export/figma-raw.json`](../scripts/figma-export/figma-raw.json).
2. **Convert to DTCG.** `npm run tokens:export` runs [`scripts/figma-export/to-dtcg.mjs`](../scripts/figma-export/to-dtcg.mjs). It turns the raw snapshot into DTCG JSON in `tokens/`.

The script only reads from Figma. It never writes to the file.

The raw snapshot is committed so every export can be reviewed as a diff, and so the converter can be rerun without access to Figma.

### Why the Plugin API, not the REST API

Figma's REST endpoint for variables (`GET /v1/files/:key/variables/local`) is only available on Enterprise plans. The Plugin API can read variables on any plan, and it's what the Figma MCP server's `use_figma` tool runs.

## Running the export

### 1. Read Figma

Ask Claude Code (with the Figma MCP server connected) to:

> Run `scripts/figma-export/read-figma.js` with `use_figma` on file `kDoLf0s6Vdeg8dS8cgi1ro`, and save the returned JSON, formatted with 2-space indentation, to `scripts/figma-export/figma-raw.json`.

To run it by hand instead, paste the script into a Figma development plugin or the plugin console. The script uses top-level `await` and `return`, so wrap the body in an async function and log the returned object as JSON.

### 2. Convert

```bash
npm run tokens:export
```

This deletes every `*.json` file in `tokens/`, writes the new files, and prints a token count per file.

The converter throws if it finds something it can't represent yet. For example: a new FLOAT category, a line height that isn't in pixels, an alias to a library variable, or an effect style. If that happens, extend `to-dtcg.mjs` rather than editing the output.

### 3. Review

Check the diff of `figma-raw.json` and `tokens/` before committing. Renames show up as the same `variableId` under a new path.

### 4. Build and check the CSS

```bash
npm run tokens
```

```bash
npm run tokens:check
```

See [token-build.md](token-build.md).

## File structure

```
tokens/
  primitives.default.json   Primitives collection, default mode
  semantics.light.json      Semantics collection, light mode (Figma's default mode)
  semantics.dark.json       Semantics collection, dark mode
  typography.json           Text styles
```

There is **one file per collection per mode**, named `<collection>.<mode>.json`.

- Each mode file contains the full set of tokens for that collection, with the same token paths. The mode is in the file name, so it's always clear which values belong to which mode
- Style Dictionary builds a mode by loading `primitives.default.json` with one semantics file at a time. This is the standard way to handle modes, because a token path can only have one value per build
- Adding a mode or collection in Figma adds a file. No restructuring is needed
- Text styles have no modes, so they go in one file. There is no effects file because there are no effect styles

Each file starts with a root `$extensions` block that records the Figma file key, collection, collection ID, mode, mode ID and whether it's the collection's default mode.

> Because the light and dark files share token paths, they can't be loaded into one Style Dictionary instance. The build handles each mode separately. See [token-build.md](token-build.md).

## Token format

Groups follow the Figma variable path. `testds/semantic/color/background/primary` becomes `testds > semantic > color > background > primary`.

Every token has a `com.figma` entry in `$extensions`, holding its Figma ID, so renames can be traced:

```json
"$extensions": {
  "com.figma": {
    "variableId": "VariableID:2:4530",
    "variableKey": "97f08d74d31328254768cb777987ced4acbba66e",
    "scopes": ["ALL_SCOPES"]
  }
}
```

Text styles record `styleId`, `styleKey` and the full Figma `fontName`.

If a variable or style has a description in Figma, it's output as `$description`. Currently none do.

### Values

Values stay in Figma's units. The Style Dictionary build converts them.

| Figma | DTCG `$type` | `$value` |
| --- | --- | --- |
| Colour (literal) | `color` | DTCG 2025.10 colour object: `colorSpace`, the unrounded 0–1 `components` and `alpha` from Figma, and `hex` as a fallback |
| Colour (alias) | `color` | Reference, e.g. `{testds.primitive.color.neutral.9}` |
| Colour (alias + opacity) | `color` | `{ "color": <reference>, "opacity": <reference> }` (see below) |
| FLOAT, `opacity` category | `number` | Figma percentage, e.g. `8` |
| FLOAT, `space` or `border` category | `dimension` | `{ "value": 16, "unit": "px" }` |
| Text style | `typography` | See below |

Figma FLOAT variables have no unit, so the category segment of the name decides the type. A FLOAT in any other category stops the export.

### Colour with opacity

Some semantic colours in Figma combine two variables: a colour and an opacity. The Plugin API returns them as:

```json
{ "color": { "type": "VARIABLE_ALIAS", "id": "..." }, "opacity": { "type": "VARIABLE_ALIAS", "id": "..." } }
```

DTCG has no standard for this. The export mirrors Figma's shape and keeps both references in `$value`:

```json
"$type": "color",
"$value": {
  "color": "{testds.primitive.color.neutral.9}",
  "opacity": "{testds.primitive.opacity.4}"
}
```

Why this shape:

- **It mirrors Figma.** It is the same structure as the Plugin API value, with the aliases written as DTCG references
- **Both references are real references.** Style Dictionary resolves and checks references inside object values. A renamed or deleted opacity primitive causes a broken reference error, so the build can't miss it
- **It fails loudly.** A tool that doesn't know this shape can't turn the object into a colour, so it errors or outputs something obviously wrong. The alternative is to put the colour reference in `$value` and the opacity in `$extensions`. That is valid DTCG, but any tool that ignores the extension would silently output an opaque colour
- **It maps directly to the CSS.** CLAUDE.md asks for `color-mix(in srgb, var(<color>) calc(var(<opacity>) * 100%), transparent)`. The `testds/color/mix` transform builds this from the two references

The downside: it's not valid DTCG for `$type: color`, so a strict DTCG validator will reject these tokens.

### Typography

Each text style becomes a DTCG `typography` token. Its group is the style name, so `headline/300` becomes `headline > 300`.

```json
"$type": "typography",
"$value": {
  "fontFamily": "Inter",
  "fontSize": { "value": 40, "unit": "px" },
  "fontWeight": 590,
  "lineHeight": { "value": 44, "unit": "px" },
  "letterSpacing": { "value": 0, "unit": "%" }
}
```

`fontWeight` is the weight Figma renders: the `wght` axis value from the style's `fontName.variationSettings`. It is never derived from the style name. Inter is a variable font, so a style named `Medium` can render at 510 or 590. If a style has no `wght` axis value, the export stops. The full Figma `fontName`, including the style name, is kept in `$extensions`.

Two values aren't standard DTCG, because converting them would mean changing Figma's values:

- `lineHeight` is in px. DTCG expects a unitless multiplier
- `letterSpacing` uses `%`, which isn't a DTCG dimension unit. Figma stores letter spacing as a percentage of the font size

The converter checks that paragraph spacing, paragraph indent, text case, text decoration and leading trim are all at Figma's defaults. If any style changes one of them, the export stops so the new property can be added.
