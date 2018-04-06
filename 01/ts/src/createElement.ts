export type VNodeProps = { [key: string]: any } | null;

export interface VNode {
  type: string;
  name: string;
  props: VNodeProps;
  children: VNodeChild[];
}

export type VNodeChild = VNode | string | any[];

export type Component = (props: VNodeProps, children: VNodeChild[]) => VNode;

function flatten(children: VNodeChild[]) {
  const arr = [];
  children.forEach(
    c => (Array.isArray(c) ? arr.push(...flatten(c)) : arr.push(c))
  );
  return arr;
}

export function createElement(
  name: string | Component,
  props: VNodeProps,
  ...children: (VNode | string | any[])[]
): VNode {
  if (typeof name === "function") {
    return name(props, flatten(children));
  }
  return {
    type: "element",
    name,
    props,
    children: flatten(children),
  };
}
