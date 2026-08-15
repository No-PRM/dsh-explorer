/** Flat-model, virtualized file tree (VS Code-style per-row guides preserved).
 *  Every visible row is a FlatRow; only the on-screen window is rendered. */
import { useRef } from 'react'
import { useVirtualizer } from './virtual.ts'
import {
  IconChevronRightOutline14,
  IconFolderClose16,
  IconFolderOpen16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ActiveGuide, DirRecord, Translate } from '../types/index.ts'
import { basenameOf, cls, dirnameOf, formatSize, GUIDE_W, joinPath } from './constants.ts'
import { markDrag } from './chips.ts'
import { styles } from './styles.ts'
import { fileIconSpec, TypeIcon } from './icons.tsx'

/** Fixed row height for the virtualizer (kept in sync with .ftr-row height). */
export const ROW_H = 23

export type FlatRow =
  | { key: string; path: string; name: string; depth: number; kind: 'dir'; type: 'dir'; isOpen: boolean }
  | { key: string; path: string; name: string; depth: number; kind: 'file'; type: 'file'; size: number; hidden: boolean; deleted: boolean }
  | { key: string; path: string; depth: number; type: 'loading' }
  | { key: string; path: string; depth: number; type: 'empty' }
  | { key: string; path: string; depth: number; type: 'truncated' }
  | { key: string; path: string; depth: number; type: 'error'; message: string }

/** Entries hidden from the tree, matching VS Code's default files.exclude
 *  (VCS-internal dirs + OS junk files). node_modules stays visible (grayed
 *  when gitignored), exactly like the VS Code explorer. */
const HIDDEN_ENTRIES = new Set(['.git', '.svn', '.hg', 'CVS', '.DS_Store', 'Thumbs.db'])

/** Git statuses of files deleted from the working tree (parent dir -> rows). */
export type DeletedByDir = Map<string, Array<{ name: string; path: string }>>

/** Depth-first flattening of the visible tree (expanded dirs only). */
export function flattenTree(
  rootPath: string | null,
  dirs: Record<string, DirRecord>,
  expanded: Set<string>,
  deletedByDir?: DeletedByDir,
): FlatRow[] {
  if (!rootPath) return []
  const rows: FlatRow[] = []
  const visit = (path: string, name: string, depth: number) => {
    rows.push({ key: path, path, name, depth, kind: 'dir', type: 'dir', isOpen: expanded.has(path) })
    if (!expanded.has(path)) return
    const rec = dirs[path]
    if (!rec) {
      rows.push({ key: path + '::loading', path, depth: depth + 1, type: 'loading' })
      return
    }
    if (rec.state === 'error') {
      rows.push({ key: path + '::error', path, depth: depth + 1, type: 'error', message: rec.message })
      return
    }
    /* Files of this dir, merged with deleted-file ghost rows, sorted by name
       (dirs keep the host's order and are visited inline). */
    const files: Array<{ name: string; path: string; size: number; hidden: boolean; deleted: boolean }> = []
    for (const e of rec.entries) {
      if (HIDDEN_ENTRIES.has(e.name)) continue
      if (e.kind === 'dir') {
        visit(joinPath(path, e.name), e.name, depth + 1)
      } else {
        files.push({ name: e.name, path: joinPath(path, e.name), size: e.size, hidden: e.hidden, deleted: false })
      }
    }
    const dels = deletedByDir?.get(path)
    if (dels) {
      for (const d of dels) files.push({ name: d.name, path: d.path, size: 0, hidden: false, deleted: true })
    }
    files.sort((a, b) => {
      const al = a.name.toLowerCase()
      const bl = b.name.toLowerCase()
      return al < bl ? -1 : al > bl ? 1 : 0
    })
    for (const f of files) {
      rows.push({ key: f.path, path: f.path, name: f.name, depth: depth + 1, kind: 'file', type: 'file', size: f.size, hidden: f.hidden, deleted: f.deleted })
    }
    if (rec.entries.length === 0 && !dels?.length) rows.push({ key: path + '::empty', path, depth: depth + 1, type: 'empty' })
    if (rec.truncated) rows.push({ key: path + '::truncated', path, depth: depth + 1, type: 'truncated' })
  }
  visit(rootPath, basenameOf(rootPath), 0)
  return rows
}

