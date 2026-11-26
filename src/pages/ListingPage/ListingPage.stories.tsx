import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListingPage } from './ListingPage';

// Full-screen, as the Figma frame is a whole page (1440px wide in Figma).
// Light and Dark set the Theme toolbar's value, so each theme has its own page.
const meta = {
  title: 'Pages/Listing',
  component: ListingPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ListingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {
  globals: { theme: 'light' },
};

export const Dark: Story = {
  globals: { theme: 'dark' },
};
