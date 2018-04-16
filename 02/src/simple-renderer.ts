import { VNode, Attrs, Component } from "./h";

export function createRenderer(container: Element) {
  const lifeCycles: Function[] = [];

  const getNode = (vnode: any): Node => vnode && vnode._node;

  const setNode = (vnode: any, node: Node) => (vnode._node = node);

  function setAttr(el: Element, k: string, attr: any) {
    if (/^on/.test(k) || k === "checked" || k === "value") {
      el[k] = attr;
    } else {
      el.setAttribute(k, attr);
    }
  }

  function removeAttr(el: Element, k: string) {
    if (/^on/.test || k === "checked" || k === "value") {
      el[k] = null;
    } else {
      el.removeAttribute(k);
    }
  }

  function resolveComponent(vnode: VNode) {
    if (!vnode || vnode.type !== "component") return;
    const _vnode = (vnode.name as Component)(vnode.props);
    Object.assign(vnode, _vnode);
  }

  function createElement(vnode: VNode): Node {
    switch (vnode.type) {
      case "text": {
        const node = document.createTextNode(vnode.name as string);
        setNode(vnode, node);
        return node;
      }
      case "component": {
        resolveComponent(vnode);
        return createElement(vnode);
      }
      case "element": {
        const node = document.createElement(vnode.name as string);
        const { attrs, children } = vnode.props;
        for (const k in attrs) {
          setAttr(node, k, attrs[k]);
        }
        setNode(vnode, node);
        children.forEach(child => node.appendChild(createElement(child)));
        attrs.oncreate && lifeCycles.push(() => attrs.oncreate(node));
        return node;
      }
    }
  }

  function removeChildren(vnode: VNode) {
    if (!vnode || vnode.type === "text") return;
    const { attrs, children } = vnode.props;
    children.forEach(removeChildren);
    attrs.ondestroy && attrs.ondestroy(getNode(vnode));
  }

  function removeElement(vnode: VNode) {
    const el = getNode(vnode);
    removeChildren(vnode);
    const parent = el.parentElement;
    parent && parent.removeChild(el);
  }

  function updateElement(el: Element, oldAttrs: Attrs, newAttrs: Attrs) {
    for (const k in { ...oldAttrs, ...newAttrs }) {
      oldAttrs[k] != null && newAttrs[k] == null && el.removeAttribute(k);
      newAttrs[k] != null && setAttr(el, k, newAttrs[k]);
    }
    newAttrs.onupdate && lifeCycles.push(() => newAttrs.onupdate(el));
  }

  function createThenInsert(parent: Node, vnode: VNode, node?: Node) {
    const _node = createElement(vnode);
    node ? parent.insertBefore(_node, node) : parent.appendChild(_node);
  }

  function patch(parent: Node, old: VNode, vnode: VNode) {
    resolveComponent(vnode);
    if (old === vnode) return;
    const node = getNode(old);
    if (!old && vnode) {
      createThenInsert(parent, vnode);
    } else if (old && !vnode) {
      removeElement(old);
    } else if (old.type !== vnode.type) {
      createThenInsert(parent, vnode, node);
      removeElement(old);
    } else if (old.name !== vnode.name) {
      if (old.type === "text") {
        node.nodeValue = vnode.name as string;
        setNode(vnode, node);
        return;
      }
      createThenInsert(parent, vnode, node);
      removeElement(old);
    } else {
      setNode(vnode, node);
      if (old.type === "text") return;
      updateElement(node as Element, old.props.attrs, vnode.props.attrs);

      const oldChildren = old.props.children;
      const newChildren = vnode.props.children;
      let i = 0;

      while (i < newChildren.length) {
        patch(node, oldChildren[i], newChildren[i]);
        i++;
      }

      while (i < oldChildren.length) {
        removeElement(oldChildren[i]);
        i++;
      }
    }
  }

  let old: VNode;
  let _vnode: VNode;
  let isRendering = false;

  return function render(vnode: VNode | any) {
    _vnode = vnode;
    if (isRendering) return;
    isRendering = true;
    window.requestIdleCallback(() => {
      isRendering = false;
      patch(container, old, _vnode);
      old = _vnode;
      while (lifeCycles.length) lifeCycles.pop()();
    });
  };
}
