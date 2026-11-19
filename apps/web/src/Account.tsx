/** Account: sign in with an emailed link, see what you own, sign out. No passwords anywhere. */
import { useEffect, useState } from "preact/hooks";
import { DECK_SUMMARIES } from "@vulgar-acts/decks";
import { Wordmark, Panel } from "./ui";
import { me, startSignIn, signOut, portal, type Me } from "./net";

const ERRORS: Record<string, string> = {
  used: "That link was already used. Ask for a fresh one.",
  expired: "That link expired (they last 15 minutes). Ask for a fresh one.",
  bad: "That link didn't look right. Ask for a fresh one.",
};

export function Account() {
  const [who, setWho] = useState<Me | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState(() => { const m = location.hash.match(/err=(\w+)/); return m ? ERRORS[m[1]] ?? ERRORS.bad : ""; });
  const [devLink, setDevLink] = useState("");
  // Someone sent here from the store goes straight back once they're in.
  const landed = (m: Me) => { setWho(m); if (m.signedIn && sessionStorage.getItem("va_after_signin") === "store") { sessionStorage.removeItem("va_after_signin"); location.hash = "store"; } };
  useEffect(() => { me().then(landed); }, []);

  const go = async () => {
    const e = email.trim();
    if (!e.includes("@")) { setErr("Type the email you'll check right now."); return; }
    setErr(""); setState("busy");
    const r = await startSignIn(e);
    if (!r.ok) { setErr(r.error); setState("idle"); return; }
    if (r.devLink) setDevLink(r.devLink);
    setState("sent");
  };
  const out = async () => { await signOut(); setWho({ signedIn: false }); setState("idle"); };
  const back = (e: Event) => { e.preventDefault(); location.hash = ""; };

  if (who === null) return <><div class="row between"><Wordmark small /><span class="pill">Account</span></div><p class="small">One sec…</p></>;

  if (who.signedIn) {
    const owned = DECK_SUMMARIES.filter((d) => d.id === "starter" || who.decks.includes(d.id));
    const starter = DECK_SUMMARIES.find((d) => d.id === "starter")!;
    const passDate = who.passUntil ? new Date(who.passUntil).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
    return (
      <>
        <div class="row between"><Wordmark small /><span class="pill">Account</span></div>
        <Panel title="You're in">
          <p class="sub">Signed in as <b>{who.email}</b>. Anything you buy follows this email to any phone, web or app.</p>
        </Panel>
        <Panel title="Your decks">
          {passDate && <p class="sub"><b>Vulgar Acts Pass</b> active until {passDate}. Every deck, including new ones. <a href="#" onClick={async (e) => { e.preventDefault(); const r = await portal(); if (r.ok) location.href = r.data.url; }}>Manage or cancel</a></p>}
          <div class="list">{owned.map((d) => <div key={d.id}><span>{d.title}</span><span class="small">{d.id === "starter" ? (who.starterFull ? `${d.count} cards · full` : `${starter.freeCount} of ${d.count} cards · free`) : `${d.count} cards`}</span></div>)}</div>
          {who.decks.length === 0 && !who.starterFull && <p class="small">Just the free Starter so far. <a href="#store">Browse the store</a>.</p>}
          <p class="small">Decks you own come with you into any room: host or join from this phone and the lobby unlocks them for everyone there.</p>
        </Panel>
        <div class="row"><button onClick={out}>Sign out</button><button class="yellow" onClick={() => { location.hash = "store"; }}>Store</button><button class="primary" onClick={() => { location.hash = "play"; }}>Play</button></div>
        <p class="small"><a href="#" onClick={back}>← Front page</a></p>
      </>
    );
  }

  if (state === "sent") return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Account</span></div>
      <Panel title="Check your email">
        <p class="sub">We sent a sign-in link to <b>{email.trim()}</b>. Tap it on this phone and you're in. It works once and lasts 15 minutes.</p>
        {devLink && <p class="small">Dev build, no mail set up — <a href={devLink} onClick={async (e) => { e.preventDefault(); await fetch(devLink, { credentials: "include", redirect: "manual" }); setDevLink(""); landed(await me()); }}>use the link directly</a>.</p>}
        <p class="small">Nothing arrived? Check spam, or <a href="#" onClick={(e) => { e.preventDefault(); setState("idle"); }}>try a different email</a>.</p>
      </Panel>
      <p class="small"><a href="#" onClick={back}>← Front page</a></p>
    </>
  );

  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Account</span></div>
      <Panel title="Sign in">
        <p class="sub">No password. Type your email and we'll send a link that signs you in. You only need this to buy decks; playing is free and needs nothing.</p>
        <input type="email" inputMode="email" autocomplete="email" placeholder="you@example.com" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }} />
        {err && <p class="err">{err}</p>}
        <button class="primary big" disabled={state === "busy"} onClick={go}>{state === "busy" ? "Sending…" : "Email me a link"}</button>
        <p class="small">We keep your email and nothing else. <a href="#privacy">Privacy</a>.</p>
      </Panel>
      <p class="small"><a href="#" onClick={back}>← Front page</a></p>
    </>
  );
}
