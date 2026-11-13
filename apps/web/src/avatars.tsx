/**
 * Sixteen goofy characters, drawn inline in a wobbly, bug-eyed cartoon style:
 * mismatched eyes with pinprick pupils, lumpy outlines, teeth, drool.
 * Nothing to license, nothing to load. Each draws into a 64x64 viewBox.
 */
import type { JSX } from "preact";

const K = "#121212";
const S = { stroke: K, "stroke-width": 2.4, "stroke-linejoin": "round", "stroke-linecap": "round" } as const;
const thin = { stroke: K, "stroke-width": 1.6, "stroke-linecap": "round", fill: "none" } as const;
/** A bug eye: white blob, tiny pupil, a squiggle of a lower lid. rx/ry differ so no two eyes match. */
const eye = (x: number, y: number, rx: number, ry = rx * 1.15, px = 1, py = 1) => (
  <>
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" {...S} />
    <circle cx={x + px} cy={y + py} r={Math.max(1.3, rx * 0.22)} fill={K} />
    <path d={`M${x - rx * 0.7} ${y + ry + 1.5}q${rx * 0.7} 1.5 ${rx * 1.4} 0`} {...thin} />
  </>
);
const teeth = (x: number, y: number, w: number, n = 4) => {
  const s = w / n; let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += `l${s / 2} 3 l${s / 2} -3`;
  return <path d={d} {...thin} />;
};
const drool = (x: number, y: number, h = 6) => <path d={`M${x} ${y}q-1 ${h / 2} 0 ${h}`} fill="none" stroke="#5AC8FA" stroke-width="2.2" stroke-linecap="round" />;

export const AVATAR_NAMES = ["Bear", "Blob", "Squid", "Potato", "Toilet", "Pizza", "Ghost", "Cyclops", "Cat", "Onion", "Pickle", "Disco Ball", "Brain", "Worm", "Sock", "Banana"];
export const AVATAR_COUNT = AVATAR_NAMES.length;

