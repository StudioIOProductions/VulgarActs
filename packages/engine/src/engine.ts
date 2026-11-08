/**
 * Vulgar Acts rules engine.
 *
 * Pure functions over GameState. Nothing here touches a screen or a socket.
 * Every exported function returns a NEW state and never mutates its input,
 * so the server can keep history and the tests can compare before/after.
 * Anything time- or chance-dependent takes a Ctx {now, random}.
 */
import {
  BowlCard, Ctx, DeckCard, GameState, Player, RuleError, Settings, Team, Turn, DEFAULT_SETTINGS, PickedCard,
} from "./types";

export const ROUNDS = [
  { n: 1, name: "Say Anything", rule: "Say anything you like. Not a word that's on the card." },
  { n: 2, name: "One Word", rule: "Say exactly one word. Then act it out." },
  { n: 3, name: "Act Only", rule: "No sound at all. Mime it." },
] as const;

export const HAND_SIZE = 6;
export const CUSTOM_MAX_CHARS = 40;
export const MIN_PLAYERS: Record<Settings["mode"], number> = { teams: 4, ffa: 3 };
export const MAX_PLAYERS = 16;
export const GIVER_PAUSE_MS = 15_000;
export const TEAM_NAMES = ["Red Team", "Blue Team"] as const;

