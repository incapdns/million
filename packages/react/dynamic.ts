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
  // 1. Se for nulo ou primitivo, retorna direto
  if (!vnode || typeof vnode !== 'object') return vnode;

  // 2. Se for um Hole do Million ({ $: 'key' }), resolve o valor
  if ('$' in vnode) {
    return currentProps[vnode.$];
  }

  // 3. Se for um Elemento React Válido, inspecionamos as props
  if (isValidElement(vnode)) {
    const newProps = { ...vnode.props };
    let hasChanges = false;

    for (const key in newProps) {
      const val = newProps[key];
      
      // Verifica se a PROP é um Hole
      if (val && typeof val === 'object' && '$' in val) {
        newProps[key] = currentProps[val.$];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      return cloneElement(vnode, newProps);
    }
  }

  return vnode;
};