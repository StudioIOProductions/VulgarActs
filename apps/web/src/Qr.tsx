import { useEffect, useRef } from "preact/hooks";
import QRCode from "qrcode";

/** A QR code for the join link, drawn on a canvas in the box palette. */
export function Qr({ text, size = 220 }: { text: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, text, { width: size, margin: 1, color: { dark: "#121212", light: "#FFFDF5" } }).catch(() => {});
  }, [text, size]);
  return <canvas ref={ref} class="qr" width={size} height={size} aria-label={`QR code for ${text}`} />;
}
