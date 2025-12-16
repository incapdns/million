import { useEffect, useRef } from 'react';
import type { ComponentType, DependencyList } from 'react';

export const RENDER_SCOPE = 'slot';
export const SVG_RENDER_SCOPE = 'g';
export const REACT_ROOT = '__react_root';

function sameArray(a: DependencyList, b: DependencyList) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const Effect = ({
  effect,
  deps,
}: {
  effect: () => void;
  deps?: DependencyList;
}): null => {
  useEffect(effect, deps || []);
  return null;
};

export const SynchronousEffect = ({
  effect,
  deps,
}: {
  effect: () => void;
  deps?: DependencyList;
}): null => {
  const depsRef = useRef<DependencyList>([] as DependencyList);
  // @ts-ignore
  if(!sameArray(depsRef.current, deps)){
    effect();
  }
  depsRef.current = deps;
  return null;
};

export const REGISTRY = new Map<ComponentType, any>();
