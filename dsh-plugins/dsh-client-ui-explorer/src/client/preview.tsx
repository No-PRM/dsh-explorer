/** File content preview: header + CodeMirror 6 read-only code viewer. */
import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { search } from '@codemirror/search'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { php } from '@codemirror/lang-php'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { powerShell } from '@codemirror/legacy-modes/mode/powershell'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { xml } from '@codemirror/legacy-modes/mode/xml'
import { diff } from '@codemirror/legacy-modes/mode/diff'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { githubLight } from '@uiw/codemirror-theme-github'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import type { Extension } from '@codemirror/state'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { MergeView } from '@codemirror/merge'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '../types/index.ts'
import { styles } from './styles.ts'
import { basenameOf } from './constants.ts'
import { isOverComposer, setComposerTarget } from './chips.ts'
import { fileIconSpec, TypeIcon } from './icons.tsx'
import { IconArrowsDiff } from './tabler-icons.ts'

export type MediaKind = 'image' | 'video' | 'audio' | 'pdf'

export type PreviewState =
  | { status: 'loading' }
  | { status: 'done'; binary: boolean; content?: string; size?: number; truncated?: boolean }
  | { status: 'done'; kind: MediaKind; url: string }
  | { status: 'error'; error: string }

export interface PreviewPaneProps {
  previewPath: string | null
  preview: PreviewState | null
  relPath: (p: string) => string
  onClose: () => void
  /** File has a git status (so a HEAD diff exists to compare). */
  canDiff: boolean
  /** Manual selection-drag -> add a reference to the composer. */
  onReference?: (ref: { text: string; label: string; kind: string }) => void
  t: Translate
}

/** Extension → CodeMirror language extension (null = plain text). */
function langFor(path: string | null): Extension | null {
  if (!path) return null
  const base = basenameOf(path).toLowerCase()
  const ext = base.slice(base.lastIndexOf('.') + 1)
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': return javascript()
    case 'jsx': return javascript({ jsx: true })
    case 'ts': case 'mts': case 'cts': return javascript({ typescript: true })
    case 'tsx': return javascript({ jsx: true, typescript: true })
    case 'json': return json()
    case 'css': return css()
    case 'scss': case 'sass': case 'less': return css()
    case 'html': case 'htm': return html()
    case 'md': case 'markdown': return markdown()
    case 'py': case 'pyw': return python()
    case 'sql': return sql()
    case 'c': case 'h': case 'cpp': case 'cc': case 'cxx': case 'hpp': return cpp()
    case 'java': return java()
    case 'rs': return rust()
    case 'go': return go()
    case 'php': return php()
    case 'yml': case 'yaml': return StreamLanguage.define(yaml)
    case 'sh': case 'bash': case 'zsh': case 'fish': return StreamLanguage.define(shell)
    case 'ps1': case 'cmd': case 'bat': return StreamLanguage.define(powerShell)
    case 'rb': return StreamLanguage.define(ruby)
    case 'lua': return StreamLanguage.define(lua)
    case 'xml': case 'svg': case 'cshtml': return StreamLanguage.define(xml)
    case 'diff': return StreamLanguage.define(diff)
    case 'dockerfile': return StreamLanguage.define(dockerFile)
    default: return null
  }
}

/** Media files render natively (img/video/audio/pdf) via the host /filetree/raw stream. */
export function mediaKind(path: string | null): MediaKind | null {
  if (!path) return null
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'ogv', 'mov', 'm4v'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac', 'aac', 'opus'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  return null
}

