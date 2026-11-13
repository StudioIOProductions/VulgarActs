/** Small shared pieces: wordmark, avatars, segmented controls. */
import type { ComponentChildren } from "preact";

export const Wordmark = ({ small = false }: { small?: boolean }) => (
  <div class={"wordmark" + (small ? " small" : "")}><span>Vul</span><span>gar</span> <span>Acts</span></div>
);

import { AvatarArt, AVATAR_NAMES } from "./avatars";
/** Twelve goofy characters; a tinted circle behind each so they read at chip size. */
const AV_BG = ["#F7E020", "#FFFDF5", "#1BA3D6", "#F7E020", "#1BA3D6", "#FFFDF5", "#1BA3D6", "#F7E020", "#FFFDF5", "#1BA3D6", "#F7E020", "#FFFDF5"];
export function Avatar({ n, size = 36, selected = false }: { n: number; size?: number; selected?: boolean }) {
  const i = ((n % 12) + 12) % 12;
  return (
    <span class={"avatar" + (selected ? " on" : "")} style={{ width: size, height: size, background: AV_BG[i] }} role="img" aria-label={AVATAR_NAMES[i]}>
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
