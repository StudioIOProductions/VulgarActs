import { describe, it, expect } from "vitest";
import * as E from "../src/index";
import type { GameState, DeckCard, Ctx } from "../src/index";

/* ---------- fixtures ---------- */

const CARDS: DeckCard[] = [];
for (let i = 0; i < 60; i++) CARDS.push({ id: `s${i}`, text: `Starter card ${i}`, deck: "starter" });
for (let i = 0; i < 30; i++) CARDS.push({ id: `d${i}`, text: `Dark card ${i}`, deck: "afterdark" });
const GROUPS = [["s0", "s1"], ["s2", "s3", "s4"], ["s5", "d0"]];

/** Deterministic "random": cycles through a fixed sequence so shuffles are repeatable. */
function seeded(seed = 1): () => number {
  let x = seed;
  return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
}
const ctx = (now = 1_000_000, seed = 1): Ctx => ({ now, random: seeded(seed) });

const NAMES = ["Jordan", "Sam", "Riley", "Morgan", "Alex", "Casey"];
function lobby(n = 6, settings: Partial<E.Settings> = {}): GameState {
  let s = E.createGame("KXRT", "p1", settings);
  for (let i = 0; i < n; i++) s = E.join(s, `p${i + 1}`, NAMES[i] ?? `Player ${i + 1}`, ctx(1000 + i));
  return s;
}
function picked(n = 6, settings: Partial<E.Settings> = {}): GameState {
  let s = E.deal(lobby(n, settings), CARDS, GROUPS, ctx());
  for (const p of E.playerList(s)) {
    const picks: E.Pick[] = [];
    for (let i = 0; i < s.settings.cardsPerPlayer; i++) picks.push({ hand: i });
    s = E.lockPicks(s, p.id, picks);
  }
  return s;
}
function started(n = 6, settings: Partial<E.Settings> = {}): GameState {
  return E.startGame(picked(n, settings), ctx());
}
function live(n = 6, settings: Partial<E.Settings> = {}): GameState {
  let s = E.announceTurn(started(n, settings));
  return E.startTurn(s, s.turn!.giver, ctx());
}

/* ---------- lobby ---------- */

describe("room codes", () => {
  it("are four consonants so they never spell a word", () => {
    expect(E.makeRoomCode()).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
  });
});

describe("joining", () => {
  it("adds players with trimmed names capped at 14 characters", () => {
    const s = E.join(E.createGame("KXRT", "p1"), "p1", "  Jordan Burbank-Longname  ", ctx());
    expect(s.players.p1.name).toBe("Jordan Burbank");
  });
  it("rejects empty names", () => {
    expect(() => E.join(E.createGame("KXRT", "p1"), "p1", "   ", ctx())).toThrow("empty_name");
  });
  it("caps the room at 16 players", () => {
    const s = lobby(16);
    expect(() => E.join(s, "p17", "One more", ctx())).toThrow("room_full");
  });
  it("rejoining with the same id keeps the seat and marks connected", () => {
    let s = lobby(4);
    s = E.setConnected(s, "p2", false);
    s = E.join(s, "p2", "Sam", ctx());
    expect(Object.keys(s.players).length).toBe(4);
    expect(s.players.p2.connected).toBe(true);
  });
});

describe("settings", () => {
  it("can only change in the lobby", () => {
    expect(() => E.updateSettings(picked(), { timerSec: 90 })).toThrow("wrong_phase");
  });
  it("must keep at least one deck", () => {
    expect(() => E.updateSettings(lobby(), { decks: [] })).toThrow("no_decks");
  });
});

/* ---------- dealing ---------- */

