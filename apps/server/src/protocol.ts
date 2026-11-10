/**
 * Wire protocol between phones and the room server. Shared with the web app.
 * Clients send ClientMsg; the server answers with ServerMsg. Every state change
 * is pushed to every connected socket as that player's own `view`.
 */
import type { PlayerView, Settings, Pick } from "@vulgar-acts/engine";

export type ClientMsg =
  | { t: "join"; pid: string; name: string; avatar?: number }
  /** A host screen (TV, laptop): watches the room without taking a seat. Has host powers if it created the room. */
  | { t: "watch"; pid: string }
  | { t: "action"; name: ActionName; args?: Record<string, unknown> }
  | { t: "ping" };

export type ActionName =
  | "settings"      // host: { patch: Partial<Settings> }
  | "deal"          // host
  | "redraw"
  | "lock"          // { picks: Pick[] }
  | "start"         // host (start game; { force?: boolean } to start without everyone locked)
  | "announce"      // host: pick the next giver
  | "skipGiver"     // host
  | "startTurn"     // giver
  | "gotIt"         // giver: { guesser?: string }
  | "skip"          // giver
  | "buzz"          // anyone but giver
  | "pause"         // giver or host
  | "resume"        // giver or host
  | "endTurn"       // host: force end
  | "continue"      // host
  | "playAgain"     // host
  | "remove"        // host: { pid }
  | "renameTeam"    // host: { team: 0|1, name }
  | "moveTeam"      // host: { pid, team: 0|1 }
  | "shuffleTeams"  // host
  | "leave";

export type ServerMsg =
  | { t: "view"; view: PlayerView; now: number }
  | { t: "error"; code: string; message?: string }
  | { t: "buzz"; by: string; at: number }
  | { t: "pong"; now: number };

export type { PlayerView, Settings, Pick };
