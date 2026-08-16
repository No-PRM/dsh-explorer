/** The file-tree panel: header, search box, tree (or search results, or preview). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconCloseOutline16,
  IconFolderClose16,
  IconFolderOpen16,
  IconRefreshOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { DirRecord, SearchResult, SelectorHook, SessionsState, Translate, WorkspacesState } from '../types/index.ts'
import {
  cls, dirnameOf, loadExpandedSet, persistExpanded, POLL_MS,
} from './constants.ts'
import { styles } from './styles.ts'
import { DRAG_MIME, flattenTree, TreeList, type DeletedByDir } from './tree.tsx'
import { dragMarkedText, isDragMarked, isOverComposer, markDrag, setComposerTarget, updateChipBar } from './chips.ts'
import { mediaKind, PreviewPane, type PreviewState } from './preview.tsx'
import { fetchDir, bfsSearch, fetchGitStatus } from './fetch.ts'
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
/** Stable empty containers so TreeList props keep identity between renders. */
const EMPTY_GIT_MAP: Map<string, string> = new Map()
const EMPTY_GIT_SET: Set<string> = new Set()

/** Find the chat composer textarea (the app's one big textarea). */
function findComposerTextarea(): HTMLTextAreaElement | null {
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement) return active
  const tas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea'))
  if (tas.length === 0) return null
  tas.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)
  return tas[0]
}

/** Insert text into the composer at the caret. Uses the native value setter so
 *  React's controlled state picks the change up, then fires 'input'. */