/** Git diff (HEAD vs working tree) rendered with @codemirror/merge. */
function GitDiff({ path, dark }: { path: string; dark: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<{ base: string; current: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/filetree/gitdiff?path=' + encodeURIComponent(path), { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (j && j.ok === true && j.git === true) setData({ base: j.base ?? '', current: j.current ?? '' })
        else setErr(j?.error?.message || 'diff failed')
      })
      .catch(() => { if (alive) setErr('diff failed') })
    return () => { alive = false }
  }, [path])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !data) return
    const readOnly: Extension = [EditorState.readOnly.of(true), EditorView.editable.of(false)]
    const lang = langFor(path)
    const theme = dark ? vscodeDark : githubLight
    const view = new MergeView({
      a: { doc: data.base, extensions: [readOnly, theme, lineNumbers(), ...(lang ? [lang] : [])] },
      b: { doc: data.current, extensions: [readOnly, theme, lineNumbers(), ...(lang ? [lang] : [])] },
      parent: mount,
      gutter: true,
      highlightChanges: true,
      collapseUnchanged: { margin: 3, minSize: 8 },
      orientation: 'a-b',
    })
    return () => { view.destroy() }
  }, [data, dark, path])

  if (err) return <div className={styles.error}>{err}</div>
  return <div ref={mountRef} className={styles.diffWrap} />
}

