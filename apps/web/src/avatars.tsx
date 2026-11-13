/**
 * Twelve goofy pop-art characters, drawn inline so there's nothing to license
 * and nothing to load. Thick black outlines, flat box-palette colours.
 * Each is a function returning SVG children for a 64x64 viewBox.
 */
const K = "#121212";
const S = { stroke: K, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" } as const;
const eye = (x: number, y: number, r = 4) => <><circle cx={x} cy={y} r={r + 2} fill="#fff" {...S} /><circle cx={x + 1} cy={y + 1} r={r / 2} fill={K} /></>;
const dots = (x: number, y: number, w: number, h: number, c: string) => <rect x={x} y={y} width={w} height={h} fill={c} opacity="0.25" />;

export const AVATAR_NAMES = ["Bear", "Blob", "Squid", "Potato", "Toilet", "Hot Dog", "Ghost", "Cyclops", "Cat", "Onion", "Pickle", "Disco Ball"];

const draw: ((bg: string) => preact.JSX.Element)[] = [
  // 0 Bear: round head, round ears, big snout, one ear chewed
  () => <>
    <circle cx="16" cy="16" r="9" fill="#C8792B" {...S} /><circle cx="48" cy="16" r="9" fill="#C8792B" {...S} />
    <circle cx="32" cy="36" r="22" fill="#C8792B" {...S} />
    <ellipse cx="32" cy="44" rx="11" ry="8" fill="#F2D3A0" {...S} />
    {eye(24, 32)}{eye(40, 32)}
    <ellipse cx="32" cy="42" rx="4" ry="3" fill={K} /><path d="M26 49q6 4 12 0" fill="none" {...S} />
    <path d="M44 9 l5 -4 l-1 7" fill="#C8792B" {...S} />
  </>,
  // 1 Blob: amorphous, drippy, three eyes
  () => <>
    <path d="M12 40c-6-12 4-26 18-28s26 6 24 22c-1 10-6 14-6 20s-8 4-12 2-10 6-16 0-4-10-8-16z" fill="#7BE07B" {...S} />
    {eye(22, 30, 3)}{eye(36, 26, 5)}{eye(46, 36, 3)}
    <path d="M24 44q10 8 20 0" fill="#121212" {...S} /><path d="M27 44q5 3 10 0" fill="#FF7AB6" stroke="none" />
    <circle cx="14" cy="52" r="3" fill="#7BE07B" {...S} />
  </>,
  // 2 Squid: dome head, tentacles, suspicious eyes
  () => <>
    <path d="M18 34c0-18 6-28 14-28s14 10 14 28z" fill="#FF7AB6" {...S} />
    <path d="M18 34h28v6c0 4-3 6-4 6s-2 10-5 10-3-8-5-8-2 8-5 8-4-10-5-10-4-2-4-6z" fill="#FF7AB6" {...S} />
    {eye(26, 28, 3)}{eye(38, 28, 3)}
    <path d="M22 22q4-3 8 0" fill="none" {...S} /><path d="M34 22q4-3 8 0" fill="none" {...S} />
    <path d="M29 36q3 3 6 0" fill="none" {...S} />
  </>,
  // 3 Potato: lumpy, sprouting, dead-eyed
  () => <>
    <path d="M14 30c-4-12 10-22 22-20s20 12 16 24-10 18-22 16S18 42 14 30z" fill="#D9A866" {...S} />
    <path d="M30 10l2-7M36 10l5-6" fill="none" {...S} /><circle cx="22" cy="24" r="1.5" fill={K} /><circle cx="44" cy="40" r="1.5" fill={K} /><circle cx="26" cy="46" r="1.5" fill={K} />
    {eye(27, 30, 3)}{eye(41, 30, 3)}
    <path d="M28 42h12" fill="none" {...S} />
  </>,
  // 4 Toilet: yes, a toilet, with a face
  () => <>
    <rect x="22" y="6" width="22" height="20" rx="3" fill="#FFFDF5" {...S} />
    <circle cx="33" cy="4" r="3" fill="#1BA3D6" {...S} />
    <path d="M12 30h40c0 14-8 24-20 24S12 44 12 30z" fill="#FFFDF5" {...S} />
    <path d="M10 28h44v6H10z" fill="#FFFDF5" {...S} />
    {eye(26, 42, 3)}{eye(38, 42, 3)}
    <path d="M27 50q5 4 10 0" fill="none" {...S} />
    <path d="M26 14q7-5 14 0" fill="none" {...S} />
  </>,
  // 5 Hot dog: bun, sausage, mustard, one proud eye
  () => <>
    <path d="M8 36c0-10 10-14 24-14s24 4 24 14-10 14-24 14S8 46 8 36z" fill="#E8B96A" {...S} />
    <path d="M10 32c4-8 40-8 44 0" fill="#C8792B" {...S} />
    <path d="M12 30c4-6 36-6 40 0 0 6-40 6-40 0z" fill="#E3261D" {...S} />
    <path d="M16 28q6 6 12 0t12 0t12 0" fill="none" stroke="#F7E020" stroke-width="3" stroke-linecap="round" />
    {eye(24, 38, 3)}{eye(40, 38, 3)}
    <path d="M28 46q4 3 8 0" fill="none" {...S} />
  </>,
  // 6 Ghost: sheet, wobbly hem, surprised
  () => <>
    <path d="M14 56V30c0-12 8-20 18-20s18 8 18 20v26l-6-5-6 5-6-5-6 5-6-5z" fill="#FFFDF5" {...S} />
    {eye(25, 30, 4)}{eye(39, 30, 4)}
    <ellipse cx="32" cy="42" rx="4" ry="6" fill={K} />
    <path d="M10 22q-6 4-4 10" fill="none" {...S} />
  </>,
  // 7 Cyclops: one huge eye, tiny horns
  () => <>
    <path d="M12 38c0-16 9-26 20-26s20 10 20 26-9 18-20 18S12 54 12 38z" fill="#9B6BFF" {...S} />
    <path d="M22 14l-4-8 8 4M42 14l4-8-8 4" fill="#F7E020" {...S} />
    <circle cx="32" cy="34" r="11" fill="#fff" {...S} /><circle cx="33" cy="35" r="5" fill="#1BA3D6" {...S} /><circle cx="34" cy="36" r="2" fill={K} />
    <path d="M26 50q6-4 12 0" fill="none" {...S} /><path d="M29 48l1 3M34 48l-1 3" fill="none" {...S} />
  </>,
  // 8 Cat: judging, with a moustache
  () => <>
    <path d="M14 20l2-14 10 8h12l10-8 2 14v18c0 10-8 18-18 18S14 48 14 38z" fill="#F7E020" {...S} />
    {eye(25, 30, 3)}{eye(39, 30, 3)}
    <path d="M20 28l8-2M44 28l-8-2" fill="none" {...S} />
    <path d="M30 38l2 2 2-2z" fill={K} />
    <path d="M22 42q5-6 10-1 5-5 10 1" fill={K} {...S} />
    <path d="M8 36h10M46 36h10" fill="none" {...S} />
  </>,
  // 9 Onion: layered, crying, pointy top
  () => <>
    <path d="M32 4c4 8 6 12 6 16H26c0-4 2-8 6-16z" fill="#D7C3E8" {...S} />
    <path d="M12 38c0-14 9-20 20-20s20 6 20 20-9 20-20 20S12 52 12 38z" fill="#E8D9F2" {...S} />
    <path d="M20 26q12-6 24 0M18 36q14-6 28 0" fill="none" stroke="#B59CD1" stroke-width="3" stroke-linecap="round" />
    {eye(25, 38, 3)}{eye(39, 38, 3)}
    <path d="M25 44q0 6 -2 10M39 44q0 6 2 10" fill="none" stroke="#1BA3D6" stroke-width="3" stroke-linecap="round" />
    <path d="M28 50q4-3 8 0" fill="none" {...S} />
  </>,
  // 10 Pickle: bumpy, smug, sunglasses
  () => <>
    <path d="M22 10c-8 8-10 22-6 34s12 14 20 10 10-18 6-30S30 2 22 10z" fill="#4DA64D" {...S} />
    <circle cx="20" cy="22" r="1.5" fill={K} /><circle cx="36" cy="18" r="1.5" fill={K} /><circle cx="26" cy="46" r="1.5" fill={K} /><circle cx="40" cy="40" r="1.5" fill={K} />
    <rect x="18" y="26" width="10" height="7" rx="2" fill={K} /><rect x="30" y="26" width="10" height="7" rx="2" fill={K} /><path d="M28 29h2" {...S} />
    <path d="M24 42q6 4 12 -2" fill="none" {...S} />
  </>,
  // 11 Disco ball: mirrored, dazzling, one lazy eye
  () => <>
    <path d="M32 2v6" fill="none" {...S} /><circle cx="32" cy="34" r="24" fill="#5AC8FA" {...S} />
    <path d="M12 26h40M10 34h44M12 42h40M24 12v44M32 10v48M40 12v44" fill="none" stroke="#121212" stroke-width="2" opacity="0.5" />
    {eye(25, 32, 4)}{eye(40, 36, 3)}
    <path d="M26 46q6 4 12 0" fill="none" {...S} />
    <path d="M6 14l4 2M58 14l-4 2M8 54l4-2M56 54l-4-2" fill="none" stroke="#F7E020" stroke-width="3" stroke-linecap="round" />
  </>,
];

export function AvatarArt({ n }: { n: number }) {
  const i = ((n % 12) + 12) % 12;
  return <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">{draw[i]("")}</svg>;
}
