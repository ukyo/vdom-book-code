import { Attrs, Component, Props, VNode, VNodeType } from "./h";
import { LinkedList } from "./linkedlist";

enum FiberEffectTag {
  NoWork = 0,
  Placement = 1,
  Update = 2,
  Deletion = 4,
}

type FiberType = VNodeType | "root";
type EffectList = LinkedList<Fiber>;

interface Fiber {
  type: FiberType;
  name?: string | Component;
  props?: Props;
  node?: Node;
  return?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  alternate?: Fiber;
  effectTag: FiberEffectTag;
  effects: EffectList;
}

export function createRenderer(container: Element) {
  function createFiber(vnode: VNode): Fiber {
    return {
      name: vnode ? vnode.name : null,
      props: vnode ? vnode.props : null,
      type: vnode ? vnode.type : "root",
      node: null,
      return: null,
      child: null,
      sibling: null,
      alternate: null,
      effectTag: FiberEffectTag.NoWork,
      effects: new LinkedList<Fiber>(),
    };
  }

  function cloneFiber(current: Fiber, vnode: VNode) {
    if (!current) return createFiber(vnode);
    const fiber = {
      name: vnode.name,
      props: vnode.props,
      type: vnode ? vnode.type : ("root" as FiberType),
      alternate: current,
      node: current.node,
      return: null,
      child: null,
      sibling: null,
      effectTag: FiberEffectTag.NoWork,
      effects: new LinkedList<Fiber>(),
    };
    current.alternate = fiber;
    return fiber;
  }

  function createRootFiber(vnode: VNode, container: Element) {
    const rootFiber = createFiber(null);
    rootFiber.child = createFiber(vnode);
    rootFiber.child.return = rootFiber;
    rootFiber.node = container;
    return rootFiber;
  }

  function wireRootFiber(prevRoot: Fiber, nextRoot: Fiber) {
    nextRoot.alternate = prevRoot;
    prevRoot.alternate = nextRoot;
    nextRoot.node = prevRoot.node;
    nextRoot.child.alternate = prevRoot.child;
    prevRoot.child.alternate = nextRoot.child;
    nextRoot.child.node = prevRoot.child.node;
  }

  function patch(workInProgress: Fiber) {
    const current = workInProgress.alternate;
    if (!current) {
      workInProgress.effectTag = FiberEffectTag.Placement;
    } else {
      if (current.type !== workInProgress.type) {
        workInProgress.effectTag = FiberEffectTag.Placement;
        current.effectTag = FiberEffectTag.Deletion;
        workInProgress.effects.push(current);
      } else {
        if (current.type === "text" && current.name !== workInProgress.name) {
          workInProgress.effectTag = FiberEffectTag.Update;
        } else if (current.name !== workInProgress.name) {
          workInProgress.effectTag = FiberEffectTag.Placement;
          current.effectTag = FiberEffectTag.Deletion;
          workInProgress.effects.push(current);
        } else {
          workInProgress.effectTag = FiberEffectTag.Update;
        }
      }
    }
    return workInProgress.type === "element" ? reconcileChildren(workInProgress) : null;
  }

  function reconcileChildren(workInProgress: Fiber) {
    const current = workInProgress.alternate;
    let first: Fiber;
    let prevFiber: Fiber;
    let oldFiber: Fiber = current && current.child;
    const children = workInProgress.props.children;
    children.forEach(child => {
      const f = cloneFiber(oldFiber, child);
      f.return = workInProgress;
      if (!first) {
        first = prevFiber = f;
      } else {
        prevFiber.sibling = f;
        prevFiber = f;
      }
      if (oldFiber) oldFiber = oldFiber.sibling;
    });
    while (oldFiber) {
      oldFiber.effectTag = FiberEffectTag.Deletion;
      workInProgress.effects.push(oldFiber);
      oldFiber = oldFiber.sibling;
    }
    return (workInProgress.child = first);
  }

  function removeChilden(fiber: Fiber) {
    if (fiber.child) removeChilden(fiber.child);
    if (fiber.sibling) removeChilden(fiber.sibling);
    fiber.type === "element" &&
      fiber.props.attrs.onremove &&
      fiber.props.attrs.onremove(fiber.node);
  }

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

  function updateAttrs(el: Element, oldAttrs: Attrs, newAttrs: Attrs) {
    for (const k in { ...oldAttrs, ...newAttrs }) {
      oldAttrs[k] != null && newAttrs[k] == null && removeAttr(el, k);
      newAttrs[k] != null && setAttr(el, k, newAttrs[k]);
    }
  }

  function resolveComponent(fiber: Fiber) {
    if (fiber.type !== "component") return;
    const vnode = (fiber.name as Component)(fiber.props.attrs, fiber.props.children);
    Object.assign(fiber, vnode);
    fiber.type = vnode.type;
  }

  function commitAllBeforeMutationLifeCycles(effects: EffectList) {
    for (const fiber of effects) {
      if (fiber.effectTag === FiberEffectTag.Deletion) {
        removeChilden(fiber);
      }
    }
  }

  function commitAllHostEffects(effects: EffectList) {
    for (const fiber of effects) {
      switch (fiber.effectTag) {
        case FiberEffectTag.Placement: {
          let node: Node;
          if (fiber.type === "text") {
            node = document.createTextNode(fiber.name as string);
          } else {
            node = document.createElement(fiber.name as string);
            const { attrs, children } = fiber.props;
            updateAttrs(node as Element, {}, attrs);
          }
          const parent = fiber.return.node;
          if (fiber.alternate) {
            const oldNode = fiber.alternate.node;
            parent.insertBefore(node, oldNode);
          } else {
            parent.appendChild(node);
          }
          fiber.node = node;
          break;
        }
        case FiberEffectTag.Update: {
          const node = fiber.alternate.node as Node;
          if (fiber.type === "text") {
            node.nodeValue = fiber.name as string;
          } else {
            const { attrs, children } = fiber.props;
            updateAttrs(node as Element, fiber.alternate.props.attrs, attrs);
            fiber.node = node;
          }
          break;
        }
        case FiberEffectTag.Deletion: {
          const node = fiber.node as Node;
          const parent = node.parentElement;
          parent && parent.removeChild(node);
        }
      }
    }
  }

  function commitAllLifeCycles(effects: EffectList) {
    for (const fiber of effects) {
      if (fiber.type !== "element") return;
      switch (fiber.effectTag) {
        case FiberEffectTag.Placement: {
          fiber.props.attrs.oncreate && fiber.props.attrs.oncreate(fiber.node);
          break;
        }
        case FiberEffectTag.Update: {
          const current = fiber.alternate;
          current.props.attrs.onupdate && current.props.attrs.onupdate(fiber.node);
          break;
        }
      }
    }
  }

  let nextUnitOfWork = null;
  let effects: EffectList;
  let isRunning = false;
  let prevRoot: Fiber = null;
  let nextRoot: Fiber = null;

  function renderRoot() {
    if (isRunning) return;
    isRunning = true;
    window.requestIdleCallback(workLoop);
  }

  function workLoop(deadline) {
    if (!nextUnitOfWork) {
      if (prevRoot && nextRoot) wireRootFiber(prevRoot, nextRoot);
      nextUnitOfWork = prevRoot = nextRoot;
      nextRoot = null;
    }

    while (nextUnitOfWork !== null && deadline.timeRemaining() > 5) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }

    if (nextUnitOfWork) {
      window.requestIdleCallback(workLoop);
    } else {
      commitAll();
      if (nextRoot) {
        window.requestIdleCallback(workLoop);
      } else {
        isRunning = false;
      }
    }
  }

  function performUnitOfWork(workInProgress: Fiber): Fiber | null {
    let next = beginWork(workInProgress);
    if (next == null) {
      next = completeUnitOfWork(workInProgress);
    }
    return next;
  }

  function beginWork(workInProgress: Fiber): Fiber | null {
    if (workInProgress.type === "root") {
      return workInProgress.child;
    }
    resolveComponent(workInProgress);
    return patch(workInProgress);
  }

  function completeUnitOfWork(workInProgress: Fiber): Fiber | null {
    while (true) {
      completeWork(workInProgress);
      if (workInProgress.sibling != null) return workInProgress.sibling;
      if (workInProgress.return != null) {
        workInProgress = workInProgress.return;
        continue;
      }
      return null;
    }
  }

  function completeWork(workInProgress: Fiber) {
    if (workInProgress.return) {
      workInProgress.effectTag && workInProgress.return.effects.push(workInProgress);
      workInProgress.return.effects.concat(workInProgress.effects);
    } else {
      effects = workInProgress.effects;
    }
  }

  function commitAll() {
    commitAllBeforeMutationLifeCycles(effects);
    commitAllHostEffects(effects);
    commitAllLifeCycles(effects);
    effects = null;
  }

  return function render(vnode: VNode) {
    nextRoot = createRootFiber(vnode, container);
    renderRoot();
  };
}
