// import type { App } from "./app";
import { Block } from "./bdom";
import { mountBlock } from "./bdom/block";
import type { Component, ComponentClosure } from "./index";
import { toClassObj } from "./template_utils";

// -----------------------------------------------------------------------------
//  Component Block
// -----------------------------------------------------------------------------

let currentNode: BNode | null = null;

export function getCurrent(): BNode | null {
  return currentNode;
}

type LifecycleHook = Function;

export class BNode implements Block<BNode> {
  el: ChildNode | null = null;
  parentClass?: any = null;
  currentClass?: any = null;
  classTarget?: HTMLElement;
  handlers: any = null;
  renderComponent: ComponentClosure;
  bdom: Block | null = null;
  nextBdom: Block | null = null;
  dirty: boolean = false;

  children: { [key: string]: BNode } = Object.create(null);
  slots: any = {};
  refs: any = {};
  props: any = {};

  willUnmount: LifecycleHook[] = [];
  mounted: LifecycleHook[] = [];
  willPatch: LifecycleHook[] = [];
  patched: LifecycleHook[] = [];
  destroyed: LifecycleHook[] = [];

  constructor(C: Component, props: any) {
    currentNode = this;
    this.renderComponent = C(this);
  }

  mountComponent(target: any) {
    this.bdom = this.renderComponent();
    mountBlock(this.bdom, target);
  }

  // async initiateRender(fiber: Fiber | MountFiber) {
  //   if (this.mounted.length) {
  //     fiber.root.mounted.push(fiber);
  //   }
  //   const component = this.component;
  //   const prom = Promise.all(this.willStart.map((f) => f.call(component)));
  //   await prom;
  //   if (this.status === STATUS.NEW && this.fiber === fiber) {
  //     this._render(fiber);
  //   }
  // }

  async render() {
    this.dirty = true;
    await Promise.resolve();
    if (this.dirty) {
      this.dirty = false;
      let newblock = this.renderComponent();
      this.bdom!.patch(newblock);
    }
    //   if (this.fiber && !this.fiber.bdom) {
    //     return this.fiber.root.promise;
    //   }
    //   if (!this.bdom && !this.fiber) {
    //     // should find a way to return the future mounting promise
    //     return;
    //   }

    //   const fiber = makeRootFiber(this);
    //   this.app.scheduler.addFiber(fiber);
    //   await Promise.resolve();
    //   if (this.fiber === fiber) {
    //     this._render(fiber);
    //   }
    //   return fiber.root.promise;
  }

  // _render(fiber: Fiber | RootFiber) {
  //   try {
  //     fiber.bdom = this.renderFn();
  //   } catch (e) {
  //     fiber.root.error = e;
  //     this.handleError(fiber);
  //   }
  //   fiber.root.counter--;
  // }

  // handleError(fiber: Fiber) {
  //   fiber.node.app.destroy();
  // }

  // destroy() {
  //   if (this.status === STATUS.MOUNTED) {
  //     callWillUnmount(this);
  //     this.bdom!.remove();
  //   }
  //   callDestroyed(this);

  //   function callWillUnmount(node: BNode) {
  //     const component = node.component;
  //     for (let cb of node.willUnmount) {
  //       cb.call(component);
  //     }
  //     for (let child of Object.values(node.children)) {
  //       if (child.status === STATUS.MOUNTED) {
  //         callWillUnmount(child);
  //       }
  //     }
  //   }

  //   function callDestroyed(node: BNode) {
  //     const component = node.component;
  //     node.status = STATUS.DESTROYED;
  //     for (let child of Object.values(node.children)) {
  //       callDestroyed(child);
  //     }
  //     for (let cb of node.destroyed) {
  //       cb.call(component);
  //     }
  //   }
  // }

  /**
   *
   * @param name
   * @param props
   * @param key
   * @param owner the component in which the component was defined
   * @param parent the actual parent (may be different in case of slots)
   */
  getChild(name: string, props: any, key: string, owner: any) {
    let node: any = this.children[key];

    if (node) {
      if (node.shouldUpdate) {
        if (node.shouldUpdate(node.props, props)) {
          node.props = props;
          node.nextBdom = node.renderComponent(props);
        }
      } else {
        node.nextBdom = node.renderComponent(props);
        node.props = props;
      }
      //     node.updateAndRender(props, parentFiber);
    } else {
      //     // new component
      const C = owner[name as any];
      node = new BNode(C, props);
      this.children[key] = node;
      node.bdom = node.renderComponent(props);
      node.props = props;

      //     const fiber = makeChildFiber(node, parentFiber);
      //     node.initiateRender(fiber);
    }
    return node;
  }

