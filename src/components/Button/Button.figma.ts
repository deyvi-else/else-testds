// url=https://www.figma.com/design/kDoLf0s6Vdeg8dS8cgi1ro/Test-design-system?node-id=93-219
// source=src/components/Button/Button.tsx
// component=Button
import figma from 'figma';

const instance = figma.selectedInstance;

const label = instance.getString('Label');
const variant = instance.getEnum('Variant', {
  Primary: 'primary',
  Secondary: 'secondary',
});

// Interaction state isn't mapped: it's a CSS state (:hover), not a prop. See CLAUDE.md.
// variant is always written out, though primary is the default, so the snippet shows which one it is.
// onClick has no Figma property, so the snippet leaves it out.
// href has no Figma property either: Figma has one Button whether it's a link or an action, so the
// snippet can't tell which. It shows the <button> form. Add href="..." to make it a link, which
// looks the same (the Card's snippet does write href="#", because a Card is always a link).
export default {
  example: figma.code`<Button label="${label}" variant="${variant}" />`,
  imports: ['import { Button } from "else-testds"'],
  id: 'button',
  metadata: { nestable: true },
};
