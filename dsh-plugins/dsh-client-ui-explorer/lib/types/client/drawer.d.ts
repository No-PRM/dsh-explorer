import type { SelectorHook, SessionsState, Translate, WorkspacesState } from '../types/index.js';
export interface FileTreeOverlayProps {
    useSessions: SelectorHook<SessionsState>;
    useWorkspaces: SelectorHook<WorkspacesState>;
    t: Translate;
}
/** Overlay entry: owns open/width state and composes button + drawer. */
export declare function FileTreeOverlay(props: FileTreeOverlayProps): import("react").JSX.Element;
