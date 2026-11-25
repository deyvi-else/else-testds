// url=https://www.figma.com/design/kDoLf0s6Vdeg8dS8cgi1ro/Test-design-system?node-id=5-192
// source=src/components/Card/Card.tsx
// component=Card
import figma from 'figma';

const instance = figma.selectedInstance;

const titleText = instance.getString('Title text');
const descriptionText = instance.getString('Description text');

// Choose icon is an instance swap. If the swapped icon has its own Code Connect mapping, its
// snippet goes in chooseIcon. If it doesn't, chooseIcon shows a placeholder comment rather than
// a hard-coded icon, so the required prop stays visible.
// Interaction state isn't mapped: it's a CSS state (:hover), not a prop. See CLAUDE.md.
const chooseIcon = instance.getInstanceSwap('Choose icon');
let chooseIconCode;
if (chooseIcon && chooseIcon.type === 'INSTANCE' && chooseIcon.hasCodeConnect()) {
  chooseIconCode = chooseIcon.executeTemplate().example;
}

// href has no Figma property, so "#" is a placeholder for the real link.
export default {
  example: figma.code`<Card
  ${chooseIconCode ? figma.code`chooseIcon={${chooseIconCode}}` : 'chooseIcon={/* icon */}'}
  titleText="${titleText}"
  descriptionText="${descriptionText}"
  href="#"
/>`,
  imports: ['import { Card } from "else-testds"'],
  id: 'card',
  metadata: { nestable: true },
};
