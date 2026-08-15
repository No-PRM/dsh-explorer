/** File-type icons via @tabler/icons-react (mature icon library, tree-shaken). */
import type { ReactNode } from 'react';
import { type TablerIcon } from './tabler-icons.js';
export type IconComponent = TablerIcon;
export interface IconSpec {
    Icon: IconComponent;
    color: string;
}
/** Resolve a file basename to its type icon spec. */
export declare function fileIconSpec(name: string): IconSpec;
/** Render one icon spec as an inline SVG (tabler icon). */
export declare function TypeIcon({ spec, size }: {
    spec: IconSpec;
    size?: number;
}): ReactNode;
/** Expand-all / collapse-all glyphs (tabler double chevrons). */
export declare function IconExpandAll({ size }: {
    size?: number;
}): ReactNode;
export declare function IconCollapseAll({ size }: {
    size?: number;
}): ReactNode;
