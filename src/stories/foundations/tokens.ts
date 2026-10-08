// Reads the token JSON exported from Figma (tokens/*.json) for the foundation
// pages. Every list, label and reference on those pages comes from here, so
// the pages update after every export. Values shown as "CSS" and everything
// drawn on the pages come from tokens.css in the browser, not from this file.

type Json = Record<string, unknown>;

interface FileMeta {
  collection?: string;
  mode?: string;
  isDefaultMode?: boolean;
  source?: string;
}

const files = import.meta.glob<Json>('../../../tokens/*.json', { eager: true, import: 'default' });

// --- Raw tokens --------------------------------------------------------------

export interface RawToken {
  /** Path in the JSON, which follows the Figma name */
  path: string[];
  type: string;
  value: unknown;
}

const flatten = (node: Json, path: string[] = []): RawToken[] => {
  if ('$type' in node) return [{ path, type: node.$type as string, value: node.$value }];
  return Object.entries(node)
    .filter(([key]) => !key.startsWith('$'))
    .flatMap(([key, child]) => flatten(child as Json, [...path, key]));
};

interface TokenFile {
  meta: FileMeta;
  tokens: RawToken[];
}

const tokenFiles: TokenFile[] = Object.values(files).map((json) => {
  const { $extensions, ...tree } = json;
  const meta = (($extensions as Json | undefined)?.['com.figma'] ?? {}) as FileMeta;
  return { meta, tokens: flatten(tree) };
});

const level = (token: RawToken) => token.path[1];

// --- Names -------------------------------------------------------------------

// Same naming as style-dictionary.config.mjs. If the two ever drift, the
// pages show the token as missing from tokens.css (see useCssValue).
const kebab = (segment: string) =>
  segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_/]+/g, '-')
    .toLowerCase();

export const cssVar = (path: string[]) => `--${path.map(kebab).join('-')}`;

/** Figma variable and text style names use `/` between groups */
export const figmaName = (path: string[]) => path.join('/');

// --- References ----------------------------------------------------------------

export interface Reference {
  /** What the reference is for, when a token has more than one */
  role?: string;
  path: string[];
}

const REFERENCE = /^\{([^{}]+)\}$/;
const parseReference = (ref: unknown): string[] => {
  const match = typeof ref === 'string' ? REFERENCE.exec(ref) : null;
  if (!match) throw new Error(`Expected a reference, got ${JSON.stringify(ref)}`);
  return match[1].split('.');
};

const isColorWithOpacity = (value: unknown): value is { color: string; opacity: string } =>
  typeof value === 'object' && value !== null && 'color' in value && 'opacity' in value;

export const references = (token: RawToken): Reference[] => {
  if (typeof token.value === 'string') return [{ path: parseReference(token.value) }];
  if (isColorWithOpacity(token.value)) {
    return [
      { role: 'Colour', path: parseReference(token.value.color) },
      { role: 'Opacity', path: parseReference(token.value.opacity) },
    ];
  }
  return [];
};

// --- Primitives ------------------------------------------------------------------

const primitiveTokens = tokenFiles.flatMap((file) => file.tokens.filter((t) => level(t) === 'primitive'));

const byKey = new Map(primitiveTokens.map((t) => [t.path.join('.'), t]));
const primitiveAt = (path: string[]) => {
  const token = byKey.get(path.join('.'));
  if (!token) throw new Error(`Reference to unknown token ${path.join('.')}`);
  return token;
};

/** Primitive tokens of one category (`color`, `opacity`, `space`, `border`) */
export const primitives = (category: string) => primitiveTokens.filter((t) => t.path[2] === category);

// --- Semantics -----------------------------------------------------------------

export interface Mode {
  name: string;
  isDefault: boolean;
  tokens: RawToken[];
}

/** Semantic modes, default mode first */
export const modes: Mode[] = tokenFiles
  .filter((file) => file.tokens.some((t) => level(t) === 'semantic'))
  .map((file) => ({
    name: file.meta.mode ?? 'default',
    isDefault: file.meta.isDefaultMode ?? false,
    tokens: file.tokens.filter((t) => level(t) === 'semantic'),
  }))
  .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

export const defaultMode = modes[0];

export const modeNamed = (name: string) => modes.find((mode) => mode.name === name) ?? defaultMode;

/** Attributes that switch an element to a mode, matching tokens.css */
export const modeAttributes = (mode: Mode) => (mode.isDefault ? {} : { 'data-theme': mode.name });