describe("dealing", () => {
  it("needs 4 players in Teams and 3 in Free-for-All", () => {
    expect(() => E.deal(lobby(3), CARDS, GROUPS, ctx())).toThrow("too_few_players");
    expect(E.deal(lobby(3, { mode: "ffa" }), CARDS, GROUPS, ctx()).phase).toBe("pick");
  });
  it("gives every player six cards nobody else holds", () => {
    const s = E.deal(lobby(), CARDS, GROUPS, ctx());
    const all = E.playerList(s).flatMap((p) => p.hand);
    expect(all.length).toBe(36);
    expect(new Set(all).size).toBe(36);
    E.playerList(s).forEach((p) => expect(p.hand.length).toBe(E.HAND_SIZE));
  });
  it("deals only from the selected decks", () => {
    const s = E.deal(lobby(), CARDS, GROUPS, ctx());
    E.playerList(s).forEach((p) => p.hand.forEach((i) => expect(s.cards[i].deck).toBe("starter")));
  });
  it("keeps only one card from each variant group", () => {
    const s = E.deal(lobby(6, { decks: ["starter", "afterdark"] }), CARDS, GROUPS, ctx());
    const ids = new Set(s.cards.map((c) => c.id));
    for (const g of GROUPS) expect(g.filter((id) => ids.has(id)).length).toBe(1);
  });
  it("deals evenly across two decks", () => {
    const s = E.deal(lobby(6, { decks: ["starter", "afterdark"] }), CARDS, GROUPS, ctx());
    const hand = s.players.p1.hand.map((i) => s.cards[i].deck);
    expect(hand.filter((d) => d === "starter").length).toBe(3);
    expect(hand.filter((d) => d === "afterdark").length).toBe(3);
  });
  it("refuses when the deck can't cover six per player", () => {
    const small = CARDS.slice(0, 20);
    expect(() => E.deal(lobby(), small, [], ctx())).toThrow("deck_too_small");
  });
  it("splits players into two teams that differ by at most one", () => {
    const s = E.deal(lobby(5), CARDS, GROUPS, ctx());
    const [a, b] = s.teams!;
    expect(Math.abs(a.members.length - b.members.length)).toBeLessThanOrEqual(1);
    expect(a.members.length + b.members.length).toBe(5);
  });
  it("sets a random giver order in Free-for-All", () => {
    const s = E.deal(lobby(4, { mode: "ffa" }), CARDS, GROUPS, ctx());
    expect([...s.order].sort()).toEqual(["p1", "p2", "p3", "p4"]);
    expect(s.teams).toBeNull();
  });
});

describe("the bowl", () => {
  it("lets a player redraw the whole hand once", () => {
    let s = E.deal(lobby(), CARDS, GROUPS, ctx());
    const before = [...s.players.p1.hand];
    s = E.redrawHand(s, "p1", ctx(0, 7));
    expect(s.players.p1.hand).not.toEqual(before);
    expect(() => E.redrawHand(s, "p1", ctx())).toThrow("already_redrawn");
  });
  it("requires exactly cardsPerPlayer picks", () => {
    const s = E.deal(lobby(), CARDS, GROUPS, ctx());
    expect(() => E.lockPicks(s, "p1", [{ hand: 0 }, { hand: 1 }])).toThrow("wrong_pick_count");
  });
  it("accepts a custom card in any slot, capped at 40 characters", () => {
    let s = E.deal(lobby(), CARDS, GROUPS, ctx());
    s = E.lockPicks(s, "p1", [{ hand: 0 }, { custom: "Morgan's 'quick' Target run" }, { hand: 2 }]);
    expect(s.players.p1.picks[1]).toEqual({ text: "Morgan's 'quick' Target run", custom: true });
    const long = "x".repeat(E.CUSTOM_MAX_CHARS + 1);
    expect(() => E.lockPicks(E.deal(lobby(), CARDS, GROUPS, ctx()), "p2", [{ custom: long }, { hand: 0 }, { hand: 1 }])).toThrow("custom_too_long");
  });
  it("rejects picking the same hand card twice", () => {
    const s = E.deal(lobby(), CARDS, GROUPS, ctx());
    expect(() => E.lockPicks(s, "p1", [{ hand: 0 }, { hand: 0 }, { hand: 1 }])).toThrow("bad_hand_index");
  });
  it("holds cardsPerPlayer cards per locked player and is shuffled", () => {
    const s = started();
    expect(s.bowl.length).toBe(18);
    expect(s.pool.length).toBe(18);
    expect(new Set(s.bowl.map((c) => c.by)).size).toBe(6);
  });
  it("can hold 4 or 5 cards per player for small groups", () => {
    const s = started(4, { cardsPerPlayer: 5 });
    expect(s.bowl.length).toBe(20);
  });
  it("starts without the players who never locked in; they guess only", () => {
    let s = E.deal(lobby(), CARDS, GROUPS, ctx());
    for (const p of E.playerList(s).slice(0, 5)) s = E.lockPicks(s, p.id, [{ hand: 0 }, { hand: 1 }, { hand: 2 }]);
    s = E.startGame(s, ctx());
    expect(s.bowl.length).toBe(15);
    expect(s.bowl.some((c) => c.by === "p6")).toBe(false);
  });
  it("hides every other player's hand in their view", () => {
    const s = E.deal(lobby(), CARDS, GROUPS, ctx());
    const v = E.viewFor(s, "p1");
    expect(v.myHand.length).toBe(6);
    expect(JSON.stringify(v)).not.toContain(s.cards[s.players.p2.hand[0]].text);
  });
});

