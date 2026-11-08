/** Stand-in cards until Beat 10 loads the real decks from JSON. */
import type { DeckCard } from "@vulgar-acts/engine";

const WORDS = ["Band-Aid lasagna", "Riding a turtle into battle", "Arm wrestling a T-Rex", "Puppets with human teeth", "Trust fall with grandma", "Babies with rabies", "Yeti confetti", "Hot lava yoga", "Fart-powered jetpack", "Ramen gladiators", "Human pyramid scheme", "Pug cartel", "Moshing at the opera", "Interpretive dance eulogy", "Walking on a bed of Legos", "Zumba for cats", "Beatbox wedding vows", "Clown stripper", "Jury duty on Ice", "Condoms for giraffes"];

export const PLACEHOLDER_CARDS: DeckCard[] = [];
for (let i = 0; i < 6; i++) {
  WORDS.forEach((w, j) => PLACEHOLDER_CARDS.push({ id: `ph${i}-${j}`, text: i === 0 ? w : `${w} #${i + 1}`, deck: "starter" }));
}
export const PLACEHOLDER_GROUPS: string[][] = [];
