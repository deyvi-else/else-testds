// Checks src/styles/tokens.css against the Figma snapshot (figma-raw.json).
//
// For each mode (light and dark), works out the final value of every custom
// property by following var() references and evaluating color-mix() and
// calc() the way a browser would. Compares each with the value Figma gives
// the matching variable or text style property in that mode.
//
// It deliberately shares no code with the Style Dictionary build or the
// DTCG converter: it reads only the CSS and the raw Figma snapshot.
//
// It also checks:
// - References: if Figma aliases a variable, the CSS must use var() to the
//   aliased token, not a resolved value
// - Units: spacing, font size and line height in rem, borders in px, opacity
//   as a decimal, letter spacing in em
// - Coverage: nothing missing from the CSS, nothing extra, and the dark block
//   only overrides tokens from collections that have a dark mode
//
// Usage: npm run tokens:check. Exits 1 if anything doesn't match.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const raw = JSON.parse(readFileSync(join(ROOT, 'scripts/figma-export/figma-raw.json'), 'utf8'));
const css = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');

const REM_BASE = 16;
// The font fallback stack specified in CLAUDE.md (not a Figma value).
const FONT_FALLBACK = ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'];
const MODES = ['light', 'dark'];
const SELECTORS = { root: ':root', dark: '[data-theme="dark"]' };
// Hex output rounds each channel to 8 bits, so allow half a step.
const CHANNEL_TOLERANCE = 0.5 / 255 + 1e-9;
const EPSILON = 1e-9;

const failures = [];
const fail = (mode, name, message) => failures.push({ mode, name, message });

// --- Parse the CSS ---------------------------------------------------------

const blocks = {};
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
for (const [, selector, body] of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const declarations = new Map();
  for (const declaration of body.split(';')) {
    const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(declaration);
    if (match) declarations.set(match[1], match[2]);
    else if (declaration.trim()) fail('-', selector.trim(), `can't parse declaration "${declaration.trim()}"`);
  }
  blocks[selector.trim()] = declarations;
}
for (const selector of Object.keys(blocks)) {
  if (!Object.values(SELECTORS).includes(selector)) fail('-', selector, 'unexpected selector');
}
const rootBlock = blocks[SELECTORS.root] ?? new Map();
const darkBlock = blocks[SELECTORS.dark] ?? new Map();

// The declarations that apply in each mode: dark overrides :root.
const scopes = {
  light: rootBlock,
  dark: new Map([...rootBlock, ...darkBlock]),
};

// --- Evaluate CSS values ---------------------------------------------------

// Splits on a separator at the top level, ignoring separators inside ().
const splitTopLevel = (text, separator) => {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth === 0 && separator.test(char)) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const parseHex = (hex) => {
  const digits = hex.slice(1);
  if (![6, 8].includes(digits.length)) throw new Error(`unsupported hex ${hex}`);
  const channels = digits.match(/../g).map((pair) => Number.parseInt(pair, 16) / 255);
  return { type: 'color', r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1 };
};

const TRANSPARENT = { type: 'color', r: 0, g: 0, b: 0, a: 0 };

// CSS Color 5 color-mix() in sRGB: interpolate premultiplied channels, then
// un-premultiply. With alpha 0 the channels are undefined, so return 0s.
const colorMix = (c1, p1, c2, p2) => {
  const total = p1 + p2;
  if (total <= 0) throw new Error('color-mix percentages sum to 0');
  const w1 = p1 / total;
  const w2 = p2 / total;
  const a = c1.a * w1 + c2.a * w2;
  const channel = (k) => (a === 0 ? 0 : (c1[k] * c1.a * w1 + c2[k] * c2.a * w2) / a);
  // Percentages summing below 100% scale the alpha down.
  const scale = Math.min(total, 100) / 100;
  return { type: 'color', r: channel('r'), g: channel('g'), b: channel('b'), a: a * scale };
};

