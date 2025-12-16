/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/unbound-method */
import { currentFn, DYNAMIC, resolveHoles } from '../react/dynamic';
import type { MillionProps } from '../types';
import {
  cloneNode$,
  createEventListener,
  insertBefore$,
  insertText,
  remove$ as removeElement$,
  setAttribute,
  setText,
  setStyleAttribute,
  setSvgAttribute,
  childAt,
  replaceChild$,
  stringToDOM,
  removeComments,
} from './dom';
import { renderToTemplate } from './template';
import { AbstractBlock } from './types';
import { arrayMount$, arrayPatch$ } from './array';
import {
  TEXT_NODE_CACHE,
  AttributeFlag,
  ChildFlag,
  EventFlag,
  StyleAttributeFlag,
  EVENT_PATCH,
} from './constants';
import type { ArrayBlock } from './array';
import type { EditChild, VElement, Hole, VNode, Edit } from './types';
import { EXEC_KEY } from '../million/constants';

const createDeepHole = (key: string): any => {
  const hole = { $: key };

  return new Proxy(hole, {
    get(target, prop: string) {
      if (prop === '$') return target.$;

      return createDeepHole(`${key}.${prop}`);
    },
  });
};

const HOLE_PROXY = new Proxy(
  {},
  {
    get(_, key: string): Hole {
      return createDeepHole(key);
    },
  },
);

export const block = (
  fn: (props?: MillionProps) => VElement,
  unwrap?: (vnode: VElement) => VNode,
  shouldUpdate?: (oldProps: MillionProps, newProps: MillionProps) => boolean,
  svg?: boolean,
) => {
  const vnode = fn(HOLE_PROXY);
  const edits: Edit[] = [];

  // Turns vnode into a string of HTML and creates an array of "edits"
  // Edits are instructions for how to update the DOM given some props
  const root = stringToDOM(
    renderToTemplate(unwrap ? unwrap(vnode) : vnode, edits),
    svg,
  );
  removeComments(root);

  return <T extends MillionProps>(
    props?: T | null,
    key?: string,
    shouldUpdateCurrentBlock?: (
      oldProps: MillionProps,
      newProps: MillionProps,
    ) => boolean,
  ) => {
    return new Block(
      root,
      edits,
      props,
      key ?? props?.key ?? null,
      shouldUpdateCurrentBlock ?? shouldUpdate ?? null,
      null,
    );
  };
};

export const mount = (
  block: AbstractBlock,
  parent?: HTMLElement,
  hydrateNode?: HTMLElement,
): HTMLElement => {
  if ('b' in block && parent) {
    return arrayMount$.call(block, parent, null);
  }
  return mount$.call(block, parent, null, hydrateNode);
};

export const patch = (
  oldBlock: AbstractBlock,
  newBlock: AbstractBlock,
): HTMLElement => {
  if ('b' in oldBlock || 'b' in newBlock) {
    arrayPatch$.call(oldBlock, newBlock as ArrayBlock);
  }

  if (!oldBlock.l) mount$.call(oldBlock, undefined, null, null);
  if ((oldBlock.k && oldBlock.k === newBlock.k) || oldBlock.r === newBlock.r) {
    return patch$.call(oldBlock, newBlock);
  }
  const el = mount$.call(newBlock, oldBlock.t()!, oldBlock.l, null);
  remove$.call(oldBlock);
  oldBlock.k = newBlock.k!;
  return el;
};

type ArrayType<T> = T extends Array<infer U> ? U : T;

const processValue = (
  edit: ArrayType<Edit['e']>,
  props: MillionProps
): any => {
  const rawValue = edit.h ? props[edit.h] : edit.v;

  let value = (edit.h === null && edit.v)
    ? resolveHoles({ vnode: rawValue, props })
    : rawValue;

  let depth = 0;
  const MAX_DEPTH = 50;

  while (value && typeof value === 'object' && value[EXEC_KEY]) {
    if (depth++ > MAX_DEPTH) {
      break;
    }

    try {
      const fn = value.fn;
      let args = value.args || [];

      if (args.some((arg: any) => arg && typeof arg === 'object' && arg[EXEC_KEY])) {
        args = args.map((arg: any) => {
          if (arg && typeof arg === 'object' && arg[EXEC_KEY]) {
            try {
              return typeof arg.fn === 'function' ? arg.fn(...(arg.args || [])) : null
            }
            catch {
              return null
            }
          }
          return arg;
        });
      }

      if (typeof fn === 'function') {
        value = fn(...args);
      } else {
        value = null;
        break;
      }
    } catch (err) {
      value = null;
      break;
    }
  }

  return value;
};

