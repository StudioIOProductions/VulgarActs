/** The deck store. Signed-in people buy; everyone else is sent to sign in first and comes straight back. */
import { useEffect, useState } from "preact/hooks";
import { DECK_SUMMARIES } from "@vulgar-acts/decks";
import { Wordmark, Panel } from "./ui";
import { me, catalog, checkout, claimFounders, type Me, type Catalog } from "./net";

const LAUNCH = ["starter_full", "afterdark", "office", "pop", "patent"];
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const SAMPLES: Record<string, string> = {
  afterdark: "“Corn on the cob blowjob” · “Ghost sex” · “Potato-powered vibrator”",
  office: "“Per my last email, bitch!” · “Swivel chair jousting” · “Zoom call on the toilet”",
  pop: "“Breastfeeding a Labubu” · “Furby exorcism” · “Terminator using self-checkout”",
  patent: "Cards coming soon.",
};

export function Store() {
  const [who, setWho] = useState<Me | null>(null);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const done = (location.hash.match(/done=(\w+)/) ?? [])[1];
  useEffect(() => { me().then(setWho); catalog().then(setCat); }, []);
  useEffect(() => { if (done) { const t = setInterval(() => me().then(setWho), 2500); setTimeout(() => clearInterval(t), 30000); return () => clearInterval(t); } }, [done]);

  const signedIn = !!who && who.signedIn;
  const skus = signedIn ? (who as Extract<Me, { signedIn: true }>).skus : [];
  const owns = (sku: string) => skus.includes(sku) || (sku === "launch" && LAUNCH.every((k) => skus.includes(k))) || (sku !== "pass" && sku !== "launch" && skus.includes("pass"));
  const passActive = skus.includes("pass");
  const toSignIn = () => { sessionStorage.setItem("va_after_signin", "store"); location.hash = "account"; };

  const buy = async (sku: string) => {
    if (!signedIn) return toSignIn();
    setBusy(sku); setNote("");
    const r = await checkout(sku);
    setBusy("");
    if (!r.ok) { setNote(r.status === 401 ? "Sign in first." : r.error); return; }
    location.href = r.data.url;
  };
  const founders = async () => {
    if (!signedIn) return toSignIn();
    setBusy("founders"); setNote("");
    const r = await claimFounders();
    setBusy("");
    if (!r.ok) { setNote(r.status === 410 ? "The 500 are gone. Sorry." : r.error); return; }
    setWho(await me()); setCat(await catalog()); setNote("After Dark is yours. Forever.");
  };

  const Btn = ({ sku, label }: { sku: string; label: string }) => owns(sku)
    ? <button class="owned" disabled>Owned</button>
    : <button class="primary" disabled={busy === sku || (cat !== null && !cat.live)} onClick={() => buy(sku)}>{busy === sku ? "One sec…" : label}</button>;
  const price = (sku: string) => cat ? money(cat.prices[sku].cents) + (cat.prices[sku].recurring ? " / year" : "") : "…";

  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Deck store</span></div>
      {done && <Panel><h3>{owns(done) ? "It's yours." : "Thanks — finishing up…"}</h3><p class="sub">{owns(done) ? "The deck is on your account and comes with you into any room." : "Payment went through. Your decks appear here within a few seconds."}</p></Panel>}
      {note && <p class="small ink"><b>{note}</b></p>}
      {cat && !cat.live && <p class="small ink">The store is in preview — nothing can be bought yet.</p>}

      {cat && cat.founders.left > 0 && !skus.includes(cat.founders.sku) && (
        <div class="founders">
          <div><b>Founders deal.</b> The first {cat.founders.limit} accounts get After Dark free, forever. <span class="count">{cat.founders.left} left</span></div>
          <button class="primary" disabled={busy === "founders"} onClick={founders}>{signedIn ? "Claim it" : "Sign in to claim"}</button>
        </div>
      )}

      <Panel title="Launch Collection" tone="paper">
        <img class="offerart" src="/img/everything.jpg" alt="" />
        <p class="sub"><b>Five decks, 500+ cards, yours forever</b> — the full Starter plus After Dark, Office Party, Pop Culture Trash and Patent Rejected.</p>
        <div class="row between"><span class="price">{price("launch")} <small>one time</small></span><Btn sku="launch" label="Get the collection" /></div>
        <p class="small">Saves $2 on buying the five separately.</p>
      </Panel>

      <Panel title="Vulgar Acts Pass" tone="dark">
        <img class="offerart" src="/img/pass.jpg" alt="" />
        <p class="sub"><b>For the obsessed.</b> The Launch Collection to keep, plus every new deck the day it drops for as long as you're a member. Cancel anytime; the collection stays yours.</p>
        <div class="row between"><span class="price">{price("pass")}</span>{passActive ? <button class="owned" disabled>Active</button> : <Btn sku="pass" label="Get the Pass" />}</div>
      </Panel>

      <h3 class="or">Or just pick a deck</h3>
      {DECK_SUMMARIES.map((d) => {
        const sku = d.id === "starter" ? "starter_full" : d.id;
        return (
          <div key={d.id} class={"deckrow"} style={{ borderColor: d.color }}>
            <img src={d.art} alt="" />
            <div class="info">
              <b>{d.id === "starter" ? "Full Starter" : d.title}</b>
              <span class="small">{d.id === "starter" ? `${d.freeCount} cards free · unlock all ${d.count}` : `${d.count} cards`}{d.rating === "18+" ? " · 18+" : ""}</span>
              {SAMPLES[d.id] && <span class="small sample">{SAMPLES[d.id]}</span>}
              <div class="row between"><span class="price">{price(sku)}</span><Btn sku={sku} label="Unlock" /></div>
            </div>
          </div>
        );
      })}

      <Panel title="How paying works">
        <ul class="plain">
          <li><b>Playing is free.</b> No account to join, host, or play the {DECK_SUMMARIES.find((d) => d.id === "starter")!.freeCount}-card Starter.</li>
          <li><b>One buyer unlocks the room.</b> If anyone in the room owns a deck, the host can put it in the bowl.</li>
          <li><b>Buy once, play anywhere.</b> Decks are tied to your email, not your phone.</li>
          <li><b>No ads, no energy, no loot boxes.</b> Decks are the only thing for sale.</li>
        </ul>
        <p class="small">Card payments are handled by Stripe; we never see your card number. <a href="#terms">Terms</a> · <a href="#privacy">Privacy</a></p>
      </Panel>
      <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); location.hash = ""; }}>← Front page</a> · <a href="#account">Account</a></p>
    </>
  );
}