const evaluate = (expression, scope, seen = []) => {
  const text = expression.trim();

  const variable = /^var\(\s*(--[\w-]+)\s*\)$/.exec(text);
  if (variable) {
    const name = variable[1];
    if (seen.includes(name)) throw new Error(`circular reference ${[...seen, name].join(' -> ')}`);
    if (!scope.has(name)) throw new Error(`var(${name}) is not defined`);
    return evaluate(scope.get(name), scope, [...seen, name]);
  }

  const calc = /^calc\((.+)\)$/.exec(text);
  if (calc) {
    const terms = splitTopLevel(calc[1], /\*/);
    if (terms.length !== 2) throw new Error(`unsupported calc ${text}`);
    const [a, b] = terms.map((term) => evaluate(term, scope, seen));
    if (a.type === 'number' && b.type === 'percentage') return { type: 'percentage', value: a.value * b.value };
    if (a.type === 'percentage' && b.type === 'number') return { type: 'percentage', value: a.value * b.value };
    if (a.type === 'number' && b.type === 'number') return { type: 'number', value: a.value * b.value };
    throw new Error(`unsupported calc ${text}`);
  }

  const mix = /^color-mix\((.+)\)$/.exec(text);
  if (mix) {
    const [space, ...stops] = splitTopLevel(mix[1], /,/);
    if (space !== 'in srgb') throw new Error(`unsupported colour space "${space}"`);
    if (stops.length !== 2) throw new Error(`color-mix needs two colours: ${text}`);
    const parsed = stops.map((stop) => {
      const parts = splitTopLevel(stop, /\s/).map((part) => evaluate(part, scope, seen));
      const color = parts.find((part) => part.type === 'color');
      const percentage = parts.find((part) => part.type === 'percentage');
      if (!color || parts.length > 2) throw new Error(`unsupported color-mix stop "${stop}"`);
      return { color, percentage: percentage?.value };
    });
    let [p1, p2] = parsed.map((stop) => stop.percentage);
    for (const p of [p1, p2]) {
      if (p !== undefined && (p < 0 || p > 100)) throw new Error(`color-mix percentage ${p}% is invalid CSS`);
    }
    if (p1 === undefined && p2 === undefined) [p1, p2] = [50, 50];
    else if (p1 === undefined) p1 = 100 - p2;
    else if (p2 === undefined) p2 = 100 - p1;
    return colorMix(parsed[0].color, p1, parsed[1].color, p2);
  }

  if (text === 'transparent') return TRANSPARENT;
  if (/^#[0-9a-f]+$/i.test(text)) return parseHex(text);

  const quantity = /^(-?\d*\.?\d+)(rem|px|em|%)?$/.exec(text);
  if (quantity) {
    const value = Number.parseFloat(quantity[1]);
    if (quantity[2] === '%') return { type: 'percentage', value };
    if (quantity[2]) return { type: 'length', value, unit: quantity[2] };
    return { type: 'number', value };
  }

  // Anything else (e.g. a font family list) is a plain string.
  return { type: 'string', value: text };
};

// --- Resolve Figma values --------------------------------------------------

const variablesById = new Map(raw.variables.map((v) => [v.id, v]));
const collectionsById = new Map(raw.collections.map((c) => [c.id, c]));

// A collection with one mode applies to both; otherwise match by mode name.
const figmaModeId = (collection, mode) => {
  if (collection.modes.length === 1) return collection.modes[0].modeId;
  const match = collection.modes.find((m) => m.name === mode);
  if (!match) throw new Error(`collection ${collection.name} has no "${mode}" mode`);
  return match.modeId;
};

const kebab = (segment) =>
  String(segment)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_/]+/g, '-')
    .toLowerCase();
const cssName = (figmaName) => `--${figmaName.split('/').map(kebab).join('-')}`;

const valueIn = (variable, mode) =>
  variable.valuesByMode[figmaModeId(collectionsById.get(variable.variableCollectionId), mode)];

