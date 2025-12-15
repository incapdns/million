import { isValidElement, cloneElement } from 'react';

// dynamic.ts
export const DYNAMIC = Symbol("million_dynamic");

export const currentFn: { context: any } = { context: null };

export const dynamic = <P>(node: P): P => {
  if (!currentFn.context) {
    throw new Error("dynamic() must be called inside a block()");
  }

  if (!currentFn.context.__million_map) {
    currentFn.context.__million_map = new Map();
  }

  return { 
    __kind: DYNAMIC, 
    node, 
    __million_map: currentFn.context.__million_map
  } as any;
}

export const resolveHoles = (vnode: any, currentProps: any): any => {
  if (!vnode || typeof vnode !== 'object') return vnode;

  if ('$' in vnode) {
    return currentProps[vnode.$];
  }

  if (Array.isArray(vnode)) {
    let hasChanges = false;
    const newArray = vnode.map((item) => {
      const resolved = resolveHoles(item, currentProps);
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
      
      const newValue = resolveHoles(oldValue, currentProps);

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
      const newValue = resolveHoles(oldValue, currentProps);

      if (oldValue !== newValue) {
        newObj[key] = newValue;
        hasChanges = true;
      }
    }

    return hasChanges ? newObj : vnode;
  }

  return vnode;
};