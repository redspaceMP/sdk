import { describe, expect, test } from "bun:test";
import { clamp, distance, isValidCommandName, type Mp, type MpVector3 } from "./index.ts";

describe("clamp", () => {
  test("clamps above the max", () => {
    expect(clamp(10, 0, 5)).toBe(5);
  });

  test("clamps below the min", () => {
    expect(clamp(-3, 0, 5)).toBe(0);
  });

  test("keeps in-range values", () => {
    expect(clamp(2, 0, 5)).toBe(2);
  });
});

describe("distance", () => {
  test("computes euclidean distance", () => {
    const a: MpVector3 = { x: 0, y: 0, z: 0 };
    const b: MpVector3 = { x: 3, y: 4, z: 0 };
    expect(distance(a, b)).toBe(5);
  });

  test("zero distance for identical points", () => {
    const p: MpVector3 = { x: 1, y: 2, z: 3 };
    expect(distance(p, p)).toBe(0);
  });
});

describe("isValidCommandName", () => {
  test("accepts plain names", () => {
    expect(isValidCommandName("givecar")).toBe(true);
  });

  test("accepts digits and separators after the first char", () => {
    expect(isValidCommandName("give_car2")).toBe(true);
    expect(isValidCommandName("goto-pos")).toBe(true);
  });

  test("rejects names that do not start with a lowercase letter", () => {
    expect(isValidCommandName("Givecar")).toBe(false);
    expect(isValidCommandName("1givecar")).toBe(false);
    expect(isValidCommandName("_givecar")).toBe(false);
  });

  test("rejects invalid characters", () => {
    expect(isValidCommandName("give car")).toBe(false);
    expect(isValidCommandName("give.car")).toBe(false);
    expect(isValidCommandName("give$car")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidCommandName("")).toBe(false);
  });
});

// Type-level check: a conforming host object satisfies the `Mp` contract.
const mp: Mp = {
  players: [],
  vehicles: [],
  events: {
    on: () => {},
    emit: () => {},
  },
  commands: {
    register: () => {},
  },
  log: () => {},
};

test("declared `mp` satisfies the Mp contract", () => {
  expect(mp).toBeDefined();
  expect(mp.players).toEqual([]);
});
