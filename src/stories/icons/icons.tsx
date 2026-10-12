// Icons exported from the Figma Icons page, used by stories and documentation.
// Each file is named after its Figma name: "20px / Mini-golf" is saved as 20px-mini-golf.svg.
// This is the one place that turns file names back into Figma names.

const files = import.meta.glob<string>('./*.svg', { query: '?raw', import: 'default', eager: true });

export interface IconAsset {
  /** Key used in story controls, e.g. "mini-golf" */
  id: string;
  /** Size prefix from the Figma name, e.g. "20px" */
  size: string;
  /** Figma name without the size, e.g. "Mini-golf" */
  name: string;
  /** Full Figma name, e.g. "20px / Mini-golf" */
  figmaName: string;
  /** File name in src/stories/icons/ */
  file: string;
  /** SVG markup, with colours set to currentColor */
  svg: string;
}

export const icons: IconAsset[] = Object.entries(files)
  .map(([path, svg]) => {
    const file = path.slice(2);
    const match = /^(\d+px)-(.+)\.svg$/.exec(file);
    if (!match) throw new Error(`Icon file name doesn't start with a size: ${file}`);
    const [, size, id] = match;
    const name = id.charAt(0).toUpperCase() + id.slice(1);
    return { id, size, name, figmaName: `${size} / ${name}`, file, svg };
  })
  .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }) || a.name.localeCompare(b.name));

/** Icons of one size, e.g. iconsOfSize('20px') */
export const iconsOfSize = (size: string) => icons.filter((icon) => icon.size === size);

/** Every size prefix in use, smallest first */
export const iconSizes = [...new Set(icons.map((icon) => icon.size))];

/** Renders an icon's SVG inline, so its colours follow the surrounding text colour */
export const Icon = ({ icon }: { icon: IconAsset }) => <span dangerouslySetInnerHTML={{ __html: icon.svg }} />;
