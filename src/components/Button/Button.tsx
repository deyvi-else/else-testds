import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary';

interface ButtonBaseProps {
  /** Figma: Label. Stays on one line; the button grows to fit it */
  label: string;
  /** Figma: Variant. Defaults to primary, as in Figma */
  variant?: ButtonVariant;
}

/** Without href: renders a <button> */
export interface ButtonAsButtonProps
  extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  href?: undefined;
}

/** With href: renders an <a>, styled the same */
export interface ButtonAsLinkProps
  extends ButtonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  /** Not in Figma. Where the button links to. With it, the button renders as a link */
  href: string;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

// Figma's Interaction state (Default, Hover) is CSS, not a prop: see Button.module.css.
// With href it's a link (it goes somewhere); without, a button (it does something). Both look
// the same, because Figma has one Button for both.
// type defaults to "button" so the button never submits a form by accident.
export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { label, variant = 'primary', className, ...rest } = props;
    return (
      <a className={classNames(variant, className)} {...rest}>
        {label}
      </a>
    );
  }

  const { label, variant = 'primary', type = 'button', className, ...rest } = props;
  return (
    <button type={type} className={classNames(variant, className)} {...rest}>
      {label}
    </button>
  );
}

const classNames = (variant: ButtonVariant, className?: string) =>
  [styles.button, styles[variant], className].filter(Boolean).join(' ');