/* ---------- turns ---------- */

describe("turn order", () => {
  it("picks a random team to start, then alternates", () => {
    let s = started();
    const first = s.turnTeam;
    s = E.announceTurn(s);
    s = E.startTurn(s, s.turn!.giver, ctx());
    s = E.endTurn(s, "time", ctx());
    s = E.continueGame(s, ctx());
    expect(s.turnTeam).toBe(1 - first);
  });
  it("rotates givers within a team in a fixed order", () => {
    let s = started();
    const team = s.teams![s.turnTeam];
    const g1 = E.giverFor(s);
    s = E.announceTurn(s); s = E.startTurn(s, g1!, ctx()); s = E.endTurn(s, "time", ctx()); s = E.continueGame(s, ctx());
    s = E.startTurn(s, s.turn!.giver, ctx()); s = E.endTurn(s, "time", ctx()); s = E.continueGame(s, ctx());
    const g2 = s.turn!.giver;
    expect(team.members).toContain(g1);
    expect(team.members).toContain(g2);
    expect(g2).not.toBe(g1);
  });
  it("skips a disconnected player when choosing the giver", () => {
    let s = started();
    const g = E.giverFor(s)!;
    s = E.setConnected(s, g, false);
    expect(E.giverFor(s)).not.toBe(g);
  });
  it("lets the host skip a giver who isn't there and advances rotation", () => {
    let s = E.announceTurn(started());
    const g = s.turn!.giver;
    s = E.skipGiver(s);
    expect(s.phase).toBe("round");
    expect(E.giverFor(s)).not.toBe(g);
  });
  it("only the giver can start the clock", () => {
    const s = E.announceTurn(started());
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    expect(() => E.startTurn(s, other, ctx())).toThrow("not_the_giver");
  });
  it("sets the timer from settings when the clock starts", () => {
    const s = live(6, { timerSec: 45 });
    expect(s.turn!.endsAt).toBe(1_000_000 + 45_000);
    expect(E.secondsLeft(s, 1_000_000 + 10_000)).toBe(35);
  });
});

describe("got it", () => {
  it("removes the card from the pool, scores the team, and shows the next card", () => {
    let s = live();
    const cur = s.turn!.cur!;
    const team = s.turn!.team!;
    s = E.gotIt(s, s.turn!.giver, ctx());
    expect(s.pool).not.toContain(cur);
    expect(s.teams![team].pts).toBe(1);
    expect(s.turn!.cur).not.toBe(cur);
    expect(s.turn!.got).toEqual([cur]);
  });
  it("counts toward the giver's Best Giver tally", () => {
    let s = live();
    const g = s.turn!.giver;
    s = E.gotIt(s, g, ctx());
    expect(s.given[g]).toBe(1);
  });
  it("in Free-for-All credits the named guesser and refuses self-credit", () => {
    let s = live(4, { mode: "ffa" });
    const g = s.turn!.giver;
    const guesser = E.playerList(s).find((p) => p.id !== g)!.id;
    expect(() => E.gotIt(s, g, ctx())).toThrow("need_guesser");
    expect(() => E.gotIt(s, g, ctx(), g)).toThrow("need_guesser");
    s = E.gotIt(s, g, ctx(), guesser);
    expect(s.pts[guesser]).toBe(1);
  });
  it("after time is up, a late tap ends the turn instead of scoring", () => {
    let s = live();
    s = E.gotIt(s, s.turn!.giver, ctx(1_000_000 + 61_000));
    expect(s.phase).toBe("turnend");
    expect(s.turn!.why).toBe("time");
  });
});

