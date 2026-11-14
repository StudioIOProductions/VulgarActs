/**
 * Sixteen character avatars, supplied as artwork in /public/img/avatars/<n>.png
 * (256x256, transparent). Index = the player's avatar number.
 */
export const AVATAR_NAMES = ["Pirate Bear", "Alien", "Jellyfish", "Potato", "Toilet", "Pizza", "Ghost", "Minotaur", "Punk Cat", "Onion", "Avocado", "Disco Ball", "Brain", "Worm", "Poop", "Banana"];
export const AVATAR_COUNT = AVATAR_NAMES.length;

export function AvatarArt({ n }: { n: number }) {
  const i = ((n % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  return <img src={`/img/avatars/${i}.png`} alt="" width="256" height="256" draggable={false} />;
}
