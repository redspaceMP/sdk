// A tiny dependency-injection container: register factories (lazy singletons)
// and values, then resolve them by token.

/** A factory producing an instance of `T`. */
export type Factory<T> = () => T;

/**
 * Dependency-injection container.
 *
 * - `register` binds a token to a factory; the factory runs at most once
 *   (lazy singleton) and the result is cached on first `resolve`.
 * - `registerValue` binds a token to a ready-made value.
 * - `has` reports whether a token is bound.
 * - `resolve` throws when the token is unbound or a circular dependency is
 *   detected while constructing factories.
 */
export class Container {
  private readonly factories = new Map<string, Factory<unknown>>();
  private readonly instances = new Map<string, unknown>();
  private readonly values = new Set<string>();
  private readonly resolving = new Set<string>();

  /** Bind `token` to a lazy factory. Re-registering replaces the binding. */
  register<T>(token: string, factory: Factory<T>): void {
    this.factories.set(token, factory as Factory<unknown>);
    this.instances.delete(token);
    this.values.delete(token);
  }

  /** Bind `token` to a ready-made value. Re-registering replaces the binding. */
  registerValue<T>(token: string, value: T): void {
    this.factories.delete(token);
    this.values.add(token);
    this.instances.set(token, value);
  }

  /**
   * Resolve `token`, instantiating and caching it on first use. Throws a clear
   * error when the token is unbound or its construction loops (cycle).
   */
  resolve<T = unknown>(token: string): T {
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected while resolving token "${token}"`);
    }
    if (this.values.has(token) || this.instances.has(token)) {
      return this.instances.get(token) as T;
    }
    const factory = this.factories.get(token);
    if (factory === undefined) {
      throw new Error(`No binding registered for token "${token}"`);
    }
    this.resolving.add(token);
    try {
      const instance = factory();
      this.instances.set(token, instance);
      return instance as T;
    } finally {
      this.resolving.delete(token);
    }
  }

  /** True when `token` has a binding (factory or value). */
  has(token: string): boolean {
    return this.factories.has(token) || this.values.has(token);
  }
}

/** Create a new empty container. */
export function createContainer(): Container {
  return new Container();
}
