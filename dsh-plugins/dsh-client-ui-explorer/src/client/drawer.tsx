/** Pure-plugin drawer: floating toggle + overlay drawer shell + state owner. */
import { Fragment, useRef, useState } from 'react'
import {
  IconChevronLeftOutline14,
  IconChevronRightOutline14,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SelectorHook, SessionsState, Translate, WorkspacesState } from '../types/index.ts'
import { clampDrawerWidth, PANEL_KEY, WIDTH_KEY } from './constants.ts'
import { styles } from './styles.ts'
import { FileTreePanel } from './panel.tsx'

export interface FileTreeOverlayProps {
  useSessions: SelectorHook<SessionsState>
  useWorkspaces: SelectorHook<WorkspacesState>
  t: Translate
}

/** Floating round toggle (right-middle, always visible). */
function FileTreeFloatingButton({ open, width, onToggle, t }: {
  open: boolean
  width: number
  onToggle: () => void
  t: Translate
}) {
  return (
    <div className={styles.floating} style={{ right: (open ? width : 0) + 10 }}>
      <Tooltip label={open ? t('close') : t('open')} delayMs={500}>
        <button
          type="button"
          aria-label={open ? t('close') : t('open')}
          style={{
            width: 30, height: 30, border: 'none', background: 'transparent', color: 'inherit',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: 0,
          }}
          onClick={onToggle}
        >
          {open ? <IconChevronRightOutline14 size={16} /> : <IconChevronLeftOutline14 size={16} />}
        </button>
      </Tooltip>
    </div>
  )
}

/** Right drawer shell: absolute overlay column with its own drag handle. */
function FileTreeDrawer({ open, width, onResize, useSessions, useWorkspaces, t }: {
  open: boolean
  width: number
  onResize: (w: number) => void
  useSessions: SelectorHook<SessionsState>
  useWorkspaces: SelectorHook<WorkspacesState>
  t: Translate
}) {
  const base = useRef({ x: 0, w: 0 })
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    base.current = { x: e.clientX, w: width }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    onResize(base.current.w + (base.current.x - e.clientX))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  return (
    <div className={styles.drawer + (open ? ' ' + styles.drawerOpen : '')} style={{ width }}>
      <div
        className={styles.drawerHandle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <FileTreePanel useSessions={useSessions} useWorkspaces={useWorkspaces} t={t} active={open} />
    </div>
  )
}

/** Overlay entry: owns open/width state and composes button + drawer. */
export function FileTreeOverlay(props: FileTreeOverlayProps) {
  const { useSessions, useWorkspaces, t } = props
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_KEY) === '1' } catch (e) { return false }
  })
  const [width, setWidth] = useState(() => {
    try {
      const w = parseInt(localStorage.getItem(WIDTH_KEY) ?? '', 10)
      return Number.isFinite(w) ? clampDrawerWidth(w) : 380
    } catch (e) { return 380 }
  })
  const toggle = () => {
    setOpen((o) => {
      const next = !o
      try { localStorage.setItem(PANEL_KEY, next ? '1' : '0') } catch (e) {}
      return next
    })
  }
  const onResize = (w: number) => {
    const next = clampDrawerWidth(w)
    setWidth(next)
    try { localStorage.setItem(WIDTH_KEY, String(next)) } catch (e) {}
  }
  return (
    <Fragment>
      <FileTreeFloatingButton open={open} width={width} onToggle={toggle} t={t} />
      <FileTreeDrawer open={open} width={width} onResize={onResize} useSessions={useSessions} useWorkspaces={useWorkspaces} t={t} />
    </Fragment>
  )
}
