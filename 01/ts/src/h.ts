export type Attrs = { [key: string]: any };

export interface Props {
  attrs: Attrs;
  children: Child[];
}

export interface VNode {
  name: string;
  props: Props;
}

export type Child = VNode | any[];
export type NestedChild = VNode | string | any[];
export type Component = (props: Props) => VNode;

function flatten(children: NestedChild[]): Child[] {
  const arr = [];
  children.forEach(
    c => (Array.isArray(c) ? arr.push(...flatten(c)) : arr.push(c))
  );
  return arr;
}

export function h(
  name: string | Component,
  attrs: Attrs,
  ...children: NestedChild[]
): VNode {
  const props = { attrs, children: flatten(children) };
  return typeof name === "function" ? name(props) : { name, props };
}
