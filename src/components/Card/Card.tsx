import type { ReactNode } from 'react';
import styles from './Card.module.css';

export type CardSectionHeading = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardProps {
  /** Figma: Choose icon. Any icon; it's decorative and takes its colour from the slot via currentColor */
  chooseIcon: ReactNode;
  /** Figma: Title text. Truncates after 3 lines */
  titleText: string;
  /** Figma: Description text. Truncates after 3 lines */
  descriptionText: string;
  /** Where the card links to. The whole card is clickable */
  href: string;
  /**
   * HTML heading element for the title, for screen readers. It doesn't change the text style.
   * Not in Figma: it depends on where the card sits on the page. Defaults to h3, for cards
   * listed under a section's h2
   */
  htmlSectionHeading?: CardSectionHeading;
}

// The link wraps the title only, so its accessible name is the title rather than all of the
// card's text. A pseudo-element on the link stretches over the card to make the whole card
// clickable. See the Card entry in docs/learnings.md.
export function Card({ chooseIcon, titleText, descriptionText, href, htmlSectionHeading = 'h3' }: CardProps) {
  const Heading = htmlSectionHeading;

  return (
    <div className={styles.card}>
      <div className={styles.iconArea}>
        <div className={styles.slot}>
          <span className={styles.icon} aria-hidden="true">
            {chooseIcon}
          </span>
        </div>
      </div>
      <div className={styles.contentArea}>
        <Heading className={styles.title}>
          <a className={styles.link} href={href}>
            {titleText}
          </a>
        </Heading>
        <p className={styles.description}>{descriptionText}</p>
      </div>
    </div>
  );
}
