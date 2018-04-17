import { VNode, Component, VNodeType } from "./h";
import { LinkedList } from "./linkedlist";

enum FiberEffectTag {
  NoWork = 0,
  Placement = 1,
  Update = 2,
  Deletion = 4,
}

type FiberTag = VNodeType | "root";
type EffectList = LinkedList<Fiber>;

interface Fiber {
  tag: FiberTag;
  vnode: VNode;
  node?: Node;
  return?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  alternate?: Fiber;
  effectTag: FiberEffectTag;
  effects: EffectList;
}

function createFiber(vnode: VNode): Fiber {
  return {
    vnode,
    tag: vnode ? vnode.type : "root",
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
    vnode,
    tag: vnode ? vnode.type : ("root" as FiberTag),
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

function reconcileNode(workInProgress: Fiber) {
  const current = workInProgress.alternate;
  if (!current) {
    workInProgress.effectTag = FiberEffectTag.Placement;
  } else {
    if (current.tag !== workInProgress.tag) {
      workInProgress.effectTag = FiberEffectTag.Placement;
    } else {
      if (
        current.tag === "text" &&
        current.vnode.name !== workInProgress.vnode.name
      ) {
        workInProgress.effectTag = FiberEffectTag.Update;
      } else if (current.vnode.name !== workInProgress.vnode.name) {
        workInProgress.effectTag = FiberEffectTag.Placement;
      } else {
        workInProgress.effectTag = FiberEffectTag.Update;
      }
    }
  }
  return workInProgress.tag === "element"
    ? reconcileChildren(workInProgress)
    : null;
}

function reconcileChildren(workInProgress: Fiber) {
  const current = workInProgress.alternate;
  let first: Fiber;
  let prevFiber: Fiber;
  let oldFiber: Fiber = current && current.child;
  const children = workInProgress.vnode.props.children;
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

function removeChilden(e: Fiber) {
  if (e.child) removeChilden(e.child);
  if (e.sibling) removeChilden(e.sibling);
  e.tag === "element" &&
    e.vnode.props.attrs.onremove &&
    e.vnode.props.attrs.onremove(e.node);
}

function setAttr(el: Element, k: string, attr: any) {
  if (/^on/.test(k) || k === "checked" || k === "value") {
    el[k] = attr;
  } else {
    el.setAttribute(k, attr);
  }
}

function resolveComponent(fiber: Fiber) {
  const vnode = fiber.vnode;
  if (!vnode || vnode.type !== "component") return;
  const _vnode = (vnode.name as Component)(vnode.props);
  Object.assign(vnode, _vnode);
  fiber.tag = vnode.type;
}

function commitAllBeforeMutationLifeCycles(effects: EffectList) {
  for (const e of effects) {
    if (e.effectTag === FiberEffectTag.Deletion) {
      removeChilden(e);
    }
  }
}

function commitAllHostEffects(effects: EffectList) {
  for (const e of effects) {
    switch (e.effectTag) {
      case FiberEffectTag.Placement: {
        let node: Node;
        if (e.tag === "text") {
          node = document.createTextNode(e.vnode.name as string);
        } else {
          node = document.createElement(e.vnode.name as string);
          const { attrs, children } = e.vnode.props;
          for (const k in attrs) {
            setAttr(node as Element, k, attrs[k]);
          }
        }
        const parent = e.return.node;
        if (e.alternate) {
          const oldNode = e.alternate.node;
          parent.insertBefore(node, oldNode);
          parent.removeChild(oldNode);
        } else {
          parent.appendChild(node);
        }
        e.node = node;
        break;
      }
      case FiberEffectTag.Update: {
        const node = e.alternate.node as Node;
        if (e.tag === "text") {
          node.nodeValue = e.vnode.name as string;
        } else {
          const { attrs, children } = e.vnode.props;
          for (const k in attrs) {
            setAttr(node as Element, k, attrs[k]);
          }
          e.node = node;
        }
        break;
      }
      case FiberEffectTag.Deletion: {
        const node = e.node as Node;
        const parent = node.parentElement;
        parent && parent.removeChild(node);
      }
    }
  }
}

function commitAllLifeCycles(effects: EffectList) {
  for (const e of effects) {
    if (e.tag !== "element") return;
    switch (e.effectTag) {
      case FiberEffectTag.Placement: {
        e.vnode.props.attrs.oncreate && e.vnode.props.attrs.oncreate(e.node);
      }
      case FiberEffectTag.Update: {
        e.vnode.props.attrs.onupdate && e.vnode.props.attrs.onupdate(e.node);
      }
    }
  }
}

export function createRenderer(container: Element) {
  let nextUnitOfWork = null;
  let effects: EffectList;
  let isRunning = false;
  let prevRoot: Fiber = null;
  let nextRoot: Fiber = null;

  function workLoop() {
    if (isRunning) return;
    isRunning = true;
    const cb = deadline => {
      if (!nextUnitOfWork) {
        if (prevRoot && nextRoot) {
          nextRoot.alternate = prevRoot;
          prevRoot.alternate = nextRoot;
          nextRoot.node = prevRoot.node;
          nextRoot.child.alternate = prevRoot.child;
          prevRoot.child.alternate = nextRoot.child;
          nextRoot.child.node = prevRoot.child.node;
        }
        nextUnitOfWork = prevRoot = nextRoot;
        nextRoot = null;
      }

      while (nextUnitOfWork !== null && deadline.timeRemaining() > 5) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
      }

      if (nextUnitOfWork) {
        window.requestIdleCallback(cb);
      } else {
        commitAll();
        if (nextRoot) {
          window.requestIdleCallback(cb);
        } else {
          isRunning = false;
        }
      }
    };
    window.requestIdleCallback(cb);
  }

  function performUnitOfWork(workInProgress: Fiber): Fiber | null {
    let next = beginWork(workInProgress);
    if (next == null) {
      next = completeUnitOfWork(workInProgress);
    }
    return next;
  }

  function beginWork(workInProgress: Fiber): Fiber | null {
    if (workInProgress.tag === "root") {
      return workInProgress.child;
    }
    resolveComponent(workInProgress);
    return reconcileNode(workInProgress);
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
      workInProgress.effectTag &&
        workInProgress.return.effects.push(workInProgress);
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
    workLoop();
  };
}
