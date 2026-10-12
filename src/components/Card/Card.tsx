import type { ReactNode } from 'react';
import styles from './Card.module.css';

export type CardHeadingLevel = 2 | 3 | 4 | 5 | 6;

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
   * Heading level for the title. Not in Figma: it depends on where the card sits on the page.
   * Defaults to 3, for cards listed under a section's h2
   */
  headingLevel?: CardHeadingLevel;
}

// The link wraps the title only, so its accessible name is the title rather than all of the
// card's text. A pseudo-element on the link stretches over the card to make the whole card
// clickable. See the Card entry in docs/learnings.md.
export function Card({ chooseIcon, titleText, descriptionText, href, headingLevel = 3 }: CardProps) {
  const Heading = `h${headingLevel}` as const;

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
