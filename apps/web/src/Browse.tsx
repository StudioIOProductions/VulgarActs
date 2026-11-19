/** Just read the cards: flip through a deck like the physical box, no timer. */
import { useState, useEffect } from "preact/hooks";
import { me } from "./net";
import { DECKS } from "@vulgar-acts/decks";
import { Wordmark, Panel, deckClass } from "./ui";

const shuffle = (n: number) => {
  const a = Array.from({ length: n }, (_, k) => k);
  for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
};

type Access = { decks: string[]; starterFull: boolean };
/** The cards a visitor may read: what they own in full; otherwise the free part of the Starter, or a paid deck's sample. */
const readable = (d: (typeof DECKS)[number], a: Access) => {
  if (d.id === "starter") return a.starterFull || !d.free ? d.cards : d.cards.filter((c) => d.free!.includes(c.id));
  if (a.decks.includes(d.id)) return d.cards;
  return d.sample && d.sample.length ? d.cards.filter((c) => d.sample!.includes(c.id)) : d.cards;
};

export function Browse() {
  const [deckId, setDeckId] = useState("starter");
  const [adult, setAdult] = useState(() => { try { return localStorage.getItem("va_adult") === "1"; } catch { return false; } });
  const [gate, setGate] = useState(false);
  // Every visit deals the deck in a fresh random order: nobody reads it A to Z.
  // Paid decks only show their sample here; the Starter is free to read end to end.
  const [access, setAccess] = useState<Access>({ decks: [], starterFull: false });
  useEffect(() => { me().then((m) => { if (m.signedIn) { const a = { decks: m.decks, starterFull: m.starterFull }; setAccess(a); setOrder(shuffle(readable(DECKS.find((d) => d.id === deckId)!, a).length)); setI(0); } }); }, []);
  const [order, setOrder] = useState(() => shuffle(readable(DECKS.find((d) => d.id === "starter")!, { decks: [], starterFull: false }).length));
  const [i, setI] = useState(0);
  const deck = DECKS.find((d) => d.id === deckId)!;
  const cards = readable(deck, access);
  const locked = deck.cards.length - cards.length;
  const n = cards.length + (locked > 0 ? 1 : 0); // the last "card" of a sampled deck is the lock
  const atLock = locked > 0 && i % n === cards.length;
  const card = atLock ? null : cards[order[i % n]];
  const open = (id: string) => { const d = DECKS.find((x) => x.id === id)!; setDeckId(id); setOrder(shuffle(readable(d, access).length)); setI(0); };
  const pick = (id: string) => { const d = DECKS.find((x) => x.id === id)!; if (d.rating === "18+" && !adult) { setGate(true); return; } open(id); };
  const reshuffle = () => { setOrder(shuffle(cards.length)); setI(0); };
  const next = () => setI((i + 1) % n);
  const back = () => setI((i - 1 + n) % n);
  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Just the cards</span></div>
      <div class="row">{DECKS.map((d) => <button key={d.id} class={deckId === d.id ? "yellow" : ""} onClick={() => pick(d.id)}>{d.title}{d.rating === "18+" ? " · 18+" : ""}</button>)}</div>
      {gate && <div class="gate18"><h3>After Dark is 18+</h3><p>Every card in it is explicit.</p><div class="row"><button onClick={() => setGate(false)}>Not tonight</button><button class="primary" onClick={() => { setAdult(true); try { localStorage.setItem("va_adult", "1"); } catch {} setGate(false); open("afterdark"); }}>I'm 18+</button></div></div>}
      {card
        ? <div class={"bigcard" + deckClass(deck.id)} onClick={next}>{card.text}</div>
        : <div class={"bigcard locked" + deckClass(deck.id)} onClick={next}><span class="lockbig">{locked} more</span><span class="locksub">{deck.id === "starter" ? "That's the free part. The rest come with the full Starter." : "That's the free peek. The rest come with the deck."}{" "}<a href="#store">Get it in the store</a>.</span></div>}
      <p class="small">{atLock ? `${cards.length} of ${deck.cards.length} shown` : `${(i % n) + 1} of ${cards.length}${locked > 0 ? ` free to read · ${deck.cards.length} in the deck` : ""}`} · tap the card for the next one</p>
      <div class="row"><button onClick={back}>← Back</button><button class="yellow" onClick={reshuffle}>Shuffle</button><button onClick={next}>Next →</button></div>
      <Panel><p class="sub">Like them? <a href="#" onClick={(e) => { e.preventDefault(); location.hash = "duo"; }}>Play with one other person</a> or <a href="#" onClick={(e) => { e.preventDefault(); location.hash = "play"; }}>start a room</a>.</p></Panel>
      <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); location.hash = ""; }}>← Front page</a></p>
    </>
  );
}
