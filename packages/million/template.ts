import getAttributeAlias from './alias';
import {
  X_CHAR,
  VOID_ELEMENTS,
  EventFlag,
  StyleAttributeFlag,
  SvgAttributeFlag,
  AttributeFlag,
  ChildFlag,
  BlockFlag,
  SetHas$,
  EXEC_KEY,
} from './constants';
import { AbstractBlock } from './types';
import type { Edit, VNode } from './types';

export const renderToTemplate = (
  vnode: VNode,
  edits: Edit[] = [],
  path: number[] = [],
): string => {
  if (typeof vnode === 'string') return vnode;
  if (
    typeof vnode === 'number' ||
    typeof vnode === 'bigint' ||
    vnode === true
  ) {
    return String(vnode);
  }
  if (vnode === null || vnode === undefined || vnode === false) return '';
  // TODO: refactor this so there is not an extra wrapper element
  if (typeof vnode === 'object' && '$' in vnode) {
    edits.push({
      p: path,
      e: [
        {
          /* type */ t: ChildFlag,
          /* name */ n: null,
          /* value */ v: null,
          /* hole */ h: vnode.$ as string,
          /* index */ i: 0,
          /* listener */ l: null,
          /* patch */ p: null,
          /* block */ b: null,
        },
      ],
      i: [],
    });

    return '<!--$-->';
  }

  if (typeof vnode === 'object' && vnode[EXEC_KEY]) {
    edits.push({
      p: path,
      e: [
        {
          /* type */ t: ChildFlag,
          /* name */ n: null,
          /* value */ v: vnode as any,
          /* hole */ h: null as any,
          /* index */ i: 0,
          /* listener */ l: null,
          /* patch */ p: null,
          /* block */ b: null,
        },
      ],
      i: [],
    });

    return '<!--$-->';
  }

  let props = '';
  let children = '';
  const current: Edit = {
    p: path, // The location of the edit in in the virtual node tree
    e: [], // Occur on mount + patch
    i: [], // Occur before mount
  };

  for (let name in vnode.props) {
    const value = vnode.props[name];
    if (name === 'key' || name === 'ref' || name === 'children') {
      continue;
    }

    const alias = getAttributeAlias(name);
    if (alias) name = alias;

    if (name === 'className') name = 'class';

    if (name.startsWith('on')) {
      if (value && typeof value === 'object' && value[EXEC_KEY]) {
        current.e.push({
          /* type */ t: EventFlag,
          /* name */ n: name.slice(2),
          /* value */ v: value,
          /* hole */ h: null as unknown as string,
          /* index */ i: null,
          /* listener */ l: null,
          /* patch */ p: null,
          /* block */ b: null,
        });
        continue;
      }

      // Make edits monomorphic
      if ('$' in value) {
        current.e.push({
          /* type */ t: EventFlag,
          /* name */ n: name.slice(2),
          /* value */ v: null,
          /* hole */ h: value.$,
          /* index */ i: null,
          /* listener */ l: null,
          /* patch */ p: null,
          /* block */ b: null,
        });
      } else {
        current.i!.push({
          /* type */ t: EventFlag,
          /* name */ n: name.slice(2),
          /* value */ v: null,
          /* hole */ h: null,
          /* index */ i: null,
          /* listener */ l: value,
          /* patch */ p: null,
          /* block */ b: null,
        });
      }

      continue;
    }

    if (value) {
      if (typeof value === 'object' && value[EXEC_KEY]) {
        let flag = AttributeFlag;
        if (name === 'style') {
          flag = StyleAttributeFlag;
        } else if (name.charCodeAt(0) === X_CHAR) {
          flag = SvgAttributeFlag;
        }

        current.e.push({
            /* type */ t: flag,
            /* name */ n: name,
            /* value */ v: value,
            /* hole */ h: null as any,
            /* index */ i: null,
            /* listener */ l: null,
            /* patch */ p: null,
            /* block */ b: null,
        });
        continue;
      }

      if (typeof value === 'object' && '$' in value) {
        if (name === 'style') {
          current.e.push({
            /* type */ t: StyleAttributeFlag,
            /* name */ n: name,
            /* value */ v: null,
            /* hole */ h: value.$,
            /* index */ i: null,
            /* listener */ l: null,
            /* patch */ p: null,
            /* block */ b: null,
          });
        } else if (name.charCodeAt(0) === X_CHAR) {
          current.e.push({
            /* type */ t: SvgAttributeFlag,
            /* name */ n: name,
            /* value */ v: null,
            /* hole */ h: value.$,
            /* index */ i: null,
            /* listener */ l: null,
            /* patch */ p: null,
            /* block */ b: null,
          });
        } else {
          current.e.push({
            /* type */ t: AttributeFlag,
            /* name */ n: name,
            /* value */ v: null,
            /* hole */ h: value.$,
            /* index */ i: null,
            /* listener */ l: null,
            /* patch */ p: null,
            /* block */ b: null,
          });
        }

        continue;
      }

      if (name === 'style' && typeof value === 'object') {
        let style = '';
        for (const key in value) {
          const val = value[key];

          if (val && typeof val === 'object' && val[EXEC_KEY]) {
            current.e.push({
              /* type */ t: StyleAttributeFlag,
              /* name */ n: key,
              /* value */ v: val,
              /* hole */ h: null as unknown as string,
              /* index */ i: null,
              /* listener */ l: null,
              /* patch */ p: null,
              /* block */ b: null,
            });
            continue;
          }

          if (val && typeof val === 'object' && '$' in val) {
            current.e.push({
              /* type */ t: StyleAttributeFlag,
              /* name */ n: key,
              /* value */ v: null,
              /* hole */ h: val.$,
              /* index */ i: null,
              /* listener */ l: null,
              /* patch */ p: null,
              /* block */ b: null,
            });
            continue;
          }

          // Caso C: Estático
          let kebabKey = '';
          for (let i = 0, j = key.length; i < j; ++i) {
            const char = key.charCodeAt(i);
            if (char < 97) {
              kebabKey += `-${String.fromCharCode(char + 32)}`;
            } else {
              kebabKey += key[i];
            }
          }
          style += `${kebabKey}:${String(val)};`;
        }
        props += ` style="${style}"`;
        continue;
      }

      if (typeof value === 'object' && hasHole(value)) {
        current.e.push({
          /* type */ t: AttributeFlag,
          /* name */ n: name,
          /* value */ v: value,
          /* hole */ h: null as unknown as string,
          /* index */ i: null,
          /* listener */ l: null,
          /* patch */ p: null,
          /* block */ b: null,
        });
        continue;
      }

      props += ` ${name}="${String(value)}"`;
    }
  }

  if (SetHas$.call(VOID_ELEMENTS, vnode.type)) {
    if (current.e.length) edits.push(current);
    return `<${vnode.type}${props} />`;
  }

  let canMergeString = false;
  for (let i = 0, j = vnode.props.children?.length || 0, k = 0; i < j; ++i) {
    const child = vnode.props.children?.[i];
    if (child === null || child === undefined || child === false) continue;

    // 1. Child Hole
    if (typeof child === 'object' && '$' in child) {
      current.e.push({
        /* type */ t: ChildFlag,
        /* name */ n: null,
        /* value */ v: null,
        /* hole */ h: child.$,
        /* index */ i,
        /* listener */ l: null,
        /* patch */ p: null,
        /* block */ b: null,
      });

      children += '<!--$-->';
      k++;
      canMergeString = false;
      continue;
    }

    if (typeof child === 'object' && child[EXEC_KEY]) {
      current.e.push({
        /* type */ t: ChildFlag,
        /* name */ n: null,
        /* value */ v: child as any,
        /* hole */ h: null as any,
        /* index */ i,
        /* listener */ l: null,
        /* patch */ p: null,
        /* block */ b: null,
      });
      children += '<!--$-->';
      k++;
      canMergeString = false;
      continue;
    }

    // 3. Child Block (Static)
    if (child instanceof AbstractBlock) {
      current.i!.push({
        t: BlockFlag,
        n: null,
        v: null,
        h: null,
        i,
        l: null,
        p: null,
        b: child,
      });

      continue;
    }

    if (
      typeof child === 'string' ||
      typeof child === 'number' ||
      typeof child === 'bigint'
    ) {
      const value =
        typeof child === 'number' || typeof child === 'bigint'
          ? String(child)
          : child;
      if (canMergeString) {
        current.i!.push({
          /* type */ t: ChildFlag,
          /* name */ n: null,
          /* value */ v: value,
          /* hole */ h: null,
          /* index */ i,
          /* listener */ l: null,
          /* patch */ p: null,
          /* block */ b: null,
        });
        continue;
      }
      canMergeString = true;
      children += value;
      k++;
      continue;
    }

    // 5. Recursão para elementos HTML aninhados
    canMergeString = false;
    const newPath = path.slice();
    newPath.push(k++);
    children += renderToTemplate(child, edits, newPath);
  }

  if (current.i!.length || current.e.length) edits.push(current);

  return `<${vnode.type}${props}>${children}</${vnode.type}>`;
};

const hasHole = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  if ('$' in value) return true;
  if (Array.isArray(value)) return value.some(hasHole);
  return Object.values(value).some(hasHole);
}