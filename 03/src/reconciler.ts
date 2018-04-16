import { VNode, Component, VNodeType } from "./h";

export function createRenderer(container: Element) {}

let nextUnitOfWork = null;
let effects: Fiber[];

enum FiberEffectTag {
  NoWork = 0,
  Placement = 1,
  Update = 2,
  Deletion = 4,
}

type FiberTag = VNodeType | "root";

interface Fiber {
  tag: FiberTag;
  vnode: VNode;
  node?: Node;
  return?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  alternate?: Fiber;
  effectTag: FiberEffectTag;
  effects: Fiber[];
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
    effects: [],
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
    effects: [],
  };
  current.alternate = fiber;
  return fiber;
}

function updateNode(workInProgress: Fiber) {
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
  return workInProgress.tag === "element" ? patch(workInProgress) : null;
}

function beginWork(workInProgress: Fiber): Fiber | null {
  if (workInProgress.tag === "root") {
    return workInProgress.child;
  }
  resolveComponent(workInProgress);
  return updateNode(workInProgress);
}

function completeWork(fiber: Fiber) {
  if (fiber.return) {
    const childEffects = fiber.effects;
    const thisEffects = fiber.effectTag ? [fiber] : [];
    fiber.return.effects = [
      ...fiber.return.effects,
      ...thisEffects,
      ...childEffects,
    ];
  } else {
    effects = fiber.effects;
  }
}

function completeUnitOfWork(fiber: Fiber): Fiber | null {
  while (true) {
    completeWork(fiber);
    if (fiber.sibling != null) return fiber.sibling;
    if (fiber.return != null) {
      fiber = fiber.return;
      continue;
    }
    return null;
  }
}

function performUnitOfWork(fiber: Fiber): Fiber | null {
  let next = beginWork(fiber);
  if (next == null) {
    next = completeUnitOfWork(fiber);
  }
  return next;
}

function setAttr(el: Element, k: string, attr: any) {
  if (/^on/.test(k) || k === "checked" || k === "value") {
    el[k] = attr;
  } else {
    el.setAttribute(k, attr);
  }
}

function commitAll() {
  const _effects = effects;
  effects = null;
  _effects.forEach(e => {
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
  });
}

let isRunning = false;
function workLoop() {
  if (isRunning) return;
  isRunning = true;
  const cb = deadline => {
    if (!nextUnitOfWork) {
      if (prevRoot && nextRoot) {
        nextRoot.alternate = prevRoot;
        nextRoot.node = prevRoot.node;
        nextRoot.child.alternate = prevRoot.child;
        nextRoot.child.node = prevRoot.child.node;
      }
      nextUnitOfWork = prevRoot = nextRoot;
      nextRoot = null;
    }

    while (nextUnitOfWork !== null && deadline.timeRemaining() > 0) {
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
  // cb(null);
  window.requestIdleCallback(cb);
}

function resolveComponent(fiber: Fiber) {
  const vnode = fiber.vnode;
  if (!vnode || vnode.type !== "component") return;
  const _vnode = (vnode.name as Component)(vnode.props);
  Object.assign(vnode, _vnode);
  fiber.tag = vnode.type;
}

function patch(workInProgress: Fiber) {
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

let prevRoot: Fiber = null;
let nextRoot: Fiber = null;

function createRootFiber(vnode: VNode, container: Element) {
  const rootFiber = createFiber(null);
  rootFiber.child = createFiber(vnode);
  rootFiber.child.return = rootFiber;
  rootFiber.node = container;
  return rootFiber;
}

export function render(vnode: VNode, container: Element) {
  nextRoot = createRootFiber(vnode, container);
  workLoop();
}
