import { createElement, Fragment, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import type { ComponentType, Ref } from 'react';
import {
  block as createBlock,
  mount$,
  patch as patchBlock,
  remove$ as removeBlock,
} from '../million/block';
import { MapHas$, MapSet$ } from '../million/constants';
import type { MillionPortal, MillionProps, Options } from '../types';
// eslint-disable-next-line camelcase
import { experimental_options } from '../experimental';
import { REGISTRY, RENDER_SCOPE, SVG_RENDER_SCOPE, SynchronousEffect } from './constants';
import { processProps, unwrap } from './utils';
import { currentFn, resolveHoles } from './dynamic';
import { RenderPortals } from './portals';

export const block = <P extends MillionProps>(
  fn: ComponentType<P> | null,
  options: Options<P> | null | undefined = {},
) => {
  // eslint-disable-next-line camelcase
  const noSlot = options?.experimental_noSlot ?? experimental_options.noSlot;
  let blockTarget: ReturnType<typeof createBlock> | null = options?.block;
  const defaultType = options?.svg ? SVG_RENDER_SCOPE : RENDER_SCOPE;

  if (fn) {
    currentFn.context = fn;

    blockTarget = createBlock(
      fn as any,
      unwrap as any,
      options?.shouldUpdate as Parameters<typeof createBlock>[2],
      options?.svg,
    );

    currentFn.context = undefined;
  }

  const MillionBlock = <P extends MillionProps>(
    props: P,
    forwardedRef: Ref<any>,
  ) => {
    const hmrTimestamp = props._hmr;
    const ref = useRef<HTMLElement | null>(null);
    const patch = useRef<((props: P) => void) | null>(null);
    const portalRef = useRef<MillionPortal[]>([]);
    const tempContainer = useMemo(() => document.createElement('million-temp'), []);
    const blockInstance = useRef<any>(null);

    const rtPortals = useRef<any[]>([]);
    rtPortals.current = [];

    const raw = fn as any;

    if (raw.million_map != undefined) {
      // @ts-ignore
      props = { ...props };

      raw.million_map.forEach((node, key) => {
        // @ts-ignore
        props[key] = resolveHoles({ vnode: node, props });
      });
    }

    props = processProps(props, forwardedRef, portalRef.current);

    if (patch.current && blockInstance.current) {
      blockInstance.current.rtPortals = rtPortals.current;
      patch.current(props);
    }

    const runMount = useCallback(() => {
      if (patch.current) return;

      const targetRoot = ref.current || tempContainer;

      const currentBlock = blockTarget!(props, props.key);
      blockInstance.current = currentBlock;

      currentBlock.rtPortals = rtPortals.current;

      mount$.call(currentBlock, targetRoot, null);

      patch.current = (props: P) => {
        patchBlock(
          currentBlock,
          blockTarget!(
            props,
            props.key,
            options?.shouldUpdate as Parameters<typeof createBlock>[2]
          )
        );
      };
    }, []);

    useLayoutEffect(() => {
      if (tempContainer.hasChildNodes() && ref.current) {
        while (tempContainer.firstChild) {
          ref.current.appendChild(tempContainer.firstChild);
        }
      }

      return () => {
        if (blockInstance.current) removeBlock.call(blockInstance.current);
      };
    }, []);

    const marker = useMemo(() => {
      if (noSlot) {
        return null;
      }
      return createElement(options?.as ?? defaultType, { ref });
    }, []);

    const childrenSize = portalRef.current.length;
    const children = new Array(childrenSize);
    for (let i = 0; i < childrenSize; ++i) {
      children[i] = portalRef.current[i]?.portal;
    }

    const vnode = createElement(
      Fragment,
      {},
      marker,
      createElement(SynchronousEffect, {
        effect: runMount,
        deps: hmrTimestamp ? [hmrTimestamp] : [],
      }),
      children,
      createElement(RenderPortals, {
        portals: rtPortals.current
      })
    );

    return vnode;
  };

  if (!MapHas$.call(REGISTRY, MillionBlock)) {
    MapSet$.call(REGISTRY, MillionBlock, block);
  }

  // TODO add dev guard
  if (options?.name) {
    if (fn) {
      fn.displayName = `Million(Render(${options.name}))`;
    }
    MillionBlock.displayName = `Million(Block(${options.name}))`;
  }

  return MillionBlock<P>;
};