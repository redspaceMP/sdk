// Typed contract for the `mp.*` scripting host API injected by the RedSpaceM
// host into resource sandboxes (mirrors CyberpunkMP's typed host API).

/** A connected player. */
export interface MpPlayer {
  id: number;
  name: string;
  pingMs: number;
  ip?: string;
  connectedAt: number;
}

/** A 3D position in the game world. */
export interface MpVector3 {
  x: number;
  y: number;
  z: number;
}

/** A spawned vehicle. */
export interface MpVehicle {
  id: number;
  model: string;
  position: MpVector3;
  health: number;
}

/** Map of host event names to their payload types. */
export interface MpEventMap {
  playerJoin: MpPlayer;
  playerLeave: { id: number; reason: string };
  chatMessage: { from: number; text: string };
  playerSpawn: { id: number; position: MpVector3 };
}

export type MpEventHandler<T extends keyof MpEventMap> = (payload: MpEventMap[T]) => void;

/** Host event bus: subscribe to and emit typed events. */
export interface MpEvents {
  on<T extends keyof MpEventMap>(name: T, handler: MpEventHandler<T>): void;
  emit<T extends keyof MpEventMap>(name: T, payload: MpEventMap[T]): void;
}

export type MpCommandHandler = (player: MpPlayer, args: string[]) => void;

/** Host command registry. */
export interface MpCommands {
  register(name: string, handler: MpCommandHandler): void;
}

/** The `mp` global object injected into every resource sandbox. */
export interface Mp {
  players: MpPlayer[];
  vehicles: MpVehicle[];
  events: MpEvents;
  commands: MpCommands;
  log(level: "info" | "warn" | "error", msg: string): void;
}

/** Clamp a value into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Euclidean distance between two points. */
export function distance(a: MpVector3, b: MpVector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const COMMAND_NAME_RE = /^[a-z][a-z0-9_-]*$/;

/** True when a name is valid for a command (lowercase start, [a-z0-9_-]). */
export function isValidCommandName(name: string): boolean {
  return COMMAND_NAME_RE.test(name);
}
