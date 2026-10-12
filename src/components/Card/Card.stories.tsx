import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

// Icons exported from the Figma Icons page, named after their Figma names ("20px / Mini-golf"
// becomes 20px-mini-golf.svg). The card's icon slot is 20px, so only icons whose Figma name
// starts with "20px" are offered. Each is inlined so its colours can use currentColor.
const iconFiles = import.meta.glob<string>('../../stories/icons/20px-*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const icons = Object.fromEntries(
  Object.entries(iconFiles).map(([path, svg]) => {
    const name = path.match(/20px-(.+)\.svg$/)![1];
    return [name, <span dangerouslySetInnerHTML={{ __html: svg }} />];
  }),
);

// Labels repeat the part of the Figma name after "20px / ", e.g. Mini-golf
const iconLabels = Object.fromEntries(
  Object.keys(icons).map((name) => [name, name.charAt(0).toUpperCase() + name.slice(1)]),
);

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
    // Figma's default for Choose icon
    chooseIcon: 'placeholder',
    titleText: 'Title',
    descriptionText: 'Description which can span across multiple lines until it eventually truncates.',
    href: '#',
    htmlSectionHeading: 'h3',
  },
  // Labels match the Figma property names. href and htmlSectionHeading aren't in Figma
  argTypes: {
    chooseIcon: {
      name: 'Choose icon',
      options: Object.keys(icons),
      mapping: icons,
      control: { type: 'select', labels: iconLabels },
    },
    titleText: { name: 'Title text' },
    descriptionText: { name: 'Description text' },
    href: { name: 'Link destination' },
    htmlSectionHeading: {
      name: 'HTML section heading',
      control: 'select',
      options: ['h2', 'h3', 'h4', 'h5', 'h6'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
