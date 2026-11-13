/**
 * The host screen: a TV or laptop that shows the room to everyone.
 * It never takes a seat. If this device created the room it has host powers
 * (settings, deal, start), operated with the mouse or trackpad.
 */
import { useEffect, useState } from "preact/hooks";
import { Connection, myPid } from "./net";
import type { PlayerView } from "../../server/src/protocol";
import { Wordmark, Avatar, Panel } from "./ui";
import { SettingsPanel, TeamsPanel } from "./Lobby";
import { Scoreboard, useSecondsLeft, useBuzzShake, ROUND_NAMES } from "./Turn";
import { FinalScreen } from "./Final";

export function HostScreen({ code }: { code: string }) {
  const [conn] = useState(() => new Connection(code, myPid(), "", 0, true));
  const [view, setView] = useState<PlayerView | null>(null);
  const [status, setStatus] = useState(conn.status);
  useEffect(() => {
    const off = conn.on((m) => {
      if (m.t === "view") { setView(m.view); setStatus("open"); }
      if (m.t === "error" && m.code === "reconnecting") setStatus("reconnecting");
    });
    return () => { off(); conn.close(); };
  }, [conn]);
  const joinUrl = `${location.origin}${location.pathname}#${code}`;

  if (!view) return <div class="stage tv"><div class="wide"><Wordmark /><Panel><p>{status === "reconnecting" ? "Reconnecting…" : "Opening the room…"}</p></Panel></div></div>;

  return (
    <div class="stage tv">
      <div class="wide">
        <div class="row between"><Wordmark /><span class="pill">Host screen · room {code}</span></div>

        {view.phase === "lobby" && (
          <div class="cols">
            <div class="col">
              <Panel>
                <p class="tag ink">Join at</p>
                <div class="linkbox">{joinUrl}</div>
                <div class="code big">{code}</div>
                <p class="sub center">Open the link on your phone and enter the code</p>
              </Panel>
              <Panel title={`${view.players.length} in the room`}>
                <div class="chips big">
                  {view.players.length === 0 && <span class="sub">Waiting for players…</span>}
                  {view.players.map((p) => <span key={p.id} class={"chip av" + (p.connected ? "" : " off")}><Avatar n={p.avatar} size={28} />{p.name}</span>)}
                </div>
              </Panel>
            </div>
            {view.isHost && (
              <div class="col">
                <SettingsPanel view={view} conn={conn} />
                <button class="primary" disabled={view.players.length < (view.settings.mode === "ffa" ? 3 : 4)} onClick={() => conn.action("deal")}>Deal the cards</button>
                <p class="small">Need {view.settings.mode === "ffa" ? 3 : 4}+ players. Bowl will hold {view.players.length * view.settings.cardsPerPlayer} cards.</p>
              </div>
            )}
          </div>
        )}

        {view.phase === "pick" && (
          <div class="cols">
            <div class="col">
              <Panel title="Building the bowl">
                <p class="sub">Everyone picks {view.settings.cardsPerPlayer} cards on their phone, or writes their own.</p>
                <div class="chips big">
                  {view.players.map((p) => <span key={p.id} class={"chip av" + (p.locked ? " ok" : "")}><Avatar n={p.avatar} size={28} />{p.name} {p.locked ? "✓" : "…"}</span>)}
                </div>
                <p><b>{view.players.filter((p) => p.locked).length} of {view.players.length}</b> locked in</p>
              </Panel>
              {view.isHost && (
                <>
                  <button class="primary" disabled={!view.players.every((p) => p.locked)} onClick={() => conn.action("start")}>Start the game</button>
                  <button onClick={() => conn.action("start", { force: true })}>Start with who's ready</button>
                </>
              )}
            </div>
            <div class="col">{view.teams && <TeamsPanel view={view} conn={conn} />}</div>
          </div>
        )}

        {view.phase === "round" && <RoundIntroTV view={view} conn={conn} />}
        {view.phase === "turn" && <TurnTV view={view} conn={conn} />}
        {view.phase === "turnend" && <TurnEndTV view={view} conn={conn} />}
        {view.phase === "final" && <FinalScreen view={view} conn={conn} tv />}
      </div>
    </div>
  );
}

