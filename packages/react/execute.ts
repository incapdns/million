import { EXEC_KEY } from '../million/constants';

export const execute = (fn: any, ...args: any[]) => {
  return {
    [EXEC_KEY]: true,
    fn,
    args
  };
};