/** True when the path itself or any ancestor dir is gitignored. */
function isIgnoredPath(path: string, ignored: Set<string>): boolean {
  let d = path
  for (let i = 0; i < 16; i++) {
    if (ignored.has(d)) return true
    const next = dirnameOf(d)
    if (next === d) break
    d = next
  }
  return false
}

/** Workspace-relative display path for a tree row ('' for the root itself). */
function relOf(rowPath: string, rootPath: string | null): string {
  if (!rootPath) return rowPath
  const sep = rootPath.indexOf('\\') !== -1 ? '\\' : '/'
  if (rowPath === rootPath) return ''
  if (!rowPath.startsWith(rootPath + sep)) return rowPath
  return rowPath.slice(rootPath.length + 1)
}

/** MIME we use to carry the drag payload (custom type is only readable on drop). */
export const DRAG_MIME = 'application/x-dsh-explorer'

/** Start a drag of a tree row: carries the @-mention token (Codex convention)
 *  plus a structured payload for the drop handler. */
function startRowDrag(e: React.DragEvent, path: string, rootPath: string | null, kind: string) {
  const rel = relOf(path, rootPath)
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('text/plain', rel)
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ path, rel, kind }))
  markDrag(rel)
  /* Suppress the native drag image — the panel renders a LIVE ghost pill
     (same .ftr-dragGhost as content drags) that follows the pointer and can
     highlight blue over the composer. */
  const blank = document.createElement('div')
  blank.style.cssText = 'position:fixed;top:-1000px;left:-1000px;width:1px;height:1px'
  document.body.appendChild(blank)
  e.dataTransfer.setDragImage(blank, 0, 0)
  setTimeout(() => { blank.remove() }, 0)
}

/** VS Code git-decoration letter → localized tooltip key + CSS class. */
const GIT_META: Record<string, { key: string; cls: string }> = {
  M: { key: 'gitModified', cls: 'gitM' },
  A: { key: 'gitAdded', cls: 'gitA' },
  U: { key: 'gitUntracked', cls: 'gitU' },
  D: { key: 'gitDeleted', cls: 'gitD' },
  R: { key: 'gitRenamed', cls: 'gitR' },
  C: { key: 'gitRenamed', cls: 'gitR' },
  T: { key: 'gitModified', cls: 'gitT' },
}

interface TreeRowProps {
  row: FlatRow
  rootPath: string | null
  onRowHover: (p: string | null) => void
  activeGuide: ActiveGuide | null
  onToggle: (p: string) => void
  openPreview: (p: string) => void
  gitByPath: Map<string, string>
  dirtyDirs: Set<string>
  ignored: Set<string>
  t: Translate
}

