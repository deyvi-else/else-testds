import type { Meta, StoryObj } from '@storybook/react-vite';
import { CssValue, Name, Page, Table, TokenName, Values, type Column } from './docs';
import styles from './docs.module.css';
import { cssVar, figmaName, figmaValue, pageBackground, primitives, usedBy, type RawToken } from './tokens';

const meta = {
  title: 'Foundations/Opacity',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const columns: Column<RawToken>[] = [
  {
    header: 'Sample',
    cell: (token) => (
      <div className={styles.opacityBackdrop} style={{ backgroundColor: `var(${cssVar(pageBackground)})` }}>
        <div className={styles.opacitySample} style={{ opacity: `var(${cssVar(token.path)})` }} />
      </div>
    ),
  },
  { header: 'Token', cell: (token) => <TokenName path={token.path} /> },
  { header: 'Value', cell: (token) => <Values figma={figmaValue(token)} css={<CssValue name={cssVar(token.path)} />} /> },
  {
    header: 'Used by',
    cell: (token) => {
      const uses = usedBy(token.path);
      if (uses.length === 0) return <span className={styles.subtle}>Not used by a semantic token</span>;
      return (
        <ul className={styles.list}>
          {uses.map(({ mode, tokens }) => (
            <li key={mode.name} className={styles.stack}>
              <span className={styles.label}>{mode.name}</span>
              {tokens.map((t) => (
                <span key={t.path.join('.')} className={styles.subtle}>
                  <Name>{figmaName(t.path)}</Name>
                </span>
              ))}
            </li>
          ))}
        </ul>
      );
    },
  },
];

export const Opacity: Story = {
  render: () => (
    <Page
      title="Opacity"
      intro={
        <>
          <p>
            Figma stores opacity as a percentage; tokens.css outputs a decimal. Semantic colours combine these with a
            colour primitive. Components may also use them for element opacity.
          </p>
          <p>
            Each sample is a block of <code className={styles.code}>icon/strong</code> with{' '}
            <code className={styles.code}>opacity</code> set to the token, drawn on{' '}
            <code className={styles.code}>{figmaName(pageBackground)}</code>. Both follow the toolbar theme.
          </p>
        </>
      }
    >
      <Table caption="Opacity primitives" columns={columns} rows={primitives('opacity')} />
    </Page>
  ),
};
