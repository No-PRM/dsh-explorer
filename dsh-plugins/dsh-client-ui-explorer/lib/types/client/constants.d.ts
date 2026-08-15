/** Tunables and small path/format helpers. */
export declare const POLL_MS = 1200;
export declare const GUIDE_W = 12;
export declare const PANEL_KEY = "dsh.filetree.panel";
export declare const WIDTH_KEY = "dsh.filetree.width";
export declare const EXPANDED_KEY = "dsh.filetree.expanded";
export declare const clampDrawerWidth: (w: number) => number;
/** Tiny classnames joiner (kept local — no dependency needed). */
export declare function cls(...args: Array<unknown>): string;
export declare function joinPath(a: string, b: string): string;
export declare function basenameOf(p: string): string;
export declare function formatSize(bytes: number): string;
export declare function loadExpandedSet(): Set<string>;
export declare function persistExpanded(set: Set<string>): void;
/** Parent directory of an absolute path (keeps the trailing-drive form). */
export declare function dirnameOf(p: string): string;
