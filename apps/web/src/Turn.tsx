/**
 * The turn, on a phone: You're up → the giver's card view, or the guesser's
 * Buzz view, then the turn summary. The clock is the server's; phones only
 * display it, using the connection's clock offset so every screen agrees.
 */
import { useEffect, useState } from "preact/hooks";
import type { PlayerView } from "../../server/src/protocol";
import type { Connection } from "./net";
import { Avatar, Panel } from "./ui";

export const ROUND_NAMES = ["Say Anything", "One Word", "Act Only"];

/** Seconds left on the server clock, re-rendered four times a second. */
export function useSecondsLeft(view: PlayerView, conn: Connection): number {
  const t = view.turn;
  const calc = () => {
    if (!t || t.status === "ready" || t.status === "done") return 0;
    const end = t.status === "paused" ? t.endsAt + (conn.now() - t.pausedAt) : t.endsAt;
    return Math.max(0, Math.ceil((end - conn.now()) / 1000));
  };
  const [s, setS] = useState(calc);
  useEffect(() => {
    setS(calc());
    const id = setInterval(() => setS(calc()), 250);
    return () => clearInterval(id);
  }, [t?.endsAt, t?.status, t?.pausedAt]);
  return s;
}

/** Shake whatever element has the class when the server says someone buzzed. */
export function useBuzzShake(conn: Connection, selector: string) {
  useEffect(() => conn.on((m) => {
    if (m.t !== "buzz") return;
    const el = document.querySelector(selector);
    if (el) { el.classList.remove("shake"); void (el as HTMLElement).offsetWidth; el.classList.add("shake"); }
    try { navigator.vibrate?.([80, 40, 80]); } catch {}
  }), [conn, selector]);
}

export function Scoreboard({ view }: { view: PlayerView }) {
  if (view.teams) {
    return (
      <div class="score">
        {view.teams.map((t, i) => <div key={i} class={"t" + i}><div class="n">{t.pts}</div>{t.name}</div>)}
      </div>
    );
  }
  const ranked = [...view.players].filter((p) => p.locked || p.lateJoiner).sort((a, b) => (view.pts[b.id] ?? 0) - (view.pts[a.id] ?? 0));
  return (
    <Panel>
      <div class="list">{ranked.map((p) => <div key={p.id}><span><Avatar n={p.avatar} size={20} /> {p.name}</span><span>{view.pts[p.id] ?? 0}</span></div>)}</div>
    </Panel>
  );
}

export function TurnPhone({ view, conn }: { view: PlayerView; conn: Connection }) {
  const t = view.turn!;
  const giver = view.players.find((p) => p.id === t.giver);
  const isGiver = t.giver === view.me;
  const secs = useSecondsLeft(view, conn);
  useBuzzShake(conn, ".shakeable");
  const round = ROUND_NAMES[view.round];
  const guessingTeam = t.team !== null && view.teams ? view.teams[t.team].name : null;
  const myTeam = view.players.find((p) => p.id === view.me)?.team ?? null;
  const mine = t.team === null || myTeam === t.team;

  if (isGiver && t.status === "ready") {
    return (
      <>
        <div class="alert">
          <p class="tag ink">You're up!</p>
          <h1>{giver?.name}</h1>
          <p class="sub">{guessingTeam ? `${guessingTeam} guesses` : "Everyone guesses"} · Round {view.round + 1}: {round}</p>
          <p class="sub">{view.poolSize} cards left · {view.settings.timerSec} seconds · {view.settings.skipsPerTurn} skips</p>
        </div>
        <button class="primary" onClick={() => conn.action("startTurn")}>Ready, start the clock</button>
      </>
    );
  }
  if (isGiver) return <GiverLive view={view} conn={conn} secs={secs} />;

  return (
    <>
      <div class="strip"><span><Avatar n={giver?.avatar ?? 0} size={22} /> {giver?.name} is up</span><span class={"timer" + (secs <= 10 && t.status === "live" ? " hot" : "")}>{t.status === "ready" ? "—" : secs}</span><span>{view.poolSize} left</span></div>
      <div class="alert shakeable">
        <p class="tag ink">{t.status === "ready" ? "Get ready" : t.status === "paused" ? "Paused" : mine ? "Your team guesses" : "Other team is up"}</p>
        <h1>{t.status === "ready" ? `Waiting for ${giver?.name}` : mine ? "Shout it out!" : "Watch and judge"}</h1>
        <p class="sub">Round {view.round + 1}: {round}</p>
      </div>
      <button class="buzz" disabled={t.status !== "live"} onClick={() => conn.action("buzz")}>Buzz!</button>
      <p class="small">Buzz if the giver says a word on the card. Anyone can.</p>
      <Scoreboard view={view} />
    </>
  );
}

