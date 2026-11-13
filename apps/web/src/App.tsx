import { useEffect, useState } from "preact/hooks";
import { Connection, createRoom, roomExists, myPid, savedName, saveName, savedAvatar, saveAvatar } from "./net";
import type { PlayerView } from "../../server/src/protocol";
import { Wordmark, Avatar, Seg, Toggle, Panel } from "./ui";
import { HostScreen } from "./HostScreen";
import { Lobby, PickPhase } from "./Lobby";
import { PickScreen, LockedScreen } from "./Pick";
import { TurnPhone, TurnEndPhone, RoundIntroPhone } from "./Turn";

/** Routes: ""  home · "#KXRT" play on this phone · "#KXRT/screen" host screen (TV/laptop) */
function route() {
  const m = location.hash.replace("#", "").toUpperCase().match(/^([A-Z]{4})(\/SCREEN)?$/);
  return m ? { code: m[1], screen: !!m[2] } : null;
}

export function App() {
  const [r, setR] = useState(route());
  useEffect(() => {
    const f = () => setR(route());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  if (!r) return <div class="stage"><div class="phone"><Home /></div></div>;
  if (r.screen) return <HostScreen code={r.code} />;
  return <div class="stage"><div class="phone"><Room code={r.code} /></div></div>;
}

/* ---------- home ---------- */

function Home() {
  const [join, setJoin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    const c = join.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(c)) return setErr("Codes are four letters.");
    setBusy(true);
    if (await roomExists(c)) location.hash = c; else setErr(`No room ${c}. Check the code with your host.`);
    setBusy(false);
  };
  const host = async (screen: boolean) => {
    setBusy(true);
    try { const c = await createRoom(myPid()); location.hash = screen ? `${c}/screen` : c; }
    catch { setErr("Couldn't reach the server. Is it running?"); }
    setBusy(false);
  };
  return (
    <>
      <Wordmark />
      <p class="tag">Charades with a filthy mouth</p>
      <Panel title="Join a room">
        <input class="code" id="join-code" value={join} maxLength={4} autocapitalize="characters" autocomplete="off" placeholder="ABCD"
          onInput={(e) => { setJoin((e.target as HTMLInputElement).value.toUpperCase()); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && go()} />
        <button class="primary" onClick={go} disabled={busy}>Join</button>
      </Panel>
      <Panel title="Host a room">
        <p class="sub">Hosting on a TV or laptop? Use the host screen: it shows the code, the timer and the scores, and you join from your phone like everyone else.</p>
        <button class="yellow" onClick={() => host(true)} disabled={busy}>Host screen on this device</button>
        <p class="sub">No big screen? Host from your phone. You play too.</p>
        <button onClick={() => host(false)} disabled={busy}>Host from this phone</button>
      </Panel>
      {err && <div class="panel error">{err}</div>}
    </>
  );
}

/* ---------- a player's phone ---------- */

function Room({ code }: { code: string }) {
  const [name, setName] = useState(savedName());
  const [avatar, setAvatar] = useState(savedAvatar());
  const [joined, setJoined] = useState(false);
  const submit = () => { if (!name.trim()) return; saveName(name.trim()); saveAvatar(avatar); setJoined(true); };
  if (!joined) {
    return (
      <>
        <Wordmark />
        <Panel>
          <h2>Room {code}</h2>
          <label for="name">Your name</label>
          <input id="name" value={name} maxLength={14} autocomplete="off" placeholder="Name"
            onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <label>Pick a face</label>
          <div class="avatars">
            {Array.from({ length: 12 }, (_, i) => (
              <button key={i} type="button" class="avbtn" aria-pressed={i === avatar} onClick={() => setAvatar(i)}><Avatar n={i} size={44} selected={i === avatar} /></button>
            ))}
          </div>
          <button class="primary" disabled={!name.trim()} onClick={submit}>Join</button>
        </Panel>
        <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); location.hash = ""; }}>← Different room</a></p>
      </>
    );
  }
  return <Live code={code} name={name.trim()} avatar={avatar} />;
}

function Live({ code, name, avatar }: { code: string; name: string; avatar: number }) {
  const [conn] = useState(() => new Connection(code, myPid(), name, avatar));
  const [view, setView] = useState<PlayerView | null>(null);
  const [status, setStatus] = useState(conn.status);
  const [err, setErr] = useState("");
  useEffect(() => {
    const off = conn.on((m) => {
      if (m.t === "view") { setView(m.view); setStatus("open"); setErr(""); }
      if (m.t === "error") { if (m.code === "reconnecting") setStatus("reconnecting"); else setErr(friendly(m.code)); }
    });
    return () => { off(); conn.close(); };
  }, [conn]);

  if (!view) return <><Wordmark /><Panel><p>{status === "reconnecting" ? "Reconnecting…" : `Joining room ${code}…`}</p>{err && <p class="sub">{err}</p>}</Panel></>;
  return (
    <>
      <div class="row between"><Wordmark small /><span class={"pill" + (status === "open" ? "" : " warn")}>{status === "open" ? `Room ${code}` : "Reconnecting…"}</span></div>
      {view.phase === "lobby" && <Lobby view={view} conn={conn} />}
      {view.phase === "pick" && (view.myLocked ? <LockedScreen view={view} /> : <PickScreen view={view} conn={conn} />)}
      {view.phase === "pick" && view.isHost && <PickPhase view={view} conn={conn} />}
      {view.phase === "round" && <RoundIntroPhone view={view} conn={conn} />}
      {view.phase === "turn" && <TurnPhone view={view} conn={conn} />}
      {view.phase === "turnend" && <TurnEndPhone view={view} conn={conn} />}
      {view.phase === "final" && <Panel title="Game over"><p class="sub">Beat 7 builds the awards screen.</p></Panel>}
      {err && <div class="panel error" onClick={() => setErr("")}>{err}</div>}
    </>
  );
}

export function friendly(code: string): string {
  const m: Record<string, string> = {
    too_few_players: "Not enough players yet. Teams need 4, Free-for-All needs 3.",
    not_all_locked: "Someone hasn't locked in their cards yet.",
    host_only: "Only the host can do that.",
    room_full: "This room is full (16 players).",
    deck_too_small: "Not enough cards in the selected decks for this many players.",
    join_first: "Join the room first.",
  };
  return m[code] ?? code.replace(/_/g, " ");
}
