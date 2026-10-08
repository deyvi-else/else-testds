import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BackdropNote,
  Name,
  Page,
  References,
  RenderedColor,
  Swatch,
  Table,
  TokenName,
  Values,
  type Column,
} from './docs';
import styles from './docs.module.css';
import {
  cssVar,
  defaultMode,
  figmaName,
  figmaValue,
  hasOpacity,
  modeAttributes,
  modeNamed,
  modes,
  primitives,
  semanticColorGroups,
  usedBy,
  type Mode,
  type RawToken,
} from './tokens';

const meta = {
  title: 'Foundations/Colour',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Primitives -------------------------------------------------------------------

const UsedBy = ({ token }: { token: RawToken }) => {
  const uses = usedBy(token.path);
  if (uses.length === 0) return <span className={styles.subtle}>Not used by a semantic token</span>;
  return (
    <ul className={styles.list}>
      {uses.map(({ mode, tokens }) => (
        <li key={mode.name} className={styles.stack}>
          <span className={styles.label}>Used in {mode.name} mode by</span>
          {tokens.map((t) => (
            <span key={t.path.join('.')} className={styles.subtle}>
              <Name>{figmaName(t.path)}</Name>
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
};

export const Primitives: Story = {
  render: () => (
    <Page
      title="Colour primitives"
      intro={
        <p>
          Primitives have one mode. Components never use them directly; they use the semantic colours, which
          reference these.
        </p>
      }
    >
      <ul className={styles.palette}>
        {primitives('color').map((token) => (
          <li key={token.path.join('.')}>
            <div className={styles.paletteSwatch} style={{ backgroundColor: `var(${cssVar(token.path)})` }} />
            <div className={styles.list}>
              <TokenName path={token.path} />
              <Values figma={figmaValue(token)} css={<RenderedColor name={cssVar(token.path)} />} />
              <UsedBy token={token} />
            </div>
          </li>
        ))}
      </ul>
    </Page>
  ),
};

// --- Semantic ------------------------------------------------------------------------

const semanticColumns: Column<RawToken>[] = [
  { header: 'Colour', cell: (token) => <Swatch name={cssVar(token.path)} transparent={hasOpacity(token)} /> },
  { header: 'Token', cell: (token) => <TokenName path={token.path} /> },
  {
    header: 'Value',
    cell: (token) => <Values figma={figmaValue(token)} css={<RenderedColor name={cssVar(token.path)} />} />,
  },
  { header: 'References', cell: (token) => <References token={token} /> },
];


export const Semantic: Story = {
  render: (_, { globals }) => {
    const mode = modeNamed(globals.theme as string);
    return (
      <Page
        title="Semantic colours"
        intro={
          <>
            <p>
              Showing <strong>{mode.name}</strong> mode. Use the Theme toggle in the toolbar to switch modes, or see{' '}
              <em>Semantic: light and dark</em> for both side by side.
            </p>
            <BackdropNote />
          </>
        }
      >
        {semanticColorGroups(mode).map(({ property, tokens }) => (
          <section key={property} className={styles.section}>
            <h2 className={styles.heading}>{property}</h2>
            <Table caption={`${property} colours, ${mode.name} mode`} columns={semanticColumns} rows={tokens} />
          </section>
        ))}
      </Page>
    );
  },
};

// One cell per mode. The cell sets its mode the same way the app does
// (data-theme on a container), so everything in it reads tokens.css in that mode.
const ModeCell = ({ mode, path }: { mode: Mode; path: string[] }) => {
  const token = mode.tokens.find((t) => t.path.join('.') === path.join('.'));
  return (
    <div className={styles.mode} {...modeAttributes(mode)}>
      {token ? (
        <div className={styles.list}>
          <Swatch name={cssVar(token.path)} transparent={hasOpacity(token)} />
          <Values figma={figmaValue(token)} css={<RenderedColor name={cssVar(token.path)} />} />
          <References token={token} />
        </div>
      ) : (
        <span className={styles.subtle}>Not in this mode</span>
      )}
    </div>
  );
};

const modeColumns: Column<RawToken>[] = [
  { header: 'Token', cell: (token) => <TokenName path={token.path} /> },
  ...modes.map((mode) => ({ header: mode.name, cell: (token: RawToken) => <ModeCell mode={mode} path={token.path} /> })),
];

export const SemanticLightAndDark: Story = {
  name: 'Semantic: light and dark',
  // Each mode column sets data-theme, so it shows its mode whatever the
  // toolbar theme is. With the toolbar on dark, the light column is a light
  // section inside a dark page.
  render: () => (
    <Page
      title="Semantic colours: light and dark"
      intro={
        <>
          <p>
            Every mode side by side. Each mode column sets <code className={styles.code}>data-theme</code> the same
            way the app does, so its swatches and CSS values are read from tokens.css in that mode. The page around
            them follows the toolbar theme.
          </p>
          <BackdropNote />
        </>
      }
    >
      {semanticColorGroups(defaultMode).map(({ property, tokens }) => (
        <section key={property} className={styles.section}>
          <h2 className={styles.heading}>{property}</h2>
          <Table caption={`${property} colours, all modes`} columns={modeColumns} rows={tokens} />
        </section>
      ))}
    </Page>
  ),
};
