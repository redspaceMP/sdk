// Dependency-free, type-safe RPC layer for resource <-> host communication
// (mirrors CyberpunkMP's automatic RPC system).

/** A request sent from a client to a server. */
// biome-ignore lint/correctness/noUnusedVariables: Res documents the expected response payload type.
export type RpcRequest<Req = unknown, Res = unknown> = {
  id: number;
  method: string;
  req: Req;
};

/** A response sent from a server back to a client. */
export type RpcResponse<Res = unknown> =
  | { id: number; ok: true; res: Res }
  | { id: number; ok: false; error: string };

/** A single RPC handler. */
export type RpcHandler<Req = unknown, Res = unknown> = (req: Req) => Res | Promise<Res>;

/**
 * Server side of the RPC layer. `handle` accepts a raw JSON payload and
 * returns the raw JSON response, dispatching by method name.
 */
export class RpcServer {
  private readonly handlers = new Map<string, RpcHandler<unknown, unknown>>();
  private nextId = 1;

  /** Register a handler for `method`. */
  on<Req = unknown, Res = unknown>(method: string, handler: RpcHandler<Req, Res>): void {
    this.handlers.set(method, handler as RpcHandler<unknown, unknown>);
  }

  /**
   * Process one raw request. Echoes the request's id back in the response; if
   * the request carries no numeric id, one is assigned from an internal
   * counter. Unknown methods and handler exceptions surface as `{ok:false}`.
   */
  async handle(raw: string): Promise<string> {
    let request: RpcRequest;
    try {
      request = JSON.parse(raw) as RpcRequest;
    } catch {
      return this.respond({ id: this.nextId++, ok: false, error: "invalid JSON" });
    }

    const id = typeof request.id === "number" ? request.id : this.nextId++;
    const handler = this.handlers.get(request.method);
    if (handler === undefined) {
      return this.respond({ id, ok: false, error: `unknown method: ${request.method}` });
    }

    try {
      const res = await handler(request.req);
      return this.respond({ id, ok: true, res });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.respond({ id, ok: false, error: message });
    }
  }

  private respond<Res>(response: RpcResponse<Res>): string {
    return JSON.stringify(response);
  }
}

/** Transport injected into a client: delivers raw requests to the server. */
export interface RpcTransport {
  send(raw: string): void;
}

/**
 * Client side of the RPC layer. `call` assigns an id, sends the request via
 * the injected transport, and resolves the matching response by id.
 */
export class RpcClient {
  private readonly pending = new Map<
    number,
    { resolve: (res: unknown) => void; reject: (err: Error) => void }
  >();
  private nextId = 1;

  constructor(private readonly transport: RpcTransport) {}

  /** Send a request and resolve once the matching response arrives. */
  call<T = unknown>(method: string, req: unknown): Promise<T> {
    const id = this.nextId++;
    const raw = JSON.stringify({ id, method, req } satisfies RpcRequest);
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (res: unknown) => void,
        reject,
      });
      this.transport.send(raw);
    });
  }

  /** Deliver a raw response (typically called by the transport). */
  handleResponse(raw: string): void {
    let response: RpcResponse;
    try {
      response = JSON.parse(raw) as RpcResponse;
    } catch {
      return;
    }
    const entry = this.pending.get(response.id);
    if (entry === undefined) {
      return;
    }
    this.pending.delete(response.id);
    if (response.ok) {
      entry.resolve(response.res);
    } else {
      entry.reject(new Error(response.error));
    }
  }
}

/** Any strongly-typed method table (loose constraint, concrete params inferred). */
export type RpcMethodTable = Record<string, (req: never) => unknown>;

/** Typed facade over a client produced by `createTypedRpc`. */
export interface TypedRpc<T extends RpcMethodTable> {
  call<K extends keyof T & string>(
    client: RpcClient,
    method: K,
    req: Parameters<T[K]>[0],
  ): Promise<Awaited<ReturnType<T[K]>>>;
}

/**
 * Register a strongly-typed method table onto a server and get back a typed
 * call facade. Example:
 *
 *   const api = createTypedRpc(server).define({
 *     greet: (req: { name: string }) => `hello ${req.name}`,
 *   });
 *   const msg = await api.call(client, "greet", { name: "red" });
 */
export function createTypedRpc(server: RpcServer): {
  define<T extends RpcMethodTable>(methods: T): TypedRpc<T>;
} {
  return {
    define<T extends RpcMethodTable>(methods: T): TypedRpc<T> {
      for (const [name, handler] of Object.entries(methods)) {
        server.on(name, handler);
      }
      return {
        call<K extends keyof T & string>(
          client: RpcClient,
          method: K,
          req: Parameters<T[K]>[0],
        ): Promise<Awaited<ReturnType<T[K]>>> {
          return client.call(method, req);
        },
      };
    },
  };
}
