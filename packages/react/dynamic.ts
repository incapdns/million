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