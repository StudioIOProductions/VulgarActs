import { describe, it, expect } from "vitest";
import { ROUNDS, makeRoomCode } from "../src/index";

describe("rounds", () => {
  it("has three rounds in escalating order", () => {
    expect(ROUNDS.map((r) => r.name)).toEqual(["Say Anything", "One Word", "Act Only"]);
  });
});

describe("room codes", () => {
  it("are four consonants", () => {
    const code = makeRoomCode();
    expect(code).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
  });
  it("are deterministic for a fixed random source", () => {
    expect(makeRoomCode(() => 0)).toBe("BBBB");
  });
});
