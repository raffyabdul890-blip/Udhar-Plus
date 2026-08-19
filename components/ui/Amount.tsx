"use client";

import { useEffect, useRef, useState } from "react";

/** Financial figure with a brief count-up animation whenever its value changes. */
export default function Amount({
  value,
  prefix = "",
  className,
}: {
  value: number;
  /** e.g. "+" or "-" shown before the digits, unaffected by the count-up. */
  prefix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const [popping, setPopping] = useState(false);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    if (from === value) return;
    prevRef.current = value;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const duration = 450;
    const delta = value - from;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPopping(true);
        window.setTimeout(() => setPopping(false), 320);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span
      className={`inline-block tabular-nums ${popping ? "animate-value-pop" : ""} ${className ?? ""}`}
    >
      {prefix}
      {display.toLocaleString("en-PK")}
    </span>
  );
}