describe("skipping", () => {
  it("allows three skips per turn and then disables", () => {
    let s = live();
    const g = s.turn!.giver;
    s = E.skip(s, g, ctx()); s = E.skip(s, g, ctx()); s = E.skip(s, g, ctx());
    expect(s.turn!.skips).toBe(3);
    expect(() => E.skip(s, g, ctx())).toThrow("no_skips_left");
    expect(E.viewFor(s, g).turn!.skipsLeft).toBe(0);
  });
  it("sends the skipped card to the back of the pool and never shows it again this turn", () => {
    let s = live();
    const g = s.turn!.giver;
    const first = s.turn!.cur!;
    s = E.skip(s, g, ctx());
    expect(s.pool[s.pool.length - 1]).toBe(first);
    for (let i = 0; i < 10 && s.phase === "turn"; i++) {
      expect(s.turn!.cur).not.toBe(first);
      s = E.gotIt(s, g, ctx());
    }
  });
  it("records the skip on the card for the Most Skipped award", () => {
    let s = live();
    const first = s.turn!.cur!;
    s = E.skip(s, s.turn!.giver, ctx());
    expect(s.bowl[first].skips).toBe(1);
  });
  it("skips per turn is a house rule", () => {
    let s = live(6, { skipsPerTurn: 0 });
    expect(() => E.skip(s, s.turn!.giver, ctx())).toThrow("no_skips_left");
  });
  it("only the giver can skip", () => {
    const s = live();
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    expect(() => E.skip(s, other, ctx())).toThrow("not_the_giver");
  });
});

describe("buzzing", () => {
  it("anyone but the giver can buzz", () => {
    const s = live();
    expect(() => E.buzz(s, s.turn!.giver, ctx())).toThrow("giver_cannot_buzz");
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    expect(E.buzz(s, other, ctx()).turn!.buzzes).toBe(1);
  });
  it("a teammate can buzz too", () => {
    const s = live();
    const mate = s.teams![s.turn!.team!].members.find((m) => m !== s.turn!.giver)!;
    expect(E.buzz(s, mate, ctx()).turn!.buzzes).toBe(1);
  });
  it("by default forfeits the card back into the bowl and moves on", () => {
    let s = live();
    const cur = s.turn!.cur!;
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    s = E.buzz(s, other, ctx());
    expect(s.pool).toContain(cur);
    expect(s.turn!.cur).not.toBe(cur);
    expect(s.teams![s.turn!.team!].pts).toBe(0);
  });
  it("with penalty 'point' the giving side loses a point, never below zero", () => {
    let s = live(6, { buzzPenalty: "point" });
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    s = E.buzz(s, other, ctx());
    expect(s.teams![s.turn!.team!].pts).toBe(0);
  });
  it("with penalty 'none' the card stays on screen", () => {
    let s = live(6, { buzzPenalty: "none" });
    const cur = s.turn!.cur!;
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    s = E.buzz(s, other, ctx());
    expect(s.turn!.cur).toBe(cur);
  });
  it("three buzzes end the turn", () => {
    let s = live();
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    s = E.buzz(s, other, ctx()); s = E.buzz(s, other, ctx()); s = E.buzz(s, other, ctx());
    expect(s.phase).toBe("turnend");
    expect(s.turn!.why).toBe("buzzed");
  });
});

