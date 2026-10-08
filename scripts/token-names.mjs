// The one place that turns Figma names into CSS custom property names (see
// CLAUDE.md, "One source for naming logic"). Used by the Style Dictionary
// build, the Figma check and the Storybook foundation pages.
//
// A token's path is its Figma name split on `/`:
//   testds/semantic/color/background/primary -> --testds-semantic-color-background-primary
//
// Text style names (`headline/300`) have no `testds/<level>/` prefix, so their
// properties are named under `testds/typography/`:
//   headline/300, fontSize -> --testds-typography-headline-300-font-size

/** One path segment in lowercase kebab-case (`fontSize` -> `font-size`) */
export const kebab = (segment) =>
  String(segment)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_/]+/g, '-')
    .toLowerCase();

/** Path segments -> CSS name without the leading `--` */
export const cssName = (path) => path.map(kebab).join('-');

/** Path segments -> CSS custom property, e.g. `--testds-primitive-space-1` */
export const cssVar = (path) => `--${cssName(path)}`;

/** Figma variable or text style name -> path segments */
export const figmaPath = (figmaName) => figmaName.split('/');

/** Path segments -> Figma name */
export const figmaName = (path) => path.join('/');

/** The path of one property of a text style, e.g. (['headline', '300'], 'fontSize') */
export const typographyPath = (stylePath, property) => ['testds', 'typography', ...stylePath, property];

const REFERENCE = /^\{([^{}]+)\}$/;

/** DTCG reference `{testds.primitive.space.1}` -> path segments, or undefined */
export const referencePath = (reference) => {
  const match = typeof reference === 'string' ? REFERENCE.exec(reference) : null;
  return match ? match[1].split('.') : undefined;
};
