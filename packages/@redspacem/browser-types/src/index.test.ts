import { describe, expect, test } from "bun:test";
import { createBrowserBridge } from "./index.ts";

/** A fake transport capturing posted messages and dispatching incoming ones. */
function makeFakeTransport() {
  const listeners = new Set<(message: unknown) => void>();
  const posted: unknown[] = [];
  let subscribeCalls = 0;
  return {
    postMessage(message: unknown): void {
      posted.push(message);
    },
    subscribe(onMessage: (message: unknown) => void): () => void {
      subscribeCalls += 1;
      listeners.add(onMessage);
      return () => listeners.delete(onMessage);
    },
    dispatch(message: unknown): void {
      for (const listener of listeners) listener(message);
    },
    posted,
    get subscribeCalls(): number {
      return subscribeCalls;
    },
  };
}

describe("createBrowserBridge", () => {
  test("emit posts an event envelope", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });

    bridge.emit("setSpeed", { kmh: 90 });
    expect(transport.posted).toEqual([{ event: "setSpeed", payload: { kmh: 90 } }]);
  });

  test("on dispatches matching incoming envelopes", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });
    const calls: unknown[] = [];
    bridge.on("speedChanged", (payload) => calls.push(payload));

    transport.dispatch({ event: "speedChanged", payload: { kmh: 90 } });
    expect(calls).toEqual([{ kmh: 90 }]);
  });

  test("off stops dispatching", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge<
      { speedChanged: { kmh: number } },
      { setSpeed: { kmh: number } }
    >({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });
    const calls: unknown[] = [];
    const handler = (payload: { kmh: number }): void => {
      calls.push(payload);
    };
    bridge.on("speedChanged", handler);
    bridge.off("speedChanged", handler);

    transport.dispatch({ event: "speedChanged", payload: { kmh: 100 } });
    expect(calls).toEqual([]);
  });

  test("ignores malformed messages", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });
    const calls: unknown[] = [];
    bridge.on("speedChanged", (payload) => calls.push(payload));

    transport.dispatch(null);
    transport.dispatch({ noEvent: true });
    transport.dispatch({ event: 42, payload: null });
    expect(calls).toEqual([]);
  });

  test("subscribes once on creation", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });
    bridge.on("speedChanged", () => {});
    expect(transport.subscribeCalls).toBe(1);
  });

  test("dispatches to multiple handlers", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });
    const first: unknown[] = [];
    const second: unknown[] = [];
    bridge.on("speedChanged", (payload) => first.push(payload));
    bridge.on("speedChanged", (payload) => second.push(payload));

    transport.dispatch({ event: "speedChanged", payload: { kmh: 90 } });
    expect(first).toEqual([{ kmh: 90 }]);
    expect(second).toEqual([{ kmh: 90 }]);
  });

  test("adding the same handler twice dispatches it once", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });
    const calls: unknown[] = [];
    const handler = (payload: unknown): void => {
      calls.push(payload);
    };
    bridge.on("speedChanged", handler);
    bridge.on("speedChanged", handler);

    transport.dispatch({ event: "speedChanged", payload: { kmh: 90 } });
    expect(calls).toEqual([{ kmh: 90 }]);
  });

  test("off for an unregistered event is a no-op", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({
      postMessage: transport.postMessage,
      subscribe: transport.subscribe,
    });

    expect(() => bridge.off("speedChanged", () => {})).not.toThrow();
  });

  test("emit works without a subscribe transport", () => {
    const transport = makeFakeTransport();
    const bridge = createBrowserBridge({ postMessage: transport.postMessage });

    bridge.emit("setSpeed", { kmh: 90 });
    expect(transport.posted).toEqual([{ event: "setSpeed", payload: { kmh: 90 } }]);
  });
});