describe("the clock", () => {
  it("ends the turn when time runs out and the card returns to the bowl", () => {
    let s = live();
    const cur = s.turn!.cur!;
    s = E.tick(s, ctx(1_000_000 + 60_000));
    expect(s.phase).toBe("turnend");
    expect(s.turn!.why).toBe("time");
    expect(s.pool).toContain(cur);
  });
  it("does nothing while time remains", () => {
    const s = live();
    expect(E.tick(s, ctx(1_000_000 + 30_000))).toBe(s);
  });
  it("lets the giver pause once for up to 15 seconds", () => {
    let s = live();
    const g = s.turn!.giver;
    s = E.pause(s, g, ctx(1_000_000 + 10_000));
    expect(s.turn!.status).toBe("paused");
    expect(E.secondsLeft(s, 1_000_000 + 20_000)).toBe(50);
    s = E.resume(s, g, ctx(1_000_000 + 40_000)); // 30 s later, capped to 15
    expect(s.turn!.endsAt).toBe(1_000_000 + 75_000);
    expect(() => E.pause(s, g, ctx())).toThrow("pause_used");
  });
  it("auto-resumes a giver pause after 15 seconds on the next tick", () => {
    let s = live();
    s = E.pause(s, s.turn!.giver, ctx(1_000_000 + 10_000));
    s = E.tick(s, ctx(1_000_000 + 30_000));
    expect(s.turn!.status).toBe("live");
    expect(s.turn!.endsAt).toBe(1_000_000 + 75_000);
  });
  it("lets the host pause at any time, with no limit", () => {
    let s = live();
    s = E.pause(s, "p1", ctx(1_000_000 + 10_000));
    s = E.tick(s, ctx(1_000_000 + 100_000));
    expect(s.turn!.status).toBe("paused");
    s = E.resume(s, "p1", ctx(1_000_000 + 100_000));
    expect(s.turn!.endsAt).toBe(1_000_000 + 150_000);
  });
  it("leftover seconds vanish when the bowl empties mid-turn", () => {
    let s = live(4, { cardsPerPlayer: 3 });
    const g = s.turn!.giver;
    while (s.phase === "turn") s = E.gotIt(s, g, ctx(1_000_000 + 5_000));
    expect(s.turn!.why).toBe("empty");
    expect(s.carry).toBe(0);
  });
  it("carries leftover seconds when the Monikers house rule is on", () => {
    let s = live(4, { carryoverSeconds: true });
    const g = s.turn!.giver;
    while (s.phase === "turn") s = E.gotIt(s, g, ctx(1_000_000 + 5_000));
    expect(s.carry).toBe(55);
    s = E.continueGame(s, ctx());
    s = E.announceTurn(s);
    s = E.startTurn(s, s.turn!.giver, ctx(2_000_000));
    expect(s.turn!.endsAt).toBe(2_000_000 + 115_000);
  });
});

/* ---------- rounds ---------- */

function playRoundOut(s: GameState): GameState {
  // Every giver gets every card instantly until the pool empties.
  let guard = 0;
  while (s.phase !== "final" && guard++ < 200) {
    if (s.phase === "round") s = E.announceTurn(s);
    if (s.phase === "turn" && s.turn!.status === "ready") s = E.startTurn(s, s.turn!.giver, ctx());
    if (s.phase === "turn") {
      const g = s.turn!.giver;
      const guesser = s.settings.mode === "ffa" ? E.playerList(s).find((p) => p.id !== g)!.id : undefined;
      s = E.gotIt(s, g, ctx(), guesser);
    }
    if (s.phase === "turnend") {
      if (s.pool.length === 0) return s; // caller decides whether to continue
      s = E.continueGame(s, ctx());
    }
  }
  return s;
}

describe("rounds", () => {
  it("ends a round when the bowl is empty and the next round reuses every card", () => {
    let s = playRoundOut(started());
    expect(s.pool.length).toBe(0);
    s = E.continueGame(s, ctx());
    expect(s.phase).toBe("round");
    expect(s.round).toBe(1);
    expect(s.pool.length).toBe(18);
    expect(E.currentRound(s).name).toBe("One Word");
  });
  it("round two starts with whichever team gave fewer turns", () => {
    let s = playRoundOut(started());
    const fewer = s.turnsGiven[0] <= s.turnsGiven[1] ? 0 : 1;
    s = E.continueGame(s, ctx());
    expect(s.turnTeam).toBe(fewer);
  });
  it("a two-round game ends after One Word", () => {
    let s = playRoundOut(started(6, { rounds: 2 }));
    s = E.continueGame(s, ctx());
    s = playRoundOut(s);
    s = E.continueGame(s, ctx());
    expect(s.phase).toBe("final");
  });
  it("a three-round game ends after Act Only with scores carried across rounds", () => {
    let s = started();
    for (let r = 0; r < 3; r++) { s = playRoundOut(s); s = E.continueGame(s, ctx()); }
    expect(s.phase).toBe("final");
    expect(s.teams![0].pts + s.teams![1].pts).toBe(54);
  });
});