export class Block extends AbstractBlock {
  declare r: HTMLElement;
  declare e: Edit[];

  public rtPortals: any[] | null = null;
  public _v: any[] = [];

  constructor(
    root: HTMLElement,
    edits: Edit[],
    props?: MillionProps | null,
    key?: string | null,
    shouldUpdate?:
      | ((oldProps: MillionProps, newProps: MillionProps) => boolean)
      | null,
    getElements?: ((root: HTMLElement) => HTMLElement[]) | null,
  ) {
    super();
    this.r = root;
    this.d = props;
    this.e = edits;
    this.k = key;
    this.c = Array(edits.length);
    if (shouldUpdate) {
      this._u = shouldUpdate;
    } else {
      this._u = null;
    }
    if (getElements) {
      this.g = getElements;
    } else {
      this.g = null;
    }
  }
  m(
    parent?: HTMLElement,
    refNode: Node | null = null,
    hydrateNode?: HTMLElement | null,
  ): HTMLElement {
    if (this.l) return this.l;
    // cloneNode(true) uses less memory than recursively creating new nodes
    let root = hydrateNode ?? (cloneNode$.call(this.r, true) as HTMLElement);
    const elements = this.g?.(root);
    if (elements) this.c = elements;

    for (let i = 0, j = this.e.length; i < j; ++i) {
      const current = this.e[i]!;
      const el =
        elements?.[i] ?? getCurrentElement(current.p!, root, this.c, i);
      for (let k = 0, l = current.e.length; k < l; ++k) {
        const edit = current.e[k]!;

        const prevContext = currentFn.context;

        const getSlot = () => {
          let current = el[TEXT_NODE_CACHE]?.[k];
          if (!current) current = childAt(el, edit.i!);

          if (current.tagName === 'MILLION-PORTAL') return current;

          const wrapper = document.createElement('million-portal');
          wrapper.style.display = 'contents';

          replaceChild$.call(el, wrapper, current);

          if (!el[TEXT_NODE_CACHE]) el[TEXT_NODE_CACHE] = new Array(l);
          el[TEXT_NODE_CACHE][k] = wrapper;

          return wrapper;
        };

        currentFn.context = {
          block: this,
          getSlot
        };
        const value = processValue(edit, this.d!);
        currentFn.context = prevContext;

        this._v.push(value);

        if (value && value.kind == DYNAMIC) {
          continue;
        }

        if (edit.t & ChildFlag) {
          if (value instanceof AbstractBlock) {
            const child = childAt(el, edit.i!);
            if (hydrateNode) {
              value.m(el, child, child);
            } else {
              value.m(el, child);
            }
            continue;
          }
          if (!el[TEXT_NODE_CACHE]) el[TEXT_NODE_CACHE] = new Array(l);

          if (value && typeof value === 'object' && 'foreign' in value) {
            const targetEl = value.current;

            if (el === root && root.nodeType === 8 && root.nodeValue === '$') {
              root = targetEl;
              continue;
            }

            if (hydrateNode) {
              const child = childAt(el, edit.i!);
              value.reset(child);
            }

            el[TEXT_NODE_CACHE][k] = targetEl;
            if (!hydrateNode) {
              insertBefore$.call(el, targetEl, childAt(el, edit.i!));
            }
            continue;
          }
          if (hydrateNode) {
            el[TEXT_NODE_CACHE][k] = childAt(el, edit.i!);
            continue;
          }
          // insertText() on mount, setText() on patch
          el[TEXT_NODE_CACHE][k] = insertText(
            el,
            // eslint-disable-next-line eqeqeq
            value == null || value === false ? '' : String(value),
            edit.i!,
          );
        } else if (edit.t & EventFlag) {
          const patch = createEventListener(el, edit.n!, value);
          el[EVENT_PATCH + edit.n!] = patch;
        } else if (edit.t & AttributeFlag) {
          const name = edit.n!;
          if (name.startsWith('data-') || name.startsWith('_')) {
            el[name] = value;
          } else {
            setAttribute(el, name, value);
          }
        } else if (edit.t & StyleAttributeFlag) {
          if (typeof value === 'string' || typeof value === 'number') {
            setStyleAttribute(el, edit.n!, value);
          } else {
            for (const style in value) {
              setStyleAttribute(el, style, value[style]);
            }
          }
        } else {
          setSvgAttribute(el, edit.n!, value);
        }
      }

      const initsLength = current.i?.length;
      if (!initsLength) continue;
      for (let k = 0; k < initsLength; ++k) {
        const init = current.i![k]!;

        if (init.t & ChildFlag) {
          // Handles case for positioning text nodes. When text nodes are
          // put into a template, they can be merged. For example,
          // ["hello", "world"] becomes "helloworld" in the DOM.
          // Inserts text nodes into the DOM at the correct position.
          if (init.v && !hydrateNode) insertText(el, init.v, init.i);
        } else if (init.t & EventFlag) {
          createEventListener(el, init.n!, init.l!);
        } else {
          const child = childAt(el, init.i!);
          if (hydrateNode) {
            init.b!.m(el, child, child);
          } else {
            init.b!.m(el, child);
          }
        }
      }
    }

    if (parent && !hydrateNode) {
      insertBefore$.call(parent, root, refNode);
    }
    this.l = root;

    return root;
  }
  p(newBlock: AbstractBlock): HTMLElement {
    const root = this.l!;
    if (!newBlock.d) return root;
    const props = this.d!;

    if (!shouldUpdate$.call(this, props, newBlock.d)) return root;
    this.d = newBlock.d;

    let cursor = 0;

    for (let i = 0, j = this.e.length; i < j; ++i) {
      const current = this.e[i]!;
      const el: HTMLElement =
        this.c![i] ?? getCurrentElement(current.p!, root, this.c, i);

      for (let k = 0, l = current.e.length; k < l; ++k) {
        const edit = current.e[k]!;

        const rawOld = edit.h ? props[edit.h] : edit.v;
        const rawNew = edit.h ? newBlock.d[edit.h] : edit.v;

        const isExecute = rawNew && typeof rawNew === 'object' && rawNew[EXEC_KEY];

        if (rawOld === rawNew && !isExecute) {
          cursor++;
          continue;
        }

        const oldValue = this._v[cursor];

        const prevContext = currentFn.context;

        const getSlot = () => {
          let node = el[TEXT_NODE_CACHE]?.[k];
          if (!node) {
            node = childAt(el, edit.i!);

            if (!el[TEXT_NODE_CACHE]) el[TEXT_NODE_CACHE] = new Array(l);
            el[TEXT_NODE_CACHE][k] = node;
          }

          if (node && node.tagName === 'MILLION-PORTAL') return node;

          const wrapper = document.createElement('million-portal');
          wrapper.style.display = 'contents';

          replaceChild$.call(el, wrapper, node);

          el[TEXT_NODE_CACHE][k] = wrapper;

          return wrapper;
        };

        currentFn.context = {
          block: this,
          getSlot
        };
        const newValue = processValue(edit, newBlock.d!);
        currentFn.context = prevContext;

        this._v[cursor] = newValue;
        cursor++;

        if (oldValue && oldValue.kind === DYNAMIC && (!newValue || newValue.kind !== DYNAMIC)) {
          const current = el[TEXT_NODE_CACHE][k];
          if (current && current.tagName === 'MILLION-PORTAL') {
            const newTextNode = document.createTextNode('');
            replaceChild$.call(el, newTextNode, current);
            el[TEXT_NODE_CACHE][k] = newTextNode;
          }
        }

        const isNewDynamic = newValue && typeof newValue === 'object' && newValue.kind === DYNAMIC;

        if (newValue === oldValue || isNewDynamic) {
          if (isNewDynamic && (edit.t & ChildFlag)) {
            const node = el[TEXT_NODE_CACHE] && el[TEXT_NODE_CACHE][k];

            if (node && node.nodeType === 3) {
              setText(node, '');
            }
          }
          continue;
        }

        if (edit.t & EventFlag) {
          el[EVENT_PATCH + edit.n!]!(newValue);
          continue;
        }

        if (edit.t & ChildFlag) {
          if (oldValue instanceof AbstractBlock) {
            const firstEdit = newBlock.e?.[i]?.e[k] as EditChild;
            const newChildBlock = newBlock.d[firstEdit.h];
            oldValue.p(newChildBlock);
            continue;
          }

          if (newValue && typeof newValue === 'object' && 'foreign' in newValue) {
            // Root Swap Logic
            if (this.r.nodeType === 8 && this.r.nodeValue === '$') {
              const newTargetEl = newValue.current;
              if (newValue.unstable && oldValue !== newValue) {
                // @ts-ignore
                replaceChild$.call(this.t(), newTargetEl, this.l);
                this.l = newTargetEl;
              }
              continue;
            }

            const targetEl = el[TEXT_NODE_CACHE][k];
            if (newValue.unstable && oldValue !== newValue) {
              const newTargetEl = newValue.current;
              el[TEXT_NODE_CACHE][k] = newTargetEl;
              replaceChild$.call(el, newTargetEl, targetEl);
            } else {
              newValue.current = targetEl;
            }
            continue;
          }

          setText(
            el[TEXT_NODE_CACHE][k],
            newValue == null || newValue === false ? '' : String(newValue),
          );
        } else if (edit.t & AttributeFlag) {
          const name = edit.n!;
          if (name.startsWith('data-') || name.startsWith('_')) {
            el[name] = newValue;
          } else {
            setAttribute(el, name, newValue);
          }
        } else if (edit.t & StyleAttributeFlag) {
          if (typeof newValue === 'string' || typeof newValue === 'number') {
            setStyleAttribute(el, edit.n!, newValue);
          } else {
            for (const style in newValue) {
              if (newValue[style] !== oldValue[style]) {
                setStyleAttribute(el, style, newValue[style]);
              }
            }
          }
        } else {
          setSvgAttribute(el, edit.n!, newValue);
        }
      }
    }
    return root;
  }
  v(block: AbstractBlock | null = null, refNode: Node | null = null): void {
    insertBefore$.call(this.t(), this.l!, block ? block.l! : refNode);
  }
  x(): void {
    removeElement$.call(this.l);
    this.l = null;
  }
  u(_oldProps: MillionProps, _newProps: MillionProps): boolean {
    if (!this._u) return true;
    return this._u(_oldProps, _newProps);
  }
  s(): string {
    return String(this.l?.outerHTML);
  }
  t(): HTMLElement | null | undefined {
    if (!this._t) this._t = this.l?.parentElement;
    return this._t;
  }
}

const getCurrentElement = (
  path: number[],
  root: HTMLElement,
  cache?: HTMLElement[],
  key?: number,
): HTMLElement => {
  const pathLength = path.length;
  if (!pathLength) return root;
  const isCacheAndKeyExists = cache && key !== undefined;
  if (isCacheAndKeyExists && cache[key]) {
    return cache[key]!;
  }
  // path is an array of indices to traverse the DOM tree
  // For example, [0, 1, 2] becomes:
  // root.firstChild.firstChild.nextSibling.firstChild.nextSibling.nextSibling
  // We use path because we don't have the actual DOM nodes until mount()
  for (let i = 0; i < pathLength; ++i) {
    const siblings = path[i]!;
    root = childAt(root, siblings);
  }
  if (isCacheAndKeyExists) cache[key] = root;
  return root;
};

export const withKey = (value: any, key: string): any => {
  value.key = key;
  return value;
};

const block$ = Block.prototype;

export const mount$ = block$.m;
export const patch$ = block$.p;
export const move$ = block$.v;
export const remove$ = block$.x;
export const shouldUpdate$ = block$.u;
