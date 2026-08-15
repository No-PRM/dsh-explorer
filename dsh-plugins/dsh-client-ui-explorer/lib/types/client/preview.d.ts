import type { Translate } from '../types/index.js';
export type MediaKind = 'image' | 'video' | 'audio' | 'pdf';
export type PreviewState = {
    status: 'loading';
} | {
    status: 'done';
    binary: boolean;
    content?: string;
    size?: number;
    truncated?: boolean;
} | {
    status: 'done';
    kind: MediaKind;
    url: string;
} | {
    status: 'error';
    error: string;
};
export interface PreviewPaneProps {
    previewPath: string | null;
    preview: PreviewState | null;
    relPath: (p: string) => string;
    onClose: () => void;
    /** File has a git status (so a HEAD diff exists to compare). */
    canDiff: boolean;
    /** Manual selection-drag -> add a reference to the composer. */
    onReference?: (rel: string, kind: string) => void;
    t: Translate;
}
/** Media files render natively (img/video/audio/pdf) via the host /filetree/raw stream. */
export declare function mediaKind(path: string | null): MediaKind | null;
export declare function PreviewPane({ previewPath, preview, relPath, onClose, canDiff, onReference, t }: PreviewPaneProps): import("react").JSX.Element;