/* ---------- scoring and awards ---------- */

describe("Free-for-All scoring", () => {
  it("gives the giver one bonus point per two cards guessed, rounded down", () => {
    let s = live(4, { mode: "ffa" });
    const g = s.turn!.giver;
    const guesser = E.playerList(s).find((p) => p.id !== g)!.id;
    for (let i = 0; i < 5; i++) s = E.gotIt(s, g, ctx(), guesser);
    s = E.tick(s, ctx(1_000_000 + 60_000));
    expect(s.turn!.bonus).toBe(2);
    expect(s.pts[g]).toBe(2);
    expect(s.pts[guesser]).toBe(5);
  });
  it("never deducts for wrong shouts (there is no such action)", () => {
    expect((E as any).wrongGuess).toBeUndefined();
  });
});

describe("awards", () => {
  it("names the winning team, or a tie", () => {
    let s = started();
    for (let r = 0; r < 3; r++) { s = playRoundOut(s); s = E.continueGame(s, ctx()); }
    const a = E.awards(s);
    expect([s.teams![0].name, s.teams![1].name, "tie"]).toContain(a.winner);
    expect(a.tie).toBe(s.teams![0].pts === s.teams![1].pts);
  });
  it("tracks best giver, most skipped, and the hardest inside joke with its author", () => {
    let s = E.deal(lobby(4), CARDS, GROUPS, ctx());
    s = E.lockPicks(s, "p1", [{ custom: "Jordan's secret" }, { hand: 0 }, { hand: 1 }]);
    for (const id of ["p2", "p3", "p4"]) s = E.lockPicks(s, id, [{ hand: 0 }, { hand: 1 }, { hand: 2 }]);
    s = E.startGame(s, ctx());
    s = E.announceTurn(s); s = E.startTurn(s, s.turn!.giver, ctx());
    const g = s.turn!.giver;
    // skip until the custom card is on screen, then skip it too
    for (let i = 0; i < 3; i++) s = E.skip(s, g, ctx());
    s = E.tick(s, ctx(1_000_000 + 60_000));
    for (let r = 0; r < 3; r++) { s = E.continueGame(s, ctx()); s = playRoundOut(s); }
    s = E.continueGame(s, ctx());
    expect(s.phase).toBe("final");
    const a = E.awards(s);
    expect(a.bestGiver).not.toBeNull();
    expect(a.mostSkipped!.skips).toBeGreaterThanOrEqual(1);
    expect(a.hardestCustom!.text).toBe("Jordan's secret");
    expect(a.hardestCustom!.by).toBe("p1");
  });
  it("Free-for-All ties share the win", () => {
    let s = started(4, { mode: "ffa" });
    for (let r = 0; r < 3; r++) { s = playRoundOut(s); s = E.continueGame(s, ctx()); }
    const a = E.awards(s);
    expect(a.winner.length).toBeGreaterThan(0);
    if (a.tie) expect(a.winner).toContain("&");
  });
});

/* ---------- messy rooms ---------- */

