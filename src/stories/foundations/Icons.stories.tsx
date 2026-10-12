import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, iconSizes, iconsOfSize, type IconAsset } from '../icons/icons';
import { Page, Section, Table, useRenderedSize, type Column } from './docs';
import styles from './docs.module.css';

const meta = {
  title: 'Foundations/Icons',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The icon at its own size, with its measured size in the browser. Both wrappers fit the SVG
 * exactly, so one measures the width and the other the height.
 */
const Sample = ({ icon }: { icon: IconAsset }) => {
  const [ref, width] = useRenderedSize<HTMLSpanElement>('width');
  const [heightRef, height] = useRenderedSize<HTMLSpanElement>('height');
  return (
    <div className={styles.stack}>
      <span ref={ref} className={styles.icon}>
        <span ref={heightRef} className={styles.icon}>
          <Icon icon={icon} />
        </span>
      </span>
      <span className={styles.subtle}>
        Rendered {width} × {height}
      </span>
    </div>
  );
};

const columns: Column<IconAsset>[] = [
  { header: 'Icon', cell: (icon) => <Sample icon={icon} /> },
  { header: 'Figma name', cell: (icon) => icon.figmaName },
  { header: 'File', cell: (icon) => <code className={styles.code}>{icon.file}</code> },
];

export const Icons: Story = {
  render: () => (
    <Page
      title="Icons"
      intro={
        <>
          <p>
            Every icon on the Figma Icons page, exported as SVG to <code className={styles.code}>src/stories/icons/</code>{' '}
            and named after its Figma name. Icons are grouped by the size at the start of their name.
          </p>
          <p>
            Icons have no colour of their own: in Figma they use{' '}
            <code className={styles.code}>testds/semantic/color/icon/strong</code>, and the SVGs use{' '}
            <code className={styles.code}>currentColor</code>, so they take the colour of where they&apos;re placed.
            Here that&apos;s <code className={styles.code}>--testds-semantic-color-icon-strong</code>, which follows the
            Theme toolbar.
          </p>
        </>
      }
    >
      {iconSizes.map((size) => (
        <Section key={size} title={size}>
          <Table caption={`${size} icons`} columns={columns} rows={iconsOfSize(size)} />
        </Section>
      ))}
    </Page>
  ),
};