function insertIntoComposer(text: string): boolean {
  const ta = findComposerTextarea()
  if (!ta) return false
  ta.focus()
  const start = ta.selectionStart ?? ta.value.length
  const end = ta.selectionEnd ?? start
  const next = ta.value.slice(0, start) + text + ta.value.slice(end)
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  if (setter) {
    setter.call(ta, next)
    const pos = start + text.length
    ta.setSelectionRange(pos, pos)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }
  ta.value = next
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

/** Insert a dragged reference, padded with spaces so it never glues to
 *  neighbouring text (skipped when the adjacent char is already whitespace
 *  or the line/field boundary). */
/** XML-tagged reference — unambiguous for the model (mirrors dsh-at-file's
 *  <workspace-reference> convention). */
function formatRef(path: string, kind: string, lines?: string): string {
  const attrs = lines ? 'path="' + path + '" lines="' + lines + '"' : 'path="' + path + '"'
  return '<reference ' + attrs + ' />'
}

function insertReference(rel: string): void {
  const ta = findComposerTextarea()
  if (!ta) return
  const at = ta.selectionStart ?? ta.value.length
  const before = ta.value[at - 1]
  let text = rel
  if (at > 0 && before !== undefined && !/\s/.test(before)) text = ' ' + text
  /* Trailing space decided by what follows the insertion point: the char
     at the caret (non-space → pad), or nothing at all (the reference lands at
     the very end of the draft → pad so the next input doesn't glue). */
  const following = ta.value[at]
  if (following === undefined || !/\s/.test(following)) text = text + ' '
  insertIntoComposer(text)
}

export function FileTreePanel({ useSessions, useWorkspaces, t, active }: FileTreePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(loadExpandedSet)
  const [dirs, setDirs] = useState<Record<string, DirRecord>>({})
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchUiState>(EMPTY_SEARCH)
  const [hoverPath, setHoverPath] = useState<string | null>(null)
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [git, setGit] = useState<{ byPath: Map<string, string>; dirtyDirs: Set<string>; deletedByDir: DeletedByDir; ignored: Set<string> } | null>(null)
  const [refs, setRefs] = useState<Array<{ text: string; label: string; kind: string }>>([])

  const previewPathRef = useRef<string | null>(null)
  const dirsRef = useRef<Record<string, DirRecord>>({})
  const expandedRef = useRef<Set<string>>(expanded)
  const searchTimer = useRef<number | null>(null)
  const gitTimer = useRef(0)
  const gitSkipRoot = useRef<string | null>(null)
  const rootPathRef = useRef<string | null>(null)
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

  /* Drag & drop: tree rows carry the @-mention token; dropping anywhere
     inserts it into the chat composer (React-safe). */
  useEffect(() => {
    /* live ghost for file/folder drags: the native drag image is suppressed,
       so we render the same .ftr-dragGhost pill as content drags and move it
       with the pointer (blue while over the composer). Detection uses our drag
       marker — custom dataTransfer types are invisible during dragover. */
    let dragGhostEl: HTMLDivElement | null = null
    const onDragOver = (e: DragEvent) => {
      if (!isDragMarked()) return
      const over = isOverComposer(e.clientX, e.clientY)
      if (!dragGhostEl) {
        const text = dragMarkedText()
        if (text) {
          dragGhostEl = document.createElement('div')
          dragGhostEl.className = 'ftr-dragGhost'
          dragGhostEl.textContent = text
          document.body.appendChild(dragGhostEl)
        }
      }
      if (dragGhostEl) {
        dragGhostEl.style.left = e.clientX + 12 + 'px'
        dragGhostEl.style.top = e.clientY + 12 + 'px'
        dragGhostEl.classList.toggle('over', over)
      }
      setComposerTarget(over)
      if (over) e.preventDefault()
    }
    const clearTarget = () => {
      setComposerTarget(false)
      dragGhostEl?.remove()
      dragGhostEl = null
      markDrag(null)
    }
    const onDrop = (e: DragEvent) => {
      if (!isDragMarked()) { clearTarget(); return }
      /* fill only when dropped into the composer */
      if (!isOverComposer(e.clientX, e.clientY)) { clearTarget(); return }
      e.preventDefault()
      clearTarget()
      const raw = e.dataTransfer?.getData(DRAG_MIME)
      if (!raw) return
      let payload: { path?: string; rel?: string; kind?: string }
      try { payload = JSON.parse(raw) } catch { return }
      if (!payload.rel) return
      /* plain workspace-relative path (no @ prefix) + a removable chip */
      const rel = payload.rel
      const kind = payload.kind === 'dir' ? 'dir' : 'file'
      const text = formatRef(rel, kind)
      setRefs((prev) => (prev.some((r) => r.text === text) ? prev : [...prev, { text, label: rel, kind }]))
      insertReference(text)
    }
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    document.addEventListener('dragend', clearTarget)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
      document.removeEventListener('dragend', clearTarget)
    }
  }, [])

  /* Reference chips: render above the composer, re-measure while visible. */
  const removeRef = useCallback((text: string) => {
    const ta = findComposerTextarea()
    if (ta) {
      const idx = ta.value.indexOf(text)
      if (idx !== -1) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        const next = ta.value.slice(0, idx) + ta.value.slice(idx + text.length)
        if (setter) {
          setter.call(ta, next)
          ta.dispatchEvent(new Event('input', { bubbles: true }))
        } else {
          ta.value = next
          ta.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    }
    setRefs((prev) => prev.filter((r) => r.text !== text))
  }, [])

  useEffect(() => {
    if (refs.length === 0) { updateChipBar([], removeRef); return }
    const render = () => {
      /* Sync with the draft: the app clears the composer through React state
         (no DOM 'input' event), so each heartbeat also drops refs whose path
         text vanished — this makes chips disappear after sending, without
         needing a click. */
      const ta = findComposerTextarea()
      if (ta) {
        const alive = refs.filter((r) => ta.value.includes(r.text))
        if (alive.length !== refs.length) { setRefs(alive); return }
      }
      updateChipBar(refs, removeRef)
    }
    render()
    window.addEventListener('resize', render)
    window.addEventListener('scroll', render, true)
    const t = window.setInterval(render, 400)
    return () => {
      window.removeEventListener('resize', render)
      window.removeEventListener('scroll', render, true)
      window.clearInterval(t)
      updateChipBar([], removeRef)
    }
  }, [refs, removeRef])

  /* Drop chips whose path text vanished from the composer (user deleted it or
     the message was sent). */
  useEffect(() => {
    const onInput = (e: Event) => {
      const ta = e.target
      if (!(ta instanceof HTMLTextAreaElement)) return
      setRefs((prev) => (prev.length === 0 ? prev : prev.filter((r) => ta.value.includes(r.text))))
    }
    document.addEventListener('input', onInput, true)
    return () => document.removeEventListener('input', onInput, true)
  }, [])

  /* Reset git decorations when the workspace folder changes. */
  useEffect(() => {
    rootPathRef.current = rootPath
    gitSkipRoot.current = null
    gitTimer.current = 0
    setGit(null)
  }, [rootPath])
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

  /* VS Code-style git decorations: fetch /filetree/gitstatus throttled to
     ~3s; non-repo roots are remembered so we stop probing them. */
  const refreshGit = useCallback(async (p: string) => {
    const now = Date.now()
    if (now - gitTimer.current < 3000) return
    gitTimer.current = now
    const data = await fetchGitStatus(p)
    if (rootPathRef.current !== p) return
    if (!data.git || !data.root || !data.entries) {
      gitSkipRoot.current = p
      setGit(null)
      return
    }
    const sep = p.indexOf('\\') !== -1 ? '\\' : '/'
    const norm = (x: string) => (sep === '\\' ? x.replace(/\//g, '\\') : x.replace(/\\/g, '/'))
    const root = norm(data.root)
    const rootWithSep = root.endsWith(sep) ? root : root + sep
    const byPath = new Map<string, string>()
    const dirtyDirs = new Set<string>()
    const deletedByDir: DeletedByDir = new Map()
    const ignored = new Set<string>()
    for (const e of data.entries) {
      const path = norm(e.path)
      /* ignored entries (status I) only feed the gray-out set — never badges,
         dirty dots or ghost rows */
      if (e.status === 'I') {
        /* collapsed dir entries arrive with a trailing separator (dir/) */
        ignored.add(path.replace(/[\\/]+$/, ''))
        continue
      }
      byPath.set(path, e.status)
      if (e.status === 'D') {
        const parent = dirnameOf(path)
        const list = deletedByDir.get(parent) ?? []
        list.push({ name: path.slice(Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')) + 1), path })
        deletedByDir.set(parent, list)
      }
      let d = dirnameOf(path)
      while (d === root || d.startsWith(rootWithSep)) {
        dirtyDirs.add(d)
        if (d === root) break
        d = dirnameOf(d)
      }
    }
    setGit({ byPath, dirtyDirs, deletedByDir, ignored })
  }, [])

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
      if (rootPathRef.current && gitSkipRoot.current !== rootPathRef.current) void refreshGit(rootPathRef.current)
    }, POLL_MS)
    if (rootPathRef.current && gitSkipRoot.current !== rootPathRef.current) void refreshGit(rootPathRef.current)
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
    if (mediaKind(p)) return /* media elements manage their own state */
    try {
      const res = await fetch('/filetree/read?path=' + encodeURIComponent(p), { cache: 'no-store' })
      applyPreviewData(await res.json())
    } catch (e) {}
  }, [applyPreviewData])

  const openPreview = useCallback(async (p: string) => {
    setPreviewPath(p)
    const kind = mediaKind(p)
    if (kind) {
      /* media previews stream from /filetree/raw — no content read needed */
      setPreview({ status: 'done', kind, url: '/filetree/raw?path=' + encodeURIComponent(p) })
      return
    }
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
  const rows = useMemo(() => flattenTree(rootPath, dirs, expanded, git?.deletedByDir), [rootPath, dirs, expanded, git])
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
        ? <PreviewPane
        previewPath={previewPath}
        preview={preview}
        relPath={relPath}
        onClose={closePreview}
        canDiff={previewPath != null && git != null && git.byPath.has(previewPath)}
        onReference={(ref) => {
          setRefs((prev) => (prev.some((r) => r.text === ref.text) ? prev : [...prev, ref]))
          insertReference(ref.text)
        }}
        t={t}
      />
        : searching || !rootPath
          ? <div className={styles.body}>{bodyContent}</div>
          : (
            <TreeList
              rows={rows}
              rootPath={rootPath}
              onRowHover={setHoverPath}
              activeGuide={activeGuide}
              onToggle={toggleDir}
              openPreview={openPreview}
              gitByPath={git?.byPath ?? EMPTY_GIT_MAP}
              dirtyDirs={git?.dirtyDirs ?? EMPTY_GIT_SET}
              ignored={git?.ignored ?? EMPTY_GIT_SET}
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
