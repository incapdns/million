import { EXEC_KEY } from '../million/constants';

export const execute =
  <Args extends any[], R>(fn: (...args: Args) => R, ...args: Args): R =>
    ({
      [EXEC_KEY]: true,
      fn,
      args
    }) as any

export const bind = <Bound extends any[], Rest extends any[], R>(
  fn: (...args: [...Bound, ...Rest]) => R,
  ...bound: Bound
): ((...rest: Rest) => R) =>
  ({
    [EXEC_KEY]: true,
    fn: (...resolvedArgs: Bound) => fn.bind(undefined, ...resolvedArgs),
    args: bound
  }) as any