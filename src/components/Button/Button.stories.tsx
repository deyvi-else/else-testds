import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

// Paints the page background so the Secondary button's transparent fill sits on it, as in Figma.
// The padding matches the 20px around the variants in the Figma component set.
const withFrame: Decorator = (Story) => (
  <div
    style={{
      minHeight: '100vh',
      boxSizing: 'border-box',
      padding: 'var(--testds-primitive-space-6)',
      backgroundColor: 'var(--testds-semantic-color-background-primary)',
    }}
  >
    <Story />
  </div>
);

const meta = {
  title: 'Components/Button',
  component: Button,
  decorators: [withFrame],
  parameters: { layout: 'fullscreen' },
  args: {
    // Figma's default for Label
    label: 'Label',
  },
  // Labels match the Figma property names. type and className are HTML attributes with no Figma
  // property, so they're hidden from the controls. onClick is logged in the Actions panel
  argTypes: {
    label: { name: 'Label' },
    variant: { name: 'Variant', control: 'inline-radio', options: ['primary', 'secondary'] },
    type: { table: { disable: true } },
    className: { table: { disable: true } },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// One story. It starts on Primary, Figma's default Variant. Switch to Secondary with the Variant
// control, see Hover by hovering or with the pseudo-states toolbar button, and switch light and
// dark with the Theme toolbar.
export const Default: Story = {
  args: { variant: 'primary' },
};
