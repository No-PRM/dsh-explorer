/** Plugin entry: registers the file-tree drawer into the shell overlay. */
import type { ClientCtx } from '../types/index.js';
/** Services required by the plugin. */
export declare const inject: string[];
/**
 * Client plugin body: one overlay entry owns the floating toggle + the right
 * drawer. Pure plugin — no layout changes, survives dsh upgrades.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientCtx): void;
