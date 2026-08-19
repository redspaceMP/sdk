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

/** Loosely-typed response shape used when parsing raw client input. */
interface ParsedResponse {
  id?: number;
  ok?: boolean;
  res?: unknown;
  error?: string;
}

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
   * Malformed payloads (invalid JSON, non-objects, missing method) also return
   * a `{ok:false}` response instead of throwing.
   */
  async handle(raw: string): Promise<string> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.respond({ id: this.nextId++, ok: false, error: "invalid JSON" });
    }
    if (typeof parsed !== "object" || parsed === null) {
      return this.respond({ id: this.nextId++, ok: false, error: "invalid request" });
    }
    const request = parsed as Partial<RpcRequest>;
    const id = typeof request.id === "number" ? request.id : this.nextId++;
    if (typeof request.method !== "string") {
      return this.respond({ id, ok: false, error: "invalid method" });
    }

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

  /**
   * Send a request and resolve once the matching response arrives. When
   * `timeoutMs` is given, the call rejects with a timeout error instead of
   * waiting forever; a synchronous `transport.send` throw also rejects the
   * call and leaves no pending entry behind.
   */
  call<T = unknown>(method: string, req: unknown, timeoutMs?: number): Promise<T> {
    const id = this.nextId++;
    const raw = JSON.stringify({ id, method, req } satisfies RpcRequest);
    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const clearTimer = (): void => {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      };
      this.pending.set(id, {
        resolve: (res: unknown) => {
          clearTimer();
          resolve(res as T);
        },
        reject: (err: Error) => {
          clearTimer();
          reject(err);
        },
      });
      try {
        this.transport.send(raw);
      } catch (err) {
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          if (this.pending.delete(id)) {
            reject(new Error(`RPC call "${method}" timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);
      }
    });
  }

  /**
   * Deliver a raw response (typically called by the transport). Malformed
   * payloads and responses with unknown ids are ignored.
   */
  handleResponse(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null) {
      return;
    }
    const response = parsed as ParsedResponse;
    if (response.id === undefined) {
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
