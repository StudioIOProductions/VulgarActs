/** Just read the cards: flip through a deck like the physical box, no timer. */
import { useState } from "preact/hooks";
import { DECKS } from "@vulgar-acts/decks";
import { Wordmark, Panel } from "./ui";

const shuffle = (n: number) => {
  const a = Array.from({ length: n }, (_, k) => k);
  for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
};

export function Browse() {
  const [deckId, setDeckId] = useState("starter");
  const [adult, setAdult] = useState(() => { try { return localStorage.getItem("va_adult") === "1"; } catch { return false; } });
  const [gate, setGate] = useState(false);
  // Every visit deals the deck in a fresh random order: nobody reads it A to Z.
  const [order, setOrder] = useState(() => shuffle(DECKS.find((d) => d.id === "starter")!.cards.length));
  const [i, setI] = useState(0);
  const deck = DECKS.find((d) => d.id === deckId)!;
  const card = deck.cards[order[i % order.length]];
  const open = (id: string) => { const d = DECKS.find((x) => x.id === id)!; setDeckId(id); setOrder(shuffle(d.cards.length)); setI(0); };
  const pick = (id: string) => { const d = DECKS.find((x) => x.id === id)!; if (d.rating === "18+" && !adult) { setGate(true); return; } open(id); };
  const reshuffle = () => { setOrder(shuffle(deck.cards.length)); setI(0); };
  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Just the cards</span></div>
      <div class="row">{DECKS.map((d) => <button key={d.id} class={deckId === d.id ? "yellow" : ""} onClick={() => pick(d.id)}>{d.title}{d.rating === "18+" ? " · 18+" : ""}</button>)}</div>
      {gate && <div class="gate18"><h3>After Dark is 18+</h3><p>Every card in it is explicit.</p><div class="row"><button onClick={() => setGate(false)}>Not tonight</button><button class="primary" onClick={() => { setAdult(true); try { localStorage.setItem("va_adult", "1"); } catch {} setGate(false); open("afterdark"); }}>I'm 18+</button></div></div>}
      <div class={"bigcard" + (deck.id === "afterdark" ? " dark" : "")} onClick={() => setI((i + 1) % deck.cards.length)}>{card.text}</div>
      <p class="small">{i + 1} of {deck.cards.length} · tap the card for the next one</p>
      <div class="row"><button onClick={() => setI((i - 1 + deck.cards.length) % deck.cards.length)}>← Back</button><button class="yellow" onClick={reshuffle}>Shuffle</button><button onClick={() => setI((i + 1) % deck.cards.length)}>Next →</button></div>
      <Panel><p class="sub">Like them? <a href="#" onClick={(e) => { e.preventDefault(); location.hash = "duo"; }}>Play with one other person</a> or <a href="#" onClick={(e) => { e.preventDefault(); location.hash = "play"; }}>start a room</a>.</p></Panel>
      <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); location.hash = ""; }}>← Front page</a></p>
    </>
  );
}
