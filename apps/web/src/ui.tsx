/** Small shared pieces: wordmark, avatars, segmented controls. */
import type { ComponentChildren } from "preact";

/** The wordmark, ransom-note style like the box: every letter in its own black tile on the red bar. */
const TILTS = [-4, 3, -2, 4, -3, 2, 0, 3, -4, 2, -2];
export const Wordmark = ({ small = false }: { small?: boolean }) => {
  const letters = "VULGAR ACTS".split("");
  return (
    <div class={"wordmark" + (small ? " small" : "")} aria-label="Vulgar Acts" role="img">
      {letters.map((ch, i) => ch === " "
        ? <span key={i} class="gap" aria-hidden="true" />
        : <span key={i} class="tile" style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg) translateY(${i % 3 === 1 ? 1 : i % 3 === 2 ? -1 : 0}px)` }}>{ch}</span>)}
    </div>
  );
};

import { AvatarArt, AVATAR_NAMES, AVATAR_COUNT } from "./avatars";
/** Sixteen goofy characters; bare artwork, no backing circle. */
export { AVATAR_COUNT };
export function Avatar({ n, size = 36, selected = false }: { n: number; size?: number; selected?: boolean }) {
  const i = ((n % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  return (
    <span class={"avatar" + (selected ? " on" : "")} style={{ width: size, height: size }} role="img" aria-label={AVATAR_NAMES[i]}>
      <AvatarArt n={i} />
    </span>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, id }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; id: string }) {
  return (
    <div class="seg" id={id} role="group">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle<T extends string>({ values, options, onChange, id }: { values: T[]; options: { v: T; label: string }[]; onChange: (v: T[]) => void; id: string }) {
  const flip = (v: T) => {
    const next = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    onChange(next.length ? next : [v]);
  };
  return (
    <div class="seg" id={id} role="group">
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={values.includes(o.v)} onClick={() => flip(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

export const Panel = ({ title, children, cls = "" }: { title?: string; children: ComponentChildren; cls?: string }) => (
  <div class={"panel " + cls}>{title && <h2>{title}</h2>}{children}</div>
);
