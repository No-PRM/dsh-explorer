/** The file-tree panel: header, search box, tree (or search results, or preview). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconCloseOutline16,
  IconFolderClose16,
  IconFolderOpen16,
  IconRefreshOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { DirRecord, SearchResult, SelectorHook, SessionsState, Translate, WorkspacesState } from './types.ts'
import {
  cls, loadExpandedSet, persistExpanded, POLL_MS,
} from './constants.ts'
import { styles } from './styles.ts'
import { flattenTree, TreeList } from './tree.tsx'
import { PreviewPane, type PreviewState } from './preview.tsx'
import { fetchDir, bfsSearch } from './fetch.ts'
import { fileIconSpec, IconCollapseAll, IconExpandAll, TypeIcon } from './icons.tsx'

export interface FileTreePanelProps {
  useSessions: SelectorHook<SessionsState>
  useWorkspaces: SelectorHook<WorkspacesState>
  t: Translate
  /** False while the drawer is closed (off-screen) — pauses polling. */
  active?: boolean
}

interface SearchUiState {
  q: string
  status: 'idle' | 'searching' | 'done' | 'error'
  results: SearchResult[]
  error: string | null
}

const EMPTY_SEARCH: SearchUiState = { q: '', status: 'idle', results: [], error: null }

export function FileTreePanel({ useSessions, useWorkspaces, t, active }: FileTreePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(loadExpandedSet)
  const [dirs, setDirs] = useState<Record<string, DirRecord>>({})
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchUiState>(EMPTY_SEARCH)
  const [hoverPath, setHoverPath] = useState<string | null>(null)
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  const previewPathRef = useRef<string | null>(null)
  const dirsRef = useRef<Record<string, DirRecord>>({})
  const expandedRef = useRef<Set<string>>(expanded)
  const searchTimer = useRef<number | null>(null)
  const searchSeq = useRef(0)

  useEffect(() => { previewPathRef.current = previewPath }, [previewPath])
  useEffect(() => { dirsRef.current = dirs }, [dirs])
  useEffect(() => { expandedRef.current = expanded }, [expanded])
  useEffect(() => () => { if (searchTimer.current !== null) window.clearTimeout(searchTimer.current) }, [])

  const current = useSessions((s) => s.current)
  const byId = useSessions((s) => s.byId)
  const wsItems = useWorkspaces((s) => s.items)
  const recentId = useWorkspaces((s) => s.recentWorkspaceId)

  const rootPath = useMemo(() => {
    if (current && byId[current] && byId[current].cwd) return byId[current].cwd
    const item = wsItems.find((w) => w.workspaceId === recentId)
    if (item && item.path) return item.path
    return null
  }, [current, byId, wsItems, recentId])

  const fetchAndStore = useCallback(async (p: string) => {
    const r = await fetchDir(p)
    setDirs((prev) => ({ ...prev, [p]: r }))
  }, [])

  const refreshAll = useCallback(async (manual?: boolean) => {
    const paths = Object.keys(dirsRef.current).filter((p) => expandedRef.current.has(p))
    if (paths.length === 0) return
    if (manual) setBusy(true)
    try {
      await Promise.all(paths.map((p) => fetchAndStore(p)))
    } finally {
      if (manual) setBusy(false)
    }
  }, [fetchAndStore])

  /* Load the root level once the current folder resolves. */
  useEffect(() => {
    if (!rootPath) return
    let alive = true
    fetchDir(rootPath).then((r) => {
      if (!alive) return
      setDirs((prev) => ({ ...prev, [rootPath]: r }))
      setExpanded((prev) => {
        if (prev.has(rootPath)) return prev
        const next = new Set(prev)
        next.add(rootPath)
        persistExpanded(next)
        return next
      })
    })
    return () => { alive = false }
  }, [rootPath])

  /* Fetch every expanded level that has no listing yet — restores persisted
     expansions after a reopen/refresh without a click. */
  useEffect(() => {
    const missing = Array.from(expanded).filter((p) => !dirsRef.current[p])
    if (missing.length === 0) return
    let alive = true
    Promise.all(missing.map((p) => fetchDir(p))).then((results) => {
      if (!alive) return
      setDirs((prev) => {
        const next = { ...prev }
        for (let i = 0; i < missing.length; i++) next[missing[i]] = results[i]
        return next
      })
    })
    return () => { alive = false }
  }, [expanded])

  /* Real-time refresh: poll loaded levels and the open preview, plus focus /
     visibility refresh. Paused while the drawer is closed. */
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => {
      void refreshAll()
      if (previewPathRef.current) void refreshPreview(previewPathRef.current)
    }, POLL_MS)
    const onVisible = () => { if (!document.hidden) void refreshAll() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAll, active])

  const toggleDir = useCallback((p: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p); else next.add(p)
      persistExpanded(next)
      return next
    })
  }, [])

  /* ---- search ---- */
  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || !rootPath) {
      setSearch({ q: trimmed, status: 'idle', results: [], error: null })
      return
    }
    setSearch((prev) => ({ ...prev, q: trimmed, status: 'searching' }))
    const seq = ++searchSeq.current
    let results: SearchResult[] | null = null
    try {
      /* Host /filetree/search when live (app restarted since the endpoint was added). */
      const res = await fetch('/filetree/search?path=' + encodeURIComponent(rootPath) + '&q=' + encodeURIComponent(trimmed), { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data && data.ok === true) results = data.results || []
      }
    } catch (e) {
      /* endpoint not live yet — fall through to the client BFS walk */
    }
    if (results === null) {
      try {
        results = await bfsSearch(rootPath, trimmed.toLowerCase())
      } catch (e2) {
        if (seq === searchSeq.current) setSearch({ q: trimmed, status: 'error', results: [], error: String((e2 && (e2 as Error).message) || e2) })
        return
      }
    }
    if (seq !== searchSeq.current) return
    setSearch({ q: trimmed, status: 'done', results, error: null })
  }, [rootPath])

  const onQueryChange = useCallback((v: string) => {
    setQuery(v)
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => { void runSearch(v) }, 250)
  }, [runSearch])

  const clearSearch = useCallback(() => {
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current)
    searchSeq.current += 1
    setQuery('')
    setSearch(EMPTY_SEARCH)
  }, [])

  /* ---- file preview ---- */
  const applyPreviewData = useCallback((data: { ok?: boolean; binary?: boolean; content?: string; size?: number; truncated?: boolean; error?: { message?: string } }) => {
    if (data && data.ok === true) {
      if (data.binary === true) setPreview({ status: 'done', binary: true, size: data.size, truncated: data.truncated === true })
      else setPreview({ status: 'done', binary: false, content: data.content || '', size: data.size, truncated: data.truncated === true })
    } else {
      setPreview({ status: 'error', error: (data && data.error && data.error.message) || 'read failed' })
    }
  }, [])

  const refreshPreview = useCallback(async (p: string) => {
    try {
      const res = await fetch('/filetree/read?path=' + encodeURIComponent(p), { cache: 'no-store' })
      applyPreviewData(await res.json())
    } catch (e) {}
  }, [applyPreviewData])

  const openPreview = useCallback(async (p: string) => {
    setPreviewPath(p)
    setPreview({ status: 'loading' })
    try {
      const res = await fetch('/filetree/read?path=' + encodeURIComponent(p), { cache: 'no-store' })
      applyPreviewData(await res.json())
    } catch (e) {
      setPreview({ status: 'error', error: String((e && (e as Error).message) || e) })
    }
  }, [applyPreviewData])

  const closePreview = useCallback(() => {
    setPreviewPath(null)
    setPreview(null)
  }, [])

  /* ---- expand / collapse all (bounded recursive expansion) ---- */
  const expandAll = useCallback(async () => {
    if (!rootPath) return
    setBusy(true)
    try {
      const next = new Set(expandedRef.current)
      next.add(rootPath)
      let frontier = [rootPath]
      let depth = 0
      let count = 0
      const MAX_DIRS = 150
      const MAX_DEPTH = 6
      while (frontier.length > 0 && depth < MAX_DEPTH && count < MAX_DIRS) {
        const level: string[] = []
        for (const p of frontier) {
          if (count >= MAX_DIRS) break
          const rec = dirsRef.current[p] ?? (await fetchDir(p))
          if (!dirsRef.current[p]) setDirs((prev) => ({ ...prev, [p]: rec }))
          if (rec.state !== 'ok') continue
          for (const e of rec.entries) {
            if (e.kind !== 'dir') continue
            count += 1
            const child = joinPathLocal(p, e.name)
            next.add(child)
            level.push(child)
            if (count >= MAX_DIRS) break
          }
        }
        frontier = level
        depth += 1
      }
      setExpanded(next)
      persistExpanded(next)
    } finally {
      setBusy(false)
    }
  }, [rootPath])

  /* VS Code guide rule: the active guide is the hovered node's PARENT line
     (or its own line when hovering an open folder). */
  const activeGuide = useMemo(() => {
    if (!hoverPath || !rootPath) return null
    const sep = rootPath.indexOf('\\') !== -1 ? '\\' : '/'
    const rel = hoverPath.slice(rootPath.length).replace(/^[\\/]+/, '')
    if (rel === '') {
      /* hovering the root itself: open root lights its own line */
      if (expanded.has(hoverPath)) return { path: hoverPath, depth: 0 }
      return null
    }
    const segs = rel.split(/[\\/]/)
    if (expanded.has(hoverPath)) {
      return { path: hoverPath, depth: segs.length }
    }
    segs.pop()
    return { path: rootPath + sep + segs.join(sep), depth: segs.length }
  }, [hoverPath, rootPath, expanded])

  const collapseAll = useCallback(() => {
    setExpanded((prev) => {
      const next = new Set(rootPath && prev.has(rootPath) ? [rootPath] : [])
      persistExpanded(next)
      return next
    })
  }, [rootPath])

  const anyExpanded = Array.from(expanded).some((p) => p !== rootPath)

  /* ---- render ---- */
  const relPath = (p: string) => {
    if (!rootPath) return p
    const rel = p.slice(rootPath.length).replace(/^[\\/]+/, '')
    return rel || p
  }

  let bodyContent: React.ReactNode
  const searching = query.trim() !== ''
  const rows = useMemo(() => flattenTree(rootPath, dirs, expanded), [rootPath, dirs, expanded])
  if (searching) {
    bodyContent = search.status === 'searching'
      ? <div className={styles.message}>{t('searching')}</div>
      : search.status === 'error'
        ? <div className={styles.error}>{search.error}</div>
        : search.results.length === 0
          ? <div className={styles.message}>{t('noResults')}</div>
          : (
            <div className={styles.results}>
              {search.results.map((r) => (
                <button key={r.path} type="button" className={styles.resultRow} title={r.path} onClick={() => openPreview(r.path)}>
                  {r.kind === 'dir'
                    ? <IconFolderClose16 className={styles.dirIcon} size={14} />
                    : <TypeIcon spec={fileIconSpec(r.name)} size={14} />}
                  <span className={styles.resultPath}>{relPath(r.path)}</span>
                  <span className={styles.resultKind}>{r.kind}</span>
                </button>
              ))}
            </div>
          )
  } else if (!rootPath) {
    bodyContent = <div className={styles.message}>{t('noFolder')}</div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <IconFolderOpen16 className={styles.dirIcon} size={15} />
        {rootPath
          ? <span className={styles.path} title={rootPath}>{rootPath}</span>
          : <span className={styles.path}>{t('noFolder')}</span>}
        <button type="button" className={styles.iconButton} aria-label={t('refresh')} title={t('refresh')} disabled={busy} onClick={() => void refreshAll(true)}>
          <IconRefreshOutline16 className={cls(busy && styles.spin)} size={14} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={anyExpanded ? t('collapseAll') : t('expandAll')}
          title={anyExpanded ? t('collapseAll') : t('expandAll')}
          onClick={() => { if (anyExpanded) collapseAll(); else void expandAll() }}
        >
          {anyExpanded ? <IconCollapseAll size={15} /> : <IconExpandAll size={15} />}
        </button>
      </div>
      <div className={styles.search}>
        <input
          className={styles.searchInput}
          type="text"
          value={query}
          placeholder={t('searchPlaceholder')}
          spellCheck={false}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query
          ? <button type="button" className={styles.searchClear} aria-label={t('clear')} title={t('clear')} onClick={clearSearch}>
              <IconCloseOutline16 size={12} />
            </button>
          : null}
      </div>
      {previewPath
        ? <PreviewPane previewPath={previewPath} preview={preview} relPath={relPath} onClose={closePreview} t={t} />
        : searching || !rootPath
          ? <div className={styles.body}>{bodyContent}</div>
          : (
            <TreeList
              rows={rows}
              hoverPath={hoverPath}
              onRowHover={setHoverPath}
              activeGuide={activeGuide}
              onToggle={toggleDir}
              openPreview={openPreview}
              t={t}
            />
          )}
    </div>
  )
}

/** Local path join for expandAll (avoids a circular import shape). */
function joinPathLocal(a: string, b: string): string {
  const sep = a.indexOf('\\') !== -1 ? '\\' : '/'
  return a.endsWith(sep) ? a + b : a + sep + b
}
