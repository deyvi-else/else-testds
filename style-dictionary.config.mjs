import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import StyleDictionary from 'style-dictionary';
import { cssName, referencePath, typographyPath } from './scripts/token-names.mjs';

const OUTPUT = 'src/styles/tokens.css';
const REM_BASE = 16;

// Builds src/styles/tokens.css from the DTCG JSON in tokens/, applying the
// token conventions in CLAUDE.md. See docs/token-build.md.
//
// The light and dark semantics files share token paths, so they can't be
// loaded into one Style Dictionary instance. Each CSS block is built by its
// own instance, and the blocks are joined into one file:
//
//   :root                          Primitives, typography
//   :root, [data-theme="light"]    Semantics (light)
//   [data-theme="dark"]            Semantics (dark)
//
// Light is also on [data-theme="light"] so a light section can sit inside a
// dark one. The semantics instances also load the primitives so their
// references resolve, but only output their own mode.

const FILES = {
  primitives: 'tokens/primitives.default.json',
  light: 'tokens/semantics.light.json',
  dark: 'tokens/semantics.dark.json',
  typography: 'tokens/typography.json',
};

const BLOCKS = [
  {
    selector: ':root',
    source: [FILES.primitives, FILES.typography],
    output: [FILES.primitives, FILES.typography],
  },
  {
    selector: ':root, [data-theme="light"]',
    source: [FILES.primitives, FILES.light],
    output: [FILES.light],
  },
  {
    selector: '[data-theme="dark"]',
    source: [FILES.primitives, FILES.dark],
    output: [FILES.dark],
  },
];

// Font family primitives (Inter, from Figma) are followed by a system
// sans-serif fallback stack. The stack is specified in CLAUDE.md, not Figma.
// Keep the two in sync.
const FONT_FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// --- Parsing ---------------------------------------------------------------

// Each token file has a root `$extensions` block recording its Figma
// collection and mode (see docs/token-export.md). Style Dictionary merges
// files before building, so these blocks would collide. They describe the
// file, not a token, so they're dropped on read.
StyleDictionary.registerParser({
  name: 'testds/json',
  pattern: /\.json$/,
  parser: ({ contents }) => {
    const { $extensions, ...tokens } = JSON.parse(contents);
    void $extensions;
    return tokens;
  },
});

// --- Naming ----------------------------------------------------------------

// Names come from scripts/token-names.mjs, shared with the check and the docs.

const isTypography = (token) => token.filePath.endsWith('typography.json');

// Expanded typography tokens have the text style's path plus the property.
const tokenPath = (token) =>
  isTypography(token) ? typographyPath(token.path.slice(0, -1), token.path.at(-1)) : token.path;

// `{testds.primitive.color.neutral.9}` -> `var(--testds-primitive-color-neutral-9)`
const referenceToVar = (ref, context) => {
  const path = referencePath(ref);
  if (!path) throw new Error(`${context}: expected a single reference, got ${JSON.stringify(ref)}`);
  return `var(--${cssName(path)})`;
};

StyleDictionary.registerTransform({
  name: 'testds/name',
  type: 'name',
  transform: (token) => cssName(tokenPath(token)),
});

// --- Values ----------------------------------------------------------------

// Trims float noise (e.g. 0.07 * 100) without rounding real precision away.
const num = (n) => Number.parseFloat(n.toPrecision(12));

const category = (token) => token.path[2];

const isColorWithOpacity = (token) => {
  const original = token.original.$value;
  return typeof original === 'object' && original !== null && 'opacity' in original;
};

// Colour literal: DTCG colour object with 0-1 sRGB components -> hex.
StyleDictionary.registerTransform({
  name: 'testds/color/hex',
  type: 'value',
  filter: (token) => token.$type === 'color' && !isColorWithOpacity(token),
  transform: (token) => {
    const value = token.$value;
    if (value?.colorSpace !== 'srgb') {
      throw new Error(`${token.name}: unsupported colour ${JSON.stringify(value)}`);
    }
    const channels = value.alpha === 1 ? value.components : [...value.components, value.alpha];
    return `#${channels.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`;
  },
});

// Colour with opacity: keeps both references, per CLAUDE.md. Built from the
// original references rather than resolved values.
StyleDictionary.registerTransform({
  name: 'testds/color/mix',
  type: 'value',
  transitive: true,
  filter: (token) => token.$type === 'color' && isColorWithOpacity(token),
  transform: (token) => {
    const { color, opacity } = token.original.$value;
    const colorVar = referenceToVar(color, `${token.name} color`);
    const opacityVar = referenceToVar(opacity, `${token.name} opacity`);
    return `color-mix(in srgb, ${colorVar} calc(${opacityVar} * 100%), transparent)`;
  },
});

// Opacity: Figma percentage -> decimal.
StyleDictionary.registerTransform({
  name: 'testds/number',
  type: 'value',
  filter: (token) => token.$type === 'number',
  transform: (token) => {
    if (category(token) !== 'opacity') {
      throw new Error(`${token.name}: no conversion defined for number category "${category(token)}"`);
    }
    return num(token.$value / 100);
  },
});

const pxToRem = (value, token) => {
  if (value.unit !== 'px') throw new Error(`${token.name}: expected px, got ${value.unit}`);
  return `${num(value.value / REM_BASE)}rem`;
};

