// Converts the raw Figma snapshot (figma-raw.json, produced by read-figma.js)
// into DTCG JSON files in tokens/.
//
// This step only restructures. Values stay exactly as Figma stores them
// (px, opacity as a percentage, colour channels as 0-1 floats). Unit
// conversions belong to the Style Dictionary build.
//
// Anything the script doesn't know how to represent throws, so a new kind of
// value in Figma fails the export instead of being dropped or guessed.
//
// Usage: npm run tokens:export   (see docs/token-export.md)

import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = join(ROOT, 'scripts', 'figma-export', 'figma-raw.json');
const OUT = join(ROOT, 'tokens');

const raw = JSON.parse(readFileSync(RAW, 'utf8'));

const variablesById = new Map(raw.variables.map((v) => [v.id, v]));

// --- Helpers ---------------------------------------------------------------

const slug = (name) => name.trim().toLowerCase().replace(/\s+/g, '-');

const reference = (alias, context) => {
  if (alias?.type !== 'VARIABLE_ALIAS') {
    throw new Error(`${context}: expected a VARIABLE_ALIAS, got ${JSON.stringify(alias)}`);
  }
  const target = variablesById.get(alias.id);
  if (!target) {
    // Aliases to variables in other files (libraries) aren't in the snapshot.
    throw new Error(`${context}: alias target ${alias.id} is not a local variable`);
  }
  return `{${target.name.split('/').join('.')}}`;
};

const isAlias = (value) => value?.type === 'VARIABLE_ALIAS';

// Figma colour { r, g, b, a } with 0-1 channels, as a DTCG 2025.10 colour
// object. The channels are kept unrounded; `hex` is the spec's fallback field.
const colorLiteral = ({ r, g, b, a }) => {
  const hex = [r, g, b]
    .map((c) => Math.round(c * 255).toString(16).padStart(2, '0'))
    .join('');
  return { colorSpace: 'srgb', components: [r, g, b], alpha: a, hex: `#${hex}` };
};

// FLOAT variables have no unit in Figma. The category segment of the name
// (testds/<level>/<category>/...) decides how the number is typed.
const FLOAT_TYPES = {
  opacity: (value) => ({ $type: 'number', $value: value }),
  space: (value) => ({ $type: 'dimension', $value: { value, unit: 'px' } }),
  border: (value) => ({ $type: 'dimension', $value: { value, unit: 'px' } }),
};

const variableToken = (variable, modeId) => {
  const context = `${variable.name} (mode ${modeId})`;
  const value = variable.valuesByMode[modeId];
  if (value === undefined) throw new Error(`${context}: no value for this mode`);

  let token;
  if (variable.resolvedType === 'COLOR') {
    if (isAlias(value)) {
      token = { $type: 'color', $value: reference(value, context) };
    } else if (value && 'color' in value && 'opacity' in value) {
      // A colour variable that combines a colour and an opacity. See
      // docs/token-export.md, "Colour with opacity".
      token = {
        $type: 'color',
        $value: {
          color: reference(value.color, `${context} color`),
          opacity: reference(value.opacity, `${context} opacity`),
        },
      };
    } else if (value && 'r' in value) {
      token = { $type: 'color', $value: colorLiteral(value) };
    } else {
      throw new Error(`${context}: unsupported colour value ${JSON.stringify(value)}`);
    }
  } else if (variable.resolvedType === 'FLOAT') {
    if (isAlias(value)) {
      throw new Error(`${context}: FLOAT aliases aren't handled yet (no $type to inherit)`);
    }
    const category = variable.name.split('/')[2];
    const toToken = FLOAT_TYPES[category];
    if (!toToken) {
      throw new Error(`${context}: no DTCG type mapped for FLOAT category "${category}"`);
    }
    token = toToken(value);
  } else {
    throw new Error(`${context}: unsupported variable type ${variable.resolvedType}`);
  }

  if (variable.description) token.$description = variable.description;
  token.$extensions = {
    'com.figma': {
      variableId: variable.id,
      variableKey: variable.key,
      scopes: variable.scopes,
      ...(Object.keys(variable.codeSyntax).length ? { codeSyntax: variable.codeSyntax } : {}),
      ...(variable.hiddenFromPublishing ? { hiddenFromPublishing: true } : {}),
    },
  };
  return token;
};

