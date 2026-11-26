import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListingPage } from './ListingPage';

// Full-screen, as the Figma frame is a whole page (1440px wide in Figma).
// One story, like the components: switch light and dark with the Theme toolbar. The story doesn't
// set the theme itself, as that would lock the toolbar. To link straight to dark, add
// &globals=theme:dark to the story's URL.
const meta = {
  title: 'Pages/Listing',
  component: ListingPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ListingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
