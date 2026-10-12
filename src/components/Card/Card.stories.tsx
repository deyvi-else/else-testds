import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import placeholderSvg from '../../stories/icons/placeholder.svg?raw';
import { Card } from './Card';

// Figma: 20px / Placeholder, exported as SVG. Inlined so its strokes can use currentColor
const PlaceholderIcon = () => <span dangerouslySetInnerHTML={{ __html: placeholderSvg }} />;

const FIGMA_WIDTH = 242;

// Paints the page background so the card's transparent fill sits on it, as in Figma.
// The padding matches the 20px around the variants in the Figma component set.
// The card fills its container, so the container sets the width.
const withFrame: Decorator = (Story, { parameters }) => (
  <div
    style={{
      minHeight: '100vh',
      boxSizing: 'border-box',
      padding: 'var(--testds-primitive-space-6)',
      backgroundColor: 'var(--testds-semantic-color-background-primary)',
    }}
  >
    <div style={{ width: parameters.containerWidth ?? FIGMA_WIDTH }}>
      <Story />
    </div>
  </div>
);

const meta = {
  title: 'Components/Card',
  component: Card,
  decorators: [withFrame],
  parameters: { layout: 'fullscreen' },
  args: {
    chooseIcon: <PlaceholderIcon />,
    titleText: 'Title',
    descriptionText: 'Description which can span across multiple lines until it eventually truncates.',
    href: '#',
    headingLevel: 3,
  },
  argTypes: {
    chooseIcon: { control: false },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const longText = {
  titleText:
    'A much longer title that keeps going well past the width of the card, so it wraps onto a third line and then truncates',
  descriptionText:
    'A much longer description that keeps going well past the width of the card. It wraps onto several lines, and anything after the third line is cut off with an ellipsis, as in Figma.',
};

// --- Light ------------------------------------------------------------------------

export const Default: Story = {};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
};

// --- Dark -------------------------------------------------------------------------

export const DefaultDark: Story = {
  name: 'Default (dark)',
  globals: { theme: 'dark' },
};

export const HoverDark: Story = {
  name: 'Hover (dark)',
  globals: { theme: 'dark' },
  parameters: { pseudo: { hover: true } },
};

// --- Widths -----------------------------------------------------------------------

export const Wide: Story = {
  name: 'Wide (360px)',
  parameters: { containerWidth: 360 },
};

export const WideDark: Story = {
  name: 'Wide (360px, dark)',
  globals: { theme: 'dark' },
  parameters: { containerWidth: 360 },
};

// --- Truncation -------------------------------------------------------------------

export const LongText: Story = {
  name: 'Long text',
  args: longText,
};

export const LongTextDark: Story = {
  name: 'Long text (dark)',
  globals: { theme: 'dark' },
  args: longText,
};

export const LongTextWide: Story = {
  name: 'Long text (360px)',
  parameters: { containerWidth: 360 },
  args: longText,
};
