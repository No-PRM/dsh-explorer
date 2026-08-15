/** Flat-model, virtualized file tree (VS Code-style per-row guides preserved).
 *  Every visible row is a FlatRow; only the on-screen window is rendered. */
import { useRef } from 'react'
import { useVirtualizer } from './virtual.ts'
import {
  IconChevronRightOutline14,
  IconFolderClose16,
  IconFolderOpen16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ActiveGuide, DirRecord, Translate } from './types.ts'
import { basenameOf, cls, formatSize, GUIDE_W, joinPath } from './constants.ts'
import { styles } from './styles.ts'
import { fileIconSpec, TypeIcon } from './icons.tsx'

/** Fixed row height for the virtualizer (kept in sync with .ftr-row height). */
export const ROW_H = 23

export type FlatRow =
  | { key: string; path: string; name: string; depth: number; kind: 'dir'; type: 'dir'; isOpen: boolean }
  | { key: string; path: string; name: string; depth: number; kind: 'file'; type: 'file'; size: number; hidden: boolean }
  | { key: string; path: string; depth: number; type: 'loading' }
  | { key: string; path: string; depth: number; type: 'empty' }
  | { key: string; path: string; depth: number; type: 'truncated' }
  | { key: string; path: string; depth: number; type: 'error'; message: string }

/** Depth-first flattening of the visible tree (expanded dirs only). */
export function flattenTree(
  rootPath: string | null,
  dirs: Record<string, DirRecord>,
  expanded: Set<string>,
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
    for (const e of rec.entries) {
      if (e.kind === 'dir') visit(joinPath(path, e.name), e.name, depth + 1)
      else rows.push({ key: joinPath(path, e.name), path: joinPath(path, e.name), name: e.name, depth: depth + 1, kind: 'file', type: 'file', size: e.size, hidden: e.hidden })
    }
    if (rec.entries.length === 0) rows.push({ key: path + '::empty', path, depth: depth + 1, type: 'empty' })
    if (rec.truncated) rows.push({ key: path + '::truncated', path, depth: depth + 1, type: 'truncated' })
  }
  visit(rootPath, basenameOf(rootPath), 0)
  return rows
}

interface TreeRowProps {
  row: FlatRow
  hoverPath: string | null
  onRowHover: (p: string | null) => void
  activeGuide: ActiveGuide | null
  onToggle: (p: string) => void
  openPreview: (p: string) => void
  t: Translate
}

function TreeRow({ row, hoverPath, onRowHover, activeGuide, onToggle, openPreview, t }: TreeRowProps) {
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
        className={styles.row}
        style={{ paddingLeft }}
        title={row.path}
        onClick={() => onToggle(row.path)}
        onMouseEnter={() => onRowHover(row.path)}
        onMouseLeave={() => onRowHover(null)}
      >
        {renderGuides(row.depth)}
        <IconChevronRightOutline14 className={cls(styles.chevron, row.isOpen && styles.chevronOpen)} size={12} />
        {row.isOpen ? <IconFolderOpen16 className={styles.dirIcon} size={15} /> : <IconFolderClose16 className={styles.dirIcon} size={15} />}
        <span className={styles.name}>{row.name}</span>
      </button>
    )
  }

  if (row.type === 'file') {
    return (
      <div
        className={cls(styles.row, styles.fileRow, row.hidden && styles.hidden)}
        style={{ paddingLeft }}
        title={row.path}
        onClick={() => openPreview(row.path)}
        onMouseEnter={() => onRowHover(row.path)}
        onMouseLeave={() => onRowHover(null)}
      >
        {renderGuides(row.depth)}
        <TypeIcon spec={fileIconSpec(row.name)} size={16} />
        <span className={styles.name}>{row.name}</span>
        <span className={styles.size}>{formatSize(row.size)}</span>
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
  hoverPath: string | null
  onRowHover: (p: string | null) => void
  activeGuide: ActiveGuide | null
  onToggle: (p: string) => void
  openPreview: (p: string) => void
  t: Translate
}

/** Virtualized scrollable tree list. */
export function TreeList({ rows, hoverPath, onRowHover, activeGuide, onToggle, openPreview, t }: TreeListProps) {
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
              <TreeRow row={row} hoverPath={hoverPath} onRowHover={onRowHover} activeGuide={activeGuide} onToggle={onToggle} openPreview={openPreview} t={t} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
