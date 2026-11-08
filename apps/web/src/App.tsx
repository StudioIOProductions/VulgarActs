import { useEffect, useState } from "preact/hooks";
import { Connection, createRoom, roomExists, myPid, savedName, saveName } from "./net";
import type { PlayerView } from "../../server/src/protocol";

const Wordmark = () => <div class="wordmark"><span>Vul</span><span>gar</span> <span>Acts</span></div>;

function codeFromHash() {
  const h = location.hash.replace("#", "").toUpperCase();
  return /^[A-Z]{4}$/.test(h) ? h : null;
}

export function App() {
  const [code, setCode] = useState<string | null>(codeFromHash());
  useEffect(() => {
    const f = () => setCode(codeFromHash());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return <div class="stage"><div class="phone">{code ? <Room code={code} /> : <Home />}</div></div>;
}

/* ---------- home: join or host ---------- */

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
  const host = async () => {
    setBusy(true);
    try { location.hash = await createRoom(myPid()); } catch { setErr("Couldn't reach the server. Is it running?"); }
    setBusy(false);
  };
  return (
    <>
      <Wordmark />
      <p class="tag">Beat 3 · rooms are live</p>
      <div class="panel">
        <h2>Join a room</h2>
        <input class="code" id="join-code" value={join} maxLength={4} autocapitalize="characters" autocomplete="off" placeholder="ABCD"
          onInput={(e) => { setJoin((e.target as HTMLInputElement).value.toUpperCase()); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && go()} />
        <button class="primary" onClick={go} disabled={busy}>Join</button>
      </div>
      <div class="panel">
        <h2>Host a room</h2>
        <p class="sub">Put this device where everyone can see it, or host from your phone. Players join from theirs.</p>
        <button class="yellow" onClick={host} disabled={busy}>Start a room on this screen</button>
      </div>
      {err && <div class="panel error">{err}</div>}
    </>
  );
}

/* ---------- a room: name prompt, then live lobby ---------- */

function Room({ code }: { code: string }) {
  const [name, setName] = useState(savedName());
  const [joined, setJoined] = useState(!!savedName());
  if (!joined) {
    return (
      <>
        <Wordmark />
        <div class="panel">
          <h2>Room {code}</h2>
          <label>Your name</label>
          <input id="name" value={name} maxLength={14} autocomplete="off" placeholder="Name"
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && (saveName(name.trim()), setJoined(true))} />
          <button class="primary" disabled={!name.trim()} onClick={() => { saveName(name.trim()); setJoined(true); }}>Join</button>
        </div>
      </>
    );
  }
  return <Live code={code} name={name.trim()} />;
}

function Live({ code, name }: { code: string; name: string }) {
  const [conn] = useState(() => new Connection(code, myPid(), name));
  const [view, setView] = useState<PlayerView | null>(null);
  const [status, setStatus] = useState(conn.status);
  const [err, setErr] = useState("");
  useEffect(() => {
    const off = conn.on((m) => {
      if (m.t === "view") { setView(m.view); setStatus("open"); setErr(""); }
      if (m.t === "error") { if (m.code === "reconnecting") setStatus("reconnecting"); else setErr(m.code); }
    });
    return () => { off(); conn.close(); };
  }, [conn]);

  if (!view) return <><Wordmark /><div class="panel"><p>{status === "reconnecting" ? "Reconnecting…" : `Joining room ${code}…`}</p>{err && <p class="sub">{err}</p>}</div></>;
  return (
    <>
      <div class="row between"><Wordmark /><span class="pill">{status === "open" ? `Room ${code}` : "Reconnecting…"}</span></div>
      <Lobby view={view} conn={conn} />
      {err && <div class="panel error">{err}</div>}
    </>
  );
}

function Lobby({ view, conn }: { view: PlayerView; conn: Connection }) {
  const me = view.players.find((p) => p.id === view.me);
  return (
    <>
      <div class="alert">
        <p class="tag ink">You're in, {me?.name}</p>
        <h1>{view.phase === "lobby" ? "Waiting for the host" : `Phase: ${view.phase}`}</h1>
        <p class="sub">{view.players.length} in the room{view.isHost ? " · you are the host" : ""}</p>
      </div>
      <div class="panel">
        <h2>Who's here</h2>
        <div class="chips">
          {view.players.map((p) => (
            <span key={p.id} class={"chip" + (p.connected ? "" : " off")}>{p.name}{p.id === view.me ? " (you)" : ""}{p.connected ? "" : " · away"}</span>
          ))}
        </div>
      </div>
      {view.isHost && (
        <div class="panel">
          <h2>Host controls</h2>
          <p class="sub">Beat 4 adds settings and teams here. For now, share the code and watch names appear.</p>
          <div class="code">{view.code}</div>
        </div>
      )}
      <p class="small">Server clock offset: {conn.skew} ms</p>
    </>
  );
}
