import type { Decorator, Preview } from '@storybook/react-vite';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import '../src/styles/tokens.css';

type Theme = 'light' | 'dark';

// Sets data-theme on <html> so tokens scoped to [data-theme="dark"] apply.
// Light is the default and uses :root, so the attribute is removed for light.
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
};

// Decorators only run when a story renders, so docs-only (MDX) pages would
// ignore the toggle. Listening to globals events covers those pages too.
const channel = addons.getChannel();
const onGlobals = ({ globals }: { globals: { theme?: Theme } }) =>
  applyTheme(globals.theme ?? 'light');
channel.on(SET_GLOBALS, onGlobals);
channel.on(GLOBALS_UPDATED, onGlobals);

const withTheme: Decorator = (Story, context) => {
  applyTheme(context.globals.theme as Theme);
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
  },
};

export default preview;