function GiverLive({ view, conn, secs }: { view: PlayerView; conn: Connection; secs: number }) {
  const t = view.turn!;
  const [crediting, setCrediting] = useState(false);
  const card = t.card;
  const ffa = view.settings.mode === "ffa";
  const others = view.players.filter((p) => p.id !== view.me && (p.locked || p.lateJoiner));
  const paused = t.status === "paused";

  if (crediting && card) {
    return (
      <>
        <div class="strip"><span>Who got it?</span><span class="timer">{secs}</span><span></span></div>
        <div class={"bigcard" + (card.custom ? " custom" : "") + (card.deck === "afterdark" ? " dark" : "")} data-by={card.by ? view.players.find((p) => p.id === card.by)?.name : ""} style="min-height:120px;font-size:22px">{card.text}</div>
        <Panel>
          <div class="chips">{others.map((p) => <button key={p.id} class="yellow" onClick={() => { setCrediting(false); conn.action("gotIt", { guesser: p.id }); }}><Avatar n={p.avatar} size={20} /> {p.name}</button>)}</div>
          <button onClick={() => setCrediting(false)}>Nobody, go back</button>
        </Panel>
      </>
    );
  }
  return (
    <>
      <div class="strip"><span>You</span><span class={"timer" + (secs <= 10 && !paused ? " hot" : "")}>{secs}</span><span>{view.poolSize} left</span></div>
      <div class={"bigcard shakeable" + (card?.custom ? " custom" : "") + (card?.deck === "afterdark" ? " dark" : "") + (paused ? " paused" : "")} data-by={card?.by ? view.players.find((p) => p.id === card.by)?.name : ""}>
        {paused ? "Paused" : card?.text}
      </div>
      <div class="strip white"><span>Round {view.round + 1}: {ROUND_NAMES[view.round]}</span><span>Skips <span class="pips">{Array.from({ length: view.settings.skipsPerTurn }, (_, i) => <i key={i} class={i < t.skips ? "used" : ""} />)}</span></span></div>
      <div class="row">
        <button onClick={() => conn.action("skip")} disabled={t.skipsLeft === 0 || paused}>Skip</button>
        {paused
          ? <button onClick={() => conn.action("resume")}>Resume</button>
          : <button onClick={() => conn.action("pause")} disabled={!t.canPause}>{t.canPause ? "Pause (15 s)" : "Pause used"}</button>}
      </div>
      <button class="primary" disabled={paused} onClick={() => (ffa ? setCrediting(true) : conn.action("gotIt"))}>Got it!</button>
      <Scoreboard view={view} />
    </>
  );
}

export function TurnEndPhone({ view, conn }: { view: PlayerView; conn: Connection }) {
  const t = view.turn!;
  const giver = view.players.find((p) => p.id === t.giver);
  const over = view.poolSize === 0;
  return (
    <>
      <Panel>
        <h2>{t.why === "empty" ? "Bowl empty!" : t.why === "buzzed" ? "Buzzed out!" : "Time!"}</h2>
        <p>{giver?.name} got <b>{t.gotCount}</b> through{t.bonus ? ` and earns a ${t.bonus}-point giver bonus` : ""}. {t.skips} skip{t.skips === 1 ? "" : "s"} used.</p>
        <div class="list">{t.got.map((c, i) => <div key={i}><span>{c.text}{c.custom ? ` (by ${view.players.find((p) => p.id === c.by)?.name})` : ""}</span><span>✓</span></div>)}{t.got.length === 0 && <p class="sub">Nothing this time. Brutal.</p>}</div>
      </Panel>
      <Scoreboard view={view} />
      {view.isHost
        ? <button class="primary" onClick={() => conn.action("continue")}>{over ? (view.round + 1 < view.settings.rounds ? "Next round" : "Final scores") : "Next giver"}</button>
        : <p class="small">Waiting for the host…</p>}
    </>
  );
}

export function RoundIntroPhone({ view, conn }: { view: PlayerView; conn: Connection }) {
  const me = view.players.find((p) => p.id === view.me);
  const rule = ["Say anything you like. Not a word that's on the card.", "Say exactly one word. Then act it out.", "No sound at all. Mime it."][view.round];
  return (
    <>
      <div class="alert">
        <p class="tag ink">Round {view.round + 1} of {view.settings.rounds}</p>
        <h1>{ROUND_NAMES[view.round]}</h1>
        <p style="font-weight:700;font-size:18px;margin-top:8px">{rule}</p>
        {me?.team !== null && me?.team !== undefined && view.teams && <p class="sub" style="margin-top:8px">You're on {view.teams[me.team].name}</p>}
        <p class="sub">{view.poolSize} cards in the bowl</p>
      </div>
      <Scoreboard view={view} />
      {view.isHost ? <button class="primary" onClick={() => conn.action("announce")}>Who's up?</button> : <p class="small">Waiting for the host…</p>}
    </>
  );
}
