/**
 * Vulgar Acts rules engine.
 * Pure functions, no screens, no network. Beat 2 fills this in with every rule
 * from the rulebook and a test for each. For Beat 1 it only knows the rounds.
 */
export const ROUNDS = [
  { n: 1, name: "Say Anything", rule: "Say anything you like. Not a word that's on the card." },
  { n: 2, name: "One Word", rule: "Say exactly one word. Then act it out." },
  { n: 3, name: "Act Only", rule: "No sound at all. Mime it." },
] as const;

export type RoundNumber = (typeof ROUNDS)[number]["n"];

/** Four-letter room code with no vowels, so it never spells a word. */
export function makeRoomCode(random: () => number = Math.random): string {
  const letters = "BCDFGHJKLMNPQRSTVWXZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters[Math.floor(random() * letters.length)];
  return code;
}
