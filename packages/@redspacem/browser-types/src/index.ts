// CEF/NUI-style browser bridge: a typed message channel between an in-game
// browser surface (CEF/NUI) and the game client, plus a factory to create one.

/** Base constraint for event maps: event name -> payload type. */
export type BrowserEventMap = Record<string, unknown>;

/** Options for creating a browser bridge. */
export interface BrowserBridgeOptions {
  /** Deliver a message to the browser surface (e.g. postMessage into CEF). */
  postMessage(message: unknown): void;
  /** Subscribe to incoming messages from the browser. Returns an unsubscribe function. */
  subscribe?(onMessage: (message: unknown) => void): () => void;
}

/** Typed bridge between a script and a browser surface. */
export interface BrowserBridge<TIn extends BrowserEventMap, TOut extends BrowserEventMap> {
  on<K extends keyof TIn & string>(event: K, handler: (payload: TIn[K]) => void): void;
  off<K extends keyof TIn & string>(event: K, handler: (payload: TIn[K]) => void): void;
  emit<K extends keyof TOut & string>(event: K, payload: TOut[K]): void;
}

interface Envelope {
  event: string;
  payload: unknown;
}

/**
 * Create a browser bridge. Incoming messages must be
 * `{ event: string, payload: unknown }` envelopes.
 */
export function createBrowserBridge<TIn extends BrowserEventMap, TOut extends BrowserEventMap>(
  options: BrowserBridgeOptions,
): BrowserBridge<TIn, TOut> {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  const handleMessage = (message: unknown): void => {
    if (typeof message !== "object" || message === null) {
      return;
    }
    const envelope = message as Partial<Envelope>;
    if (typeof envelope.event !== "string") {
      return;
    }
    const handlers = listeners.get(envelope.event);
    if (handlers === undefined) {
      return;
    }
    for (const handler of handlers) {
      handler(envelope.payload);
    }
  };

  options.subscribe?.(handleMessage);

  return {
    on(event, handler) {
      let handlers = listeners.get(event);
      if (handlers === undefined) {
        handlers = new Set();
        listeners.set(event, handlers);
      }
      handlers.add(handler as (payload: unknown) => void);
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler as (payload: unknown) => void);
    },
    emit(event, payload) {
      options.postMessage({ event, payload } satisfies Envelope);
    },
  };
}
