import { rmSync, writeFileSync } from 'node:fs';
import StyleDictionary from 'style-dictionary';

const OUTPUT = 'src/styles/tokens.css';

// Builds src/styles/tokens.css from the DTCG JSON in tokens/.
// Token paths already start with `testds/<level>/...`, so no extra prefix is
// added: the default kebab-case name transform produces `--testds-...`.
//
// Light/dark modes, color-mix() for colour + opacity, opacity as decimals and
// typography properties are configured once the first Figma export lands and
// its file shape is known.

const sd = new StyleDictionary({
  source: ['tokens/**/*.json'],
  usesDtcg: true,
  log: { warnings: 'warn', verbosity: 'default' },
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
  },
});

// Remove the previous output so a stale file never survives a rebuild.
rmSync(OUTPUT, { force: true });

await sd.hasInitialized;

// With no tokens, Style Dictionary v5 writes an empty `:root {}` (v4 skipped
// the file). Write an explicit placeholder instead so the empty state is
// obvious, and so Storybook's import resolves before the first Figma export.
if (Object.keys(sd.tokens).length > 0) {
  await sd.buildAllPlatforms();
} else {
  writeFileSync(
    OUTPUT,
    [
      '/**',
      ' * Do not edit directly, this file was auto-generated.',
      ' * No tokens exported from Figma yet.',
      ' */',
      '',
    ].join('\n'),
  );
}
