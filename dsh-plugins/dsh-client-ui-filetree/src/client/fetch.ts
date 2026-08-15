import type { DirRecord, GitStatus, SearchResult } from '../types/index.ts'
import { joinPath } from './constants.ts'

/** List one directory level through the host's /filetree/list. */
export async function fetchDir(p: string): Promise<DirRecord> {
  try {
    const res = await fetch('/filetree/list?path=' + encodeURIComponent(p), { cache: 'no-store' })
    const data = await res.json()
    if (!data || data.ok !== true) {
      const err = data && data.error ? data.error : {}
      return { state: 'error', message: err.message || String(err.code || 'list-failed') }
    }
    return { state: 'ok', entries: data.entries || [], truncated: data.truncated === true }
  } catch (e) {
    return { state: 'error', message: String((e && (e as Error).message) || e) }
  }
}

/** Client-side BFS search over /filetree/list — fallback when the host's
 *  dedicated /filetree/search endpoint is not yet live (host code changes
 *  apply on the next app start). Bounded; skips .git and node_modules. */
export async function bfsSearch(root: string, q: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const MAX_DIRS = 300
  const MAX_RESULTS = 200
  const MAX_DEPTH = 12
  const skip = new Set(['.git', 'node_modules'])
  let frontier = [root]
  let depth = 0
  let scannedDirs = 0
  while (frontier.length > 0 && depth < MAX_DEPTH && scannedDirs < MAX_DIRS && results.length < MAX_RESULTS) {
    const listings = await Promise.all(frontier.map((p) => fetchDir(p)))
    const next: string[] = []
    frontier.forEach((p, i) => {
      const rec = listings[i]
      if (rec.state !== 'ok') return
      scannedDirs += 1
      for (const e of rec.entries) {
        if (results.length >= MAX_RESULTS) break
        if (e.name.toLowerCase().includes(q)) results.push({ path: joinPath(p, e.name), name: e.name, kind: e.kind })
        if (e.kind === 'dir' && !skip.has(e.name) && depth + 1 < MAX_DEPTH) next.push(joinPath(p, e.name))
      }
    })
    frontier = next
    depth += 1
  }
  return results
}

/** Git status for the workspace (host /filetree/gitstatus; git:false when not a repo). */
export async function fetchGitStatus(root: string): Promise<GitStatus> {
  try {
    const res = await fetch('/filetree/gitstatus?path=' + encodeURIComponent(root), { cache: 'no-store' })
    if (!res.ok) return { git: false }
    const data = await res.json()
    if (data && data.ok === true && data.git === true) {
      return { git: true, root: data.root, entries: data.entries || [], truncated: data.truncated === true }
    }
    return { git: false }
  } catch (e) {
    return { git: false }
  }
}
