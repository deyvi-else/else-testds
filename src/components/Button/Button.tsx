import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Figma: Label. Stays on one line; the button grows to fit it */
  label: string;
  /** Figma: Variant. Defaults to primary, as in Figma */
  variant?: ButtonVariant;
}

// Figma's Interaction state (Default, Hover) is CSS, not a prop: see Button.module.css.
// type defaults to "button" so the button never submits a form by accident.
export function Button({ label, variant = 'primary', type = 'button', className, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {label}
    </button>
  );
}