const RULES = ["Say anything you like. Not a word that's on the card.", "Say exactly one word. Then act it out.", "No sound at all. Mime it."];

function RoundIntroTV({ view, conn }: { view: PlayerView; conn: Connection }) {
  return (
    <div class="cols">
      <div class="col">
        <div class="alert tvalert">
          <p class="tag ink">Round {view.round + 1} of {view.settings.rounds}</p>
          <h1 class="huge">{ROUND_NAMES[view.round]}</h1>
          <p class="rule">{RULES[view.round]}</p>
          <p class="sub">{view.poolSize} cards in the bowl</p>
        </div>
        {view.isHost && <button class="primary" onClick={() => conn.action("announce")}>Who's up?</button>}
      </div>
      <div class="col"><Scoreboard view={view} /></div>
    </div>
  );
}

function TurnTV({ view, conn }: { view: PlayerView; conn: Connection }) {
  const t = view.turn!;
  const giver = view.players.find((p) => p.id === t.giver);
  const secs = useSecondsLeft(view, conn);
  useBuzzShake(conn, ".tvbox");
  const who = t.team !== null && view.teams ? `${view.teams[t.team].name} guesses` : "Everyone guesses";
  return (
    <div class="cols">
      <div class="col">
        <div class="alert tvalert tvbox">
          <p class="tag ink">{t.status === "ready" ? "Up next" : t.status === "paused" ? "Paused" : "Giving clues"}</p>
          <h1 class="huge"><Avatar n={giver?.avatar ?? 0} size={56} /> {giver?.name}</h1>
          <p class="rule">{who} · Round {view.round + 1}: {ROUND_NAMES[view.round]}</p>
          {t.status === "ready"
            ? <p class="sub">Waiting for {giver?.name} to tap Ready…</p>
            : <div class={"timer tvtimer" + (secs <= 10 && t.status === "live" ? " hot" : "")}>{secs}</div>}
          {t.status !== "ready" && <p class="sub">{view.poolSize} left in the bowl · got {t.gotCount} · skips used {t.skips}</p>}
        </div>
        {view.isHost && t.status === "ready" && <button onClick={() => conn.action("skipGiver")}>{giver?.name} isn't here, skip to next giver</button>}
        {view.isHost && t.status !== "ready" && (
          <div class="row">
            {t.status === "paused" ? <button onClick={() => conn.action("resume")}>Resume</button> : <button onClick={() => conn.action("pause")}>Pause</button>}
            <button onClick={() => conn.action("endTurn")}>End this turn now</button>
          </div>
        )}
      </div>
      <div class="col"><Scoreboard view={view} /></div>
    </div>
  );
}

function TurnEndTV({ view, conn }: { view: PlayerView; conn: Connection }) {
  const t = view.turn!;
  const giver = view.players.find((p) => p.id === t.giver);
  const over = view.poolSize === 0;
  return (
    <div class="cols">
      <div class="col">
        <Panel>
          <h2>{t.why === "empty" ? "Bowl empty!" : t.why === "buzzed" ? "Buzzed out!" : "Time!"}</h2>
          <p>{giver?.name} got <b>{t.gotCount}</b> through{t.bonus ? ` and earns a ${t.bonus}-point giver bonus` : ""}. {t.skips} skip{t.skips === 1 ? "" : "s"} used.</p>
          <div class="list">{t.got.map((c, i) => <div key={i}><span>{c.text}</span><span>✓</span></div>)}{t.got.length === 0 && <p class="sub">Nothing this time. Brutal.</p>}</div>
        </Panel>
        {view.isHost && <button class="primary" onClick={() => conn.action("continue")}>{over ? (view.round + 1 < view.settings.rounds ? "Next round" : "Final scores") : "Next giver"}</button>}
      </div>
      <div class="col"><Scoreboard view={view} /></div>
    </div>
  );
}