/** Semantic tokens that reference a primitive, in each mode */
export const usedBy = (path: string[]) =>
  modes
    .map((mode) => ({
      mode,
      tokens: mode.tokens.filter((t) => references(t).some((ref) => ref.path.join('.') === path.join('.'))),
    }))
    .filter(({ tokens }) => tokens.length > 0);

/** Semantic colours grouped by property (`background`, `text`, ...) */
export const semanticColorGroups = (mode: Mode) => {
  const groups = new Map<string, RawToken[]>();
  for (const token of mode.tokens.filter((t) => t.path[2] === 'color')) {
    const property = token.path[3];
    groups.set(property, [...(groups.get(property) ?? []), token]);
  }
  return [...groups.entries()].map(([property, tokens]) => ({ property, tokens }));
};

export const hasOpacity = (token: RawToken) => isColorWithOpacity(token.value);

/**
 * The opaque background colours of every mode, as the primitive each one
 * references. Transparent colours are drawn on these so the transparency
 * shows. Primitives are used because a mode's semantic values can't be
 * reached from inside another mode (light values only exist on :root).
 */
export const backdrops = modes.flatMap((mode) =>
  mode.tokens
    .filter((t) => t.path[2] === 'color' && t.path[3] === 'background' && typeof t.value === 'string')
    .map((token) => ({ mode, token, primitive: references(token)[0].path })),
);

// --- Figma values -----------------------------------------------------------------

interface ColorValue {
  hex: string;
  alpha: number;
}

const percent = (n: number) => `${Number.parseFloat(n.toPrecision(12))}%`;

const formatLiteral = (token: RawToken): string => {
  const value = token.value as Json;
  if (token.type === 'color') {
    const { hex, alpha } = value as unknown as ColorValue;
    return alpha === 1 ? hex : `${hex} at ${percent(alpha * 100)}`;
  }
  if (token.type === 'number') return token.path[2] === 'opacity' ? percent(token.value as number) : String(token.value);
  if (token.type === 'dimension') return `${value.value}${value.unit}`;
  return JSON.stringify(token.value);
};

/** The token's value as Figma stores it, with references resolved */
export const figmaValue = (token: RawToken): string => {
  if (typeof token.value === 'string') return figmaValue(primitiveAt(parseReference(token.value)));
  if (isColorWithOpacity(token.value)) {
    const color = figmaValue(primitiveAt(parseReference(token.value.color)));
    const opacity = figmaValue(primitiveAt(parseReference(token.value.opacity)));
    return `${color} at ${opacity}`;
  }
  return formatLiteral(token);
};

// --- Typography -------------------------------------------------------------------

interface Dimension {
  value: number;
  unit: string;
}

interface TypographyValue {
  fontFamily: string;
  fontSize: Dimension;
  fontWeight: number;
  lineHeight: Dimension;
  letterSpacing: Dimension;
}

export interface TextStyle {
  name: string;
  path: string[];
  value: TypographyValue;
  /** One custom property per value, named as in tokens.css */
  properties: { property: keyof TypographyValue; cssVar: string; figmaValue: string }[];
}

const TYPOGRAPHY_PROPERTIES: (keyof TypographyValue)[] = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
];

const typographyTokens = tokenFiles
  .filter((file) => file.meta.source === 'text styles')
  .flatMap((file) => file.tokens);

/**
 * Text styles, largest first as Figma lists them. Style names end in numbers,
 * and JavaScript orders integer-like keys numerically whatever order the JSON
 * is in, so the Figma order can't be read from the file. Groups (`headline`,
 * `body`) keep their JSON order, which matches Figma. Within a group, styles
 * are sorted by font size, largest first.
 */
export const textStyles: TextStyle[] = typographyTokens
  .map((token, index) => ({ token, index, group: token.path.slice(0, -1).join('/') }))
  .sort((a, b) => {
    const groupOrder = (group: string) => typographyTokens.findIndex((t) => t.path.slice(0, -1).join('/') === group);
    const size = (t: RawToken) => (t.value as TypographyValue).fontSize.value;
    return groupOrder(a.group) - groupOrder(b.group) || size(b.token) - size(a.token) || a.index - b.index;
  })
  .map(({ token }) => {
    const value = token.value as TypographyValue;
    return {
      name: figmaName(token.path),
      path: token.path,
      value,
      properties: TYPOGRAPHY_PROPERTIES.map((property) => {
        const v = value[property];
        return {
          property,
          cssVar: cssVar(['testds', 'typography', ...token.path, property]),
          figmaValue: typeof v === 'object' ? `${v.value}${v.unit}` : String(v),
        };
      }),
    };
  });
