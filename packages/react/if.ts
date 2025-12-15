import { createElement } from 'react';
import type { ReactNode } from 'react';
import { dynamic } from './dynamic';

interface IfProps {
  condition: boolean;
  then?: ReactNode;
  else?: ReactNode;
  children?: ReactNode;
}

const InternalIf = ({ condition, then, else: elseProp, children }: IfProps) => {
  return condition ? (then || children) : (elseProp || null);
};

export const If = (props: IfProps) => {
  return dynamic(
    createElement(InternalIf, props)
  );
};