// Text style values, kept in Figma's units. Every field the style carries is
// read; anything other than the defaults we can represent throws.
const textStyleToken = (style) => {
  const context = `Text style ${style.name}`;
  if (style.lineHeight.unit !== 'PIXELS') {
    throw new Error(`${context}: line height unit ${style.lineHeight.unit} isn't handled yet`);
  }
  if (style.letterSpacing.unit !== 'PERCENT') {
    throw new Error(`${context}: letter spacing unit ${style.letterSpacing.unit} isn't handled yet`);
  }
  if (Object.keys(style.boundVariables ?? {}).length) {
    throw new Error(`${context}: text styles bound to variables aren't handled yet`);
  }
  const defaults = {
    paragraphSpacing: 0,
    paragraphIndent: 0,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
    leadingTrim: 'NONE',
  };
  for (const [key, expected] of Object.entries(defaults)) {
    if (style[key] !== expected) {
      throw new Error(`${context}: ${key} is ${style[key]}, which isn't handled yet`);
    }
  }

  // The weight Figma renders is the variable font's `wght` axis value, which
  // can differ from the style name (Inter "Medium" renders at 510 or 590).
  // Never derive the weight from the style name (see CLAUDE.md).
  const fontWeight = style.fontName.variationSettings?.wght;
  if (typeof fontWeight !== 'number') {
    throw new Error(
      `${context}: no wght axis value in fontName.variationSettings, so the rendered ` +
        'weight is unknown. Static fonts aren\'t handled yet',
    );
  }

  const token = {
    $type: 'typography',
    $value: {
      fontFamily: style.fontName.family,
      fontSize: { value: style.fontSize, unit: 'px' },
      fontWeight,
      lineHeight: { value: style.lineHeight.value, unit: 'px' },
      letterSpacing: { value: style.letterSpacing.value, unit: '%' },
    },
  };
  if (style.description) token.$description = style.description;
  token.$extensions = {
    'com.figma': {
      styleId: style.id,
      styleKey: style.key,
      fontName: style.fontName,
    },
  };
  return token;
};

// Places a token at a `/`-separated path. Throws if a name is also a group,
// which DTCG can't represent (see CLAUDE.md, "Token names and groups").
const place = (tree, name, token) => {
  const segments = name.split('/');
  let node = tree;
  segments.forEach((segment, i) => {
    const isLast = i === segments.length - 1;
    const existing = node[segment];
    if (isLast) {
      if (existing) throw new Error(`"${name}" is already a token or a group`);
      node[segment] = token;
    } else {
      if (existing && '$value' in existing) {
        throw new Error(`"${segments.slice(0, i + 1).join('/')}" is both a token and a group`);
      }
      node = node[segment] ??= {};
    }
  });
};

// --- Build files -----------------------------------------------------------

const files = {};

for (const collection of raw.collections) {
  for (const mode of collection.modes) {
    const tree = {
      $extensions: {
        'com.figma': {
          fileKey: raw.fileKey,
          collection: collection.name,
          collectionId: collection.id,
          mode: mode.name,
          modeId: mode.modeId,
          isDefaultMode: mode.modeId === collection.defaultModeId,
        },
      },
    };
    // variableIds is the order shown in Figma's variables panel.
    for (const id of collection.variableIds) {
      const variable = variablesById.get(id);
      place(tree, variable.name, variableToken(variable, mode.modeId));
    }
    files[`${slug(collection.name)}.${slug(mode.name)}.json`] = tree;
  }
}

if (raw.textStyles.length) {
  const tree = { $extensions: { 'com.figma': { fileKey: raw.fileKey, source: 'text styles' } } };
  for (const style of raw.textStyles) place(tree, style.name, textStyleToken(style));
  files['typography.json'] = tree;
}

if (raw.effectStyles.length) {
  throw new Error(
    `Found ${raw.effectStyles.length} effect style(s). Effect styles aren't handled yet: ` +
      'extend to-dtcg.mjs before exporting.',
  );
}

// --- Write -----------------------------------------------------------------

// tokens/ is generated. Remove previous JSON so a deleted collection or mode
// doesn't leave a stale file behind.
for (const file of readdirSync(OUT)) {
  if (file.endsWith('.json')) rmSync(join(OUT, file));
}
rmSync(join(OUT, '.gitkeep'), { force: true });

for (const [file, tree] of Object.entries(files)) {
  writeFileSync(join(OUT, file), `${JSON.stringify(tree, null, 2)}\n`);
}

// --- Summary ---------------------------------------------------------------

const countTokens = (node) =>
  Object.entries(node).reduce((sum, [key, child]) => {
    if (key.startsWith('$')) return sum;
    return sum + ('$value' in child ? 1 : countTokens(child));
  }, 0);

for (const [file, tree] of Object.entries(files)) {
  console.log(`tokens/${file}: ${countTokens(tree)} tokens`);
}
