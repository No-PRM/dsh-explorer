/** Typed wrapper for the @tabler/icons-react per-icon ESM modules we use.
 *  Each .mjs ships no adjacent type declarations, so the import is suppressed
 *  and cast to our structural icon component type (tsdown/rolldown still
 *  resolves and bundles the real .mjs — tree-shaken to exactly these icons). */
import type { ReactNode } from 'react';
export interface TablerIconProps {
    size?: number | string;
    color?: string;
    stroke?: number | string;
    className?: string;
}
export type TablerIcon = (props: TablerIconProps) => ReactNode;
export declare const IconBraces: TablerIcon;
export declare const IconChevronsDown: TablerIcon;
export declare const IconChevronsUp: TablerIcon;
export declare const IconDatabase: TablerIcon;
export declare const IconFile: TablerIcon;
export declare const IconFileAlert: TablerIcon;
export declare const IconFileCode: TablerIcon;
export declare const IconFileCode2: TablerIcon;
export declare const IconFileInfo: TablerIcon;
export declare const IconFileMusic: TablerIcon;
export declare const IconFileText: TablerIcon;
export declare const IconFileTypeBmp: TablerIcon;
export declare const IconFileTypeCss: TablerIcon;
export declare const IconFileTypeCsv: TablerIcon;
export declare const IconFileTypeDoc: TablerIcon;
export declare const IconFileTypeHtml: TablerIcon;
export declare const IconFileTypeJs: TablerIcon;
export declare const IconFileTypeJpg: TablerIcon;
export declare const IconFileTypeJsx: TablerIcon;
export declare const IconFileTypePdf: TablerIcon;
export declare const IconFileTypePhp: TablerIcon;
export declare const IconFileTypePng: TablerIcon;
export declare const IconFileTypeSql: TablerIcon;
export declare const IconFileTypeSvg: TablerIcon;
export declare const IconFileTypeTs: TablerIcon;
export declare const IconFileTypeTxt: TablerIcon;
export declare const IconFileTypeVue: TablerIcon;
export declare const IconFileTypeXls: TablerIcon;
export declare const IconFileTypeXml: TablerIcon;
export declare const IconFileTypeZip: TablerIcon;
export declare const IconKey: TablerIcon;
export declare const IconLock: TablerIcon;
export declare const IconPhoto: TablerIcon;
export declare const IconSettings: TablerIcon;
export declare const IconTerminal2: TablerIcon;
export declare const IconVideo: TablerIcon;
export declare const IconArrowsDiff: TablerIcon;
