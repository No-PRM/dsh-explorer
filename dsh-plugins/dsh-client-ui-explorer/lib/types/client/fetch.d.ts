import type { DirRecord, GitStatus, SearchResult } from '../types/index.js';
/** List one directory level through the host's /filetree/list. */
export declare function fetchDir(p: string): Promise<DirRecord>;
/** Client-side BFS search over /filetree/list — fallback when the host's
 *  dedicated /filetree/search endpoint is not yet live (host code changes
 *  apply on the next app start). Bounded; skips .git and node_modules. */
export declare function bfsSearch(root: string, q: string): Promise<SearchResult[]>;
/** Git status for the workspace (host /filetree/gitstatus; git:false when not a repo). */
export declare function fetchGitStatus(root: string): Promise<GitStatus>;