const draw: (() => JSX.Element)[] = [
  // 0 Bear: lumpy head, one chewed ear, unibrow, drooling
  () => <>
    <path d="M9 18c-2-7 5-12 10-8l2 3M55 18c2-7-5-12-10-8l-2 3" fill="#C8792B" {...S} />
    <path d="M44 7l6-4-1 6 4 2-6 2" fill="#C8792B" {...S} />
    <path d="M10 36c-2-16 8-26 22-25s24 10 21 27c-2 13-10 19-22 18S11 50 10 36z" fill="#C8792B" {...S} />
    <path d="M20 46c0-7 6-11 12-11s12 4 12 11-5 9-12 9-12-2-12-9z" fill="#F2D3A0" {...S} />
    {eye(24, 32, 5, 6, 1.5, 2)}{eye(41, 31, 6.5, 7.5, -1, 2)}
    <path d="M18 23q14-6 28 0" {...thin} />
    <path d="M28 43c0-3 8-3 8 0s-8 3-8 0z" fill={K} /><path d="M26 50q6 4 12 0" {...thin} />{teeth(27, 50, 10, 3)}{drool(39, 52, 7)}
  </>,
  // 1 Blob: dripping, three eyes, long tongue
  () => <>
    <path d="M10 38c-5-14 6-28 20-28s26 8 24 24c-1 9-5 11-5 18s-9 5-13 2-9 7-15 0-6-10-11-16z" fill="#7BE07B" {...S} />
    <path d="M14 52q0 6 2 8M48 50q1 6-1 9" fill="none" stroke="#7BE07B" stroke-width="4" stroke-linecap="round" /><path d="M14 52q0 6 2 8M48 50q1 6-1 9" {...thin} />
    {eye(21, 30, 4, 5, 1, 1)}{eye(35, 26, 7, 8, 2, 2)}{eye(47, 36, 3.5, 4, -1, 1)}
    <path d="M22 44q10 10 22 0q-11 2-22 0z" fill={K} {...S} />
    <path d="M30 46c0 6 2 10 6 12 2-4 1-8-2-12z" fill="#FF7AB6" {...S} />
  </>,
  // 2 Squid: dome, dangling tentacles, one furious eye and one bored one
  () => <>
    <path d="M17 33c-1-19 6-29 15-29s16 10 15 29z" fill="#FF7AB6" {...S} />
    <path d="M17 33h30c1 6-2 9-4 9s-1 11-4 12-3-9-5-9-2 9-4 9-3-10-5-9-2 10-5 9-2-13-3-12-1-3 0-9z" fill="#FF7AB6" {...S} />
    {eye(25, 26, 4, 4.5, 1, 0)}{eye(39, 25, 7, 8, -2, 1)}
    <path d="M20 19l9 3M44 17l-10 5" {...thin} />
    <path d="M27 36q5-4 10 0" {...thin} /><path d="M8 20l6 6M56 22l-5 5" {...thin} />
  </>,
  // 3 Potato: lumpy, bloodshot, sprouting, mouth agape
  () => <>
    <path d="M13 32c-5-12 9-24 23-22s21 12 17 25-9 20-22 18S18 44 13 32z" fill="#D9A866" {...S} />
    <path d="M28 10l1-7M35 10l6-6M40 12l6-2" {...thin} />
    <circle cx="21" cy="40" r="1.6" fill={K} /><circle cx="44" cy="22" r="1.6" fill={K} /><circle cx="46" cy="42" r="1.6" fill={K} /><circle cx="26" cy="20" r="1.4" fill={K} />
    {eye(27, 30, 6, 6.5, 2, 2)}{eye(41, 32, 4.5, 5, -1, 2)}
    <path d="M22 28l3 2M44 30l3-1" stroke="#E3261D" stroke-width="1.4" />
    <path d="M27 44c2-3 12-3 14 0 0 5-14 5-14 0z" fill={K} {...S} />{teeth(29, 43, 10, 3)}
  </>,
  // 4 Toilet: lid up, tank with a face, seat as the mouth
  () => <>
    <rect x="20" y="4" width="26" height="22" rx="3" fill="#FFFDF5" {...S} />
    <circle cx="32" cy="3" r="3" fill="#1BA3D6" {...S} />
    <path d="M10 30h44c0 14-8 24-22 24S10 44 10 30z" fill="#FFFDF5" {...S} />
    <path d="M8 28h48v6H8z" fill="#FFFDF5" {...S} />
    {eye(26, 15, 4, 4.5, 1, 1)}{eye(39, 14, 5.5, 6, -1, 2)}
    <path d="M27 22q6 3 12 -1" {...thin} />
    <path d="M20 40c6-4 18-4 24 0-2 8-22 8-24 0z" fill="#1BA3D6" {...S} />{drool(38, 48, 6)}
  </>,
  // 5 Pizza: a slice, point up, crust at the bottom, cheese sliding off
  () => <>
    <path d="M32 4L10 50h44z" fill="#F2B544" {...S} />
    <path d="M8 50h48c0 6-4 9-8 9H16c-4 0-8-3-8-9z" fill="#C8792B" {...S} />
    <path d="M14 48c6-4 10 2 16-2s10 2 16-1" fill="none" stroke="#F7E020" stroke-width="3" stroke-linecap="round" />
    <circle cx="26" cy="36" r="4" fill="#E3261D" {...S} /><circle cx="40" cy="40" r="3.5" fill="#E3261D" {...S} /><circle cx="33" cy="20" r="3" fill="#E3261D" {...S} />
    {eye(27, 26, 4, 4.5, 1, 1)}{eye(38, 29, 5.5, 6, -1, 2)}
    <path d="M28 42q5 4 10 -1" {...thin} />{teeth(29, 41, 9, 3)}{drool(40, 45, 6)}
    <path d="M44 52q1 6-1 9" fill="none" stroke="#F7E020" stroke-width="3" stroke-linecap="round" />
  </>,
  // 6 Ghost: screaming, wobbly hem, one eye huge
  () => <>
    <path d="M13 58V30c0-13 8-21 19-21s19 8 19 21v28l-6-6-7 6-6-6-7 6-6-6z" fill="#FFFDF5" {...S} />
    {eye(24, 30, 4, 4.5, 1, 1)}{eye(40, 29, 8, 9, -2, 2)}
    <path d="M26 42c0-4 12-4 12 0 0 8-12 8-12 0z" fill={K} {...S} />{teeth(27, 42, 10, 3)}
    <path d="M8 24q-6 4-3 11M57 26q5 5 1 10" {...thin} />
  </>,
  // 7 Cyclops: one enormous eye, stubby horns, gritted teeth
  () => <>
    <path d="M11 38c0-17 9-27 21-27s21 10 21 27-9 19-21 19S11 55 11 38z" fill="#9B6BFF" {...S} />
    <path d="M21 14l-5-9 9 5M43 14l5-9-9 5" fill="#F7E020" {...S} />
    <ellipse cx="32" cy="33" rx="13" ry="12" fill="#fff" {...S} /><circle cx="34" cy="34" r="5.5" fill="#1BA3D6" {...S} /><circle cx="35" cy="35" r="2" fill={K} />
    <path d="M18 20q14-8 28 0" {...thin} />
    <path d="M22 50h20" {...S} />{teeth(22, 50, 20, 6)}<path d="M22 50l0 3M42 50l0 3" {...thin} />
  </>,
  // 8 Picasso cat: the face in two colours seen from two angles at once, one ear bent, nose off-centre
  () => <>
    <path d="M12 22l2-15 10 8 8-2 6 4 8-11 6 16-2 18c-1 10-7 18-18 18S12 50 12 40z" fill="#F7E020" {...S} />
    <path d="M33 10l8-6 5 16-2 18c-1 10-7 18-15 18z" fill="#1BA3D6" {...S} />
    <path d="M33 10v46" {...thin} />
    {eye(23, 30, 5, 4, 1, 1)}
    <path d="M38 24l12 2-2 10-10-1z" fill="#fff" {...S} /><circle cx="45" cy="30" r="1.8" fill={K} />
    <path d="M16 25l9-3M50 20l-9 4" {...S} />
    <path d="M26 40l5 6-9 1z" fill="#E3261D" {...S} />
    <path d="M18 50q8-4 14 0M36 46l10 4" {...thin} />
    <path d="M6 36h9M5 42h9M48 40h10M47 46h10" {...thin} />
    <path d="M42 2l8 6-6 4" fill="#1BA3D6" {...S} />
  </>,
  // 9 Onion: layered, sobbing, pointy top
  () => <>
    <path d="M32 3c5 8 7 13 7 17H25c0-4 2-9 7-17z" fill="#D7C3E8" {...S} />
    <path d="M11 38c0-15 9-21 21-21s21 6 21 21-9 21-21 21S11 53 11 38z" fill="#E8D9F2" {...S} />
    <path d="M19 27q13-7 26 0M17 36q15-7 30 0" fill="none" stroke="#B59CD1" stroke-width="2.4" stroke-linecap="round" />
    {eye(24, 38, 5, 6, 1, 2)}{eye(40, 37, 6, 7, -1, 2)}
    <path d="M22 45q-1 7-4 12M42 44q1 7 4 12" fill="none" stroke="#1BA3D6" stroke-width="3" stroke-linecap="round" />
    <path d="M27 50c2-3 8-3 10 0" {...thin} />
  </>,
  // 10 Pickle: bumpy, sunglasses, buck teeth
  () => <>
    <path d="M23 9c-9 7-12 23-7 36s13 14 21 10 10-19 6-31S32 2 23 9z" fill="#4DA64D" {...S} />
    <circle cx="19" cy="24" r="1.6" fill={K} /><circle cx="37" cy="17" r="1.6" fill={K} /><circle cx="25" cy="48" r="1.6" fill={K} /><circle cx="41" cy="42" r="1.6" fill={K} /><circle cx="33" cy="32" r="1.2" fill={K} />
    <path d="M16 27h12v7a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" fill={K} /><path d="M31 27h12v7a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" fill={K} /><path d="M28 30h3" {...S} />
    <path d="M24 44q7 5 14-1" {...thin} /><rect x="30" y="43" width="3.5" height="5" fill="#fff" {...S} /><rect x="34" y="42" width="3.5" height="5" fill="#fff" {...S} />
  </>,
  // 11 Disco ball: mirrored, dazzled, lazy eye
  () => <>
    <path d="M32 2v6" {...S} /><circle cx="32" cy="34" r="24" fill="#5AC8FA" {...S} />
    <path d="M11 26h42M9 34h46M11 42h42M23 12v44M32 10v48M41 12v44" fill="none" stroke={K} stroke-width="1.6" opacity="0.5" />
    {eye(24, 31, 6, 6.5, 2, 1)}{eye(41, 36, 3.5, 4, -1, 1)}
    <path d="M25 46q7 5 14 0" {...thin} />{teeth(26, 46, 12, 4)}
    <path d="M5 12l5 3M59 12l-5 3M7 56l5-3M57 56l-5-3" fill="none" stroke="#F7E020" stroke-width="3" stroke-linecap="round" />
  </>,
  // 12 Brain: wrinkly, in a jar, very pleased with itself
  () => <>
    <rect x="12" y="20" width="40" height="40" rx="4" fill="#CFF3FF" {...S} /><rect x="10" y="14" width="44" height="8" rx="2" fill="#7F8285" {...S} />
    <path d="M18 44c-4-10 2-20 14-20s18 10 14 20-7 10-14 10-10-2-14-10z" fill="#FF7AB6" {...S} />
    <path d="M32 24v30M24 30q6 2 8 8M40 30q-6 2-8 8M22 44q6-2 10 2M42 44q-6-2-10 2" {...thin} />
    {eye(26, 38, 3.5, 4, 1, 1)}{eye(37, 37, 4.5, 5, -1, 1)}
    <path d="M27 48q5 3 10 -1" {...thin} /><circle cx="18" cy="50" r="1.5" fill="#fff" {...S} /><circle cx="46" cy="30" r="1.2" fill="#fff" {...S} />
  </>,
  // 13 Worm: pink, segmented, monocle, little top hat
  () => <>
    <path d="M8 54c2-10 8-14 14-12s8 8 14 4 6-12 10-16" fill="none" stroke="#FF7AB6" stroke-width="11" stroke-linecap="round" />
    <path d="M8 54c2-10 8-14 14-12s8 8 14 4 6-12 10-16" fill="none" {...S} />
    <path d="M14 48h5M20 42h5M31 46h5M39 38h5" {...thin} />
    <circle cx="48" cy="26" r="11" fill="#FF7AB6" {...S} />
    {eye(44, 24, 3.5, 4, 1, 1)}<circle cx="53" cy="25" r="4.5" fill="#fff" {...S} /><circle cx="54" cy="26" r="1.4" fill={K} /><path d="M57 29l4 8" {...thin} />
    <path d="M44 32q5 3 9 0" {...thin} />
    <path d="M40 14h16v-3h-3V4h-10v7h-3z" fill={K} />
  </>,
  // 14 Sock: lost, angry, one hole
  () => <>
    <path d="M22 6h18v24c0 6 8 8 12 14s0 14-10 14H24c-8 0-12-6-10-12s8-6 8-12z" fill="#F7E020" {...S} />
    <path d="M22 6h18v6H22z" fill="#fff" {...S} /><path d="M24 14h14M24 18h14" fill="none" stroke="#E3261D" stroke-width="2.4" />
    {eye(28, 28, 4, 4.5, 1, 1)}{eye(37, 30, 3, 3.5, -1, 1)}
    <path d="M23 23l9 3M42 25l-8 2" {...S} />
    <path d="M27 40q5-4 10 0" {...thin} />{teeth(28, 38, 8, 3)}
    <circle cx="44" cy="50" r="3.5" fill="#121212" />
  </>,
  // 15 Banana: bruised, grinning with too many teeth
  () => <>
    <path d="M12 14c-2 18 10 36 30 42 8 2 14-1 16-5-20-4-32-18-32-38z" fill="#F7E020" {...S} />
    <path d="M12 14l-4-6 8 1" fill="#4DA64D" {...S} /><path d="M52 50c-3 2-5 5-7 8" fill="#C8792B" {...S} />
    <circle cx="22" cy="32" r="2" fill="#8B5A2B" /><circle cx="34" cy="46" r="2.5" fill="#8B5A2B" /><circle cx="18" cy="20" r="1.5" fill="#8B5A2B" />
    {eye(25, 26, 4, 4.5, 1, 1)}{eye(34, 34, 5.5, 6, 1, 2)}
    <path d="M30 44c4-2 13 1 15 5-6 2-13 1-15-5z" fill="#fff" {...S} />{teeth(31, 45, 13, 5)}
    <path d="M20 20l8 2" {...thin} />
  </>,
];

export function AvatarArt({ n }: { n: number }) {
  const i = ((n % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  return <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">{draw[i]()}</svg>;
}
