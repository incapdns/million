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
import type { Edit, EditAttribute, EditChild, EditEvent, EditStyleAttribute, EditSvgAttribute, InitBlock, InitChild, InitEvent, VNode } from './types';

type EditItem =
  | EditAttribute
  | EditStyleAttribute
  | EditSvgAttribute
  | EditChild
  | EditEvent;

type IniItem =
  | InitChild
  | InitEvent
  | InitBlock

type Item = IniItem | EditItem

const createItem = (
  type: number,
  name: string | null,
  value: any,
  hole: any,
  index: number | null = null,
  block: any = null
): Item =>
  ({
  /* type */     t: type,
  /* name */     n: name,
  /* value */    v: value,
  /* hole */     h: hole,
  /* index */    i: index,
  /* listener */ l: null,
  /* patch */    p: null,
  /* block */    b: block,
  }) as Item;

export const renderToTemplate = (
  vnode: VNode,
  edits: Edit[] = [],
  path: number[] = [],
): string => {
  // 1. Primitivos
  if (typeof vnode === 'string') return vnode;
  if (
    typeof vnode === 'number' ||
    typeof vnode === 'bigint' ||
    vnode === true
  ) {
    return String(vnode);
  }
  if (vnode === null || vnode === undefined || vnode === false) return '';

  const isObject = typeof vnode === 'object';

  const isHole = isObject && '$' in vnode;
  const isExec = isObject && vnode[EXEC_KEY] != undefined;

  if (isHole || isExec) {
    edits.push({
      p: path,
      e: [
        createItem(
          ChildFlag,
          null,
          isExec ? vnode : null, // v
          isHole ? vnode.$ : null, // h
          0 // i
        ) as EditItem,
      ],
      i: [],
    });
    return '<!--$-->';
  }

  // 3. Setup
  let props = '';
  let children = '';
  const current: Edit = {
    p: path,
    e: [],
    i: [],
  };

  // 4. Props
  for (let name in vnode.props) {
    const value = vnode.props[name];
    if (name === 'key' || name === 'ref' || name === 'children') continue;

    const alias = getAttributeAlias(name);
    if (alias) name = alias;
    if (name === 'className') name = 'class';

    // A. Event Listeners
    if (name.startsWith('on')) {
      const eventName = name.slice(2);
      const isEventExec = value && typeof value === 'object' && value[EXEC_KEY] != undefined;
      const isEventHole = value && typeof value === 'object' && '$' in value;

      if (isEventExec || isEventHole) {
        current.e.push(
          createItem(
            EventFlag,
            eventName,
            isEventExec ? value : null,
            isEventHole ? value.$ : null
          ) as EditItem
        );
      } else {
        current.i!.push(
          createItem(EventFlag, eventName, null, null, null, null) as IniItem
        );
        // @ts-ignore
        current.i![current.i!.length - 1].l = value;
      }
      continue;
    }

    // B. Atributos Dinâmicos
    if (value) {
      const isAttrExec = typeof value === 'object' && value[EXEC_KEY] != undefined;
      const isAttrHole = typeof value === 'object' && '$' in value;

      if (isAttrExec || isAttrHole) {
        let flag = AttributeFlag;
        if (name === 'style') flag = StyleAttributeFlag;
        else if (name.charCodeAt(0) === X_CHAR) flag = SvgAttributeFlag;

        current.e.push(
          createItem(
            flag,
            name,
            isAttrExec ? value : null,
            isAttrHole ? value.$ : null
          ) as EditItem
        );
        continue;
      }
    }

    // C. Style Object
    if (name === 'style' && typeof value === 'object') {
      let style = '';
      for (const key in value) {
        const val = value[key];
        const isStyleExec = val && typeof val === 'object' && val[EXEC_KEY] != undefined;
        const isStyleHole = val && typeof val === 'object' && '$' in val;

        if (isStyleExec || isStyleHole) {
          current.e.push(
            createItem(
              StyleAttributeFlag,
              key,
              isStyleExec ? val : null, // Corrigido aqui também (v deve ser null se for hole)
              isStyleHole ? val.$ : null
            ) as EditItem
          );
          continue;
        }

        let kebabKey = '';
        for (let i = 0, j = key.length; i < j; ++i) {
          const char = key.charCodeAt(i);
          if (char < 97) kebabKey += `-${String.fromCharCode(char + 32)}`;
          else kebabKey += key[i];
        }
        style += `${kebabKey}:${String(val)};`;
      }
      props += ` style="${style}"`;
      continue;
    }

    // D. Deep Hole
    if (typeof value === 'object' && hasHole(value)) {
      current.e.push(createItem(AttributeFlag, name, value, null) as EditItem);
      continue;
    }

    // E. Estático
    props += ` ${name}="${String(value)}"`;
  }

  // 5. Void Elements
  if (SetHas$.call(VOID_ELEMENTS, vnode.type)) {
    if (current.e.length) edits.push(current);
    return `<${vnode.type}${props} />`;
  }

  let canMergeString = false;
  const childrenList = vnode.props.children;
  const len = childrenList?.length || 0;

  for (let i = 0, k = 0; i < len; ++i) {
    // @ts-ignore
    const child = childrenList[i];
    if (child === null || child === undefined || child === false) continue;

    const isChildHole = typeof child === 'object' && '$' in child;
    const isChildExec = typeof child === 'object' && child[EXEC_KEY] != undefined;

    if (isChildHole || isChildExec) {
      current.e.push(
        createItem(
          ChildFlag,
          null,
          isChildExec ? child : null,
          isChildHole ? child.$ : null,
          i
        ) as EditItem
      );
      children += '<!--$-->';
      k++;
      canMergeString = false;
      continue;
    }

    if (child instanceof AbstractBlock) {
      current.i!.push(createItem(BlockFlag, null, null, null, i, child) as IniItem);
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
        current.i!.push(createItem(ChildFlag, null, value, null, i) as IniItem);
        continue;
      }
      canMergeString = true;
      children += value;
      k++;
      continue;
    }

    canMergeString = false;
    const newPath = path.slice();
    newPath.push(k++);
    children += renderToTemplate(child, edits, newPath);
  }

  if (current.i!.length || current.e.length) 
    edits.push(current);

  return `<${vnode.type}${props}>${children}</${vnode.type}>`;
};

const hasHole = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  if ('$' in value) return true;
  if (Array.isArray(value)) return value.some(hasHole);
  return Object.values(value).some(hasHole);
};