const isAlias = (value) => value?.type === 'VARIABLE_ALIAS';
const isColorWithOpacity = (value) => typeof value === 'object' && value !== null && 'opacity' in value;

// Follows aliases to a final value. Colours become { r, g, b, a }.
const resolveFigma = (variable, mode) => {
  const value = valueIn(variable, mode);
  if (isAlias(value)) return resolveFigma(variablesById.get(value.id), mode);
  if (isColorWithOpacity(value)) {
    const color = resolveFigma(variablesById.get(value.color.id), mode);
    const opacity = resolveFigma(variablesById.get(value.opacity.id), mode);
    return { ...color, a: color.a * (opacity / 100) };
  }
  return value;
};

// The var() references Figma's value implies, for the reference check.
const expectedReferences = (variable, mode) => {
  const value = valueIn(variable, mode);
  if (isAlias(value)) return [cssName(variablesById.get(value.id).name)];
  if (isColorWithOpacity(value)) {
    return [cssName(variablesById.get(value.color.id).name), cssName(variablesById.get(value.opacity.id).name)];
  }
  return [];
};

const toPx = (length) => {
  if (length.unit === 'px') return length.value;
  if (length.unit === 'rem') return length.value * REM_BASE;
  return undefined;
};

// --- Compare ---------------------------------------------------------------

const expectedNames = new Set();
const checked = Object.fromEntries(MODES.map((mode) => [mode, 0]));
const near = (a, b, tolerance = EPSILON) => Math.abs(a - b) <= tolerance;

const formatColor = (c) =>
  `rgba(${[c.r, c.g, c.b].map((v) => (v * 255).toFixed(2)).join(', ')}, ${Number(c.a.toFixed(6))})`;

const UNIT_RULES = { space: 'rem', border: 'px' };

