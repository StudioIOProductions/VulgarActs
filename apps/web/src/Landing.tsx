/** The front door: what the game is, how it plays, the decks, and one red button. */
import { Wordmark } from "./ui";

export function Landing() {
  const play = (e: Event) => { e.preventDefault(); location.hash = "play"; };
  return (
    <div class="landing">
      <header class="hero">
        <div class="hero-text">
          <Wordmark />
          <p class="kicker">A party game for adults who should know better</p>
          <h1 class="hero-h">Charades, minus the dignity.</h1>
          <p class="hero-p"><b>Everyone joins from their own phone. One bowl of cards, three rounds, and your friends’ secrets on the cards. No download, no sign-up, no ads.</b></p>
          <div class="row">
            <a class="btn primary" href="#play" onClick={play}>Play with friends</a>
            <a class="btn yellow" href="#duo" onClick={(e) => { e.preventDefault(); location.hash = "duo"; }}>Just the two of us</a>
            <a class="btn" href="#cards" onClick={(e) => { e.preventDefault(); location.hash = "cards"; }}>Just read the cards</a>
          </div>
          <p class="fine">Rated 17+ · 4 to 16 players · 35 to 50 minutes</p>
        </div>
        <img class="hero-box" src="/img/box.png" alt="The Vulgar Acts box: a pop-art blonde with her mouth open, the title stamped across her eyes" width="640" height="495" />
      </header>

      <section id="how" class="band cream">
        <div class="inner">
          <p class="eyebrow">How to play</p>
          <h2 class="h2">Three rounds. Zero dignity.</h2>
          <p class="lead"><b>Everyone puts three cards in the bowl, or writes their own. Then you take turns giving clues against the clock. The same cards come back every round, and the rules get stricter each time.</b></p>
          <div class="rounds">
            <div class="rcard"><span class="rn">1</span><h3>Say anything</h3><p>Describe it, act it, scream it. Just not the words on the card.</p></div>
            <div class="rcard"><span class="rn">2</span><h3>One word</h3><p>Everyone’s heard every card once. Now you get a single word, then you act.</p></div>
            <div class="rcard dark"><span class="rn">3</span><h3>Act only</h3><p>No sound at all. Mime “Puppets with human teeth” to someone you love.</p></div>
          </div>
          <ul class="facts">
            <li><b>Two teams,</b> or free-for-all with points for the giver</li>
            <li><b>60-second turns,</b> three skips, and a Buzz button for when the giver cheats</li>
            <li><b>A host screen on the TV</b> shows the code, the clock and the scores; phones are the controllers</li>
            <li><b>Write your own cards:</b> inside jokes, last weekend, the person sitting next to you</li>
          </ul>
        </div>
      </section>

      <section class="band ink">
        <div class="inner decks">
          <div class="deck-text">
            <p class="eyebrow yellow">The decks</p>
            <h2 class="h2 paper">Free to play. Paid to get filthier.</h2>
            <p class="lead paper">The <b>Starter</b> deck comes with the game: 268 cards of sex, shit and grandma. <b>After Dark</b> is the 60 cards we couldn’t put in the Starter: lights off, phones out, 18+ only. More decks are coming.</p>
            <a class="btn yellow" href="#play" onClick={play}>Play the Starter deck</a>
          </div>
          <img class="deck-box" src="/img/box-dark.png" alt="The After Dark deck box: the same blonde in grey and red on black" width="520" height="622" />
        </div>
      </section>

      <section class="band cyan">
        <div class="inner center">
          <div class="closer">
            <h2 class="h2">Got four friends with phones?</h2>
            <p class="joke">(If not, that might be a <b>YOU</b> problem…)</p>
          </div>
          <a class="btn primary big" href="#play" onClick={play}>Start a room</a>
          <p class="fine ink">Host it on a TV or laptop for the full show, or straight from your phone.</p>
          <p class="fine ink">Only two of you tonight? <a href="#duo" onClick={(e) => { e.preventDefault(); location.hash = "duo"; }} style="color:inherit">Play Duo on one phone.</a></p>
        </div>
      </section>

      <footer class="foot">
        <div class="foot-brand">
          <img src="/img/studio-io.png" alt="Studio IO" width="72" height="35" />
          <span>© {new Date().getFullYear()} Studio IO. Vulgar Acts and the Vulgar Acts box art are trademarks of Studio IO. All rights reserved.</span>
        </div>
        <span>vulgaracts.com · For adults. Custom cards never leave your room.</span>
      </footer>
    </div>
  );
}