function TreeRow({ row, rootPath, onRowHover, activeGuide, onToggle, openPreview, gitByPath, dirtyDirs, ignored, t }: TreeRowProps) {
  const sep = row.path.indexOf('\\') !== -1 ? '\\' : '/'
  /* VS Code guide rule: a row's guide at index k lights when that ancestor is
     the active node and this row is a strict descendant of it. */
  const inActiveSubtree = activeGuide !== null && row.path !== activeGuide.path && row.path.startsWith(activeGuide.path + sep)
  const litIndex = inActiveSubtree ? activeGuide.depth : -1
  const renderGuides = (depth: number) => {
    if (depth === 0) return null
    const cells = []
    for (let k = 0; k < depth; k++) {
      cells.push(<div key={k} className={cls(styles.guide, k === litIndex && styles.guideLit)} />)
    }
    return <div className={styles.guides}>{cells}</div>
  }
  const paddingLeft = row.depth * GUIDE_W + 8

  if (row.type === 'dir') {
    return (
      <button
        type="button"
        className={cls(styles.row, isIgnoredPath(row.path, ignored) && styles.rowIgnored)}
        style={{ paddingLeft }}
        title={row.path}
        draggable
        onDragStart={(e) => startRowDrag(e, row.path, rootPath, 'dir')}
        onClick={() => onToggle(row.path)}
        onMouseEnter={() => onRowHover(row.path)}
        onMouseLeave={() => onRowHover(null)}
      >
        {renderGuides(row.depth)}
        <IconChevronRightOutline14 className={cls(styles.chevron, row.isOpen && styles.chevronOpen)} size={12} />
        {row.isOpen ? <IconFolderOpen16 className={styles.dirIcon} size={15} /> : <IconFolderClose16 className={styles.dirIcon} size={15} />}
        <span className={styles.name}>{row.name}</span>
        {dirtyDirs.has(row.path) ? <span className={styles.gitDot} title={t('gitDirty')} /> : null}
      </button>
    )
  }

  if (row.type === 'file') {
    const status = gitByPath.get(row.path)
    const meta = status ? GIT_META[status] : undefined
    return (
      <div
        className={cls(styles.row, styles.fileRow, row.hidden && styles.hidden, row.deleted && styles.rowDeleted, isIgnoredPath(row.path, ignored) && styles.rowIgnored)}
        style={{ paddingLeft }}
        title={row.path}
        draggable={!row.deleted}
        onDragStart={(e) => startRowDrag(e, row.path, rootPath, 'file')}
        onClick={row.deleted ? undefined : () => openPreview(row.path)}
        onMouseEnter={() => onRowHover(row.path)}
        onMouseLeave={() => onRowHover(null)}
      >
        {renderGuides(row.depth)}
        <TypeIcon spec={fileIconSpec(row.name)} size={16} />
        <span className={cls(styles.name, row.deleted && styles.nameDeleted, meta && styles[meta.cls as keyof typeof styles])}>{row.name}</span>
        {!row.deleted ? <span className={styles.size}>{formatSize(row.size)}</span> : null}
        {/* fixed-width marker column at the far right — every row reserves it, so
            all status letters (M/A/U/D/R) line up vertically like VS Code */}
        <span className={cls(styles.gitMark, meta && styles[meta.cls as keyof typeof styles])} title={meta ? t(meta.key) : undefined}>{meta ? status : ''}</span>
      </div>
    )
  }

  /* placeholder rows (loading / empty / truncated / error) */
  const message = row.type === 'loading' ? t('loading') : row.type === 'empty' ? t('empty') : row.type === 'truncated' ? t('truncated') : row.message
  return (
    <div
      className={cls(styles.row, styles.placeholder, row.type === 'loading' && styles.rowLoading)}
      style={{ paddingLeft: row.depth * GUIDE_W + 8 }}
    >
      {renderGuides(row.depth)}
      <span>{message}</span>
    </div>
  )
}

export interface TreeListProps {
  rows: FlatRow[]
  rootPath: string | null
  onRowHover: (p: string | null) => void
  activeGuide: ActiveGuide | null
  onToggle: (p: string) => void
  openPreview: (p: string) => void
  gitByPath: Map<string, string>
  dirtyDirs: Set<string>
  ignored: Set<string>
  t: Translate
}

/** Virtualized scrollable tree list. */
export function TreeList({ rows, rootPath, onRowHover, activeGuide, onToggle, openPreview, gitByPath, dirtyDirs, ignored, t }: TreeListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  })
  return (
    <div ref={scrollRef} className={styles.treeScroll}>
      <div style={{ height: virtualizer.getTotalSize() + 16, position: 'relative', boxSizing: 'border-box' }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index]
          return (
            <div
              key={row.key}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: 'translateY(' + (4 + vi.start) + 'px)' }}
            >
              <TreeRow row={row} rootPath={rootPath} onRowHover={onRowHover} activeGuide={activeGuide} onToggle={onToggle} openPreview={openPreview} gitByPath={gitByPath} dirtyDirs={dirtyDirs} ignored={ignored} t={t} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
