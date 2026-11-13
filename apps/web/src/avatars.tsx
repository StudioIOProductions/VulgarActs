/**
 * Sixteen original characters, heads only, in a clean adult-animation style:
 * thin even outlines, flat fills with one shade tone, big white eyes with
 * pinprick pupils, wide toothy mouths. Drawn inline: nothing to license,
 * nothing to load. Each draws into a 64x64 viewBox.
 */
import type { JSX } from "preact";

const K = "#1a1a1a";
const O = { stroke: K, "stroke-width": 1.8, "stroke-linejoin": "round", "stroke-linecap": "round" } as const;
const L = { stroke: K, "stroke-width": 1.4, "stroke-linecap": "round", fill: "none" } as const;

/** Big white eye with a tiny pupil; rx/ry per eye so no two match. */
const eye = (x: number, y: number, rx: number, ry: number, px = 0.6, py = 0.6) => (
  <>
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" {...O} />
    <circle cx={x + px} cy={y + py} r={1.5} fill={K} />
  </>
);
/** A half-closed eye: a lid across the top. */
const lid = (x: number, y: number, rx: number, ry: number, fill: string) => <path d={`M${x - rx} ${y}a${rx} ${ry} 0 0 1 ${rx * 2} 0z`} fill={fill} {...O} />;
/** Open mouth with a row of neat teeth along the top edge. */
const mouth = (d: string, teethFrom: [number, number], teethTo: [number, number], n = 5, tongue?: string) => {
  const [x1, y1] = teethFrom, [x2, y2] = teethTo; const dx = (x2 - x1) / n, dy = (y2 - y1) / n;
  let t = `M${x1} ${y1}`; for (let i = 0; i < n; i++) t += `l${dx / 2} ${dy / 2 + 2.4} l${dx / 2} ${dy / 2 - 2.4}`;
  return <><path d={d} fill="#5a1a1a" {...O} />{tongue && <path d={tongue} fill="#e8616a" {...O} />}<path d={t} fill="#fff" {...O} /></>;
};

export const AVATAR_NAMES = ["Bear", "Blob", "Squid", "Potato", "Toilet", "Pizza", "Ghost", "Cyclops", "Cat", "Onion", "Avocado", "Disco Ball", "Brain", "Worm", "Sock", "Banana"];
export const AVATAR_COUNT = AVATAR_NAMES.length;

