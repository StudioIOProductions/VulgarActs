import { useState } from "preact/hooks";
import { ROUNDS, makeRoomCode } from "@vulgar-acts/engine";

export function App() {
  const [code, setCode] = useState(() => makeRoomCode());
  return (
    <div class="stage">
      <div class="phone">
        <div class="wordmark"><span>Vul</span><span>gar</span> <span>Acts</span></div>
        <p class="tag">Beat 1 · it's alive</p>
        <div class="panel">
          <h2>Hello from the real build</h2>
          <p class="sub">This page comes from the repo, not the mockup. The rules engine is wired in: it just minted this room code.</p>
          <div class="code">{code}</div>
          <button class="primary" onClick={() => setCode(makeRoomCode())}>New code</button>
        </div>
        <div class="panel">
          <h2>The three rounds</h2>
          {ROUNDS.map((r) => (
            <p key={r.n}><b>{r.n}. {r.name}</b> · <span class="sub">{r.rule}</span></p>
          ))}
        </div>
      </div>
    </div>
  );
}
