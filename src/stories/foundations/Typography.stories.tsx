import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { CssValue, Name, Page, Section, Table, TokenName, Values, type Column } from './docs';
import styles from './docs.module.css';
import {
  cssVar,
  figmaName,
  figmaValue,
  primitives,
  textStyles,
  textStylesUsing,
  type RawToken,
  type TypographyProperty,
} from './tokens';

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE = 'The quick brown fox jumps over the lazy dog';

const CSS_PROPERTY: Record<TypographyProperty['property'], string> = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
};

// --- Font family primitives --------------------------------------------------------

const familyColumns: Column<RawToken>[] = [
  {
    header: 'Sample',
    cell: (token) => <span style={{ fontFamily: `var(${cssVar(token.path)})` }}>Aa Bb Cc 0123</span>,
  },
  { header: 'Token', cell: (token) => <TokenName path={token.path} /> },
  {
    header: 'Value',
    cell: (token) => <Values figma={figmaValue(token)} css={<CssValue name={cssVar(token.path)} />} />,
  },
  {
    header: 'Used by',
    cell: (token) => {
      const styleNames = textStylesUsing(token.path).map((style) => style.name);
      if (styleNames.length === 0) return <span className={styles.subtle}>Not used by a text style</span>;
      return (
        <ul className={styles.list}>
          {styleNames.map((name) => (
            <li key={name} className={styles.subtle}>
              <Name>{name}</Name>
            </li>
          ))}
        </ul>
      );
    },
  },
];

// --- Text styles ---------------------------------------------------------------------

const propertyColumns: Column<TypographyProperty>[] = [
  { header: 'Property', cell: (row) => <code className={styles.code}>{CSS_PROPERTY[row.property]}</code> },
  {
    header: 'Token',
    cell: (row) => (
      <code className={styles.code}>
        <Name>{row.cssVar}</Name>
      </code>
    ),
  },
  { header: 'Figma', cell: (row) => <code className={styles.code}>{row.figmaValue}</code> },
  { header: 'CSS', cell: (row) => <CssValue name={row.cssVar} /> },
  {
    header: 'References',
    cell: (row) =>
      row.reference ? (
        <div className={styles.stack}>
          <code className={styles.code}>
            <Name>{`var(${cssVar(row.reference)})`}</Name>
          </code>
          <span className={styles.subtle}>
            <Name>{figmaName(row.reference)}</Name>
          </span>
        </div>
      ) : (
        <span className={styles.subtle}>None</span>
      ),
  },
];

export const Typography: Story = {
  render: () => (
    <Page
      title="Typography"
      intro={
        <p>
          Text styles from Figma, in Figma&apos;s order. Each specimen is set using only the style&apos;s custom
          properties from tokens.css. Font family is bound to a variable in Figma, so each style references a font
          family primitive, and the build adds the fallback stack to the primitive.
        </p>
      }
    >
      <Section title="Font family">
        <Table caption="Font family primitives" columns={familyColumns} rows={primitives('font')} />
      </Section>
      <Section title="Text styles">
        <ul className={styles.specimens}>
          {textStyles.map((style) => {
            const font = Object.fromEntries(
              style.properties.map(({ property, cssVar: name }) => [property, `var(${name})`]),
            ) as CSSProperties;
            return (
              <li key={style.name} className={styles.specimen}>
                <h3 className={styles.subheading}>{style.name}</h3>
                <p className={styles.specimenText} style={font}>
                  {SAMPLE}
                </p>
                <Table caption={`${style.name} custom properties`} columns={propertyColumns} rows={style.properties} />
              </li>
            );
          })}
        </ul>
      </Section>
    </Page>
  ),
};
