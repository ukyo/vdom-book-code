import { VNode, Attrs, Component } from "./h";
import {
  setNode,
  resolveComponent,
  setAttr,
  getNode,
  updateAttrs,
} from "./common";

export function createRenderer(container: Element) {
  const lifeCycles: Function[] = [];

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
        updateAttrs(node, {}, attrs);
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
    updateAttrs(el, oldAttrs, newAttrs);
    oldAttrs.onupdate && lifeCycles.push(() => oldAttrs.onupdate(el));
  }

  function getKey(vnode: VNode) {
    return vnode && (vnode.type === "element" || vnode.type === "component")
      ? vnode.props.attrs.key
      : null;
  }

  function insertOrAppendNode(parent, a: Node, b?: Node) {
    b ? parent.insertBefore(a, b) : parent.appendChild(a);
  }

  function createElementThenInsert(parent: Node, vnode: VNode, node?: Node) {
    insertOrAppendNode(parent, createElement(vnode), node);
  }

  function patch(parent: Node, old: VNode, vnode: VNode) {
    resolveComponent(vnode);
    if (old === vnode) return;
    const node = getNode(old);
    if (!old && vnode) {
      createElementThenInsert(parent, vnode);
    } else if (old && !vnode) {
      removeElement(old);
    } else if (old.type !== vnode.type) {
      createElementThenInsert(parent, vnode, node);
      removeElement(old);
    } else if (old.name !== vnode.name) {
      if (old.type === "text") {
        node.nodeValue = vnode.name as string;
        setNode(vnode, node);
        return;
      }
      createElementThenInsert(parent, vnode, node);
      removeElement(old);
    } else {
      setNode(vnode, node);
      if (old.type === "text") return;
      updateElement(node as Element, old.props.attrs, vnode.props.attrs);

      reconcileChildren(node, old.props.children, vnode.props.children);
    }
  }

  function reconcileChildren(
    parent: Node,
    oldChildren: VNode[],
    newChildren: VNode[]
  ) {
    const oldKeyed = {};
    const newKeyed = {};

    oldChildren.forEach(child => {
      const key = getKey(child);
      if (key != null) oldKeyed[key] = child;
    });

    let i = 0;
    let j = 0;

    while (j < newChildren.length) {
      const oldKey = getKey(oldChildren[i]);
      const newKey = getKey(newChildren[j]);

      if (newKeyed[oldKey]) {
        i++;
        continue;
      }

      if (newKey == null) {
        if (oldKey == null) {
          patch(parent, oldChildren[i], newChildren[j]);
          j++;
        }
        i++;
      } else {
        const keyedNode = oldKeyed[newKey];

        if (oldKey === newKey) {
          patch(parent, keyedNode, newChildren[j]);
          i++;
        } else if (keyedNode) {
          insertOrAppendNode(
            parent,
            getNode(keyedNode),
            getNode(oldChildren[i])
          );
          patch(parent, keyedNode, newChildren[j]);
        } else {
          createElementThenInsert(
            parent,
            newChildren[j],
            getNode(oldChildren[i])
          );
        }

        newKeyed[newKey] = newChildren[j];
        j++;
      }
    }

    while (i < oldChildren.length) {
      getKey(oldChildren[i]) == null && removeElement(oldChildren[i]);
      i++;
    }

    for (const k in oldKeyed) {
      !newKeyed[k] && removeElement(oldKeyed[k]);
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
