// Client-side scripting API contract: the `mp.client` global injected by the
// RedSpace client plugin into in-game (RED4ext-style) scripts.

import type { MpVector3 } from "@redspacem/server-types";

export type { MpVector3 } from "@redspacem/server-types";

/** Camera controls exposed to client scripts. */
export interface ClientCamera {
  setPosition(position: MpVector3): void;
  getPosition(): MpVector3;
  setRotation(yaw: number, pitch: number): void;
  isLocked(): boolean;
  lock(state: boolean): void;
}

/** Input state helpers for client scripts. */
export interface ClientInput {
  isKeyPressed(key: string): boolean;
  isControlPressed(control: string): boolean;
  getMousePosition(): { x: number; y: number };
  blockInput(state: boolean): void;
}

/** Render primitives drawn onto the game viewport. */
export interface ClientRender {
  drawText(text: string, x: number, y: number, size?: number, color?: string): void;
  drawRect(x: number, y: number, width: number, height: number, color: string): void;
}

/** Map of client-side event names to their payload types. */
export interface ClientEventMap {
  keyDown: { key: string };
  keyUp: { key: string };
  mouseMove: { x: number; y: number };
  frame: { deltaMs: number };
}

/** Handler for a client-side event: receives the payload declared for `name`. */
export type ClientEventHandler<T extends keyof ClientEventMap> = (
  payload: ClientEventMap[T],
) => void;

/** Client-side event bus: subscribe to and emit typed events. */
export interface ClientEventBus {
  on<T extends keyof ClientEventMap>(name: T, handler: ClientEventHandler<T>): void;
  emit<T extends keyof ClientEventMap>(name: T, payload: ClientEventMap[T]): void;
}

/** The `mp.client` global object injected into every client-side script. */
export interface ClientMp {
  camera: ClientCamera;
  input: ClientInput;
  render: ClientRender;
  events: ClientEventBus;
  log(level: "info" | "warn" | "error", msg: string): void;
}

/** Linearly interpolate between `a` and `b` by `t` (clamped to [0, 1]). */
export function lerp(a: number, b: number, t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return a + (b - a) * clamped;
}
