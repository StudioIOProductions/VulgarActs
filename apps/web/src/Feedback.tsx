/** Playtest feedback: six questions, one tap each where possible, posted to the server. */
import { useState } from "preact/hooks";
import { Wordmark, Panel, Seg } from "./ui";

const opts = (xs: string[]) => xs.map((v) => ({ v, label: v }));
const FUN = opts(["1", "2", "3", "4", "5"]);
const ROUNDS = opts(["Say Anything", "One Word", "Act Only"]);
const YMN = opts(["Yes", "Maybe", "No"]);

export function Feedback() {
  const [f, setF] = useState<Record<string, string>>({ fun: "", round: "", confusing: "", duds: "", best: "", again: "", pay: "", name: "", room: "" });
  const [state, setState] = useState<"edit" | "busy" | "done" | "fail">("edit");
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v });
  const send = async () => {
    if (!f.fun) return;
    setState("busy");
    try {
      const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
      setState(r.ok ? "done" : "fail");
    } catch { setState("fail"); }
  };
  if (state === "done") return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Thanks</span></div>
      <Panel><h3>Got it. You're a saint.</h3><p class="sub">Every answer goes straight to the person making the game. If a card was a dud, it's on notice.</p></Panel>
      <div class="row"><button class="primary" onClick={() => { location.hash = "play"; }}>Play again</button><button onClick={() => { location.hash = ""; }}>Front page</button></div>
    </>
  );
  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Playtest</span></div>
      <Panel title="How was it?">
        <p class="sub">Two minutes. Be mean. It helps.</p>
        <label class="q">How fun was it? <b>1 = never again, 5 = best night this month</b></label>
        <Seg id="fun" value={f.fun} onChange={set("fun")} options={FUN} />
        <label class="q">Which round was the best?</label>
        <Seg id="round" value={f.round} onChange={set("round")} options={ROUNDS} />
        <label class="q">Anything confusing? Where did people get stuck?</label>
        <textarea rows={3} value={f.confusing} onInput={(e) => set("confusing")((e.target as HTMLTextAreaElement).value)} placeholder="Joining, picking cards, the timer, who's up…" />
        <label class="q">Cards that were duds or impossible to act</label>
        <textarea rows={3} value={f.duds} onInput={(e) => set("duds")((e.target as HTMLTextAreaElement).value)} placeholder="Name them. They'll be cut." />
        <label class="q">Best moment or funniest card</label>
        <textarea rows={2} value={f.best} onInput={(e) => set("best")((e.target as HTMLTextAreaElement).value)} />
        <label class="q">Would you play again?</label>
        <Seg id="again" value={f.again} onChange={set("again")} options={YMN} />
        <label class="q">Would you pay $2.99 for an extra deck?</label>
        <Seg id="pay" value={f.pay} onChange={set("pay")} options={YMN} />
        <div class="row"><input style={{ flex: 1 }} value={f.name} onInput={(e) => set("name")((e.target as HTMLInputElement).value)} placeholder="Your name (optional)" /><input value={f.room} onInput={(e) => set("room")((e.target as HTMLInputElement).value.toUpperCase())} placeholder="Room" maxLength={4} style={{ flex: "0 0 7em", textTransform: "uppercase" }} /></div>
        {state === "fail" && <p class="err">Didn't send. Check your signal and try again.</p>}
        <button class="primary big" disabled={!f.fun || state === "busy"} onClick={send}>{state === "busy" ? "Sending…" : "Send it"}</button>
        {!f.fun && <p class="small">Pick a fun score and the button wakes up.</p>}
      </Panel>
      <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); location.hash = ""; }}>← Front page</a></p>
    </>
  );
}
