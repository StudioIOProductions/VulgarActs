import type { PlayerView, Settings } from "../../server/src/protocol";
import type { Connection } from "./net";
import { Avatar, Seg, Toggle, Panel } from "./ui";

const DECKS = [{ v: "starter", label: "Starter" }, { v: "afterdark", label: "After Dark 18+" }];
const minFor = (mode: Settings["mode"]) => (mode === "ffa" ? 3 : 4);

export function PlayerChips({ view, showLock = false }: { view: PlayerView; showLock?: boolean }) {
  return (
    <div class="chips">
      {view.players.map((p) => (
        <span key={p.id} class={"chip av" + (p.connected ? "" : " off") + (showLock && p.locked ? " ok" : "")}>
          <Avatar n={p.avatar} size={22} />{p.name}{p.id === view.me ? " (you)" : ""}{p.connected ? "" : " · away"}{showLock ? (p.locked ? " ✓" : " …") : ""}
        </span>
      ))}
    </div>
  );
}

/** Host-only settings panel. Used on the host's phone and on the host screen. */
export function SettingsPanel({ view, conn }: { view: PlayerView; conn: Connection }) {
  const st = view.settings;
  const set = (patch: Partial<Settings>) => conn.action("settings", { patch });
  return (
    <Panel title="Settings">
      <label>Mode</label>
      <Seg id="mode" value={st.mode} options={[{ v: "teams", label: "Two teams" }, { v: "ffa", label: "Free-for-all" }]} onChange={(v) => set({ mode: v })} />
      <label>Rounds</label>
      <Seg id="rounds" value={st.rounds} options={[{ v: 2, label: "2" }, { v: 3, label: "3" }]} onChange={(v) => set({ rounds: v as 2 | 3 })} />
      <label>Turn timer</label>
      <Seg id="timer" value={st.timerSec} options={[30, 45, 60, 90].map((v) => ({ v, label: `${v} s` }))} onChange={(v) => set({ timerSec: v })} />
      <label>Cards each puts in the bowl</label>
      <Seg id="per" value={st.cardsPerPlayer} options={[3, 4, 5].map((v) => ({ v, label: String(v) }))} onChange={(v) => set({ cardsPerPlayer: v })} />
      <label>Decks in play</label>
      <Toggle id="decks" values={st.decks} options={DECKS} onChange={(v) => set({ decks: v })} />
      <label>When someone buzzes a card word</label>
      <Seg id="buzz" value={st.buzzPenalty} options={[{ v: "card", label: "Lose the card" }, { v: "point", label: "Lose a point" }, { v: "none", label: "Nothing" }]} onChange={(v) => set({ buzzPenalty: v })} />
    </Panel>
  );
}

export function Lobby({ view, conn }: { view: PlayerView; conn: Connection }) {
  const me = view.players.find((p) => p.id === view.me);
  const min = minFor(view.settings.mode);
  const enough = view.players.length >= min;
  return (
    <>
      <div class="alert">
        <p class="tag ink">{me ? `You're in, ${me.name}` : "Lobby"}</p>
        <h1>{view.isHost ? "You're the host" : "Waiting for the host"}</h1>
        <p class="sub">{view.players.length} in the room{!view.isHost && view.hostName ? ` · ${view.hostName} is hosting` : ""}</p>
      </div>
      <Panel title="Who's here"><PlayerChips view={view} /></Panel>
      {view.isHost && (
        <>
          <Panel title="Share the code"><div class="code">{view.code}</div><p class="sub">Friends open this same address and type the code.</p></Panel>
          <SettingsPanel view={view} conn={conn} />
          <button class="primary" disabled={!enough} onClick={() => conn.action("deal")}>Deal the cards</button>
          <p class="small">{enough ? `Bowl will hold ${view.players.length * view.settings.cardsPerPlayer} cards.` : `Need ${min}+ players (${view.players.length} so far).`}</p>
        </>
      )}
    </>
  );
}

/** Host controls during the pick phase: teams and the start buttons. The hand itself is in Pick.tsx. */
export function PickPhase({ view, conn }: { view: PlayerView; conn: Connection }) {
  const locked = view.players.filter((p) => p.locked).length;
  return (
    <>
      {view.teams && <TeamsPanel view={view} conn={conn} />}
      <Panel title="Host controls">
        <p class="sub">{locked} of {view.players.length} locked in.</p>
        <button class="primary" disabled={locked < view.players.length} onClick={() => conn.action("start")}>Start the game</button>
        {locked < view.players.length && locked >= minFor(view.settings.mode) && (
          <button onClick={() => conn.action("start", { force: true })}>Start with who's ready</button>
        )}
      </Panel>
    </>
  );
}

export function TeamsPanel({ view, conn }: { view: PlayerView; conn: Connection }) {
  if (!view.teams) return null;
  const canEdit = view.isHost && view.phase === "pick";
  return (
    <Panel title="Teams">
      <div class="teams">
        {view.teams.map((t, ti) => (
          <div key={ti} class={"team t" + ti}>
            {canEdit ? (
              <input class="teamname" value={t.name} maxLength={20} onChange={(e) => conn.action("renameTeam", { team: ti, name: (e.target as HTMLInputElement).value })} />
            ) : <h3>{t.name}</h3>}
            {t.members.map((id) => {
              const p = view.players.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div key={id} class="member">
                  <Avatar n={p.avatar} size={22} /><span class="mname">{p.name}</span>
                  {canEdit && <button class="tiny" onClick={() => conn.action("moveTeam", { pid: id, team: 1 - ti })} aria-label={`Move ${p.name} to the other team`}>{ti === 0 ? "→" : "←"}</button>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {canEdit && <button onClick={() => conn.action("shuffleTeams")}>Shuffle teams</button>}
    </Panel>
  );
}
