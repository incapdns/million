import { EXEC_KEY } from '../million/constants';

export const execute =
  <Args extends any[], R>(fn: (...args: Args) => R, ...args: Args): R => {
    const instruction = {
      [EXEC_KEY]: true,
      fn,
      args,
      k: [] as string[]
    };

    return new Proxy(instruction, {
      get(target, prop: string | symbol) {
        if (prop === EXEC_KEY) return true;
        if (prop === 'fn' || prop === 'args' || prop === 'k') return target[prop as keyof typeof target];
        if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') return undefined;
        target.k.push(prop as string);
        return new Proxy(target, this as any);
      }
    }) as any;
  }

export const bind = <Bound extends any[], Rest extends any[], R>(
  fn: (...args: [...Bound, ...Rest]) => R,
  ...bound: Bound
): ((...rest: Rest) => R) =>
  ({
    [EXEC_KEY]: true,
    fn: (...resolvedArgs: Bound) => fn.bind(undefined, ...resolvedArgs),
    args: bound
  }) as any