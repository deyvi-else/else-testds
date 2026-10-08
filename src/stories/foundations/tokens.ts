// Reads the token JSON exported from Figma (tokens/*.json) for the foundation
// pages. Every list, label and reference on those pages comes from here, so
// the pages update after every export. Values shown as "CSS" and everything
// drawn on the pages come from tokens.css in the browser, not from this file.

import { cssVar, figmaName, referencePath, typographyPath } from '../../../scripts/token-names.mjs';

export { cssVar, figmaName };

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
  /** The token's `com.figma` extension */
  figma: Json;
}

const flatten = (node: Json, path: string[] = []): RawToken[] => {
  if ('$type' in node) {
    const figma = ((node.$extensions as Json | undefined)?.['com.figma'] ?? {}) as Json;
    return [{ path, type: node.$type as string, value: node.$value, figma }];
  }
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

// --- References ----------------------------------------------------------------

export interface Reference {
  /** What the reference is for, when a token has more than one */
  role?: string;
  path: string[];
}

const parseReference = (ref: unknown): string[] => {
  const path = referencePath(ref);
  if (!path) throw new Error(`Expected a reference, got ${JSON.stringify(ref)}`);
  return path;
};

const isColorWithOpacity = (value: unknown): value is { color: string; opacity: string } =>
  typeof value === 'object' && value !== null && 'color' in value && 'opacity' in value;

export const references = (token: RawToken): Reference[] => {
  if (typeof token.value === 'string' && referencePath(token.value)) return [{ path: parseReference(token.value) }];
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

/** Primitive tokens of one category (`color`, `opacity`, `space`, `border`, `font`) */
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

/**
 * Attributes that switch an element to a mode, matching tokens.css. Every
 * mode, including the default, has a [data-theme] selector, so a section can
 * be put in any mode inside any other.
 */
export const modeAttributes = (mode: Mode) => ({ 'data-theme': mode.name });

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
 * The opaque background colours, in every mode. Transparent colours are drawn
 * on these so the transparency shows. Each is painted with its semantic token
 * inside a [data-theme] section for its mode.
 */
export const backdrops = modes.flatMap((mode) =>
  mode.tokens
    .filter((t) => t.path[2] === 'color' && t.path[3] === 'background' && !isColorWithOpacity(t.value))
    .map((token) => ({ mode, token })),
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
  if (token.type === 'fontFamily') return String(token.value);
  return JSON.stringify(token.value);
};

const resolve = (value: unknown) => figmaValue(primitiveAt(parseReference(value)));

/** The token's value as Figma stores it, with references resolved */
export const figmaValue = (token: RawToken): string => {
  if (references(token).length === 1) return resolve(token.value);
  if (isColorWithOpacity(token.value)) return `${resolve(token.value.color)} at ${resolve(token.value.opacity)}`;
  return formatLiteral(token);
};

// --- Typography -------------------------------------------------------------------

interface Dimension {
  value: number;
  unit: string;
}

interface TypographyValue {
  /** A reference to a font family primitive */
  fontFamily: string;
  fontSize: Dimension;
  fontWeight: number;
  lineHeight: Dimension;
  letterSpacing: Dimension;
}

export interface TypographyProperty {
  property: keyof TypographyValue;
  cssVar: string;
  figmaValue: string;
  /** The primitive this property references, if any */
  reference?: string[];
}

export interface TextStyle {
  name: string;
  path: string[];
  /** One custom property per value, named as in tokens.css */
  properties: TypographyProperty[];
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

const figmaOrder = (token: RawToken) => {
  const order = token.figma.order;
  if (typeof order !== 'number') throw new Error(`${figmaName(token.path)} has no Figma position in the export`);
  return order;
};

/** Text styles in the order Figma lists them, from the position the export records */
export const textStyles: TextStyle[] = [...typographyTokens]
  .sort((a, b) => figmaOrder(a) - figmaOrder(b))
  .map((token) => {
    const value = token.value as TypographyValue;
    return {
      name: figmaName(token.path),
      path: token.path,
      properties: TYPOGRAPHY_PROPERTIES.map((property) => {
        const v = value[property];
        const reference = referencePath(v);
        return {
          property,
          cssVar: cssVar(typographyPath(token.path, property)),
          figmaValue: reference ? resolve(v) : typeof v === 'object' ? `${v.value}${v.unit}` : String(v),
          reference,
        };
      }),
    };
  });

/** Text styles that reference a primitive */
export const textStylesUsing = (path: string[]) =>
  textStyles.filter((style) => style.properties.some((p) => p.reference?.join('.') === path.join('.')));
