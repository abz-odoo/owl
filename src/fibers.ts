import type { Block } from "./bdom";
import { STATUS } from "./status";
import { OwlNode } from "./owl_node";

export function makeChildFiber(node: OwlNode, parent: Fiber): Fiber {
  let current = node.fiber;
  if (current) {
    // current is necessarily a rootfiber here
    let root = parent.root;
    cancelFibers(root, current.children);
    current.children = [];
    current.parent = parent;
    root.counter++;
    current.root = root;
    return current;
  }
  return new Fiber(node, parent);
}

export function makeRootFiber(node: OwlNode): Fiber {
  let current = node.fiber;
  if (current) {
    let root = current.root;
    root.counter -= cancelFibers(root, current.children);
    current.children = [];
    root.counter++;
    current.bdom = null;
    return current;
  }
  const fiber = new RootFiber(node);
  if (node.willPatch.length) {
    fiber.willPatch.push(fiber);
  }
  if (node.patched.length) {
    fiber.patched.push(fiber);
  }

  return fiber;
}

/**
 * @returns number of not-yet rendered fibers cancelled
 */
function cancelFibers(root: any, fibers: Fiber[]): number {
  let result = 0;
  for (let fiber of fibers) {
    fiber.node.fiber = null;
    fiber.root = root;
    if (!fiber.bdom) {
      result++;
    }
    result += cancelFibers(root, fiber.children);
  }
  return result;
}

export class Fiber {
  node: OwlNode;
  bdom: Block | null = null;
  root: RootFiber;
  parent: Fiber | null;
  children: Fiber[] = [];
  appliedToDom = false;

  constructor(node: OwlNode, parent: Fiber | null) {
    this.node = node;
    node.fiber = this;
    this.parent = parent;
    if (parent) {
      const root = parent.root;
      root.counter++;
      this.root = root;
      parent.children.push(this);
    } else {
      this.root = this as any;
    }
  }
}

export class RootFiber extends Fiber {
  counter: number = 1;
  error: Error | null = null;
  resolve: any;
  promise: Promise<any>;
  reject: any;

  // only add stuff in this if they have registered some hooks
  willPatch: Fiber[] = [];
  patched: Fiber[] = [];
  mounted: Fiber[] = [];

  constructor(node: OwlNode) {
    super(node, null);
    this.counter = 1;

    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  complete() {
    const node = this.node;
    this.patchDom(() => node.bdom!.patch(this.bdom!));
  }

  patchDom(callback: Function) {
    for (let fiber of this.willPatch) {
      // because of the asynchronous nature of the rendering, some parts of the
      // UI may have been rendered, then deleted in a followup rendering, and we
      // do not want to call onWillPatch in that case.
      let node = fiber.node;
      if (node.fiber === fiber) {
        node.callWillPatch();
      }
    }

    callback();
    this.appliedToDom = true;
    let current;
    let mountedFibers = this.mounted;
    while ((current = mountedFibers.pop())) {
      if (current.appliedToDom) {
        for (let cb of current.node.mounted) {
          cb();
        }
      }
    }

    let patchedFibers = this.patched;
    while ((current = patchedFibers.pop())) {
      if (current.appliedToDom) {
        for (let cb of current.node.patched) {
          cb();
        }
      }
    }
    for (let node of __internal__destroyed) {
      for (let cb of node.destroyed) {
        cb();
      }
    }
    __internal__destroyed.length = 0;
    this.node.fiber = null;
  }
}

export let __internal__destroyed: OwlNode[] = [];

export class MountFiber extends RootFiber {
  target: HTMLElement;

  constructor(node: OwlNode, target: HTMLElement) {
    super(node);
    this.target = target;
    if (node.mounted.length) {
      this.mounted.push(this);
    }
  }
  complete() {
    const node = this.node;
    node.bdom = this.bdom;
    this.patchDom(() => node.bdom!.mount(this.target));
    node.status = STATUS.MOUNTED;
  }
}
