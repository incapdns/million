import { JSX, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { dynamic } from './dynamic';
import { execute } from './execute';
import { AbstractBlock } from '../million/types';

export interface IfProps {
  condition: boolean;
  then?: JSX.Element;
  else?: ReactNode;
  children?: ReactNode;
}

const smartChoose = (condition: boolean, then: any, elseProp: any) => {
  const target = condition ? then : elseProp;

  const value = (typeof target === 'function' && !target.__million_block && !isValidElement(target))
    ? target()
    : target;

  if (value instanceof AbstractBlock) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number' || value == null) {
    return value;
  }

  return dynamic(value);
};

export const If = ({ condition, then, else: elseProp, children }: IfProps) => {
  return execute(smartChoose, condition, then || children, elseProp);
};