const draw: (() => JSX.Element)[] = [
  // 0 Bear
  () => <>
    <circle cx="15" cy="17" r="8" fill="#b8742f" {...O} /><circle cx="49" cy="17" r="8" fill="#b8742f" {...O} />
    <circle cx="15" cy="17" r="4" fill="#e9b98a" /><circle cx="49" cy="17" r="4" fill="#e9b98a" />
    <ellipse cx="32" cy="36" rx="23" ry="21" fill="#b8742f" {...O} />
    <path d="M9 36c0 12 10 21 23 21-12-3-19-10-23-21z" fill="#8f5722" />
    <ellipse cx="32" cy="43" rx="12" ry="9" fill="#e9b98a" {...O} />
    {eye(23, 31, 5, 5.5, 0.8, 0.8)}{eye(41, 31, 5, 5.5, -0.8, 0.8)}
    <ellipse cx="32" cy="40" rx="4" ry="2.6" fill={K} />
    {mouth("M24 46q8 7 16 0q-8 2-16 0z", [25, 46.5], [39, 46.5], 4)}
    <path d="M17 24q5-3 10 0M37 24q5-3 10 0" {...L} />
  </>,
  // 1 Blob: three eyes, wobbly rim, drip
  () => <>
    <path d="M11 36c-4-14 7-26 21-26s26 10 22 26c-2 9-9 14-21 14S14 47 11 36z" fill="#8fe08a" {...O} />
    <path d="M11 36c2 8 7 13 18 14-10-2-15-7-18-14z" fill="#5fbf5f" />
    <ellipse cx="22" cy="12" rx="3" ry="2.2" fill="#c9f5c6" />
    {eye(20, 30, 4.5, 5, 0.8, 0.5)}{eye(34, 27, 7, 7.5, 0.4, 0.8)}{eye(47, 34, 3.5, 4, -0.6, 0.5)}
    {mouth("M21 42c6 8 18 8 24 0q-12 3-24 0z", [22, 42.5], [44, 42.5], 6, "M28 46q4 3 8 0q-4 4-8 0z")}
  </>,
  // 2 Squid: dome, two tentacle curls, narrowed eyes
  () => <>
    <path d="M14 36c0-20 8-30 18-30s18 10 18 30c0 4-3 6-6 6H20c-3 0-6-2-6-6z" fill="#f08bc0" {...O} />
    <path d="M14 36c0 4 3 6 6 6h6c-6-2-9-8-9-20-2 4-3 9-3 14z" fill="#d05f9b" />
    <path d="M20 42q-3 8 2 14M44 42q3 8-2 14M32 42v12" fill="none" stroke="#f08bc0" stroke-width="5" stroke-linecap="round" /><path d="M20 42q-3 8 2 14M44 42q3 8-2 14M32 42v12" {...L} />
    <ellipse cx="22" cy="12" rx="3.5" ry="2" fill="#ffd3ea" />
    {eye(25, 26, 4.5, 5, 0.8, 0.4)}{eye(39, 26, 5.5, 6, -0.8, 0.6)}
    <path d="M19 19l9 3M45 19l-9 3" {...O} />
    <path d="M27 36q5 3 10 0" {...L} />
  </>,
  // 3 Potato: lumpy, sprouting, gormless
  () => <>
    <path d="M12 34c-3-12 8-24 22-23s22 12 18 26-10 19-22 17S15 45 12 34z" fill="#d4a259" {...O} />
    <path d="M12 34c2 9 8 17 18 20-8-5-13-11-18-20z" fill="#a97a37" />
    <path d="M30 11l1-7M36 11l5-6M42 13l6-3" {...O} />
    <circle cx="20" cy="40" r="1.4" fill="#8a6128" /><circle cx="44" cy="22" r="1.4" fill="#8a6128" /><circle cx="46" cy="44" r="1.4" fill="#8a6128" /><circle cx="26" cy="22" r="1.2" fill="#8a6128" />
    {eye(26, 30, 5.5, 6, 0.8, 1)}{eye(41, 31, 4.5, 5, -0.4, 1)}
    {mouth("M26 43c3-3 11-3 14 0 0 5-14 5-14 0z", [27, 43], [39, 43], 3)}
  </>,
  // 4 Toilet: tank face, lid up
  () => <>
    <rect x="20" y="5" width="26" height="21" rx="3" fill="#f5f2ea" {...O} /><rect x="20" y="20" width="26" height="6" fill="#d8d3c6" />
    <rect x="29" y="1" width="6" height="4" rx="1.5" fill="#9bb7c9" {...O} />
    <path d="M10 31h44c0 14-8 24-22 24S10 45 10 31z" fill="#f5f2ea" {...O} />
    <path d="M10 31c0 14 8 24 22 24-11-3-18-11-20-24z" fill="#d8d3c6" />
    <rect x="8" y="28" width="48" height="6" rx="2" fill="#f5f2ea" {...O} />
    {eye(26, 15, 4, 4.5, 0.6, 0.5)}{eye(39, 14, 5.5, 6, -0.5, 0.7)}
    <path d="M27 22q6 2 12-1" {...L} />
    <ellipse cx="32" cy="41" rx="11" ry="5" fill="#7ec3e6" {...O} /><ellipse cx="28" cy="40" rx="3" ry="1.2" fill="#c9eaf7" />
  </>,
  // 5 Pizza: slice, point up, crust base
  () => <>
    <path d="M32 4L11 50h42z" fill="#f2b544" {...O} />
    <path d="M32 4L11 50h8L32 14z" fill="#d9951e" opacity="0.6" />
    <path d="M9 50h46c0 5-4 9-9 9H18c-5 0-9-4-9-9z" fill="#c07a2c" {...O} />
    <path d="M9 50c0 5 4 9 9 9h4c-5-2-8-5-9-9z" fill="#94581c" />
    <circle cx="26" cy="38" r="3.8" fill="#d8322a" {...O} /><circle cx="41" cy="41" r="3.2" fill="#d8322a" {...O} /><circle cx="33" cy="19" r="2.8" fill="#d8322a" {...O} />
    {eye(28, 27, 4, 4.5, 0.6, 0.6)}{eye(38, 29, 5, 5.5, -0.5, 0.8)}
    {mouth("M29 44q4 4 8 0q-4 1-8 0z", [29.5, 44], [36.5, 44], 2)}
  </>,
  // 6 Ghost: sheet with a wavy hem, startled
  () => <>
    <path d="M13 58V30c0-13 8-21 19-21s19 8 19 21v28l-6-6-7 6-6-6-7 6-6-6z" fill="#f5f2ea" {...O} />
    <path d="M13 58V30c0-6 2-11 5-15-1 5-1 10-1 15v22z" fill="#cfc9bb" />
    <ellipse cx="25" cy="17" rx="4" ry="2.4" fill="#fff" />
    {eye(24, 30, 4.5, 5, 0.6, 0.6)}{eye(40, 29, 6.5, 7, -0.6, 0.8)}
    <ellipse cx="32" cy="43" rx="4.5" ry="6" fill="#5a1a1a" {...O} />
  </>,
  // 7 Cyclops: one eye, small horns, flat grin
  () => <>
    <path d="M11 38c0-17 9-27 21-27s21 10 21 27-9 19-21 19S11 55 11 38z" fill="#a37bff" {...O} />
    <path d="M11 38c0 11 6 18 16 19-8-4-12-12-12-23 0-4 1-8 2-11-4 4-6 9-6 15z" fill="#7a52d9" />
    <path d="M22 13l-4-8 8 4M42 13l4-8-8 4" fill="#f5e0a3" {...O} />
    <ellipse cx="32" cy="33" rx="12" ry="11" fill="#fff" {...O} /><circle cx="33.5" cy="34" r="5" fill="#2aa9d8" {...O} /><circle cx="34.5" cy="35" r="2" fill={K} /><circle cx="31" cy="31" r="1.4" fill="#fff" />
    {mouth("M22 49h20c0 5-20 5-20 0z", [22.5, 49], [41.5, 49], 6)}
  </>,
  // 8 Picasso cat: two faces at once, one profile, one frontal
  () => <>
    <path d="M13 22l1-16 11 9h14l11-9 1 16v16c0 11-8 20-19 20S13 49 13 38z" fill="#f5c623" {...O} />
    <path d="M33 15h0l5 0 1 7v16c0 11-8 20-19 20h13z" fill="#2a9fd6" {...O} />
    <path d="M13 38c0 11 8 20 19 20-9-3-14-10-15-20z" fill="#c99a14" />
    {eye(23, 31, 5, 4.5, 0.8, 0.5)}
    <path d="M38 25l12 2-2 10-10-1z" fill="#fff" {...O} /><circle cx="45" cy="31" r="1.5" fill={K} />
    <path d="M16 25l9-3" {...O} />
    <path d="M26 40l5 6-9 1z" fill="#e84a5f" {...O} />
    <path d="M19 50q7-4 13 0M37 47l9 3" {...L} />
    <path d="M6 36h9M5 42h9M48 40h10M47 46h10" {...L} />
  </>,
  // 9 Onion: layered, sobbing
  () => <>
    <path d="M32 3c5 8 7 13 7 17H25c0-4 2-9 7-17z" fill="#d4c0e6" {...O} />
    <path d="M11 38c0-15 9-21 21-21s21 6 21 21-9 21-21 21S11 53 11 38z" fill="#eadff2" {...O} />
    <path d="M11 38c0 12 6 19 16 21-8-5-12-12-12-21 0-5 1-9 3-13-5 3-7 8-7 13z" fill="#c9b3dc" />
    <path d="M19 27q13-7 26 0M17 36q15-7 30 0" fill="none" stroke="#b59cd1" stroke-width="2" stroke-linecap="round" />
    {eye(24, 38, 5, 6, 0.6, 1)}{eye(40, 37, 6, 7, -0.6, 1)}
    <path d="M22 45q-1 7-4 12M42 44q1 7 4 12" fill="none" stroke="#7ec3e6" stroke-width="2.6" stroke-linecap="round" />
    <path d="M27 51c2-3 8-3 10 0" {...L} />
  </>,
  // 10 Avocado: half, pit for a nose, serene
  () => <>
    <path d="M14 36c0-18 8-30 18-30s18 12 18 30c0 11-8 20-18 20S14 47 14 36z" fill="#3f8f3f" {...O} />
    <path d="M18 36c0-15 6-26 14-26s14 11 14 26c0 9-6 16-14 16s-14-7-14-16z" fill="#b9e07a" {...O} />
    <path d="M18 36c0 9 6 16 14 16-6-3-10-9-10-16 0-9 2-17 5-22-6 4-9 13-9 22z" fill="#8fc24e" />
    {eye(25, 29, 4.5, 5, 0.6, 0.6)}{eye(39, 29, 4.5, 5, -0.6, 0.6)}
    <circle cx="32" cy="40" r="6" fill="#8a5a2b" {...O} /><ellipse cx="30" cy="38" rx="2" ry="1.2" fill="#b98a5a" />
    <path d="M27 49q5 3 10 0" {...L} />
  </>,
  // 11 Disco ball: faceted, dazzled
  () => <>
    <path d="M32 2v6" {...O} /><circle cx="32" cy="34" r="24" fill="#6fc9f2" {...O} />
    <path d="M8 34c0 13 11 24 24 24-10-5-16-13-16-24s6-19 16-24C19 10 8 21 8 34z" fill="#3a9fd0" />
    <path d="M10 26h44M8 34h48M10 42h44M22 12v44M32 10v48M42 12v44" fill="none" stroke={K} stroke-width="1.2" opacity="0.45" />
    <rect x="24" y="26" width="8" height="8" fill="#fff" opacity="0.7" /><rect x="42" y="34" width="8" height="8" fill="#fff" opacity="0.5" />
    {eye(25, 31, 5.5, 6, 0.8, 0.5)}{eye(41, 36, 3.5, 4, -0.5, 0.5)}
    {mouth("M25 46q7 5 14 0q-7 2-14 0z", [26, 46.5], [38, 46.5], 4)}
  </>,
  // 12 Brain: in a jar, pleased
  () => <>
    <rect x="12" y="20" width="40" height="40" rx="4" fill="#cdeffc" {...O} /><rect x="10" y="14" width="44" height="8" rx="2" fill="#8a8f94" {...O} />
    <path d="M12 24v32c0 2 2 4 4 4h4c-3-1-4-3-4-6V24z" fill="#9ed4ea" />
    <path d="M18 44c-4-10 2-20 14-20s18 10 14 20-7 10-14 10-10-2-14-10z" fill="#f49ac1" {...O} />
    <path d="M18 44c2 6 6 9 11 10-7-3-10-8-11-16z" fill="#d6709c" />
    <path d="M32 24v30M24 30q6 2 8 8M40 30q-6 2-8 8M22 44q6-2 10 2M42 44q-6-2-10 2" {...L} />
    {eye(26, 38, 3.5, 4, 0.6, 0.6)}{eye(37, 37, 4.5, 5, -0.6, 0.6)}
    <path d="M27 48q5 3 10-1" {...L} /><circle cx="18" cy="52" r="1.5" fill="#fff" {...O} /><circle cx="46" cy="30" r="1.2" fill="#fff" {...O} />
  </>,
  // 13 Worm: a head with a top hat and monocle, body curling off the bottom
  () => <>
    <path d="M30 54q-12-2-14 8" fill="none" stroke="#f08bc0" stroke-width="9" stroke-linecap="round" /><path d="M30 54q-12-2-14 8" {...L} />
    <circle cx="34" cy="36" r="18" fill="#f08bc0" {...O} />
    <path d="M16 36c0 10 8 18 18 18-8-4-12-10-12-18s4-14 12-18C24 18 16 26 16 36z" fill="#d05f9b" />
    <path d="M20 44h6M19 38h5M21 32h5" {...L} />
    {eye(29, 33, 4, 4.5, 0.6, 0.6)}<circle cx="42" cy="34" r="5.5" fill="#fff" {...O} /><circle cx="43" cy="35" r="1.5" fill={K} /><path d="M46 38l4 8" {...L} />
    <path d="M28 44q6 4 12 0" {...L} />
    <path d="M22 21h24v-3h-3V7H25v11h-3z" fill={K} /><path d="M25 14h16" stroke="#e84a5f" stroke-width="2.4" />
  </>,
  // 14 Sock: heel up, angry, one hole
  () => <>
    <path d="M22 6h18v24c0 6 8 8 12 14s0 14-10 14H24c-8 0-12-6-10-12s8-6 8-12z" fill="#f5c623" {...O} />
    <path d="M22 30c0 6-6 6-8 12s2 12 10 12h3c-6-2-9-7-7-12s6-6 6-12V6h-4z" fill="#c99a14" />
    <path d="M22 6h18v7H22z" fill="#f5f2ea" {...O} /><path d="M24 15h14M24 19h14" fill="none" stroke="#d8322a" stroke-width="2.2" />
    {eye(28, 29, 4, 4.5, 0.6, 0.6)}{eye(37, 31, 3.2, 3.6, -0.5, 0.6)}
    <path d="M23 24l9 3M42 26l-8 2" {...O} />
    {mouth("M27 41c3-3 8-3 11 0 0 4-11 4-11 0z", [28, 41], [37, 41], 3)}
    <circle cx="44" cy="50" r="3.2" fill={K} />
  </>,
  // 15 Banana: bruised, grinning
  () => <>
    <path d="M13 13c-2 19 9 36 28 43 8 3 15 0 17-5-20-3-32-18-30-39z" fill="#f5d64a" {...O} />
    <path d="M13 13c-2 19 9 36 28 43-14-9-22-23-22-40z" fill="#d9b422" />
    <path d="M13 13l-4-6 8 1" fill="#4e9a3a" {...O} /><path d="M53 51c-3 2-5 5-7 8" fill="#b57b2b" {...O} />
    <circle cx="22" cy="32" r="2" fill="#8b5a2b" /><circle cx="34" cy="46" r="2.4" fill="#8b5a2b" /><circle cx="19" cy="21" r="1.4" fill="#8b5a2b" />
    {eye(26, 25, 4, 4.5, 0.6, 0.6)}{eye(35, 33, 5, 5.5, 0.6, 0.8)}
    {mouth("M31 44c4-2 12 1 14 5-6 2-12 1-14-5z", [32, 44.5], [44, 48.5], 4)}
  </>,
];

export function AvatarArt({ n }: { n: number }) {
  const i = ((n % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  return <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">{draw[i]()}</svg>;
}
