/** Plugin entry: registers the file-tree drawer into the shell overlay. */
import type { ClientCtx } from '../types/index.ts'
import { ensureStyles } from './styles.ts'
import { en, zh } from './locales.ts'
import { FileTreeOverlay } from './drawer.tsx'

/** Dictionary namespace owned by this plugin. */
const NS = 'filetree'

/** Services required by the plugin. */
export const inject = ['slots', 'sessions', 'workspaces', 'locale']

/**
 * Client plugin body: one overlay entry owns the floating toggle + the right
 * drawer. Pure plugin — no layout changes, survives dsh upgrades.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientCtx): void {
  ensureStyles()
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-filetree: dictionaries')
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'filetree.drawer',
    order: 100,
    label: 'filetree.drawer',
    locale: NS,
    inject: () => ({}),
  }, FileTreeOverlay))
}