for (const mode of MODES) {
  const scope = scopes[mode];

  const compare = (name, check) => {
    expectedNames.add(name);
    if (!scope.has(name)) return fail(mode, name, 'missing from the CSS');
    try {
      const message = check(evaluate(`var(${name})`, scope), scope.get(name));
      if (message) fail(mode, name, message);
      else checked[mode]++;
    } catch (error) {
      fail(mode, name, error.message);
    }
  };

  for (const variable of raw.variables) {
    const name = cssName(variable.name);
    const expected = resolveFigma(variable, mode);
    const references = expectedReferences(variable, mode);

    compare(name, (actual, declared) => {
      // References must be preserved, never resolved.
      for (const reference of references) {
        if (!declared.includes(`var(${reference})`)) {
          return `should reference var(${reference}), declared as "${declared}"`;
        }
      }
      if (!references.length && declared.includes('var(')) {
        return `Figma has a literal value, but the CSS uses a reference: "${declared}"`;
      }

      if (variable.resolvedType === 'COLOR') {
        if (actual.type !== 'color') return `expected a colour, got "${declared}"`;
        if (!near(actual.a, expected.a)) {
          return `alpha ${actual.a} doesn't match Figma ${expected.a}`;
        }
        // A fully transparent colour has no visible channels to compare.
        if (expected.a === 0) return;
        for (const k of ['r', 'g', 'b']) {
          if (!near(actual[k], expected[k], CHANNEL_TOLERANCE)) {
            return `${formatColor(actual)} doesn't match Figma ${formatColor(expected)}`;
          }
        }
        return;
      }

      if (variable.resolvedType === 'FLOAT') {
        const category = variable.name.split('/')[2];
        if (category === 'opacity') {
          if (actual.type !== 'number') return `opacity should be a unitless decimal, got "${declared}"`;
          if (!near(actual.value, expected / 100)) return `${actual.value} doesn't match Figma ${expected}%`;
          return;
        }
        if (UNIT_RULES[category]) {
          if (actual.type !== 'length') return `expected a length, got "${declared}"`;
          if (actual.unit !== UNIT_RULES[category]) {
            return `${category} should be in ${UNIT_RULES[category]}, got ${actual.unit}`;
          }
          if (!near(toPx(actual), expected)) return `${toPx(actual)}px doesn't match Figma ${expected}px`;
          return;
        }
        return `no comparison defined for FLOAT category "${category}"`;
      }

      return `no comparison defined for ${variable.resolvedType}`;
    });
  }

  for (const style of raw.textStyles) {
    const prefix = `--testds-typography-${style.name.split('/').map(kebab).join('-')}`;

    compare(`${prefix}-font-family`, (actual) => {
      if (actual.type !== 'string') return `expected a font family list, got ${actual.type}`;
      const families = splitTopLevel(actual.value, /,/).map((f) => f.replace(/^["']|["']$/g, ''));
      if (families[0] !== style.fontName.family) {
        return `first family "${families[0]}" doesn't match Figma "${style.fontName.family}"`;
      }
      const fallback = families.slice(1);
      if (fallback.join(', ') !== FONT_FALLBACK.join(', ')) {
        return `fallback stack "${fallback.join(', ')}" doesn't match CLAUDE.md "${FONT_FALLBACK.join(', ')}"`;
      }
    });

    const remPx = (property, figmaPx) =>
      compare(`${prefix}-${property}`, (actual, declared) => {
        if (actual.type !== 'length' || actual.unit !== 'rem') return `should be in rem, got "${declared}"`;
        if (!near(toPx(actual), figmaPx)) return `${toPx(actual)}px doesn't match Figma ${figmaPx}px`;
      });
    remPx('font-size', style.fontSize);
    if (style.lineHeight.unit !== 'PIXELS') {
      fail(mode, `${prefix}-line-height`, `no comparison defined for line height unit ${style.lineHeight.unit}`);
    } else {
      remPx('line-height', style.lineHeight.value);
    }

    compare(`${prefix}-font-weight`, (actual, declared) => {
      const wght = style.fontName.variationSettings?.wght;
      if (typeof wght !== 'number') return 'Figma style has no wght axis value to compare';
      if (actual.type !== 'number' || actual.value !== wght) {
        return `"${declared}" doesn't match Figma's rendered weight ${wght}`;
      }
    });

    compare(`${prefix}-letter-spacing`, (actual, declared) => {
      if (style.letterSpacing.unit !== 'PERCENT') {
        return `no comparison defined for letter spacing unit ${style.letterSpacing.unit}`;
      }
      if (actual.type !== 'length' || actual.unit !== 'em') return `should be in em, got "${declared}"`;
      if (!near(actual.value * 100, style.letterSpacing.value)) {
        return `${actual.value}em doesn't match Figma ${style.letterSpacing.value}%`;
      }
    });
  }
}

if (raw.effectStyles.length) {
  fail('-', 'effect styles', `${raw.effectStyles.length} effect style(s) in Figma have no comparison defined`);
}

// --- Coverage --------------------------------------------------------------

for (const name of new Set([...rootBlock.keys(), ...darkBlock.keys()])) {
  if (!expectedNames.has(name)) fail('-', name, 'in the CSS but not in Figma');
}

// The dark block should override exactly the variables whose collection has
// a dark mode.
const darkNames = new Set(
  raw.variables
    .filter((v) => collectionsById.get(v.variableCollectionId).modes.some((m) => m.name === 'dark'))
    .map((v) => cssName(v.name)),
);
for (const name of darkBlock.keys()) {
  if (!darkNames.has(name)) fail('dark', name, 'in the dark block, but its collection has no dark mode');
}
for (const name of darkNames) {
  if (!darkBlock.has(name)) fail('dark', name, 'missing from the dark block');
}

// --- Report ----------------------------------------------------------------

for (const mode of MODES) {
  console.log(`${mode}: ${checked[mode]} of ${expectedNames.size} values match Figma`);
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const { mode, name, message } of failures) console.error(`  [${mode}] ${name}: ${message}`);
  process.exit(1);
}
console.log('\n✔ tokens.css matches the Figma snapshot');
