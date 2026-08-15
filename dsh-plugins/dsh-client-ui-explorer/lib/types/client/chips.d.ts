/** Reference chips for dragged-in files — plain-DOM overlay above the chat
 *  composer. Deliberately NOT React (avoids react-dom) and NOT inside the
 *  drawer (its transform would break fixed positioning): a container is
 *  appended to document.body and rebuilt on each update. */
interface RefChip {
    rel: string;
    kind: string;
}
/** Render (or clear) the chip bar. `null`/empty removes it. */
/** True when (x, y) falls on the composer textarea (with a small margin). */
export declare function isOverComposer(x: number, y: number): boolean;
/** Toggle a highlight ring on the composer to signal it is a drop target. */
export declare function setComposerTarget(on: boolean): void;
export declare function markDrag(rel: string | null): void;
export declare function isDragMarked(): boolean;
export declare function dragMarkedText(): string | null;
export declare function updateChipBar(refs: RefChip[], onRemove: (rel: string) => void): void;
export {};
