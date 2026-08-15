import type { ActiveGuide, DirRecord, Translate } from '../types/index.js';
/** Fixed row height for the virtualizer (kept in sync with .ftr-row height). */
export declare const ROW_H = 23;
export type FlatRow = {
    key: string;
    path: string;
    name: string;
    depth: number;
    kind: 'dir';
    type: 'dir';
    isOpen: boolean;
} | {
    key: string;
    path: string;
    name: string;
    depth: number;
    kind: 'file';
    type: 'file';
    size: number;
    hidden: boolean;
    deleted: boolean;
} | {
    key: string;
    path: string;
    depth: number;
    type: 'loading';
} | {
    key: string;
    path: string;
    depth: number;
    type: 'empty';
} | {
    key: string;
    path: string;
    depth: number;
    type: 'truncated';
} | {
    key: string;
    path: string;
    depth: number;
    type: 'error';
    message: string;
};
/** Git statuses of files deleted from the working tree (parent dir -> rows). */
export type DeletedByDir = Map<string, Array<{
    name: string;
    path: string;
}>>;
/** Depth-first flattening of the visible tree (expanded dirs only). */
export declare function flattenTree(rootPath: string | null, dirs: Record<string, DirRecord>, expanded: Set<string>, deletedByDir?: DeletedByDir): FlatRow[];
/** MIME we use to carry the drag payload (custom type is only readable on drop). */
export declare const DRAG_MIME = "application/x-dsh-explorer";
export interface TreeListProps {
    rows: FlatRow[];
    rootPath: string | null;
    onRowHover: (p: string | null) => void;
    activeGuide: ActiveGuide | null;
    onToggle: (p: string) => void;
    openPreview: (p: string) => void;
    gitByPath: Map<string, string>;
    dirtyDirs: Set<string>;
    ignored: Set<string>;
    t: Translate;
}
/** Virtualized scrollable tree list. */
export declare function TreeList({ rows, rootPath, onRowHover, activeGuide, onToggle, openPreview, gitByPath, dirtyDirs, ignored, t }: TreeListProps): import("react").JSX.Element;
