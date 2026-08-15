/** Tunables and small path/format helpers. */

export const POLL_MS = 1200
export const GUIDE_W = 12
export const PANEL_KEY = 'dsh.filetree.panel'
export const WIDTH_KEY = 'dsh.filetree.width'
export const EXPANDED_KEY = 'dsh.filetree.expanded'

export const clampDrawerWidth = (w: number): number => Math.min(720, Math.max(264, w))

/** Tiny classnames joiner (kept local — no dependency needed). */
export function cls(...args: Array<unknown>): string {
  let out = ''
  for (const v of args) if (v) out += (out ? ' ' : '') + String(v)
  return out
}

export function joinPath(a: string, b: string): string {
  if (!a) return b
  const sep = a.indexOf('\\') !== -1 ? '\\' : '/'
  return a.endsWith(sep) ? a + b : a + sep + b
}

export function basenameOf(p: string): string {
  if (!p) return p
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : p
}

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return bytes + ' B'
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  const rounded = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10
  return rounded + ' ' + units[i]
}

export function loadExpandedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set()
  } catch (e) { return new Set() }
}

export function persistExpanded(set: Set<string>): void {
  try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(Array.from(set))) } catch (e) {}
}

/** Parent directory of an absolute path (keeps the trailing-drive form). */
export function dirnameOf(p: string): string {
  const idx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
  if (idx <= 0) return p
  return p.slice(0, idx)
}