/* ---------- helpers ---------- */

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function shuffle<T>(arr: readonly T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Four-letter room code with no vowels, so it never spells a word. */
export function makeRoomCode(random: () => number = Math.random): string {
  const letters = "BCDFGHJKLMNPQRSTVWXZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters[Math.floor(random() * letters.length)];
  return code;
}

export const playerList = (s: GameState): Player[] =>
  Object.values(s.players).sort((a, b) => a.joined - b.joined);

export const activePlayers = (s: GameState): Player[] =>
  playerList(s).filter((p) => p.locked || p.lateJoiner);

export const teamOf = (s: GameState, pid: string): 0 | 1 | null => {
  if (!s.teams) return null;
  if (s.teams[0].members.includes(pid)) return 0;
  if (s.teams[1].members.includes(pid)) return 1;
  return null;
};

const requirePhase = (s: GameState, ...phases: GameState["phase"][]) => {
  if (!phases.includes(s.phase)) throw new RuleError("wrong_phase", `expected ${phases.join("/")}, got ${s.phase}`);
};

/* ---------- lobby ---------- */

export function createGame(code: string, hostId: string, settings: Partial<Settings> = {}): GameState {
  return {
    code,
    phase: "lobby",
    host: hostId,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    players: {},
    cards: [],
    spare: [],
    bowl: [],
    pool: [],
    round: 0,
    teams: null,
    turnTeam: 0,
    turnsGiven: [0, 0],
    order: [],
    orderIdx: 0,
    pts: {},
    given: {},
    turn: null,
    carry: 0,
  };
}

export function updateSettings(s: GameState, patch: Partial<Settings>): GameState {
  requirePhase(s, "lobby");
  const next = clone(s);
  next.settings = { ...next.settings, ...patch };
  if (next.settings.decks.length === 0) throw new RuleError("no_decks");
  return next;
}

export function join(s: GameState, pid: string, name: string, ctx: Ctx): GameState {
  const trimmed = name.trim().slice(0, 14);
  if (!trimmed) throw new RuleError("empty_name");
  const next = clone(s);
  if (next.players[pid]) {
    next.players[pid].name = trimmed;
    next.players[pid].connected = true;
    return next;
  }
  if (Object.keys(next.players).length >= MAX_PLAYERS) throw new RuleError("room_full");
  const late = s.phase !== "lobby";
  next.players[pid] = {
    id: pid, name: trimmed, joined: ctx.now, connected: true, hand: [], redrawn: false,
    locked: false, picks: [], lateJoiner: late,
  };
  if (late && next.teams) {
    // Late joiner: smaller team, guesser only this game.
    const t = next.teams[0].members.length <= next.teams[1].members.length ? 0 : 1;
    next.teams[t].members.push(pid);
  }
  if (late && s.settings.mode === "ffa") {
    next.order.push(pid);
    next.pts[pid] = 0;
  }
  return next;
}

export function setConnected(s: GameState, pid: string, connected: boolean): GameState {
  if (!s.players[pid]) return s;
  const next = clone(s);
  next.players[pid].connected = connected;
  return next;
}

export function removePlayer(s: GameState, pid: string): GameState {
  if (!s.players[pid]) return s;
  const next = clone(s);
  delete next.players[pid];
  if (next.teams) next.teams.forEach((t) => (t.members = t.members.filter((m) => m !== pid)));
  next.order = next.order.filter((m) => m !== pid);
  // Their cards stay in the bowl: the rulebook says so.
  if (next.turn && next.turn.giver === pid && next.phase === "turn") {
    return endTurn(next, "forced", { now: 0, random: Math.random });
  }
  return next;
}

/* ---------- dealing ---------- */

/**
 * Build this game's dealable card list: filter to selected decks, drop all but
 * one card of each variant group, then deal HAND_SIZE to every player.
 * `groups` holds arrays of card ids that are the same joke in new clothes.
 */
export function deal(s: GameState, allCards: DeckCard[], groups: string[][], ctx: Ctx): GameState {
  requirePhase(s, "lobby");
  const players = playerList(s);
  const min = MIN_PLAYERS[s.settings.mode];
  if (players.length < min) throw new RuleError("too_few_players", `need ${min}`);

  const inDecks = allCards.filter((c) => s.settings.decks.includes(c.deck));
  const drop = new Set<string>();
  for (const g of groups) {
    const present = g.filter((id) => inDecks.some((c) => c.id === id));
    if (present.length > 1) {
      const keep = present[Math.floor(ctx.random() * present.length)];
      present.forEach((id) => id !== keep && drop.add(id));
    }
  }
  const cards = inDecks.filter((c) => !drop.has(c.id));
  if (cards.length < players.length * HAND_SIZE) throw new RuleError("deck_too_small");

  // Deal evenly across decks: interleave shuffled per-deck queues.
  const byDeck = new Map<string, number[]>();
  cards.forEach((c, i) => byDeck.set(c.deck, [...(byDeck.get(c.deck) ?? []), i]));
  const queues = [...byDeck.values()].map((q) => shuffle(q, ctx.random));
  const order: number[] = [];
  let qi = 0;
  while (queues.some((q) => q.length)) {
    const q = queues[qi % queues.length];
    if (q.length) order.push(q.shift()!);
    qi++;
  }

  const next = clone(s);
  next.cards = cards;
  next.phase = "pick";
  for (const p of players) {
    next.players[p.id].hand = order.splice(0, HAND_SIZE);
    next.players[p.id].locked = false;
    next.players[p.id].picks = [];
    next.players[p.id].redrawn = false;
  }
  next.spare = order;

  if (s.settings.mode === "teams") {
    const ids = shuffle(players.map((p) => p.id), ctx.random);
    const mk = (name: string, members: string[]): Team => ({ name, members, pts: 0, next: 0 });
    next.teams = [mk(TEAM_NAMES[0], ids.filter((_, i) => i % 2 === 0)), mk(TEAM_NAMES[1], ids.filter((_, i) => i % 2 === 1))];
  } else {
    next.teams = null;
    next.order = shuffle(players.map((p) => p.id), ctx.random);
    next.orderIdx = 0;
    players.forEach((p) => (next.pts[p.id] = 0));
  }
  return next;
}

export function renameTeam(s: GameState, team: 0 | 1, name: string): GameState {
  if (!s.teams) throw new RuleError("no_teams");
  const next = clone(s);
  next.teams![team].name = name.trim().slice(0, 20) || TEAM_NAMES[team];
  return next;
}

export function movePlayerToTeam(s: GameState, pid: string, team: 0 | 1): GameState {
  requirePhase(s, "pick");
  if (!s.teams) throw new RuleError("no_teams");
  const next = clone(s);
  next.teams!.forEach((t) => (t.members = t.members.filter((m) => m !== pid)));
  next.teams![team].members.push(pid);
  return next;
}

export function redrawHand(s: GameState, pid: string, ctx: Ctx): GameState {
  requirePhase(s, "pick");
  const p = s.players[pid];
  if (!p) throw new RuleError("no_such_player");
  if (p.locked) throw new RuleError("already_locked");
  if (p.redrawn) throw new RuleError("already_redrawn");
  if (s.spare.length < HAND_SIZE) throw new RuleError("deck_too_small");
  const next = clone(s);
  const spare = shuffle([...next.spare, ...p.hand], ctx.random);
  next.players[pid].hand = spare.splice(0, HAND_SIZE);
  next.players[pid].redrawn = true;
  next.spare = spare;
  return next;
}

/**
 * Lock a player's picks. Each pick is either {hand: index into their hand}
 * or {custom: text}. Must be exactly settings.cardsPerPlayer picks.
 */
export type Pick = { hand: number } | { custom: string };

export function lockPicks(s: GameState, pid: string, picks: Pick[]): GameState {
  requirePhase(s, "pick");
  const p = s.players[pid];
  if (!p) throw new RuleError("no_such_player");
  if (p.locked) throw new RuleError("already_locked");
  if (picks.length !== s.settings.cardsPerPlayer) throw new RuleError("wrong_pick_count");
  const seenHand = new Set<number>();
  const out: PickedCard[] = [];
  for (const pk of picks) {
    if ("hand" in pk) {
      if (pk.hand < 0 || pk.hand >= p.hand.length || seenHand.has(pk.hand)) throw new RuleError("bad_hand_index");
      seenHand.add(pk.hand);
      out.push({ text: s.cards[p.hand[pk.hand]].text, custom: false });
    } else {
      const t = pk.custom.trim();
      if (!t) throw new RuleError("empty_custom");
      if (t.length > CUSTOM_MAX_CHARS) throw new RuleError("custom_too_long");
      out.push({ text: t, custom: true });
    }
  }
  const next = clone(s);
  next.players[pid].locked = true;
  next.players[pid].picks = out;
  return next;
}

export const allLocked = (s: GameState): boolean => playerList(s).every((p) => p.locked);

/* ---------- starting ---------- */

/**
 * Build the bowl from everyone who has locked in and begin round 1.
 * Unlocked players (when the host starts anyway) sit this game out as guessers.
 */
export function startGame(s: GameState, ctx: Ctx): GameState {
  requirePhase(s, "pick");
  const ready = playerList(s).filter((p) => p.locked);
  if (ready.length < MIN_PLAYERS[s.settings.mode]) throw new RuleError("too_few_players");
  const bowl: BowlCard[] = [];
  for (const p of ready) {
    for (const c of p.picks) {
      const deckCard = c.custom ? null : s.cards.find((d) => d.text === c.text);
      bowl.push({ text: c.text, custom: c.custom, by: p.id, deck: deckCard ? deckCard.deck : null, skips: 0, buzzes: 0 });
    }
  }
  const next = clone(s);
  next.bowl = shuffle(bowl, ctx.random);
  next.round = 0;
  next.given = {};
  if (s.settings.mode === "teams") {
    next.turnTeam = ctx.random() < 0.5 ? 0 : 1;
    next.turnsGiven = [0, 0];
    next.teams!.forEach((t) => { t.pts = 0; t.next = 0; });
  } else {
    ready.forEach((p) => (next.pts[p.id] = 0));
    next.orderIdx = 0;
  }
  return beginRound(next, ctx);
}

function beginRound(s: GameState, ctx: Ctx): GameState {
  const next = clone(s);
  next.phase = "round";
  next.pool = shuffle(next.bowl.map((_, i) => i), ctx.random);
  next.turn = null;
  if (next.settings.mode === "teams" && next.round > 0) {
    next.turnTeam = next.turnsGiven[0] <= next.turnsGiven[1] ? 0 : 1;
  }
  return next;
}

export const currentRound = (s: GameState) => ROUNDS[s.round];

/* ---------- turns ---------- */

/** Who gives clues next, honouring rotation and skipping disconnected or late players. */
export function giverFor(s: GameState): string | null {
  const eligible = (pid: string) => {
    const p = s.players[pid];
    return !!p && p.connected && p.locked && !p.lateJoiner;
  };
  if (s.settings.mode === "teams") {
    const t = s.teams![s.turnTeam];
    const live = t.members.filter(eligible);
    if (!live.length) return null;
    return live[t.next % live.length];
  }
  const live = s.order.filter(eligible);
  if (!live.length) return null;
  return live[s.orderIdx % live.length];
}

export function announceTurn(s: GameState): GameState {
  requirePhase(s, "round");
  const giver = giverFor(s);
  if (!giver) throw new RuleError("no_eligible_giver");
  const next = clone(s);
  next.phase = "turn";
  next.turn = {
    giver, team: s.settings.mode === "teams" ? s.turnTeam : null, status: "ready", skips: 0, buzzes: 0,
    got: [], seen: [], cur: null, endsAt: 0, pausedAt: 0, pausedBy: null, giverPauseUsed: false, why: "", bonus: 0, credited: {},
  };
  return next;
}

/** Host skips a giver who isn't there. Rotation advances past them. */
export function skipGiver(s: GameState): GameState {
  requirePhase(s, "turn");
  if (s.turn!.status !== "ready") throw new RuleError("turn_already_live");
  const next = clone(s);
  if (s.settings.mode === "teams") next.teams![s.turnTeam].next++;
  else next.orderIdx++;
  next.phase = "round";
  next.turn = null;
  return next;
}

export function startTurn(s: GameState, pid: string, ctx: Ctx): GameState {
  requirePhase(s, "turn");
  const t = s.turn!;
  if (t.giver !== pid) throw new RuleError("not_the_giver");
  if (t.status !== "ready") throw new RuleError("turn_already_live");
  if (!s.pool.length) throw new RuleError("bowl_empty");
  const next = clone(s);
  const seconds = s.settings.timerSec + (s.settings.carryoverSeconds ? s.carry : 0);
  next.carry = 0;
  next.turn!.status = "live";
  next.turn!.endsAt = ctx.now + seconds * 1000;
  next.turn!.cur = next.pool[0];
  next.turn!.seen = [next.pool[0]];
  return next;
}

const nextUnseen = (pool: number[], seen: number[]) => pool.find((i) => !seen.includes(i));

function advance(next: GameState, ctx: Ctx): GameState {
  const t = next.turn!;
  const nx = nextUnseen(next.pool, t.seen);
  if (nx === undefined) return endTurn(next, "empty", ctx);
  t.cur = nx;
  t.seen.push(nx);
  return next;
}

/** The giver taps Got it. In FFA pass the guesser's id. */
export function gotIt(s: GameState, pid: string, ctx: Ctx, guesserId?: string): GameState {
  requirePhase(s, "turn");
  const t = s.turn!;
  if (t.giver !== pid) throw new RuleError("not_the_giver");
  if (t.status !== "live") throw new RuleError("turn_not_live");
  if (ctx.now >= t.endsAt) return tick(s, ctx);
  const next = clone(s);
  const nt = next.turn!;
  const cur = nt.cur!;
  next.pool = next.pool.filter((i) => i !== cur);
  nt.got.push(cur);
  next.given[pid] = (next.given[pid] ?? 0) + 1;
  if (s.settings.mode === "teams") {
    next.teams![nt.team!].pts++;
  } else {
    if (!guesserId || guesserId === pid || !s.players[guesserId]) throw new RuleError("need_guesser");
    next.pts[guesserId] = (next.pts[guesserId] ?? 0) + 1;
    nt.credited[cur] = guesserId;
  }
  return advance(next, ctx);
}

/** The giver taps Skip. Card goes back to the end of the pool; max skipsPerTurn. */
export function skip(s: GameState, pid: string, ctx: Ctx): GameState {
  requirePhase(s, "turn");
  const t = s.turn!;
  if (t.giver !== pid) throw new RuleError("not_the_giver");
  if (t.status !== "live") throw new RuleError("turn_not_live");
  if (t.skips >= s.settings.skipsPerTurn) throw new RuleError("no_skips_left");
  if (ctx.now >= t.endsAt) return tick(s, ctx);
  const next = clone(s);
  const nt = next.turn!;
  const cur = nt.cur!;
  nt.skips++;
  next.bowl[cur].skips++;
  next.pool = [...next.pool.filter((i) => i !== cur), cur];
  return advance(next, ctx);
}

/**
 * Anyone in the room protests: the giver said a word on the card.
 * Only the giver can skip, but anyone can buzz. Penalty per settings.
 * Three buzzes in one turn end the turn.
 */
export function buzz(s: GameState, byPid: string, ctx: Ctx): GameState {
  requirePhase(s, "turn");
  const t = s.turn!;
  if (t.status !== "live") throw new RuleError("turn_not_live");
  if (byPid === t.giver) throw new RuleError("giver_cannot_buzz");
  if (!s.players[byPid]) throw new RuleError("no_such_player");
  const next = clone(s);
  const nt = next.turn!;
  const cur = nt.cur!;
  nt.buzzes++;
  next.bowl[cur].buzzes++;
  if (s.settings.buzzPenalty === "point") {
    if (s.settings.mode === "teams") next.teams![nt.team!].pts = Math.max(0, next.teams![nt.team!].pts - 1);
    else next.pts[nt.giver] = Math.max(0, (next.pts[nt.giver] ?? 0) - 1);
  }
  if (nt.buzzes >= 3) return endTurn(next, "buzzed", ctx);
  if (s.settings.buzzPenalty === "none") return next;
  // 'card' (default) and 'point': the card is forfeited back into the bowl and the giver moves on.
  next.pool = [...next.pool.filter((i) => i !== cur), cur];
  return advance(next, ctx);
}

/** Giver pauses once per turn for 15 s; host pauses any time (pass host id). */
export function pause(s: GameState, pid: string, ctx: Ctx): GameState {
  requirePhase(s, "turn");
  const t = s.turn!;
  if (t.status !== "live") throw new RuleError("turn_not_live");
  const isHost = pid === s.host;
  if (!isHost) {
    if (pid !== t.giver) throw new RuleError("not_the_giver");
    if (t.giverPauseUsed) throw new RuleError("pause_used");
  }
  const next = clone(s);
  next.turn!.status = "paused";
  next.turn!.pausedAt = ctx.now;
  next.turn!.pausedBy = isHost ? "host" : "giver";
  if (!isHost) next.turn!.giverPauseUsed = true;
  return next;
}

export function resume(s: GameState, pid: string, ctx: Ctx): GameState {
  requirePhase(s, "turn");
  const t = s.turn!;
  if (t.status !== "paused") throw new RuleError("not_paused");
  if (pid !== s.host && pid !== t.giver) throw new RuleError("not_allowed");
  const next = clone(s);
  const nt = next.turn!;
  let pausedFor = ctx.now - nt.pausedAt;
  if (nt.pausedBy === "giver") pausedFor = Math.min(pausedFor, GIVER_PAUSE_MS);
  nt.endsAt += pausedFor;
  nt.pausedAt = 0;
  nt.pausedBy = null;
  nt.status = "live";
  return next;
}

/** Called by the server clock. Ends the turn when time is up; also auto-resumes a giver pause past 15 s. */
export function tick(s: GameState, ctx: Ctx): GameState {
  if (s.phase !== "turn" || !s.turn) return s;
  const t = s.turn;
  if (t.status === "paused" && t.pausedBy === "giver" && ctx.now - t.pausedAt >= GIVER_PAUSE_MS) {
    const resumed = resume(s, t.giver, { ...ctx, now: t.pausedAt + GIVER_PAUSE_MS });
    return tick(resumed, ctx);
  }
  if (t.status === "live" && ctx.now >= t.endsAt) return endTurn(s, "time", ctx);
  return s;
}

export const secondsLeft = (s: GameState, now: number): number => {
  const t = s.turn;
  if (!t || t.status === "ready" || t.status === "done") return 0;
  const end = t.status === "paused" ? t.endsAt + (now - t.pausedAt) : t.endsAt;
  return Math.max(0, Math.ceil((end - now) / 1000));
};

export function endTurn(s: GameState, why: Turn["why"], ctx: Ctx): GameState {
  if (s.phase !== "turn" || !s.turn) return s;
  const next = clone(s);
  const t = next.turn!;
  t.status = "done";
  t.why = why;
  // Leftover seconds: vanish by default; carry when the house rule is on and the bowl emptied.
  if (why === "empty" && s.settings.carryoverSeconds && t.endsAt) {
    next.carry = Math.max(0, Math.ceil((t.endsAt - ctx.now) / 1000));
  }
  t.endsAt = 0;
  t.cur = null;
  if (s.settings.mode === "ffa") {
    t.bonus = Math.floor(t.got.length / 2);
    next.pts[t.giver] = (next.pts[t.giver] ?? 0) + t.bonus;
    next.orderIdx++;
  } else {
    next.teams![t.team!].next++;
    next.turnsGiven[t.team!]++;
  }
  next.phase = "turnend";
  return next;
}

/** Host moves on after a turn summary: next giver, next round, or final. */
export function continueGame(s: GameState, ctx: Ctx): GameState {
  requirePhase(s, "turnend");
  const next = clone(s);
  if (next.pool.length > 0) {
    if (next.settings.mode === "teams") next.turnTeam = (1 - next.turnTeam) as 0 | 1;
    next.phase = "round";
    next.turn = null;
    return announceTurn(next);
  }
  next.round++;
  if (next.round < next.settings.rounds) return beginRound(next, ctx);
  next.phase = "final";
  next.turn = null;
  return next;
}

/* ---------- results ---------- */

export interface Awards {
  winner: string; // team name, player name(s), or "tie"
  tie: boolean;
  bestGiver: { id: string; count: number } | null;
  mostSkipped: { index: number; text: string; skips: number } | null;
  hardestCustom: { index: number; text: string; by: string; skips: number } | null;
}

export function awards(s: GameState): Awards {
  requirePhase(s, "final");
  let winner = "";
  let tie = false;
  if (s.settings.mode === "teams") {
    const [a, b] = s.teams!;
    tie = a.pts === b.pts;
    winner = tie ? "tie" : a.pts > b.pts ? a.name : b.name;
  } else {
    const ranked = activePlayers(s).sort((x, y) => (s.pts[y.id] ?? 0) - (s.pts[x.id] ?? 0));
    const top = ranked.filter((p) => s.pts[p.id] === s.pts[ranked[0].id]);
    tie = top.length > 1;
    winner = top.map((p) => p.name).join(" & ");
  }
  const givers = Object.entries(s.given).sort((a, b) => b[1] - a[1]);
  const bestGiver = givers.length ? { id: givers[0][0], count: givers[0][1] } : null;
  const bySkips = s.bowl.map((c, index) => ({ ...c, index })).sort((a, b) => b.skips - a.skips);
  const mostSkipped = bySkips.length ? { index: bySkips[0].index, text: bySkips[0].text, skips: bySkips[0].skips } : null;
  const customs = bySkips.filter((c) => c.custom);
  const hardestCustom = customs.length ? { index: customs[0].index, text: customs[0].text, by: customs[0].by, skips: customs[0].skips } : null;
  return { winner, tie, bestGiver, mostSkipped, hardestCustom };
}

/** Same room, same players, fresh bowl: back to the lobby keeping names and settings. */
export function playAgain(s: GameState): GameState {
  requirePhase(s, "final");
  const next = clone(s);
  next.phase = "lobby";
  for (const p of Object.values(next.players)) {
    p.hand = []; p.locked = false; p.picks = []; p.redrawn = false; p.lateJoiner = false;
  }
  next.cards = []; next.spare = []; next.bowl = []; next.pool = []; next.round = 0;
  next.teams = null; next.turn = null; next.pts = {}; next.given = {}; next.order = []; next.orderIdx = 0;
  next.turnsGiven = [0, 0]; next.carry = 0;
  return next;
}

/* ---------- views ---------- */

/**
 * What one player is allowed to see. Hands are private; the clue text is only
 * ever in the giver's view. This is what the server sends over the wire.
 */
export interface PlayerView {
  code: string;
  phase: GameState["phase"];
  me: string;
  isHost: boolean;
  settings: Settings;
  players: { id: string; name: string; connected: boolean; locked: boolean; team: 0 | 1 | null; lateJoiner: boolean }[];
  myHand: { text: string; deck: string }[];
  myRedrawn: boolean;
  myLocked: boolean;
  teams: { name: string; pts: number; members: string[] }[] | null;
  pts: Record<string, number>;
  round: number;
  roundInfo: (typeof ROUNDS)[number] | null;
  bowlSize: number;
  poolSize: number;
  turn: null | {
    giver: string;
    team: 0 | 1 | null;
    status: Turn["status"];
    skips: number;
    skipsLeft: number;
    buzzes: number;
    gotCount: number;
    got: { text: string; custom: boolean; by: string }[];
    endsAt: number;
    pausedAt: number;
    why: Turn["why"];
    bonus: number;
    /** Only present for the giver while live. */
    card: { text: string; custom: boolean; by: string | null; deck: string | null } | null;
    canPause: boolean;
  };
  awards: Awards | null;
}

export function viewFor(s: GameState, pid: string): PlayerView {
  const me = s.players[pid];
  const t = s.turn;
  const isGiver = !!t && t.giver === pid;
  const showCard = isGiver && t!.status !== "ready" && t!.status !== "done" && t!.cur !== null;
  const cur = showCard ? s.bowl[t!.cur!] : null;
  return {
    code: s.code,
    phase: s.phase,
    me: pid,
    isHost: pid === s.host,
    settings: s.settings,
    players: playerList(s).map((p) => ({ id: p.id, name: p.name, connected: p.connected, locked: p.locked, team: teamOf(s, p.id), lateJoiner: p.lateJoiner })),
    myHand: me && s.phase === "pick" ? me.hand.map((i) => ({ text: s.cards[i].text, deck: s.cards[i].deck })) : [],
    myRedrawn: me?.redrawn ?? false,
    myLocked: me?.locked ?? false,
    teams: s.teams ? s.teams.map((x) => ({ name: x.name, pts: x.pts, members: x.members })) : null,
    pts: s.pts,
    round: s.round,
    roundInfo: s.phase === "lobby" || s.phase === "pick" ? null : ROUNDS[s.round] ?? null,
    bowlSize: s.bowl.length,
    poolSize: s.pool.length,
    turn: t
      ? {
          giver: t.giver, team: t.team, status: t.status, skips: t.skips, skipsLeft: Math.max(0, s.settings.skipsPerTurn - t.skips),
          buzzes: t.buzzes, gotCount: t.got.length,
          got: t.status === "done" ? t.got.map((i) => ({ text: s.bowl[i].text, custom: s.bowl[i].custom, by: s.bowl[i].by })) : [],
          endsAt: t.endsAt, pausedAt: t.pausedAt, why: t.why, bonus: t.bonus,
          card: cur ? { text: cur.text, custom: cur.custom, by: cur.custom ? cur.by : null, deck: cur.deck } : null,
          canPause: isGiver ? !t.giverPauseUsed : pid === s.host,
        }
      : null,
    awards: s.phase === "final" ? awards(s) : null,
  };
}
