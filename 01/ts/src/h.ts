export type Attrs = { [key: string]: any };

export interface Props {
  attrs: Attrs;
  children: VNode[];
}

export type VNodeType = "element" | "text";

export interface VNode {
  type: VNodeType;
  name: string;
  props?: Props;
}

export type Component = (attrs: Attrs, children: VNode[]) => VNode;

function normalize(children: any[]): VNode[] {
  const arr = [];
  children.forEach(c => {
    if (c == null || typeof c === "boolean") return;
    if (Array.isArray(c)) {
      arr.push(...normalize(c));
    } else if (typeof c === "string" || typeof c === "number") {
      arr.push({ type: "text", name: c });
    } else {
      arr.push(c);
    }
  });
  return arr;
}

export function h(name: string | Component, attrs: Attrs, ...children: any[]): VNode {
  const props = { attrs: attrs || {}, children: normalize(children) };
  return typeof name === "function"
    ? name(props.attrs, props.children)
    : { type: "element", name, props };
}