describe("real rooms", () => {
  it("a late joiner lands on the smaller team as a guesser and never gives clues this game", () => {
    let s = started(5);
    const smaller = s.teams![0].members.length <= s.teams![1].members.length ? 0 : 1;
    s = E.join(s, "p9", "Late Larry", ctx(9999));
    expect(s.teams![smaller].members).toContain("p9");
    expect(s.players.p9.lateJoiner).toBe(true);
    for (let i = 0; i < 20; i++) {
      expect(E.giverFor(s)).not.toBe("p9");
      s = E.announceTurn(s); s = E.startTurn(s, s.turn!.giver, ctx()); s = E.endTurn(s, "time", ctx());
      if (s.pool.length === 0) break;
      s = E.continueGame(s, ctx()); if (s.phase !== "round") { s = { ...s, phase: "round", turn: null }; }
    }
  });
  it("a removed player's cards stay in the bowl", () => {
    let s = started();
    const n = s.bowl.length;
    s = E.removePlayer(s, "p3");
    expect(s.bowl.length).toBe(n);
    expect(s.players.p3).toBeUndefined();
    expect(s.teams!.every((t) => !t.members.includes("p3"))).toBe(true);
  });
  it("removing the active giver ends the turn", () => {
    let s = live();
    s = E.removePlayer(s, s.turn!.giver);
    expect(s.phase).toBe("turnend");
    expect(s.turn!.why).toBe("forced");
  });
  it("a disconnected player's turn is skipped until they return", () => {
    let s = started();
    const g = E.giverFor(s)!;
    s = E.setConnected(s, g, false);
    s = E.announceTurn(s);
    expect(s.turn!.giver).not.toBe(g);
  });
  it("play again returns to the lobby with the same people and settings", () => {
    let s = started(6, { timerSec: 45 });
    for (let r = 0; r < 3; r++) { s = playRoundOut(s); s = E.continueGame(s, ctx()); }
    s = E.playAgain(s);
    expect(s.phase).toBe("lobby");
    expect(Object.keys(s.players).length).toBe(6);
    expect(s.settings.timerSec).toBe(45);
    expect(s.bowl.length).toBe(0);
  });
});

/* ---------- views: what goes over the wire ---------- */

describe("player views", () => {
  it("only the giver sees the clue text", () => {
    const s = live();
    const g = s.turn!.giver;
    const text = s.bowl[s.turn!.cur!].text;
    expect(E.viewFor(s, g).turn!.card!.text).toBe(text);
    for (const p of E.playerList(s)) {
      if (p.id === g) continue;
      const v = E.viewFor(s, p.id);
      expect(v.turn!.card).toBeNull();
      expect(JSON.stringify(v)).not.toContain(text);
    }
  });
  it("shows the custom card's author only to the giver, and only for custom cards", () => {
    let s = E.deal(lobby(4), CARDS, GROUPS, ctx());
    s = E.lockPicks(s, "p1", [{ custom: "Inside joke" }, { hand: 0 }, { hand: 1 }]);
    for (const id of ["p2", "p3", "p4"]) s = E.lockPicks(s, id, [{ hand: 0 }, { hand: 1 }, { hand: 2 }]);
    s = E.startGame(s, ctx());
    // force the custom card to the front
    const idx = s.bowl.findIndex((c) => c.custom);
    s = { ...s, pool: [idx, ...s.pool.filter((i) => i !== idx)] };
    s = E.announceTurn(s); s = E.startTurn(s, s.turn!.giver, ctx());
    const v = E.viewFor(s, s.turn!.giver);
    expect(v.turn!.card).toEqual({ text: "Inside joke", custom: true, by: "p1", deck: null });
  });
  it("everyone sees the timer, score, skips left and cards remaining", () => {
    const s = live();
    const other = E.playerList(s).find((p) => p.id !== s.turn!.giver)!.id;
    const v = E.viewFor(s, other);
    expect(v.turn!.endsAt).toBeGreaterThan(0);
    expect(v.poolSize).toBe(18);
    expect(v.turn!.skipsLeft).toBe(3);
    expect(v.teams!.length).toBe(2);
  });
  it("the turn summary lists what was got, including custom cards' authors", () => {
    let s = live();
    const g = s.turn!.giver;
    s = E.gotIt(s, g, ctx()); s = E.gotIt(s, g, ctx());
    s = E.tick(s, ctx(1_000_000 + 60_000));
    const v = E.viewFor(s, "p2");
    expect(v.turn!.got.length).toBe(2);
    expect(v.turn!.why).toBe("time");
  });
});
