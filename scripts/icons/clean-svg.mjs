// Parses an icon SVG exported from Figma and makes the three edits every export needs:
//
// 1. Removes a background rectangle the size of the icon (Figma's SVG export can add one
//    that isn't in the component)
// 2. Changes fixed colours on fill and stroke to currentColor, so the icon takes the colour
//    of the slot it sits in
// 3. Strips layer IDs, which would repeat when an icon is used more than once on a page
//
// Anything else that doesn't fit how the current icons are drawn is reported as a problem
// rather than guessed at, e.g. more than one colour, gradients, masks or opacity.

const ALLOWED_ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect']);
const OPACITY_ATTRIBUTES = new Set(['opacity', 'fill-opacity', 'stroke-opacity']);
const KEEP_COLOURS = new Set(['none', 'currentColor']);

/** Minimal parser for Figma's SVG export: elements and attributes only, no text content */
export function parseSvg(source) {
  const root = { name: '#root', attributes: [], children: [] };
  const stack = [root];
  const problems = [];
  const tokenPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let match;
  let consumed = 0;
  while ((match = tokenPattern.exec(source))) {
    consumed += match[0].length;
    const [token, closing, opening, attributeText, selfClosing, text] = match;
    if (token.startsWith('<!--')) problems.push('has a comment');
    else if (token.startsWith('<?')) continue;
    else if (closing) {
      const open = stack.pop();
      if (open.name !== closing) throw new Error(`</${closing}> closes <${open.name}>`);
    } else if (opening) {
      const attributes = [...attributeText.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
        ([, name, double, single]) => ({ name, value: double ?? single }),
      );
      const element = { name: opening, attributes, children: [] };
      stack.at(-1).children.push(element);
      if (!selfClosing) stack.push(element);
    } else if (text.trim()) problems.push(`has text content: ${text.trim().slice(0, 40)}`);
  }
  if (consumed !== source.length) throw new Error('could not be parsed');
  if (stack.length !== 1) throw new Error(`<${stack.at(-1).name}> is never closed`);
  const svg = root.children.filter((child) => child.name === 'svg');
  if (root.children.length !== 1 || svg.length !== 1) throw new Error('must contain exactly one <svg> element');
  return { svg: svg[0], problems };
}

const attribute = (element, name) => element.attributes.find((a) => a.name === name)?.value;
const number = (value) => (value === undefined ? 0 : Number(value));

/**
 * Cleans one icon. `size` is the number from the file name's size prefix (20 for 20px).
 * Returns the cleaned tree, what was changed, and anything that doesn't fit the pattern.
 */
export function cleanSvg(source, size) {
  const { svg, problems } = parseSvg(source);
  const changes = { backgroundsRemoved: 0, coloursReplaced: new Map(), idsStripped: 0 };
  const warnings = [];

  const width = attribute(svg, 'width');
  const height = attribute(svg, 'height');
  const viewBox = attribute(svg, 'viewBox');
  if (width !== String(size) || height !== String(size) || viewBox !== `0 0 ${size} ${size}`) {
    problems.push(`is ${width} × ${height} (viewBox "${viewBox}"), but its name says ${size}px`);
  }

  const isBackground = (element) =>
    element.name === 'rect' &&
    number(attribute(element, 'x')) === 0 &&
    number(attribute(element, 'y')) === 0 &&
    attribute(element, 'width') === String(size) &&
    attribute(element, 'height') === String(size) &&
    !attribute(element, 'rx') &&
    !attribute(element, 'transform') &&
    (attribute(element, 'stroke') ?? 'none') === 'none' &&
    (attribute(element, 'fill') ?? '#000') !== 'none';

  const visit = (element, isRoot) => {
    if (!ALLOWED_ELEMENTS.has(element.name)) problems.push(`uses <${element.name}>`);

    element.attributes = element.attributes.filter(({ name, value }) => {
      if (name === 'id') {
        changes.idsStripped += 1;
        return false;
      }
      if (name === 'style' || name === 'class') problems.push(`has a ${name} attribute on <${element.name}>`);
      if (OPACITY_ATTRIBUTES.has(name)) problems.push(`has ${name}="${value}" on <${element.name}>`);
      if (name.includes(':') && name !== 'xmlns') problems.push(`has a namespaced attribute ${name}`);
      if (value.includes('url(')) problems.push(`references ${value} in ${name}`);
      return true;
    });

    for (const attr of element.attributes) {
      if ((attr.name === 'fill' || attr.name === 'stroke') && !KEEP_COLOURS.has(attr.value)) {
        if (isRoot) {
          problems.push(`sets ${attr.name}="${attr.value}" on <svg>`);
          continue;
        }
        const colour = attr.value.toUpperCase();
        changes.coloursReplaced.set(colour, (changes.coloursReplaced.get(colour) ?? 0) + 1);
        attr.value = 'currentColor';
      }
    }

    element.children = element.children.filter((child) => {
      if (isBackground(child)) {
        changes.backgroundsRemoved += 1;
        return false;
      }
      if (child.name === 'rect') warnings.push('keeps a <rect> that isn\'t a full-size background');
      return true;
    });
    element.children.forEach((child) => visit(child, false));
  };
  visit(svg, true);

  if (changes.coloursReplaced.size > 1) {
    problems.push(`uses ${changes.coloursReplaced.size} colours (${[...changes.coloursReplaced.keys()].join(', ')}), so currentColor would flatten them`);
  }

  return { svg, changes, problems, warnings };
}

/** Serialises a cleaned tree back to SVG markup (used to compare with the source files) */
export function toSvgMarkup(element, depth = 0) {
  const attributes = element.attributes.map(({ name, value }) => ` ${name}="${value}"`).join('');
  if (!element.children.length) return `<${element.name}${attributes}/>`;
  return `<${element.name}${attributes}>\n${element.children.map((c) => toSvgMarkup(c, depth + 1)).join('\n')}\n</${element.name}>`;
}
