import { Fragment, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import styles from './docs.module.css';
import { backdrops, cssVar, figmaName, references, type RawToken } from './tokens';

// Shared building blocks for the foundation pages.

// --- Reading tokens.css in the browser ------------------------------------------

// The toolbar theme sets data-theme on <html>. Values read from the browser
// are read again whenever it changes.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};
const useHtmlTheme = () => useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme ?? '');

/**
 * Reads a computed style of an element. Read on the element itself, so
 * anything inside a [data-theme] panel reads that panel's mode.
 */
const useComputed = <T extends HTMLElement>(read: (style: CSSStyleDeclaration, el: T) => string) => {
  const ref = useRef<T>(null);
  const [value, setValue] = useState<string>();
  const theme = useHtmlTheme();
  useLayoutEffect(() => {
    if (ref.current) setValue(read(getComputedStyle(ref.current), ref.current));
    // `read` is defined inline by callers; the theme is what changes the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return [ref, value] as const;
};

const Missing = ({ name }: { name: string }) => (
  <span className={styles.missing} role="status">
    Not in tokens.css: {name}
  </span>
);

/** The value of a custom property as the browser computes it from tokens.css */
export const CssValue = ({ name }: { name: string }) => {
  const [ref, value] = useComputed<HTMLElement>((style) => style.getPropertyValue(name).trim());
  return (
    <code ref={ref} className={styles.code}>
      {value === '' ? <Missing name={name} /> : value}
    </code>
  );
};

// Computed colours come back as rgb(), rgba() or color(srgb ...) depending on
// how the CSS was written. Shown as hex plus alpha to compare with Figma.
const formatColor = (computed: string) => {
  const rgb = /^rgba?\(([^)]+)\)$/.exec(computed);
  const srgb = /^color\(srgb ([^)]+)\)$/.exec(computed);
  let channels: number[];
  let alpha = 1;
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).map(Number);
    channels = parts.slice(0, 3);
    if (parts.length > 3) alpha = parts[3];
  } else if (srgb) {
    const parts = srgb[1].split(/[\s/]+/).map(Number);
    channels = parts.slice(0, 3).map((c) => c * 255);
    if (parts.length > 3) alpha = parts[3];
  } else {
    return computed;
  }
  // Browsers don't keep the channels of a fully transparent colour (they all
  // become black), so only the alpha can be compared with Figma.
  if (alpha === 0) return 'transparent (0%)';
  const hex = `#${channels.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
  return alpha === 1 ? hex : `${hex} at ${Number.parseFloat((alpha * 100).toFixed(2))}%`;
};

/** The colour the browser renders for a colour custom property */
export const RenderedColor = ({ name }: { name: string }) => {
  const [ref, value] = useComputed<HTMLElement>((style) =>
    style.getPropertyValue(name).trim() === '' ? '' : formatColor(style.backgroundColor),
  );
  // The colour is read from a hidden probe, so the label itself isn't painted.
  return (
    <code className={styles.code}>
      <span ref={ref} hidden style={{ backgroundColor: `var(${name})` }} />
      {value === '' ? <Missing name={name} /> : value}
    </code>
  );
};

/** The rendered size of an element, measured in CSS pixels */
export const useRenderedSize = <T extends HTMLElement>(dimension: 'width' | 'height') =>
  useComputed<T>((_, el) => `${Number.parseFloat(el.getBoundingClientRect()[dimension].toFixed(2))}px`);

// --- Layout -------------------------------------------------------------------------

export const Page = ({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) => (
  <main className={styles.page}>
    <h1 className={styles.title}>{title}</h1>
    {intro && <div className={styles.intro}>{intro}</div>}
    {children}
  </main>
);

export const Section = ({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) => (
  <section className={styles.section}>
    <h2 className={styles.heading}>{title}</h2>
    {intro && <div className={styles.intro}>{intro}</div>}
    {children}
  </section>
);

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

// On narrow screens a table scrolls sideways. A scrolling region must be
// reachable by keyboard (WCAG 2.1.1), so it becomes focusable only then.
const useScrolls = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScrolls(el.scrollWidth > el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, scrolls] as const;
};

export const Table = <T,>({ caption, columns, rows }: { caption: string; columns: Column<T>[]; rows: T[] }) => {
  const [ref, scrolls] = useScrolls();
  return (
    <div
      ref={ref}
      className={styles.tableWrap}
      {...(scrolls && { tabIndex: 0, role: 'region', 'aria-label': caption })}
    >
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.header}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Token cells ----------------------------------------------------------------------

/** A token name that can wrap after each `-` or `/`, so long names fit narrow columns */
export const Name = ({ children }: { children: string }) =>
  children.split(/(?<=[-/])/).map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <wbr />}
      {part}
    </Fragment>
  ));

/** CSS custom property and Figma name */
export const TokenName = ({ path, figma = figmaName(path) }: { path: string[]; figma?: string }) => (
  <div className={styles.stack}>
    <code className={styles.code}>
      <Name>{cssVar(path)}</Name>
    </code>
    <span className={styles.subtle}>
      <Name>{figma}</Name>
    </span>
  </div>
);

/** Figma's value and the value the browser computes from tokens.css */
export const Values = ({ figma, css }: { figma: string; css: ReactNode }) => (
  <dl className={styles.values}>
    <dt>Figma</dt>
    <dd>
      <code className={styles.code}>{figma}</code>
    </dd>
    <dt>CSS</dt>
    <dd>{css}</dd>
  </dl>
);

export const References = ({ token }: { token: RawToken }) => {
  const refs = references(token);
  if (refs.length === 0) return <span className={styles.subtle}>None</span>;
  return (
    <ul className={styles.list}>
      {refs.map((ref) => (
        <li key={ref.path.join('.')} className={styles.stack}>
          {ref.role && <span className={styles.label}>{ref.role}</span>}
          <code className={styles.code}>
            <Name>{`var(${cssVar(ref.path)})`}</Name>
          </code>
          <span className={styles.subtle}>
            <Name>{figmaName(ref.path)}</Name>
          </span>
        </li>
      ))}
    </ul>
  );
};

// --- Swatches ---------------------------------------------------------------------------

/**
 * A colour drawn with its custom property. Transparent colours are drawn on
 * every mode's background colour, so the transparency is visible.
 */
export const Swatch = ({ name, transparent = false }: { name: string; transparent?: boolean }) => {
  const fill = { backgroundColor: `var(${name})` } as CSSProperties;
  if (!transparent) return <div className={styles.swatch} style={fill} />;
  return (
    <div className={styles.backdrops}>
      {backdrops.map(({ mode, token, primitive }) => (
        <div
          key={`${mode.name}-${token.path.join('.')}`}
          className={styles.backdrop}
          style={{ backgroundColor: `var(${cssVar(primitive)})` } as CSSProperties}
        >
          <div className={styles.swatchFill} style={fill} />
        </div>
      ))}
    </div>
  );
};

/** Explains what transparent swatches are drawn on, from the token JSON */
export const BackdropNote = () => (
  <p>
    Colours with transparency are drawn on{' '}
    {backdrops.map(({ mode, token, primitive }, index) => (
      <span key={`${mode.name}-${token.path.join('.')}`}>
        {index > 0 && (index === backdrops.length - 1 ? ' and ' : ', ')}
        <code className={styles.code}>
          <Name>{figmaName(token.path)}</Name>
        </code>{' '}
        in {mode.name} mode (
        <code className={styles.code}>
          <Name>{figmaName(primitive)}</Name>
        </code>
        )
      </span>
    ))}
    , left to right. A fully transparent colour shows as &ldquo;transparent&rdquo; in CSS, because browsers
    don&apos;t keep its hue.
  </p>
);

