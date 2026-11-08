import { useState } from "preact/hooks";
import { ROUNDS, makeRoomCode } from "@vulgar-acts/engine";

export function App() {
  const [code, setCode] = useState(() => makeRoomCode());
  return (
    <div class="stage">
      <div class="phone">
        <div class="wordmark"><span>Vul</span><span>gar</span> <span>Acts</span></div>
        <p class="tag">Beat 2 · rules engine: 69 tests green</p>
        <div class="panel">
          <h2>Hello from the real build</h2>
          <p class="sub">The rules engine now holds every rule in the rulebook, each with a passing test. Run <code>npm test</code> to watch them. This code came from it.</p>
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