  // async updateAndRender(props: any, parentFiber: Fiber) {
  //   // update
  //   const fiber = makeChildFiber(this, parentFiber);
  //   if (this.willPatch.length) {
  //     parentFiber.root.willPatch.push(fiber);
  //   }
  //   if (this.patched.length) {
  //     parentFiber.root.patched.push(fiber);
  //   }
  //   const component = this.component;
  //   const prom = Promise.all(this.willUpdateProps.map((f) => f.call(component, props)));
  //   await prom;
  //   if (fiber !== this.fiber) {
  //     return;
  //   }
  //   this.component.props = props;
  //   this._render(fiber);
  // }

  // ---------------------------------------------------------------------------
  // Block DOM methods
  // ---------------------------------------------------------------------------

  firstChildNode(): ChildNode | null {
    const bdom = this.bdom;
    return bdom ? bdom.firstChildNode() : null;
  }

  mountBefore(anchor: ChildNode) {
    const bdom = this.bdom!;
    //   this.bdom = bdom;
    bdom.mountBefore(anchor);
    if (this.parentClass) {
      const el = this.firstChildNode();
      if (el instanceof HTMLElement) {
        this.addClass(el);
      }
      this.currentClass = this.parentClass;
    }
    if (this.handlers) {
      for (let i = 0; i < this.handlers.length; i++) {
        const handler = this.handlers[i];
        const eventType = handler[0];
        const el = bdom.el!;
        el.addEventListener(eventType, (ev: Event) => {
          const info = this.handlers![i];
          const [, ctx, method] = info;
          (ctx.__owl__.component as any)[method](ev);
        });
      }
    }
  }

  moveBefore(anchor: ChildNode) {
    this.bdom!.moveBefore(anchor);
  }

  addClass(el: HTMLElement) {
    this.classTarget = el;
    for (let cl in toClassObj(this.parentClass)) {
      el.classList.add(cl);
    }
  }

  removeClass(el: HTMLElement) {
    for (let cl in toClassObj(this.parentClass)) {
      el.classList.remove(cl);
    }
  }

  patch() {
    if (this.nextBdom) {
      this.bdom!.patch(this.nextBdom);
    }
    //   this.bdom!.patch(this!.fiber!.bdom!);
    //   if (this.parentClass) {
    //     const el = this.firstChildNode() as HTMLElement;
    //     if (el === this.classTarget) {
    //       const prev = toClassObj(this.currentClass);
    //       const next = toClassObj(this.parentClass);
    //       for (let c in prev) {
    //         if (!(c in next)) {
    //           el.classList.remove(c);
    //         }
    //       }
    //       // add classes
    //       for (let c in next) {
    //         if (!(c in prev)) {
    //           el.classList.add(c);
    //         }
    //       }
    //       this.currentClass = next;
    //     } else {
    //       if (el && this.classTarget) {
    //         this.removeClass(this.classTarget);
    //         this.addClass(el as any);
    //       } else if (el) {
    //         this.addClass(el as any);
    //       } else {
    //         this.removeClass(this.classTarget!);
    //         this.classTarget = undefined;
    //       }
    //     }
    //   }
    //   this.fiber!.appliedToDom = true;
    //   this.fiber = null;
  }

  beforeRemove() {
    // visitRemovedNodes(this);
  }

  remove() {
    const bdom = this.bdom!;
    bdom.remove();
  }
}

// function visitRemovedNodes(node: BNode) {
//   if (node.status === STATUS.MOUNTED) {
//     const component = node.component;
//     for (let cb of node.willUnmount) {
//       cb.call(component);
//     }
//   }
//   for (let child of Object.values(node.children)) {
//     visitRemovedNodes(child);
//   }
//   node.status = STATUS.DESTROYED;
//   if (node.destroyed.length) {
//     __internal__destroyed.push(node);
//   }
// }
