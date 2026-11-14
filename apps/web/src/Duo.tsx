/**
 * Duo: two people, one phone, no server. The app deals a bowl of 20 cards
 * (plus any you write), then you alternate 60-second turns giving clues.
 * Same cards, same three rounds, fewer people. Runs entirely on the device.
 */
import { useEffect, useState } from "preact/hooks";
import { ALL_CARDS, ALL_GROUPS, DECK_SUMMARIES } from "@vulgar-acts/decks";
import { shuffle, ROUNDS } from "@vulgar-acts/engine";
import { Wordmark, Avatar, Seg, Panel, AVATAR_COUNT } from "./ui";
import { Scoreboard } from "./Turn";

const BOWL = 20;
const SKIPS = 3;
type Card = { text: string; custom: boolean; deck: string | null; skips: number };
type Turn = { giver: 0 | 1; endsAt: number; got: number[]; seen: number[]; cur: number | null; skips: number };
interface Game {
  names: [string, string]; avatars: [number, number]; rounds: 1 | 3; timer: number;
  bowl: Card[]; pool: number[]; round: number; phase: "pass" | "turn" | "turnend" | "roundend" | "final";
  turn: Turn | null; next: 0 | 1; pts: [number, number]; best: { who: 0 | 1; n: number } | null; turns: number;
}
const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} } };

function dealBowl(decks: string[], customs: string[]): Card[] {
  const inDecks = ALL_CARDS.filter((c) => decks.includes(c.deck));
  const drop = new Set<string>();
  for (const g of ALL_GROUPS) { const present = g.filter((id) => inDecks.some((c) => c.id === id)); if (present.length > 1) { const keep = present[Math.floor(Math.random() * present.length)]; present.forEach((id) => id !== keep && drop.add(id)); } }
  const cards = shuffle(inDecks.filter((c) => !drop.has(c.id)), Math.random).slice(0, Math.max(0, BOWL - customs.length));
  const bowl: Card[] = cards.map((c) => ({ text: c.text, custom: false, deck: c.deck, skips: 0 }));
  customs.forEach((t) => bowl.push({ text: t, custom: true, deck: null, skips: 0 }));
  return shuffle(bowl, Math.random);
}

export function Duo() {
  const [game, setGame] = useState<Game | null>(null);
  if (!game) return <DuoSetup onStart={setGame} />;
  return <DuoPlay game={game} setGame={setGame} onQuit={() => setGame(null)} />;
}

function DuoSetup({ onStart }: { onStart: (g: Game) => void }) {
  const [names, setNames] = useState<[string, string]>([ls.get("va_duo_a") ?? "", ls.get("va_duo_b") ?? ""]);
  const [avatars, setAvatars] = useState<[number, number]>([Number(ls.get("va_duo_aa") ?? 0), Number(ls.get("va_duo_ab") ?? 5)]);
  const [rounds, setRounds] = useState<1 | 3>(3);
  const [timer, setTimer] = useState(60);
  const [decks, setDecks] = useState<string[]>(["starter"]);
  const [gate, setGate] = useState<string[] | null>(null);
  const [customs, setCustoms] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState<0 | 1 | null>(null);
  const ready = names[0].trim() && names[1].trim();
  const toggleDeck = (id: string) => {
    const next = decks.includes(id) ? decks.filter((d) => d !== id) : [...decks, id];
    if (!next.length) return;
    if (!decks.includes(id) && DECK_SUMMARIES.find((d) => d.id === id)?.rating === "18+") setGate(next); else setDecks(next);
  };
  const start = () => {
    ls.set("va_duo_a", names[0].trim()); ls.set("va_duo_b", names[1].trim()); ls.set("va_duo_aa", String(avatars[0])); ls.set("va_duo_ab", String(avatars[1]));
    const bowl = dealBowl(decks, customs);
    onStart({ names: [names[0].trim(), names[1].trim()], avatars, rounds, timer, bowl, pool: shuffle(bowl.map((_, i) => i), Math.random), round: 0, phase: "pass", turn: null, next: Math.random() < 0.5 ? 0 : 1, pts: [0, 0], best: null, turns: 0 });
  };
  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Just the two of us</span></div>
      <Panel title="Who's playing?">
        {[0, 1].map((i) => (
          <div key={i} class="duo-player">
            <button type="button" class="avbtn" onClick={() => setPick(pick === i ? null : (i as 0 | 1))} aria-label="Pick a face"><Avatar n={avatars[i]} size={56} /></button>
            <input value={names[i]} maxLength={14} placeholder={i === 0 ? "Player 1" : "Player 2"} autocomplete="off" onInput={(e) => { const v = (e.target as HTMLInputElement).value; setNames(i === 0 ? [v, names[1]] : [names[0], v]); }} />
          </div>
        ))}
        {pick !== null && (
          <div class="avatars">{Array.from({ length: AVATAR_COUNT }, (_, k) => <button key={k} type="button" class="avbtn" aria-pressed={avatars[pick] === k} onClick={() => { setAvatars(pick === 0 ? [k, avatars[1]] : [avatars[0], k]); setPick(null); }}><Avatar n={k} size={52} /></button>)}</div>
        )}
      </Panel>
      <Panel title="How long?">
        <Seg id="duo-rounds" value={rounds} options={[{ v: 1, label: "Quick · one round" }, { v: 3, label: "Full · three rounds" }]} onChange={(v) => setRounds(v as 1 | 3)} />
        <label>Turn timer</label>
        <Seg id="duo-timer" value={timer} options={[30, 45, 60].map((v) => ({ v, label: `${v} s` }))} onChange={setTimer} />
        <label>Decks</label>
        {gate && (
          <div class="gate18"><h3>After Dark is 18+</h3><p>Every card in it is explicit. Just checking you're both adults.</p><div class="row"><button onClick={() => setGate(null)}>Not tonight</button><button class="primary" onClick={() => { setDecks(gate); setGate(null); }}>We're 18+</button></div></div>
        )}
        <div class="deckgrid">{DECK_SUMMARIES.map((d) => { const on = decks.includes(d.id); return <button key={d.id} type="button" class={"decktile" + (on ? " on" : "")} aria-pressed={on} style={{ background: d.color, color: d.ink }} onClick={() => toggleDeck(d.id)}><img src={d.art} alt="" /><span class="dt"><b>{d.title}</b><span>{d.count} cards{d.rating === "18+" ? " · 18+" : ""}</span></span><span class="dcheck">{on ? "✓ In play" : "Off"}</span></button>; })}</div>
      </Panel>
      <Panel title="Add your own cards">
        <p class="sub">Optional. The app deals {BOWL} cards; swap some for inside jokes.</p>
        <div class="row"><input value={draft} maxLength={40} placeholder="Up to 40 characters" autocomplete="off" onInput={(e) => setDraft((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { setCustoms([...customs, draft.trim()]); setDraft(""); } }} /><button type="button" class="yellow" disabled={!draft.trim() || customs.length >= 10} onClick={() => { setCustoms([...customs, draft.trim()]); setDraft(""); }}>Add</button></div>
        {customs.length > 0 && <div class="chips">{customs.map((c, i) => <span key={i} class="chip">{c}<button class="x" aria-label="Remove" onClick={() => setCustoms(customs.filter((_, k) => k !== i))}>×</button></span>)}</div>}
      </Panel>
      <button class="primary" disabled={!ready} onClick={start}>Deal the bowl</button>
      <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); location.hash = ""; }}>← Front page</a></p>
    </>
  );
}

