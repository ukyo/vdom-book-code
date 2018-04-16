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

  function getKey(vnode: VNode) {
    return vnode && (vnode.type === "element" || vnode.type === "component")
      ? vnode.props.attrs.key
      : null;
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

      const oldKeyed = {};
      const newKeyed = {};
      const oldChildren = old.props.children;
      const newChildren = vnode.props.children;

      if (!oldChildren.length) {
        const fragment = document.createDocumentFragment();
        newChildren.forEach(child => createThenInsert(fragment, child));
        node.appendChild(fragment);
        return;
      }

      if (!newChildren.length) {
        oldChildren.forEach(removeChildren);
        (node as Element).innerHTML = "";
        return;
      }

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
            patch(node, oldChildren[i], newChildren[j]);
            j++;
          }
          i++;
        } else {
          const keyedNode = oldKeyed[newKey];

          if (oldKey === newKey) {
            patch(node, keyedNode, newChildren[j]);
            i++;
          } else if (keyedNode) {
            node.insertBefore(getNode(keyedNode), getNode(oldChildren[i]));
            patch(node, keyedNode, newChildren[j]);
          } else {
            createThenInsert(node, newChildren[j], getNode(oldChildren[i]));
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
