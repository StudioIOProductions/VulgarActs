/** Terms and Privacy. Plain English, kept honest to what the app actually does.
 *  Update the "Last updated" line and the lists below whenever the product changes
 *  (accounts, purchases and app-store builds will each need additions). */
import { Wordmark, Panel } from "./ui";

const UPDATED = "November 16, 2026";
const COMPANY = "Studio IO";
const CONTACT = "hello@vulgaracts.com";
const GOVERNING_LAW = "the State of California, United States"; // change if Studio IO is based elsewhere

const Back = () => <p class="small"><a href="#" onClick={(e) => { e.preventDefault(); location.hash = ""; }}>← Front page</a> · <a href="#" onClick={(e) => { e.preventDefault(); location.hash = "terms"; }}>Terms</a> · <a href="#" onClick={(e) => { e.preventDefault(); location.hash = "privacy"; }}>Privacy</a></p>;

export function Terms() {
  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Terms</span></div>
      <Panel title="Terms of use">
        <p class="sub">Last updated {UPDATED}</p>
        <div class="legal">
          <p>Vulgar Acts is a party game made by {COMPANY} ("we", "us"). By using vulgaracts.com or any Vulgar Acts app (together, "the Game") you agree to these terms. If you don't agree, don't play. We've kept this short and in plain English; the short version doesn't make it less binding.</p>

          <h4>1. You must be an adult</h4>
          <p>The Game is for people aged 17 and over. Some decks are marked 18+ and contain explicit sexual content; by opening one you confirm you are at least 18 and that such material is legal to view where you are. If you are under 17, you may not use the Game.</p>

          <h4>2. It's offensive on purpose</h4>
          <p>The cards contain profanity, crude sexual humour, bodily functions and jokes about people, brands and pop culture. Nothing in the Game is a statement of fact about any real person or company, and references to real-world names are parody. If that's not for you, this isn't your game, and that's fine.</p>

          <h4>3. Your custom cards</h4>
          <p>Players can write their own cards during a game. You own what you write. You give us a limited licence to show it to the other people in your room so the Game works; it's held only while the room exists and is never published, sold or used to train anything. You're responsible for what you write: don't add anything that's illegal, that targets a real private person, or that sexualises minors. We can remove content or block rooms that break this without notice.</p>

          <h4>4. Our stuff</h4>
          <p>The Game, its cards, art, box designs, names and the "Vulgar Acts" mark belong to {COMPANY}. You may play it, show it on a screen at your party and share links to it. You may not copy the card decks, sell or redistribute them, scrape them, or use the art or name on your own products. Playing is a licence to play, not a transfer of anything.</p>

          <h4>5. Rooms and hosting</h4>
          <p>Rooms are temporary and open to anyone with the four-letter code. You decide who you give the code to. We may close idle rooms, cap room sizes and take the service down for maintenance at any time.</p>

          <h4>6. Purchases</h4>
          <p>The Game is currently free. If we add paid decks or passes, the price, what you get and any refund rules will be shown before you pay, and those terms will be added here. Purchases made through an app store are also subject to that store's terms.</p>

          <h4>7. No warranty, limited liability</h4>
          <p>The Game is provided "as is". We don't promise it will always be available, bug-free, or that your friends will find it funny. To the fullest extent the law allows, {COMPANY} is not liable for any indirect, incidental or consequential loss arising from the Game, and our total liability to you is limited to the amount you paid us in the last twelve months (which, today, is nothing).</p>

          <h4>8. Changes</h4>
          <p>We may update these terms. The date at the top tells you when. Continuing to play after a change means you accept it. If a change is significant we'll say so on the front page.</p>

          <h4>9. Law</h4>
          <p>These terms are governed by the laws of {GOVERNING_LAW}, and any dispute will be handled in the courts there, unless the law where you live gives you rights that can't be waived.</p>

          <h4>10. Contact</h4>
          <p>Questions, takedown requests or complaints: <a href={"mailto:" + CONTACT}>{CONTACT}</a>.</p>
        </div>
      </Panel>
      <Back />
    </>
  );
}

export function Privacy() {
  return (
    <>
      <div class="row between"><Wordmark small /><span class="pill">Privacy</span></div>
      <Panel title="Privacy">
        <p class="sub">Last updated {UPDATED}</p>
        <div class="legal">
          <p>Short version: we don't want your data. There are no accounts, no passwords, no email sign-up and no ads. Here's exactly what the Game touches.</p>

          <h4>What stays on your phone</h4>
          <p>The nickname and avatar you pick, whether you've confirmed you're 18+, and your sound setting are stored in your browser's local storage so you don't have to set them again. They never leave your device unless you join a room (see next). Clearing your browser data removes them.</p>

          <h4>What a room sees</h4>
          <p>When you join a room, your nickname, avatar and any custom cards you write are sent to our server and shown to the other players in that room, because that's the game. The server keeps them only while the room is alive; a room with nobody connected is wiped automatically after six hours. We don't read them, store them long-term, or use them for anything else.</p>

          <h4>Analytics</h4>
          <p>To find out which cards are duds, our server records a few anonymous game events: a room was created, which decks were chosen, a game started, a turn ended (how many cards were guessed, skipped or buzzed), and which <em>built-in</em> cards were skipped. These events contain no nicknames, no custom card text and no room codes, and we don't try to link them to a person. We use PostHog to store and chart them. There is no analytics script in your browser and no tracking cookies.</p>

          <h4>Hosting</h4>
          <p>The Game runs on Cloudflare. Like any web host, Cloudflare sees your IP address and standard request logs for security and to serve the site; those logs are kept briefly under Cloudflare's own privacy policy. We don't use them to identify players.</p>

          <h4>Purchases</h4>
          <p>Nothing is sold today. If we add paid decks, payment will be handled by a payment provider or your app store; we would receive confirmation that you bought something, never your card number. This policy will be updated first.</p>

          <h4>Children</h4>
          <p>The Game is for adults. We don't knowingly collect anything from anyone under 17. If you believe a child has used it, tell us and we'll delete anything we hold.</p>

          <h4>Your rights</h4>
          <p>Because we hold almost nothing, there's little to request, but you can ask us what we have, ask us to delete it, or complain, at <a href={"mailto:" + CONTACT}>{CONTACT}</a>. If you're in the EU/UK or California, the rights under GDPR/CCPA apply and we'll honour them.</p>

          <h4>Changes</h4>
          <p>If this policy changes, the date at the top changes with it. If we ever start collecting something new, we'll say so plainly here before we do.</p>
        </div>
      </Panel>
      <Back />
    </>
  );
}
