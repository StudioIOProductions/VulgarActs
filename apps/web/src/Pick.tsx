/**
 * The pick screen: your hand of six, tap to choose, or write your own.
 * Selections live on the phone until Lock in; the server only ever sees the
 * final picks, so nothing leaks while you dither.
 */
import { useState } from "preact/hooks";
import type { PlayerView, Pick } from "../../server/src/protocol";
import type { Connection } from "./net";
import { Panel } from "./ui";
import { PlayerChips } from "./Lobby";

const CUSTOM_MAX = 40;
type Sel = { kind: "hand"; i: number } | { kind: "custom"; i: number };
const same = (a: Sel, b: Sel) => a.kind === b.kind && a.i === b.i;

export function PickScreen({ view, conn }: { view: PlayerView; conn: Connection }) {
  const need = view.settings.cardsPerPlayer;
  const [sel, setSel] = useState<Sel[]>([]);
  const [customs, setCustoms] = useState<string[]>([]);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const me = view.players.find((p) => p.id === view.me);

  const toggle = (s: Sel) => {
    if (sel.some((x) => same(x, s))) return setSel(sel.filter((x) => !same(x, s)));
    if (sel.length >= need) return;
    setSel([...sel, s]);
  };
  const addCustom = () => {
    const t = draft.trim();
    if (!t) return;
    const i = customs.length;
    setCustoms([...customs, t]);
    if (sel.length < need) setSel([...sel, { kind: "custom", i }]);
    setDraft(""); setWriting(false);
  };
  const lock = () => {
    const picks: Pick[] = sel.map((s) => (s.kind === "hand" ? { hand: s.i } : { custom: customs[s.i] }));
    conn.action("lock", { picks });
  };
  const redraw = () => { setSel(sel.filter((s) => s.kind === "custom")); conn.action("redraw"); };

  const isOn = (s: Sel) => sel.some((x) => same(x, s));
  const isAfterDark = (deck: string) => deck === "afterdark";

  return (
    <>
      <Panel>
        <h2>{me?.name}, pick {need} for the bowl</h2>
        <p class="sub">{sel.length} of {need} selected{sel.length === need ? " · lock in when you're happy" : ""}</p>
        <div class="hand">
          {view.myHand.map((c, i) => (
            <button key={"h" + i} type="button" class={"card" + (isOn({ kind: "hand", i }) ? " on" : "") + (isAfterDark(c.deck) ? " dark" : "")} aria-pressed={isOn({ kind: "hand", i })} onClick={() => toggle({ kind: "hand", i })}>
              <span class="ctext">{c.text}</span>
              <span class="cmark">{isAfterDark(c.deck) ? "After Dark" : "Vulgar Acts"}</span>
            </button>
          ))}
          {customs.map((c, i) => (
            <button key={"c" + i} type="button" class={"card custom" + (isOn({ kind: "custom", i }) ? " on" : "")} aria-pressed={isOn({ kind: "custom", i })} onClick={() => toggle({ kind: "custom", i })}>
              <span class="ctext">{c}</span>
              <span class="cmark by">by {me?.name}</span>
            </button>
          ))}
          <button type="button" class="card custom new" onClick={() => setWriting(!writing)}>+ Write your own</button>
        </div>
        {writing && (
          <div class="writer">
            <label for="ctext">Your card: an inside joke, last weekend, someone in this room</label>
            <div class="row">
              <input id="ctext" value={draft} maxLength={CUSTOM_MAX} placeholder="Up to 40 characters" autocomplete="off"
                onInput={(e) => setDraft((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} />
              <button type="button" class="yellow" onClick={addCustom} disabled={!draft.trim()}>Add</button>
            </div>
            <p class="small ink">{CUSTOM_MAX - draft.length} left</p>
          </div>
        )}
        <div class="row">
          <button type="button" onClick={redraw} disabled={view.myRedrawn}>{view.myRedrawn ? "Redrawn" : "Redraw hand (once)"}</button>
        </div>
      </Panel>
      <button class="primary" disabled={sel.length !== need} onClick={lock}>Lock in</button>
      <p class="small">{view.players.filter((p) => p.locked).length} of {view.players.length} locked in</p>
    </>
  );
}

export function LockedScreen({ view }: { view: PlayerView }) {
  const locked = view.players.filter((p) => p.locked).length;
  return (
    <>
      <div class="alert">
        <p class="tag ink">Locked in</p>
        <h1>Waiting for the others</h1>
        <p class="sub">{locked} of {view.players.length} ready</p>
      </div>
      <Panel title="Who's ready"><PlayerChips view={view} showLock /></Panel>
    </>
  );
}
