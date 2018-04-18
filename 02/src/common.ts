import { VNode, Component, Attrs } from "./h";

export const getNode = (vnode: any): Node => vnode && vnode._node;

export const setNode = (vnode: any, node: Node) => (vnode._node = node);

export function setAttr(el: Element, k: string, attr: any) {
  if (/^on/.test(k) || k === "checked" || k === "value") {
    el[k] = attr;
  } else {
    el.setAttribute(k, attr);
  }
}

export function removeAttr(el: Element, k: string) {
  if (/^on/.test || k === "checked" || k === "value") {
    el[k] = null;
  } else {
    el.removeAttribute(k);
  }
}

export function updateAttrs(el: Element, oldAttrs: Attrs, newAttrs: Attrs) {
  for (const k in { ...oldAttrs, ...newAttrs }) {
    oldAttrs[k] != null && newAttrs[k] == null && removeAttr(el, k);
    newAttrs[k] != null && setAttr(el, k, newAttrs[k]);
  }
}

export function resolveComponent(vnode: VNode) {
  if (!vnode) return;
  let _vnode = vnode;
  while (_vnode.type === "component")
    _vnode = (_vnode.name as Component)(_vnode.props);
  Object.assign(vnode, _vnode);
}