export function PreviewPane({ previewPath, preview, relPath, onClose, canDiff, onReference, t }: PreviewPaneProps) {
  /* Default to the diff view when the file has git changes. */
  const [diffMode, setDiffMode] = useState(canDiff)
  const cmRef = useRef<{ view: EditorView } | null>(null)
  /* Follow the app's light/dark palette (body attribute flips on theme change). */
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.body.hasAttribute('data-ds-dark-theme'))
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.body.hasAttribute('data-ds-dark-theme')))
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    return () => obs.disconnect()
  }, [])

  /* Stable identities for the CodeMirror props: @uiw/react-codemirror runs
     StateEffect.reconfigure whenever extensions/basicSetup identity changes,
     which would wipe the dynamically-installed search extension and close the
     Ctrl+F panel on the next poll tick. Memoize so reconfigure only fires when
     the opened file changes. */
  useEffect(() => { setDiffMode(canDiff) }, [previewPath, canDiff])

  /* Manual selection-drag from the preview editor. CodeMirror's mousedown
     preventDefaults, which kills the browser's native text drag - a drag over
     the selection would re-box-select instead. So we take over: mousedown
     inside a non-empty selection arms a pointer tracker; moving past a small
     threshold commits to a drag that inserts a structured
     relative/path:from-to reference; a click (no movement) still moves the
     caret to the click position. */
  const manualDrag = useRef<{ x: number; y: number; from: number; to: number; dragging: boolean; label: string; text: string } | null>(null)
  const dragGhost = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const view = cmRef.current?.view
      const target = e.target as Element | null
      if (!view || !previewPath || e.button !== 0 || !target || !target.closest('.cm-content')) return
      const sel = view.state.selection.main
      if (sel.empty) return
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
      /* arm only when grabbing *inside* the selection (strictly, not on its
         edges) — grabbing an edge stays CodeMirror's normal selection adjust */
      if (pos === null || pos <= sel.from || pos >= sel.to) return
      e.preventDefault() /* keep CM from re-selecting on the drag */
      const fromLine = view.state.doc.lineAt(sel.from).number
      const toLine = view.state.doc.lineAt(sel.to).number
      const rel = relPath(previewPath)
      const label = rel + ':' + fromLine + (toLine > fromLine ? '-' + toLine : '')
      const text = '<reference path=\'' + rel + '\' lines=\'' + fromLine + (toLine > fromLine ? '-' + toLine : '') + '\' />'
      manualDrag.current = { x: e.clientX, y: e.clientY, from: sel.from, to: sel.to, dragging: false, label, text }
    }
    const onMouseMove = (e: MouseEvent) => {
      const m = manualDrag.current
      if (!m) return
      if (!m.dragging) {
        if (Math.hypot(e.clientX - m.x, e.clientY - m.y) > 8) {
          m.dragging = true
          /* drag feedback: a ghost pill following the pointer, like a native
             drag image, showing what will be inserted */
          if (!dragGhost.current) {
            const g = document.createElement('div')
            g.className = 'ftr-dragGhost'
            g.textContent = m.label
            document.body.appendChild(g)
            dragGhost.current = g
          }
        }
      }
      if (m.dragging && dragGhost.current) {
        dragGhost.current.style.left = e.clientX + 12 + 'px'
        dragGhost.current.style.top = e.clientY + 12 + 'px'
        setComposerTarget(isOverComposer(e.clientX, e.clientY))
        dragGhost.current.classList.toggle('over', isOverComposer(e.clientX, e.clientY))
      }
    }
    const onMouseUp = (e: MouseEvent) => {
      const m = manualDrag.current
      manualDrag.current = null
      dragGhost.current?.remove()
      dragGhost.current = null
      setComposerTarget(false)
      const view = cmRef.current?.view
      if (!m || !view || !previewPath) return
      if (!m.dragging) {
        /* plain click inside the selection: restore caret placement */
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
        if (pos !== null) view.dispatch({ selection: { anchor: pos } })
        return
      }
      /* fill only when released over the composer */
      if (isOverComposer(e.clientX, e.clientY)) onReference?.({ text: m.text, label: m.label, kind: 'file' })
    }
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('mousemove', onMouseMove, true)
    document.addEventListener('mouseup', onMouseUp, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('mouseup', onMouseUp, true)
    }
  }, [previewPath, onReference])

  const lang = useMemo(() => langFor(previewPath), [previewPath])
  /* Install the search extension statically with the panel at the top, matching
     the VS Code find-widget position (basicSetup only ships the keymap). */
  const cmExtensions = useMemo(() => [search({ top: true }), ...(lang ? [lang] : [])], [lang])
  const basicSetup = useMemo(() => ({ foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }), [])

  let body: React.ReactNode
  if (preview === null || preview.status === 'loading') {
    body = <div className={styles.message}>{t('loading')}</div>
  } else if (preview.status === 'error') {
    body = <div className={styles.error}>{preview.error}</div>
  } else if ('kind' in preview) {
    /* media preview — rendered natively, no content fetch needed */
    const url = preview.url
    if (preview.kind === 'image') {
      body = <div className={styles.media}><img src={url} alt={basenameOf(previewPath ?? '')} draggable={false} /></div>
    } else if (preview.kind === 'video') {
      body = <div className={styles.media}><video src={url} controls /></div>
    } else if (preview.kind === 'audio') {
      body = <div className={styles.media}><audio src={url} controls /></div>
    } else {
      body = <div className={styles.media}><iframe className={styles.mediaFrame} src={url} title={basenameOf(previewPath ?? '')} /></div>
    }
  } else if (diffMode && previewPath) {
    body = <GitDiff path={previewPath} dark={dark} />
  } else if (preview.binary) {
    body = <div className={styles.message}>{t('binaryFile')}</div>
  } else {
    const content = preview.content ?? ''
    /* lang via useMemo above */
    body = (
      <div className={styles.previewCm}>
        <CodeMirror
          ref={cmRef}
          key={previewPath ?? 'preview'}
          value={content}
          readOnly
          height="100%"
          theme={dark ? vscodeDark : githubLight}
          extensions={cmExtensions}
          basicSetup={basicSetup}
        />
        {preview.truncated ? <div className={styles.message}>{t('previewTruncated')}</div> : null}
      </div>
    )
  }

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        {previewPath ? <TypeIcon spec={fileIconSpec(basenameOf(previewPath))} size={16} /> : null}
        <span className={styles.previewName} title={previewPath ?? undefined}>{previewPath ? basenameOf(previewPath) : ''}</span>
        {previewPath ? <span className={styles.previewPath}>{relPath(previewPath)}</span> : null}
        {canDiff ? (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={diffMode ? t('diffBack') : t('diff')}
            title={diffMode ? t('diffBack') : t('diff')}
            onClick={() => setDiffMode((m) => !m)}
          >
            <IconArrowsDiff size={15} />
          </button>
        ) : null}
        <button type="button" className={styles.iconButton} aria-label={t('closePreview')} title={t('closePreview')} onClick={onClose}>
          <IconCloseOutline16 size={14} />
        </button>
      </div>
      <div className={styles.previewBody}>{body}</div>
    </div>
  )
}