function DuoPlay({ game, setGame, onQuit }: { game: Game; setGame: (g: Game) => void; onQuit: () => void }) {
  const g = game;
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(id); }, []);
  useEffect(() => { let lock: any; (navigator as any).wakeLock?.request?.("screen").then((l: any) => (lock = l)).catch(() => {}); return () => lock?.release?.(); }, []);
  const secs = g.turn && g.phase === "turn" ? Math.max(0, Math.ceil((g.turn.endsAt - Date.now()) / 1000)) : 0;
  useEffect(() => { if (g.phase === "turn" && g.turn && Date.now() >= g.turn.endsAt) endTurnWith(g); });

  const up = (patch: Partial<Game>) => setGame({ ...g, ...patch });
  const nextUnseen = (pool: number[], seen: number[]) => pool.find((i) => !seen.includes(i));
  const startTurn = () => { const cur = g.pool[0]; up({ phase: "turn", turn: { giver: g.next, endsAt: Date.now() + g.timer * 1000, got: [], seen: [cur], cur, skips: 0 } }); };
  /** Close the turn: score it, remember the best turn, hand the phone over (or end the round if the bowl is empty). */
  function endTurnWith(gg: Game) {
    const t = gg.turn!; const n = t.got.length;
    const pts: [number, number] = [...gg.pts] as [number, number]; pts[t.giver] += n;
    const best = !gg.best || n > gg.best.n ? { who: t.giver, n } : gg.best;
    setGame({ ...gg, phase: gg.pool.length === 0 ? "roundend" : "turnend", pts, best, turns: gg.turns + 1, next: (1 - t.giver) as 0 | 1, turn: { ...t, cur: null, endsAt: 0 } });
  }
  const gotIt = () => {
    const t = g.turn!; const pool = g.pool.filter((i) => i !== t.cur); const got = [...t.got, t.cur!];
    const gg: Game = { ...g, pool, turn: { ...t, got } };
    const nx = nextUnseen(pool, t.seen);
    if (nx === undefined) return endTurnWith(gg);
    setGame({ ...gg, turn: { ...gg.turn!, cur: nx, seen: [...t.seen, nx] } });
  };
  const skip = () => { const t = g.turn!; if (t.skips >= SKIPS) return; const bowl = g.bowl.map((c, i) => i === t.cur ? { ...c, skips: c.skips + 1 } : c); const pool = [...g.pool.filter((i) => i !== t.cur), t.cur!]; const nx = nextUnseen(pool, t.seen);
    if (nx === undefined) { endTurnWith({ ...g, bowl, pool, turn: { ...t, skips: t.skips + 1 } }); return; }
    up({ bowl, pool, turn: { ...t, skips: t.skips + 1, cur: nx, seen: [...t.seen, nx] } }); };
  const nextRound = () => { const r = g.round + 1; if (r >= g.rounds) return up({ phase: "final" }); up({ round: r, pool: shuffle(g.bowl.map((_, i) => i), Math.random), phase: "pass", turn: null }); };
  const again = () => up({ round: 0, pool: shuffle(g.bowl.map((_, i) => i), Math.random), phase: "pass", turn: null, pts: [0, 0], best: null, turns: 0, bowl: g.bowl.map((c) => ({ ...c, skips: 0 })) });

  const name = (i: 0 | 1) => g.names[i];
  const round = ROUNDS[Math.min(g.round, 2)];
  const roundLabel = g.rounds === 1 ? "Say Anything" : `Round ${g.round + 1}: ${round.name}`;
  const score = <div class="score">{[0, 1].map((i) => <div key={i} class={"t" + i}><div class="n">{g.pts[i]}</div><Avatar n={g.avatars[i]} size={22} /> {g.names[i]}</div>)}</div>;

  if (g.phase === "pass") {
    return (
      <>
        <div class="alert"><p class="tag ink">{roundLabel}</p><h1>Hand it to {name(g.next)}</h1><Avatar n={g.avatars[g.next]} size={96} /><p style="font-weight:700;font-size:18px;margin-top:8px">{round.rule}</p><p class="sub">{g.pool.length} cards left · {g.timer} seconds · {SKIPS} skips</p></div>
        <button class="primary" onClick={startTurn}>I'm {name(g.next)}, start the clock</button>
        {score}
        <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); onQuit(); }}>Quit</a></p>
      </>
    );
  }
  if (g.phase === "turn" && g.turn) {
    const t = g.turn; const card = g.bowl[t.cur!];
    return (
      <>
        <div class="strip"><span><Avatar n={g.avatars[t.giver]} size={22} /> {name(t.giver)}</span><span class={"timer" + (secs <= 10 ? " hot" : "")}>{secs}</span><span>{g.pool.length} left</span></div>
        <div class={"bigcard" + (card.custom ? " custom" : "") + (card.deck === "afterdark" ? " dark" : "")} data-by={card.custom ? "you two" : ""}>{card.text}</div>
        <div class="strip white"><span>{roundLabel}</span><span>Skips <span class="pips">{Array.from({ length: SKIPS }, (_, i) => <i key={i} class={i < t.skips ? "used" : ""} />)}</span></span></div>
        <div class="row"><button onClick={skip} disabled={t.skips >= SKIPS}>Skip</button></div>
        <button class="primary" onClick={gotIt}>Got it!</button>
        <p class="small">Got {t.got.length} this turn</p>
      </>
    );
  }
  if ((g.phase === "turnend" || g.phase === "roundend") && g.turn) {
    const t = g.turn; const over = g.phase === "roundend"; const last = g.round + 1 >= g.rounds;
    return (
      <>
        <Panel><h2>{over ? "Bowl empty!" : "Time!"}</h2><p>{name(t.giver)} got <b>{t.got.length}</b> through. {t.skips} skip{t.skips === 1 ? "" : "s"}.</p>
          <div class="list">{t.got.map((i) => <div key={i}><span>{g.bowl[i].text}</span><span>✓</span></div>)}{t.got.length === 0 && <p class="sub">Nothing. Brutal.</p>}</div>
          {g.best && <p class="sub">Best turn so far: {name(g.best.who)} with {g.best.n}</p>}
        </Panel>
        {score}
        <button class="primary" onClick={over ? nextRound : () => up({ phase: "pass" })}>{over ? (last ? "Final scores" : `Next: ${ROUNDS[g.round + 1].name}`) : `Pass to ${name(g.next)}`}</button>
      </>
    );
  }
  const lead = g.pts[0] === g.pts[1] ? "It's a tie!" : `${name(g.pts[0] > g.pts[1] ? 0 : 1)} wins!`;
  const mostSkipped = [...g.bowl].sort((a, b) => b.skips - a.skips)[0];
  return (
    <>
      <div class="alert"><p class="tag ink">Game over</p><h1>{lead}</h1><p class="sub">{g.turns} turns · {g.bowl.length} cards</p></div>
      {score}
      <Panel title="Awards"><div class="list">
        {g.best && <div><span>Best turn</span><span>{name(g.best.who)} · {g.best.n} cards</span></div>}
        {mostSkipped && mostSkipped.skips > 0 && <div><span>Most skipped</span><span>{mostSkipped.text} · {mostSkipped.skips}</span></div>}
      </div></Panel>
      <div class="row"><button class="yellow" onClick={again}>Same bowl, again</button><button onClick={onQuit}>New game</button></div>
      <p class="small">Four or more people? <a href="#" onClick={(e) => { e.preventDefault(); location.hash = "play"; }}>Play with friends</a></p>
    </>
  );
}
