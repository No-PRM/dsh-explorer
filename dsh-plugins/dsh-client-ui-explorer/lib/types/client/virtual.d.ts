import { Virtualizer } from '@tanstack/virtual-core';
import type { VirtualizerOptions } from '@tanstack/virtual-core';
export type VirtualOptions<TScrollElement extends Element, TItemElement extends Element> = Omit<VirtualizerOptions<TScrollElement, TItemElement>, 'scrollToFn' | 'observeElementRect' | 'observeElementOffset'>;
export declare function useVirtualizer<TScrollElement extends Element, TItemElement extends Element>(options: VirtualOptions<TScrollElement, TItemElement>): Virtualizer<TScrollElement, TItemElement>;
