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

        {view.phase !== "lobby" && view.phase !== "pick" && (
          <Panel title={`Phase: ${view.phase}`}><p class="sub">Beat 6 and 8 build the turn and scoreboard views here.</p></Panel>
        )}
      </div>
    </div>
  );
}
