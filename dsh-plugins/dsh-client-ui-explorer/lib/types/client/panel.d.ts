import type { SelectorHook, SessionsState, Translate, WorkspacesState } from '../types/index.js';
export interface FileTreePanelProps {
    useSessions: SelectorHook<SessionsState>;
    useWorkspaces: SelectorHook<WorkspacesState>;
    t: Translate;
    /** False while the drawer is closed (off-screen) — pauses polling. */
    active?: boolean;
}
export declare function FileTreePanel({ useSessions, useWorkspaces, t, active }: FileTreePanelProps): import("react").JSX.Element;
