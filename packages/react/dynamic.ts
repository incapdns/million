import { isValidElement, cloneElement } from 'react';
import { createPortal } from 'react-dom';

// dynamic.ts
export const DYNAMIC = Symbol("million_dynamic");

export const currentFn: { context: any } = { context: null };

export const dynamic = <P>(node: P): P => {
  const ctx = currentFn.context;

  if (!ctx) {
    throw new Error("dynamic() must be called inside a block()");
  }

  if (ctx.block && ctx.getSlot) {
    // @ts-ignore
    const portal = createPortal(node, ctx.getSlot());

    if (ctx.block.rtPortals) {
      ctx.block.v.push(portal);
    }

    return { kind: DYNAMIC } as any;
  }

  if (!currentFn.context.million_map) {
    currentFn.context.million_map = new Map();
  }

  return {
    kind: DYNAMIC,
    node,
    million_map: currentFn.context.million_map,
  } as any;
}

export const resolveHoles = ({ vnode, props }: any): any => {
  if (!vnode || typeof vnode !== 'object') return vnode;

  if ('$' in vnode) {
    return props[vnode.$];
  }

  if (Array.isArray(vnode)) {
    let hasChanges = false;
    const newArray = vnode.map((item) => {
      const resolved = resolveHoles({ vnode: item, props });
      if (resolved !== item) hasChanges = true;
      return resolved;
    });
    return hasChanges ? newArray : vnode;
  }

  if (isValidElement(vnode)) {
    const newProps = { ...(vnode.props as any || {}) };
    let hasChanges = false;

    for (const key in newProps) {
      const oldValue = newProps[key];

      const newValue = resolveHoles({ vnode: oldValue, props });

      if (oldValue !== newValue) {
        newProps[key] = newValue;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      return cloneElement(vnode, newProps);
    }
  }

  if (vnode.constructor === Object) {
    const newObj = { ...vnode };
    let hasChanges = false;

    for (const key in newObj) {
      const oldValue = newObj[key];
      const newValue = resolveHoles({ vnode: oldValue, props });

      if (oldValue !== newValue) {
        newObj[key] = newValue;
        hasChanges = true;
      }
    }

    return hasChanges ? newObj : vnode;
  }

  return vnode;
};