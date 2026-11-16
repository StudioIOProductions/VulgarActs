/** Game over: the winner, the awards, the custom-card authors revealed, play again. */
import type { PlayerView } from "../../server/src/protocol";
import type { Connection } from "./net";
import { Avatar, Panel } from "./ui";
import { Scoreboard } from "./Turn";

export function FinalScreen({ view, conn, tv = false }: { view: PlayerView; conn: Connection; tv?: boolean }) {
  const a = view.awards!;
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? "someone";
  const av = (id: string) => view.players.find((p) => p.id === id)?.avatar ?? 0;
  const winnerLine = a.tie ? "It's a tie!" : view.teams ? `${a.winner} wins!` : a.winner.includes("&") ? `${a.winner} share the win!` : `${a.winner} wins!`;

  const main = (
    <>
      <div class="alert">
        <p class="tag ink">Game over</p>
        <h1 class={tv ? "huge" : ""}>{winnerLine}</h1>
        {a.tie && view.teams && <p class="rule">Sudden death: one card, no sound, each team's best giver. First to get it wins.</p>}
      </div>
      {a.tie && view.teams && view.isHost && (
        <div class="row">
          {view.teams.map((t, i) => <button key={i} class={i === 0 ? "primary" : "yellow"} onClick={() => conn.action("suddenDeath", { team: i })}>{t.name} got it</button>)}
        </div>
      )}
      <Scoreboard view={view} />
    </>
  );
  const awards = (
    <>
      <Panel title="Awards">
        <div class="list">
          {a.bestGiver && <div><span>Best clue giver</span><span><Avatar n={av(a.bestGiver.id)} size={20} /> {name(a.bestGiver.id)} · {a.bestGiver.count}</span></div>}
          {a.mostSkipped && a.mostSkipped.skips > 0 && <div><span>Most skipped card</span><span>{a.mostSkipped.text} · {a.mostSkipped.skips}</span></div>}
          {a.hardestCustom && <div><span>Hardest inside joke</span><span>{a.hardestCustom.text} · by {name(a.hardestCustom.by)}</span></div>}
        </div>
      </Panel>
      {a.customs.length > 0 && (
        <Panel title="Who wrote what">
          <div class="list">{a.customs.map((c, i) => <div key={i}><span>{c.text}</span><span><Avatar n={av(c.by)} size={20} /> {name(c.by)}</span></div>)}</div>
        </Panel>
      )}
      {view.isHost
        ? <div class="row"><button class="yellow" onClick={() => conn.action("playAgain")}>Play again, same room</button></div>
        : <p class="small">The host can start another game.</p>}
    </>
  );
  if (tv) return <div class="cols"><div class="col">{main}</div><div class="col">{awards}</div></div>;
  return <>{main}{awards}</>;
}
