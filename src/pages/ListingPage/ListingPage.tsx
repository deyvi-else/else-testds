import type { ReactNode } from 'react';
import {
  AmericanFootballIcon20,
  BasketballIcon20,
  BowlingIcon20,
  BoxingIcon20,
  Button,
  Card,
  CyclingIcon20,
  FootballIcon20,
  MiniGolfIcon20,
  RunningIcon20,
  SwimmingIcon20,
  TennisIcon20,
} from '../../index';
import styles from './ListingPage.module.css';

interface Sport {
  icon: ReactNode;
  title: string;
  description: string;
}

interface Section {
  title: string;
  sports: Sport[];
}

const SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const LONG =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

// Figma: Listing page (108:81). Titles, descriptions and icons are copied from the Card
// instances. Basketball and Swimming have the long text, which the Card truncates after 3 lines.
const sections: Section[] = [
  {
    title: 'Ball',
    sports: [
      {
        icon: <FootballIcon20 />,
        title: 'Football',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
      },
      { icon: <BasketballIcon20 />, title: 'Basketball', description: LONG },
      { icon: <TennisIcon20 />, title: 'Tennis', description: SHORT },
      { icon: <AmericanFootballIcon20 />, title: 'American football', description: SHORT },
    ],
  },
  {
    title: 'Triathlon',
    sports: [
      { icon: <SwimmingIcon20 />, title: 'Swimming', description: LONG },
      { icon: <CyclingIcon20 />, title: 'Cycling', description: SHORT },
      { icon: <RunningIcon20 />, title: 'Running', description: SHORT },
    ],
  },
  {
    title: 'Indoor',
    sports: [
      { icon: <BowlingIcon20 />, title: 'Bowling', description: SHORT },
      { icon: <BoxingIcon20 />, title: 'Boxing', description: SHORT },
      { icon: <MiniGolfIcon20 />, title: 'Mini Golf', description: SHORT },
    ],
  },
];

const headingId = (title: string) => `${title.toLowerCase().replace(/\s+/g, '-')}-heading`;

// Headings nest h1 (page title) > h2 (section title) > h3 (Card title, the Card's default).
// Links are "#" placeholders until real destinations exist.
export function ListingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.navigation}>
        <a className={styles.brand} href="/">
          © Brand
        </a>
        <nav aria-label="Main">
          <ul className={styles.buttonGroup}>
            <li>
              <Button label="Contact" variant="secondary" href="#" />
            </li>
            <li>
              <Button label="Register" variant="secondary" href="#" />
            </li>
            <li>
              <Button label="Sign in" variant="primary" href="#" />
            </li>
          </ul>
        </nav>
      </header>

      <main className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sports</h1>
          <p className={styles.description}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div>

        {sections.map((section) => (
          <section key={section.title} className={styles.section} aria-labelledby={headingId(section.title)}>
            <div className={styles.sectionHeader}>
              <h2 id={headingId(section.title)} className={styles.sectionTitle}>
                {section.title}
              </h2>
            </div>
            <ul className={styles.row}>
              {section.sports.map((sport) => (
                <li key={sport.title} className={styles.cell}>
                  <Card chooseIcon={sport.icon} titleText={sport.title} descriptionText={sport.description} href="#" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
