import type { ReactNode } from 'react';
import { isValidElement } from 'react';
import { hole } from './hole';
import { execute } from './execute';
import { AbstractBlock } from '../million/types';

export interface IfProps {
  condition: boolean | (() => boolean);
  then?: ReactNode | (() => ReactNode);
  else?: ReactNode | (() => ReactNode);
  children?: ReactNode;
}

const smartChoose = (condition: boolean | (() => boolean), then: any, elseProp: any) => {
  const result = typeof condition === 'function' 
    ? condition()
    : condition;
    
  const target = result ? then : elseProp;

  const value = (typeof target === 'function')
    ? target()
    : target;

  if (!isValidElement(value)) {
    return value;
  }

  return hole(value);
};

export const If = ({ condition, then, else: elseProp, children }: IfProps): ReactNode => {
  return execute(smartChoose, condition, then || children, elseProp) as any;
};