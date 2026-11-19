/** Small shared pieces: wordmark, avatars, segmented controls. */
import type { ComponentChildren } from "preact";

/** The wordmark, ransom-note style like the box: every letter in its own black tile on the red bar,
 *  each tile cut a little differently (pitch, size, height) so no two look alike. */
const CUTS: { r: number; s: number; y: number; px: number }[] = [
  { r: -5, s: 1.0, y: 0, px: 0.14 },  // V
  { r: 4, s: 0.92, y: 3, px: 0.1 },    // U
  { r: -2, s: 1.08, y: -2, px: 0.12 }, // L
  { r: 6, s: 0.95, y: 2, px: 0.16 },   // G
  { r: -4, s: 1.04, y: -1, px: 0.1 },  // A
  { r: 3, s: 0.9, y: 3, px: 0.14 },    // R
  { r: 0, s: 1, y: 0, px: 0 },         // space
  { r: 5, s: 1.06, y: -3, px: 0.12 },  // A
  { r: -6, s: 0.94, y: 2, px: 0.16 },  // C
  { r: 2, s: 1.1, y: -1, px: 0.1 },    // T
  { r: -3, s: 0.96, y: 3, px: 0.14 },  // S
];
/** A deck in a picker grid. Locked tiles explain themselves instead of toggling. */
export function DeckTile({ d, on, locked, starterFull, onToggle, onLocked }: {
  d: { id: string; title: string; count: number; freeCount: number; rating: string; art: string; color: string; ink: string };
  on: boolean; locked: boolean; starterFull: boolean; onToggle: () => void; onLocked?: () => void;
}) {
  const isStarter = d.id === "starter";
  const cards = isStarter && !starterFull ? `${d.freeCount} of ${d.count} cards` : `${d.count} cards`;
  return (
    <button type="button" class={"decktile" + (on ? " on" : "") + (locked ? " locked" : "")} aria-pressed={on} style={{ background: d.color, color: d.ink }}
      onClick={locked ? onLocked : onToggle}>
      <img src={d.art} alt="" />
      <span class="dt"><b>{d.title}</b><span>{cards}{d.rating === "18+" ? " · 18+" : ""}</span></span>
      <span class="dcheck">{locked ? "🔒 Locked" : on ? "✓ In play" : "Off"}</span>
    </button>
  );
}

/** Card styling class per deck: After Dark goes black-and-red, Office Party goes slate. */
export const deckClass = (deck?: string | null) => deck === "afterdark" ? " dark" : deck === "office" ? " office" : deck === "pop" ? " pop" : "";
export const deckMark = (deck?: string | null) => deck === "afterdark" ? "After Dark" : deck === "office" ? "Office Party" : deck === "pop" ? "Pop Culture" : "Vulgar Acts";

export const Wordmark = ({ small = false }: { small?: boolean }) => {
  const letters = "VULGAR ACTS".split("");
  return (
    <div class={"wordmark" + (small ? " small" : "")} aria-label="Vulgar Acts" role="img">
      {letters.map((ch, i) => {
        const c = CUTS[i];
        return ch === " "
          ? <span key={i} class="gap" aria-hidden="true" />
          : <span key={i} class="tile" style={{ fontSize: `${c.s}em`, padding: `0 ${c.px}em`, transform: `rotate(${c.r}deg) translateY(${c.y}px)` }}>{ch}</span>;
      })}
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

export const Panel = ({ title, children, cls = "", tone }: { title?: string; children: ComponentChildren; cls?: string; tone?: "paper" | "dark" }) => (
  <div class={"panel " + cls + (tone === "dark" ? " dark" : "")}>{title && <h2>{title}</h2>}{children}</div>
);
