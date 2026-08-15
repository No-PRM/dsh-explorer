/** Minimal React adapter over @tanstack/virtual-core.
 *  The official @tanstack/react-virtual imports flushSync from react-dom,
 *  which would inline the entire react-dom into the client bundle (~1 MB).
 *  We only ever read virtual items, so a plain rerender is sufficient. */
import { useEffect, useLayoutEffect, useReducer, useState } from 'react'
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from '@tanstack/virtual-core'
import type { VirtualizerOptions } from '@tanstack/virtual-core'

const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect

export type VirtualOptions<
  TScrollElement extends Element,
  TItemElement extends Element,
> = Omit<
  VirtualizerOptions<TScrollElement, TItemElement>,
  'scrollToFn' | 'observeElementRect' | 'observeElementOffset'
>

export function useVirtualizer<
  TScrollElement extends Element,
  TItemElement extends Element,
>(options: VirtualOptions<TScrollElement, TItemElement>): Virtualizer<TScrollElement, TItemElement> {
  const rerender = useReducer((x: number) => x + 1, 0)[1]
  const resolvedOptions: VirtualizerOptions<TScrollElement, TItemElement> = {
    ...options,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    onChange: (instance, sync) => {
      rerender()
      options.onChange?.(instance, sync)
    },
  }
  const [instance] = useState(() => new Virtualizer<TScrollElement, TItemElement>(resolvedOptions))
  instance.setOptions(resolvedOptions)
  useIsomorphicLayoutEffect(() => instance._didMount(), [])
  useIsomorphicLayoutEffect(() => instance._willUpdate())
  return instance
}