// Dimensions: spacing, font size and line height in rem; borders in px;
// letter spacing (a percentage of font size in Figma) in em.
StyleDictionary.registerTransform({
  name: 'testds/dimension',
  type: 'value',
  filter: (token) => token.$type === 'dimension',
  transform: (token) => {
    const value = token.$value;

    if (isTypography(token)) {
      const property = token.path.at(-1);
      if (property === 'fontSize' || property === 'lineHeight') return pxToRem(value, token);
      if (property === 'letterSpacing') {
        if (value.unit !== '%') throw new Error(`${token.name}: expected %, got ${value.unit}`);
        return `${num(value.value / 100)}em`;
      }
      throw new Error(`${token.name}: no conversion defined for typography property "${property}"`);
    }

    if (category(token) === 'space') return pxToRem(value, token);
    if (category(token) === 'border') {
      if (value.unit !== 'px') throw new Error(`${token.name}: expected px, got ${value.unit}`);
      return `${num(value.value)}px`;
    }
    throw new Error(`${token.name}: no conversion defined for dimension category "${category(token)}"`);
  },
});

StyleDictionary.registerTransform({
  name: 'testds/fontFamily',
  type: 'value',
  filter: (token) => token.$type === 'fontFamily',
  transform: (token) => `"${token.$value}", ${FONT_FALLBACK}`,
});

// The export already holds the exact rendered weight (the wght axis value).
StyleDictionary.registerTransform({
  name: 'testds/fontWeight',
  type: 'value',
  filter: (token) => token.$type === 'fontWeight',
  transform: (token) => {
    if (typeof token.$value !== 'number') {
      throw new Error(`${token.name}: font weight must be a number, got ${JSON.stringify(token.$value)}`);
    }
    return token.$value;
  },
});

const TRANSFORMS = [
  'testds/name',
  'testds/color/hex',
  'testds/color/mix',
  'testds/number',
  'testds/dimension',
  'testds/fontFamily',
  'testds/fontWeight',
];

// --- Format ----------------------------------------------------------------

// One CSS block. A token whose value is a single reference outputs
// var(--...) instead of the resolved value. Colour-with-opacity tokens
// already contain their var() references (testds/color/mix).
StyleDictionary.registerFormat({
  name: 'testds/css-block',
  format: ({ dictionary, options }) => {
    const lines = dictionary.allTokens.map((token) => {
      const original = token.original.$value;
      const value =
        typeof original === 'string' && original.includes('{')
          ? referenceToVar(original, token.name)
          : token.$value;
      return `  --${token.name}: ${value};`;
    });
    return `${options.selector} {\n${lines.join('\n')}\n}\n`;
  },
});

// As in Figma, a text style has no font family of its own: it's bound to a
// font family primitive, which components use directly (CLAUDE.md). So the
// expanded fontFamily of each text style isn't output. It must be a reference,
// or the style would lose its font family.
const isStyleFontFamily = (token) => {
  if (!isTypography(token) || token.path.at(-1) !== 'fontFamily') return false;
  if (!referencePath(token.original.$value)) {
    throw new Error(`${token.name}: font family must reference a font family primitive, got ${JSON.stringify(token.original.$value)}`);
  }
  return true;
};

// Every type must have a conversion. Anything unexpected fails the build.
const KNOWN_TYPES = new Set(['color', 'number', 'dimension', 'fontFamily', 'fontWeight']);

const buildBlock = async ({ selector, source, output }) => {
  const sd = new StyleDictionary({
    source,
    parsers: ['testds/json'],
    usesDtcg: true,
    log: { warnings: 'error', verbosity: 'silent' },
    // Splits each typography token into one token per property.
    expand: {
      include: ['typography'],
      typesMap: {
        typography: {
          fontFamily: 'fontFamily',
          fontWeight: 'fontWeight',
          fontSize: 'dimension',
          lineHeight: 'dimension',
          letterSpacing: 'dimension',
        },
      },
    },
    platforms: {
      css: {
        transforms: TRANSFORMS,
        files: [
          {
            destination: 'block.css',
            format: 'testds/css-block',
            filter: (token) => output.some((file) => token.filePath.endsWith(file)) && !isStyleFontFamily(token),
            options: { selector },
          },
        ],
      },
    },
  });

  const dictionary = await sd.getPlatformTokens('css');
  for (const token of dictionary.allTokens) {
    if (!KNOWN_TYPES.has(token.$type)) {
      throw new Error(`${token.name}: no CSS output defined for $type "${token.$type}"`);
    }
  }

  const [{ output: css }] = await sd.formatPlatform('css');
  return css;
};

// --- Build -----------------------------------------------------------------

// Remove the previous output so a stale file never survives a rebuild.
rmSync(OUTPUT, { force: true });

const header = ['/**', ' * Do not edit directly, this file was auto-generated.'];

if (Object.values(FILES).every((file) => !existsSync(file))) {
  // Keeps Storybook's import resolving before the first Figma export.
  writeFileSync(OUTPUT, [...header, ' * No tokens exported from Figma yet.', ' */', ''].join('\n'));
} else {
  const missing = Object.values(FILES).filter((file) => !existsSync(file));
  if (missing.length) throw new Error(`Missing token files: ${missing.join(', ')}`);

  // A new collection or mode in Figma adds a file. Fail rather than skip it.
  const known = new Set(Object.values(FILES).map((file) => file.replace('tokens/', '')));
  const unknown = readdirSync('tokens').filter((file) => file.endsWith('.json') && !known.has(file));
  if (unknown.length) {
    throw new Error(`Token files with no place in the build: ${unknown.join(', ')}. Update BLOCKS.`);
  }

  const blocks = [];
  for (const block of BLOCKS) blocks.push(await buildBlock(block));
  writeFileSync(OUTPUT, [...header, ' */', '', blocks.join('\n')].join('\n'));
  console.log(`✔︎ ${OUTPUT}`);
}
