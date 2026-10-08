import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { CssValue, Page, Section, Table, TokenName, Values, type Column } from './docs';
import styles from './docs.module.css';
import { cssVar, figmaValue, primitives, type RawToken } from './tokens';

const meta = {
  title: 'Foundations/Borders',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const border = (property: string) => primitives('border').filter((token) => token.path[3] === property);

// Each sample uses the token for one property. The other property is left at
// the browser default (no radius) or the first border width token, so only the
// token being shown changes the sample.
const widthSample = (token: RawToken): CSSProperties => ({ borderWidth: `var(${cssVar(token.path)})` });
const radiusSample = (token: RawToken): CSSProperties => ({
  borderRadius: `var(${cssVar(token.path)})`,
  borderWidth: `var(${cssVar(border('width')[0].path)})`,
});

const columns = (sample: (token: RawToken) => CSSProperties): Column<RawToken>[] => [
  { header: 'Sample', cell: (token) => <div className={styles.borderSample} style={sample(token)} /> },
  { header: 'Token', cell: (token) => <TokenName path={token.path} /> },
  { header: 'Value', cell: (token) => <Values figma={figmaValue(token)} css={<CssValue name={cssVar(token.path)} />} /> },
];

export const Borders: Story = {
  render: () => (
    <Page title="Borders" intro={<p>Border radius and width are output in px, as in Figma.</p>}>
      <Section title="Radius">
        <Table caption="Border radius primitives" columns={columns(radiusSample)} rows={border('radius')} />
      </Section>
      <Section title="Width">
        <Table caption="Border width primitives" columns={columns(widthSample)} rows={border('width')} />
      </Section>
    </Page>
  ),
};
