import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { CssValue, Name, Page, Table, type Column } from './docs';
import styles from './docs.module.css';
import { textStyles, type TextStyle } from './tokens';

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE = 'The quick brown fox jumps over the lazy dog';

const CSS_PROPERTY: Record<TextStyle['properties'][number]['property'], string> = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
};

type Row = TextStyle['properties'][number];

const columns: Column<Row>[] = [
  { header: 'Property', cell: (row) => <code className={styles.code}>{CSS_PROPERTY[row.property]}</code> },
  { header: 'Token', cell: (row) => (
      <code className={styles.code}>
        <Name>{row.cssVar}</Name>
      </code>
    ) },
  { header: 'Figma', cell: (row) => <code className={styles.code}>{row.figmaValue}</code> },
  { header: 'CSS', cell: (row) => <CssValue name={row.cssVar} /> },
];

export const Typography: Story = {
  render: () => (
    <Page
      title="Typography"
      intro={
        <p>
          Text styles from Figma, largest first. Each specimen is set using only the style&apos;s custom properties
          from tokens.css.
        </p>
      }
    >
      <ul className={styles.specimens}>
        {textStyles.map((style) => {
          const font = Object.fromEntries(
            style.properties.map(({ property, cssVar }) => [property, `var(${cssVar})`]),
          ) as CSSProperties;
          return (
            <li key={style.name} className={styles.specimen}>
              <h2 className={styles.subheading}>{style.name}</h2>
              <p className={styles.specimenText} style={font}>
                {SAMPLE}
              </p>
              <Table caption={`${style.name} custom properties`} columns={columns} rows={style.properties} />
            </li>
          );
        })}
      </ul>
    </Page>
  ),
};
