/** Shared types for the Vulgar Acts rules engine. */

export type Mode = "teams" | "ffa";
export type Phase = "lobby" | "pick" | "round" | "turn" | "turnend" | "final";
export type TurnStatus = "ready" | "live" | "paused" | "done";
export type TurnEnd = "time" | "empty" | "buzzed" | "forced" | "";
export type BuzzPenalty = "none" | "card" | "point";

export interface Settings {
  mode: Mode;
  rounds: 2 | 3;
  timerSec: number;
  cardsPerPlayer: number;
  decks: string[];
  skipsPerTurn: number;
  buzzPenalty: BuzzPenalty;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "teams",
  rounds: 3,
  timerSec: 60,
  cardsPerPlayer: 3,
  decks: ["starter"],
  skipsPerTurn: 3,
  buzzPenalty: "card",
};

export interface Player {
  id: string;
  name: string;
  avatar: number; // 0..11, index into the avatar set
  joined: number;
  connected: boolean;
  /** Indexes into the deck card list dealt to this player. */
  hand: number[];
  redrawn: boolean;
  locked: boolean;
  /** Final picks for the bowl; set when locked. */
  picks: PickedCard[];
  /** True if the player joined after the bowl was built. Guesser only this game. */
  lateJoiner: boolean;
}

export interface DeckCard {
  id: string;
  text: string;
  deck: string;
}

export interface PickedCard {
  text: string;
  custom: boolean;
}

export interface BowlCard {
  text: string;
  custom: boolean;
  by: string; // player id
  deck: string | null;
  skips: number;
  buzzes: number;
}

export interface Team {
  name: string;
  members: string[];
  pts: number;
  /** Rotation pointer: next giver = members[next % members.length] among connected members. */
  next: number;
}

export interface Turn {
  giver: string;
  team: 0 | 1 | null;
  status: TurnStatus;
  skips: number;
  buzzes: number;
  got: number[]; // bowl indexes guessed this turn
  seen: number[]; // bowl indexes shown this turn (so skips don't recycle)
  cur: number | null; // bowl index on screen
  endsAt: number; // ms epoch; 0 when not live
  pausedAt: number; // ms epoch when paused; 0 otherwise
  pausedBy: "giver" | "host" | null;
  giverPauseUsed: boolean;
  why: TurnEnd;
  bonus: number;
  credited: Record<number, string>; // bowl index -> guesser id (ffa)
}

export interface GameState {
  code: string;
  phase: Phase;
  host: string;
  settings: Settings;
  players: Record<string, Player>;
  cards: DeckCard[]; // dealable cards for this game, after variant filtering
  spare: number[]; // undealt card indexes, for redraws
  bowl: BowlCard[];
  pool: number[]; // bowl indexes still to be guessed this round, in draw order
  round: number; // 0-based
  teams: [Team, Team] | null;
  turnTeam: 0 | 1;
  turnsGiven: [number, number];
  order: string[]; // ffa giver order
  orderIdx: number;
  pts: Record<string, number>; // ffa points
  given: Record<string, number>; // cards got through per giver, all modes
  turn: Turn | null;
  /** Set by the host after a sudden-death tie-break. */
  suddenDeathWinner: 0 | 1 | null;
}

export interface Ctx {
  now: number;
  random: () => number;
}

export class RuleError extends Error {
  constructor(public code: string, message?: string) {
    super(message ? `${code}: ${message}` : code);
  }
}
