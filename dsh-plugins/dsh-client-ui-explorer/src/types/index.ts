/** Shared structural types for the file-tree drawer. */

/** Locale translate function handed to slot components. */
export type Translate = (key: string) => string

/** Standard-kit selector hook (useSessions / useWorkspaces). */
export type SelectorHook<T> = <S>(sel: (s: T) => S) => S

/** One directory listing row. */
export interface DirEntry {
  name: string
  kind: 'dir' | 'file'
  size: number
  mtime: number
  hidden: boolean
}

/** Cached per-directory listing. */
export type DirRecord =
  | { state: 'ok'; entries: DirEntry[]; truncated: boolean }
  | { state: 'error'; message: string }

/** The guide line that should light on hover (VS Code rule). */
export interface ActiveGuide {
  path: string
  depth: number
}

/** One search hit. */
export interface SearchResult {
  path: string
  name: string
  kind: 'dir' | 'file'
}

/** Sessions list snapshot shape we read. */
export interface SessionsState {
  current?: string
  byId: Record<string, { cwd?: string }>
}

/** Workspaces list snapshot shape we read. */
export interface WorkspacesState {
  items: Array<{ workspaceId: string; path: string }>
  recentWorkspaceId?: string
}

/** Minimal client-context face used by apply(). */
export interface ClientCtx {
  effect(fn: () => void, label?: string): void
  slots: {
    inject(key: string, fn: () => unknown): void
    register(opts: Record<string, unknown>, comp: unknown): () => void
  }
  locale: {
    register(ns: string, dict: Record<string, Record<string, string>>): unknown
  }
}

/** Git decoration data (VS Code-style file status markers). */
export interface GitStatusEntry {
  path: string
  status: string
  x: string
  y: string
}
export interface GitStatus {
  git: boolean
  root?: string
  entries?: GitStatusEntry[]
  truncated?: boolean
  reason?: string
}
