import { TemplateSet } from "../../src/qweb_compiler";
import { makeTestFixture, renderToBdom, renderToString, snapshotTemplateCode } from "../helpers";

// -----------------------------------------------------------------------------
// t-on
// -----------------------------------------------------------------------------

describe("t-on", () => {
  function mountToFixture(template: string, ctx: any): HTMLDivElement {
    const block = renderToBdom(template, ctx);
    const fixture = makeTestFixture();
    block.mount(fixture);
    return fixture;
  }

  test("can bind event handler", () => {
    const template = `<button t-on-click="add">Click</button>`;
    snapshotTemplateCode(template);
    let a = 1;
    const fixture = mountToFixture(template, { add: () => (a = 3) });
    expect(a).toBe(1);
    fixture.querySelector("button")!.click();
    expect(a).toBe(3);
  });

  test("can bind two event handlers", () => {
    const template = `
        <button t-on-click="handleClick" t-on-dblclick="handleDblClick">Click</button>`;
    snapshotTemplateCode(template);
    let steps: string[] = [];
    const fixture = mountToFixture(template, {
      handleClick() {
        steps.push("click");
      },
      handleDblClick() {
        steps.push("dblclick");
      },
    });
    expect(steps).toEqual([]);
    fixture.querySelector("button")!.click();
    expect(steps).toEqual(["click"]);
    fixture.querySelector("button")!.dispatchEvent(new Event("dblclick"));
    expect(steps).toEqual(["click", "dblclick"]);
  });

  test("can bind handlers with arguments", () => {
    const template = `<button t-on-click="add(5)">Click</button>`;
    snapshotTemplateCode(template);
    let a = 1;
    const fixture = mountToFixture(template, { add: (n: number) => (a = a + n) });
    expect(a).toBe(1);
    fixture.querySelector("button")!.click();
    expect(a).toBe(6);
  });

  test("can bind handlers with object arguments", () => {
    const template = `<button t-on-click="add({val: 5})">Click</button>`;
    snapshotTemplateCode(template);
    let a = 1;
    const fixture = mountToFixture(template, { add: ({ val }: any) => (a = a + val) });
    expect(a).toBe(1);
    fixture.querySelector("button")!.click();
    expect(a).toBe(6);
  });

  test("can bind handlers with empty  object", () => {
    expect.assertions(2);
    const template = `<button t-on-click="doSomething({})">Click</button>`;
    snapshotTemplateCode(template);
    const fixture = mountToFixture(template, {
      doSomething(arg: any) {
        expect(arg).toEqual({});
      },
    });
    fixture.querySelector("button")!.click();
  });

  test("can bind handlers with empty object (with non empty inner string)", () => {
    expect.assertions(2);
    const template = `<button t-on-click="doSomething({ })">Click</button>`;
    snapshotTemplateCode(template);
    const fixture = mountToFixture(template, {
      doSomething(arg: any) {
        expect(arg).toEqual({});
      },
    });
    fixture.querySelector("button")!.click();
  });

  test("can bind handlers with empty object (with non empty inner string)", () => {
    expect.assertions(2);
    const template = `
        <ul>
          <li t-foreach="['someval']" t-as="action" t-key="action_index">
            <a t-on-click="activate(action)">link</a>
          </li>
        </ul>`;
    snapshotTemplateCode(template);
    const fixture = mountToFixture(template, {
      activate(action: string) {
        expect(action).toBe("someval");
      },
    });
    fixture.querySelector("a")!.click();
  });

  test("handler is bound to proper owner", () => {
    expect.assertions(2);
    const template = `<button t-on-click="add">Click</button>`;
    snapshotTemplateCode(template);
    let owner = {
      add() {
        expect(this).toBe(owner);
      },
    };
    const fixture = mountToFixture(template, owner);
    fixture.querySelector("button")!.click();
  });

  test("handler is bound to proper owner, part 2", () => {
    expect.assertions(2);
    const template = `
        <t t-foreach="[1]" t-as="value">
          <button t-on-click="add">Click</button>
        </t>`;
    snapshotTemplateCode(template);
    let owner = {
      add() {
        expect(this).toBe(owner);
      },
    };
    const fixture = mountToFixture(template, owner);
    fixture.querySelector("button")!.click();
  });

  test("handler is bound to proper owner, part 3", () => {
    expect.assertions(3);
    const templateSet = new TemplateSet();
    const sub = `<button t-on-click="add">Click</button>`;
    const main = `<t t-call="sub"/>`;
    templateSet.add("sub", sub);
    templateSet.add("main", main);

    snapshotTemplateCode(sub);
    snapshotTemplateCode(main);
    let owner = {
      add() {
        expect(this).toBe(owner);
      },
    };
    const fixture = makeTestFixture();
    const render = templateSet.getFunction("main");
    const bdom = render(owner);
    bdom.mount(fixture);
    fixture.querySelector("button")!.click();
  });

  test("handler is bound to proper owner, part 4", () => {
    expect.assertions(3);
    const templateSet = new TemplateSet();
    const sub = `<button t-on-click="add">Click</button>`;
    const main = `
        <t t-foreach="[1]" t-as="value">
          <t t-call="sub"/>
        </t>`;
    templateSet.add("sub", sub);
    templateSet.add("main", main);

    snapshotTemplateCode(sub);
    snapshotTemplateCode(main);
    let owner = {
      add() {
        expect(this).toBe(owner);
      },
    };
    const fixture = makeTestFixture();
    const render = templateSet.getFunction("main");
    const bdom = render(owner);
    bdom.mount(fixture);
    fixture.querySelector("button")!.click();
  });

  test("t-on with inline statement", () => {
    const template = `<button t-on-click="state.counter++">Click</button>`;
    snapshotTemplateCode(template);
    let owner = { state: { counter: 0 } };
    const fixture = mountToFixture(template, owner);
    expect(owner.state.counter).toBe(0);
    fixture.querySelector("button")!.click();
    expect(owner.state.counter).toBe(1);
  });

  test("t-on with inline statement (function call)", () => {
    const template = `<button t-on-click="state.incrementCounter(2)">Click</button>`;
    snapshotTemplateCode(template);
    let owner = {
      state: {
        counter: 0,
        incrementCounter: (inc: number) => {
          owner.state.counter += inc;
        },
      },
    };
    const fixture = mountToFixture(template, owner);
    expect(owner.state.counter).toBe(0);
    fixture.querySelector("button")!.click();
    expect(owner.state.counter).toBe(2);
  });

  test("t-on with inline statement, part 2", () => {
    const template = `<button t-on-click="state.flag = !state.flag">Toggle</button>`;
    snapshotTemplateCode(template);
    let owner = {
      state: {
        flag: true,
      },
    };
    const fixture = mountToFixture(template, owner);
    expect(owner.state.flag).toBe(true);
    fixture.querySelector("button")!.click();
    expect(owner.state.flag).toBe(false);
    fixture.querySelector("button")!.click();
    expect(owner.state.flag).toBe(true);
  });

  test("t-on with inline statement, part 3", () => {
    const template = `<button t-on-click="state.n = someFunction(3)">Toggle</button>`;
    snapshotTemplateCode(template);
    let owner = {
      someFunction(n: number) {
        return n + 1;
      },
      state: {
        n: 11,
      },
    };

    const fixture = mountToFixture(template, owner);
    expect(owner.state.n).toBe(11);
    fixture.querySelector("button")!.click();
    expect(owner.state.n).toBe(4);
  });

  test("t-on with t-call", async () => {
    expect.assertions(3);
    const templateSet = new TemplateSet();
    const sub = `<p t-on-click="update">lucas</p>`;
    const main = `<div><t t-call="sub"/></div>`;
    templateSet.add("sub", sub);
    templateSet.add("main", main);
    snapshotTemplateCode(sub);
    snapshotTemplateCode(main);

    let owner = {
      update() {
        expect(this).toBe(owner);
      },
    };

    const fixture = makeTestFixture();
    const render = templateSet.getFunction("main");
    const bdom = render(owner);
    bdom.mount(fixture);
    fixture.querySelector("p")!.click();
  });

  test("t-on, with arguments and t-call", async () => {
    expect.assertions(4);
    const templateSet = new TemplateSet();
    const sub = `<p t-on-click="update(value)">lucas</p>`;
    const main = `<div><t t-call="sub"/></div>`;
    templateSet.add("sub", sub);
    templateSet.add("main", main);
    snapshotTemplateCode(sub);
    snapshotTemplateCode(main);

    let owner = {
      update(val: number) {
        expect(this).toBe(owner);
        expect(val).toBe(444);
      },
      value: 444,
    };

    const fixture = makeTestFixture();
    const render = templateSet.getFunction("main");
    const bdom = render(owner);
    bdom.mount(fixture);
    fixture.querySelector("p")!.click();
  });

  test("nice error when t-on is evaluated with a missing event", () => {
    const template = `<div t-on="somemethod"></div>`;
    expect(() => renderToString(template, { someMethod() {} })).toThrow(
      "Missing event name with t-on directive"
    );
  });
});
