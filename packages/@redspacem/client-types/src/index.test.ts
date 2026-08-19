import { describe, expect, test } from "bun:test";
import { type ClientMp, lerp, type MpVector3 } from "./index.ts";

describe("lerp", () => {
  test("returns a at t=0", () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  test("returns b at t=1", () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  test("returns the midpoint at t=0.5", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  test("clamps t outside [0, 1]", () => {
    expect(lerp(0, 10, 2)).toBe(10);
    expect(lerp(0, 10, -1)).toBe(0);
  });

  test("interpolates between reversed bounds", () => {
    expect(lerp(10, 0, 0.5)).toBe(5);
  });
});

// Type-level check: a conforming client host object satisfies the `ClientMp`
// contract, including MpVector3 positions from @redspacem/server-types.
const position: MpVector3 = { x: 1, y: 2, z: 3 };

const clientMp: ClientMp = {
  camera: {
    setPosition: () => {},
    getPosition: () => position,
    setRotation: () => {},
    isLocked: () => false,
    lock: () => {},
  },
  input: {
    isKeyPressed: () => false,
    isControlPressed: () => false,
    getMousePosition: () => ({ x: 0, y: 0 }),
    blockInput: () => {},
  },
  render: {
    drawText: () => {},
    drawRect: () => {},
  },
  events: {
    on: () => {},
    emit: () => {},
  },
  log: () => {},
};

test("declared `mp.client` satisfies the ClientMp contract", () => {
  expect(clientMp.camera.getPosition()).toEqual(position);
});
