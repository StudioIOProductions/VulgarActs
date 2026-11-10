/** Small shared pieces: wordmark, avatars, segmented controls. */
import type { ComponentChildren } from "preact";

export const Wordmark = ({ small = false }: { small?: boolean }) => (
  <div class={"wordmark" + (small ? " small" : "")}><span>Vul</span><span>gar</span> <span>Acts</span></div>
);

/** Twelve pop-art avatars: a colour and a shape, no faces to license. */
const AV_COLORS = ["#E3261D", "#F7E020", "#1BA3D6", "#121212", "#FFFDF5", "#FF7AB6", "#7BE07B", "#FF9A2E", "#9B6BFF", "#00C2A8", "#FF4F81", "#5AC8FA"];
const AV_SHAPES = ["●", "■", "▲", "◆", "★", "✚", "⬟", "⬢", "♥", "☗", "✶", "⬤"];
export function Avatar({ n, size = 36, selected = false }: { n: number; size?: number; selected?: boolean }) {
  const i = ((n % 12) + 12) % 12;
  const bg = AV_COLORS[i];
  const dark = ["#121212", "#E3261D", "#9B6BFF", "#FF4F81", "#1BA3D6", "#00C2A8"].includes(bg);
  return (
    <span class={"avatar" + (selected ? " on" : "")} style={{ width: size, height: size, background: bg, color: dark ? "#FFFDF5" : "#121212", fontSize: size * 0.55 }} aria-label={`Avatar ${i + 1}`}>
      {AV_SHAPES[i]}
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
