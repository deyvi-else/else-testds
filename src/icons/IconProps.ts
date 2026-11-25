// Shared by every generated icon component in src/icons/generated/.

export interface IconProps {
  /**
   * Accessible name, for an icon that means something on its own (with no visible text
   * saying the same thing). Leave it out for decorative icons: they're hidden from screen
   * readers.
   */
  label?: string;
}

/** Hidden from screen readers by default. With a label, announced as an image with that name */
export const iconA11yProps = (label?: string) =>
  label ? ({ role: 'img', 'aria-label': label } as const) : ({ 'aria-hidden': true } as const);
