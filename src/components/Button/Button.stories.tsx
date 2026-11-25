import type { CSSProperties } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

// Paints the page background so the Secondary button's transparent fill sits on it, as in Figma.
// The padding matches the 20px around the variants in the Figma component set.
// The Overview paints its own light and dark sections, so it turns the frame off.
const withFrame: Decorator = (Story, { parameters }) =>
  parameters.frame === false ? (
    <Story />
  ) : (
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
  // Labels match the Figma property names. onClick and the other button attributes aren't in Figma
  argTypes: {
    label: { name: 'Label' },
    variant: { name: 'Variant', control: 'inline-radio', options: ['primary', 'secondary'] },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Hover these, or use the pseudo-states toolbar button. Switch light and dark with the Theme toolbar.
export const Primary: Story = {
  args: { variant: 'primary' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

// Shows that the label never wraps: the button grows to fit it, even in a narrow container
export const LongLabel: Story = {
  name: 'Long label',
  args: {
    variant: 'primary',
    label: 'A much longer label that stays on a single line',
  },
  render: (args) => (
    <div style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 'var(--testds-primitive-space-6)' }}>
      <Button {...args} variant="primary" />
      <Button {...args} variant="secondary" />
    </div>
  ),
};

// Laid out like the Figma component set: columns are Variant (Primary, Secondary), rows are
// Interaction state (Default, Hover), with 20px padding and gaps. Hover is shown with the
// pseudo-state addon, so it's the real :hover CSS rather than a prop.
const sectionStyle: CSSProperties = {
  padding: 'var(--testds-primitive-space-6)',
  backgroundColor: 'var(--testds-semantic-color-background-primary)',
};

const setStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, max-content)',
  gap: 'var(--testds-primitive-space-6)',
};

const captionStyle: CSSProperties = {
  margin: '0 0 var(--testds-primitive-space-6)',
  fontFamily: 'var(--testds-primitive-font-family-sans)',
  fontSize: 'var(--testds-typography-body-100-regular-font-size)',
  fontWeight: 'var(--testds-typography-body-100-regular-font-weight)',
  lineHeight: 'var(--testds-typography-body-100-regular-line-height)',
  color: 'var(--testds-semantic-color-text-subtle)',
};

const ComponentSet = ({ theme, label }: { theme: 'light' | 'dark'; label: string }) => (
  <section data-theme={theme} style={sectionStyle}>
    <h2 style={captionStyle}>{theme === 'light' ? 'Light' : 'Dark'}</h2>
    <div style={setStyle}>
      <Button label={label} variant="primary" />
      <Button label={label} variant="secondary" />
      <Button label={label} variant="primary" data-state="hover" />
      <Button label={label} variant="secondary" data-state="hover" />
    </div>
  </section>
);

export const Overview: Story = {
  parameters: {
    frame: false,
    pseudo: { hover: ['[data-state="hover"]'] },
    controls: { include: ['Label'] },
  },
  render: ({ label }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      <ComponentSet theme="light" label={label} />
      <ComponentSet theme="dark" label={label} />
    </div>
  ),
};
