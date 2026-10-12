import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import placeholderSvg from '../../stories/icons/placeholder.svg?raw';
import { Card } from './Card';

// Figma: 20px / Placeholder, exported as SVG. Inlined so its strokes can use currentColor
const PlaceholderIcon = () => <span dangerouslySetInnerHTML={{ __html: placeholderSvg }} />;

// Paints the page background so the card's transparent fill sits on it, as in Figma.
// The padding matches the 20px around the variants in the Figma component set.
// The card fills its container, so the container is set to the Figma width (242px).
const withFrame: Decorator = (Story) => (
  <div
    style={{
      minHeight: '100vh',
      boxSizing: 'border-box',
      padding: 'var(--testds-primitive-space-6)',
      backgroundColor: 'var(--testds-semantic-color-background-primary)',
    }}
  >
    <div style={{ width: 242 }}>
      <Story />
    </div>
  </div>
);

// One story, per CLAUDE.md. Change the text with the controls, see Hover by hovering or with
// the pseudo-states toolbar button, and switch light and dark with the Theme toolbar.
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
    htmlSectionHeading: 'h3',
  },
  argTypes: {
    chooseIcon: { control: false },
    htmlSectionHeading: { control: 'select', options: ['h2', 'h3', 'h4', 'h5', 'h6'] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
