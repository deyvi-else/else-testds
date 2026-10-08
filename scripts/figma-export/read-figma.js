// Figma Plugin API script: reads the Test design system's variables, text
// styles and effect styles, and returns them as a raw JSON snapshot.
//
// Read-only. It never writes to the Figma file.
//
// Run it with the Figma MCP `use_figma` tool (file key kDoLf0s6Vdeg8dS8cgi1ro).
// The script body uses top-level `await` and `return`, which `use_figma`
// wraps in an async function. Save the returned JSON to
// scripts/figma-export/figma-raw.json, then run `npm run tokens:export`.
// See docs/token-export.md.
//
// Values are returned exactly as Figma stores them. No conversion happens
// here; to-dtcg.mjs only restructures, and Style Dictionary converts units.

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();

return {
  fileKey: figma.fileKey ?? null,
  collections: collections.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
    defaultModeId: c.defaultModeId,
    modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    variableIds: c.variableIds,
  })),
  variables: variables.map((v) => ({
    id: v.id,
    key: v.key,
    name: v.name,
    description: v.description,
    resolvedType: v.resolvedType,
    variableCollectionId: v.variableCollectionId,
    valuesByMode: v.valuesByMode,
    scopes: v.scopes,
    codeSyntax: v.codeSyntax,
    hiddenFromPublishing: v.hiddenFromPublishing,
  })),
  textStyles: textStyles.map((s) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    description: s.description,
    fontName: s.fontName,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    paragraphSpacing: s.paragraphSpacing,
    paragraphIndent: s.paragraphIndent,
    textCase: s.textCase,
    textDecoration: s.textDecoration,
    leadingTrim: s.leadingTrim,
    boundVariables: s.boundVariables,
  })),
  effectStyles: effectStyles.map((s) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    description: s.description,
    effects: s.effects,
    boundVariables: s.boundVariables,
  })),
};
