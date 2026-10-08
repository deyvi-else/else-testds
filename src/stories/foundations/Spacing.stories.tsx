import type { Meta, StoryObj } from '@storybook/react-vite';
import { CssValue, Page, Table, TokenName, useRenderedSize, Values, type Column } from './docs';
import styles from './docs.module.css';
import { cssVar, figmaValue, primitives, type RawToken } from './tokens';

const meta = {
  title: 'Foundations/Spacing',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A square drawn at the token's size, with its measured size in the browser */
const Step = ({ token }: { token: RawToken }) => {
  const [ref, size] = useRenderedSize<HTMLDivElement>('width');
  const name = `var(${cssVar(token.path)})`;
  return (
    <div className={styles.stack}>
      <div ref={ref} className={styles.space} style={{ width: name, height: name }} />
      <span className={styles.subtle}>Rendered {size}</span>
    </div>
  );
};

const columns: Column<RawToken>[] = [
  { header: 'Size', cell: (token) => <Step token={token} /> },
  { header: 'Token', cell: (token) => <TokenName path={token.path} /> },
  { header: 'Value', cell: (token) => <Values figma={figmaValue(token)} css={<CssValue name={cssVar(token.path)} />} /> },
];

export const Spacing: Story = {
  render: () => (
    <Page
      title="Spacing"
      intro={
        <p>
          Each step is drawn at its actual size, with its width and height set to the token. Figma stores spacing in
          px; tokens.css outputs rem on a 16px base. The rendered size is measured in the browser.
        </p>
      }
    >
      <Table caption="Space primitives" columns={columns} rows={primitives('space')} />
    </Page>
  ),
};
