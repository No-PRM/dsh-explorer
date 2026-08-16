/** Reference chips for dragged-in files — plain-DOM overlay above the chat
 *  composer. Deliberately NOT React (avoids react-dom) and NOT inside the
 *  drawer (its transform would break fixed positioning): a container is
 *  appended to document.body and rebuilt on each update. */

interface RefChip {
  /** Exact text inserted into the composer (used for sync + removal). */
  text: string
  /** Human-readable chip label. */
  label: string
  kind: string
}

let container: HTMLDivElement | null = null

/** The app's chat composer textarea (the biggest one on the page). */
function composer(): HTMLTextAreaElement | null {
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement) return active
  const tas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea'))
  if (tas.length === 0) return null
  tas.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)
  return tas[0]
}

/** Render (or clear) the chip bar. `null`/empty removes it. */
/** True when (x, y) falls on the composer textarea (with a small margin). */
export function isOverComposer(x: number, y: number): boolean {
  const ta = composer()
  if (!ta) return false
  const r = ta.getBoundingClientRect()
  const m = 24
  return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m
}

/** Toggle a highlight ring on the composer to signal it is a drop target. */
export function setComposerTarget(on: boolean): void {
  const ta = composer()
  if (!ta) return
  ta.classList.toggle('ftr-composerTarget', on)
}

/** Marker for an in-flight file/folder drag. Chrome hides custom dataTransfer
 *  types during dragover (they are only readable on drop), so we flag our own
 *  drags with a plain variable and clear it on drop/dragend. */
let dragMarker: string | null = null
export function markDrag(rel: string | null): void { dragMarker = rel }
export function isDragMarked(): boolean { return dragMarker !== null }
export function dragMarkedText(): string | null { return dragMarker }

export function updateChipBar(refs: RefChip[], onRemove: (rel: string) => void): void {
  if (container && !container.isConnected) container = null
  if (refs.length === 0) {
    container?.remove()
    container = null
    return
  }
  if (!container) {
    container = document.createElement('div')
    container.className = 'ftr-chipbar'
    document.body.appendChild(container)
  }
  const ta = composer()
  const r = ta ? ta.getBoundingClientRect() : { left: 16, top: innerHeight - 60, width: innerWidth - 32, bottom: innerHeight }
  const barHeight = 34
  const above = r.top - barHeight - 8
  const top = above > 8 ? above : r.bottom + 8
  container.style.left = Math.max(8, r.left) + 'px'
  container.style.top = top + 'px'
  container.style.maxWidth = Math.min(r.width, innerWidth - 16) + 'px'

  container.textContent = ''
  for (const ref of refs) {
    const chip = document.createElement('span')
    chip.className = 'ftr-chip'
    const dot = document.createElement('span')
    dot.className = 'ftr-chipDot' + (ref.kind === 'dir' ? ' isDir' : ' isFile')
    const name = document.createElement('span')
    name.className = 'ftr-chipName'
    name.textContent = ref.label
    name.title = ref.label
    const x = document.createElement('button')
    x.className = 'ftr-chipRemove'
    x.textContent = '×'
    x.title = '移除引用'
    x.addEventListener('click', () => onRemove(ref.text))
    chip.append(dot, name, x)
    container.appendChild(chip)
  }
}
