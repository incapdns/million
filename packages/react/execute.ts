import { EXEC_KEY } from 'packages/million/constants';

export const execute = (fn: any, ...args: any[]) => {
  return {
    [EXEC_KEY]: true,
    fn: fn,
    args: args
  };
};