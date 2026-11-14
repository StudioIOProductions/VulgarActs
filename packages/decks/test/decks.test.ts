import { describe, it, expect } from "vitest";
import { DECKS, ALL_CARDS, ALL_GROUPS, deckById } from "../src/index";

describe("decks", () => {
  it("ships Starter and After Dark with the expected sizes", () => {
    expect(deckById("starter")!.cards.length).toBe(286);
    expect(deckById("afterdark")!.cards.length).toBe(67);
    expect(deckById("afterdark")!.rating).toBe("18+");
  });
  it("has a unique id and non-empty text on every card", () => {
    const ids = new Set(ALL_CARDS.map((c) => c.id));
    expect(ids.size).toBe(ALL_CARDS.length);
    ALL_CARDS.forEach((c) => expect(c.text.trim().length).toBeGreaterThan(0));
  });
  it("keeps every card to 40 characters or fewer", () => {
    const long = ALL_CARDS.filter((c) => c.text.length > 40);
    expect(long.map((c) => c.text)).toEqual([]);
  });
  it("only groups cards that exist, and never groups a card twice", () => {
    const ids = new Set(ALL_CARDS.map((c) => c.id));
    const seen = new Set<string>();
    for (const g of ALL_GROUPS) {
      expect(g.length).toBeGreaterThan(1);
      for (const id of g) { expect(ids.has(id)).toBe(true); expect(seen.has(id)).toBe(false); seen.add(id); }
    }
  });
  it("never repeats a card text within a deck", () => {
    for (const d of DECKS) expect(new Set(d.cards.map((c) => c.text.toLowerCase())).size).toBe(d.cards.length);
  });
});
