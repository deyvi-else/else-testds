// Types for token-names.mjs, so the Storybook pages (TypeScript) can import it.

export declare const kebab: (segment: string | number) => string;
export declare const cssName: (path: string[]) => string;
export declare const cssVar: (path: string[]) => string;
export declare const figmaPath: (figmaName: string) => string[];
export declare const figmaName: (path: string[]) => string;
export declare const typographyPath: (stylePath: string[], property: string) => string[];
export declare const referencePath: (reference: unknown) => string[] | undefined;
