"use client";

import { useEffect, useState } from "react";

import styles from "./a.module.css";

/**
 * The bar is fixed so the brand and the menu are always one tap away. Over the
 * hero it is transparent (the hero's own top scrim carries it); once the page
 * has moved it takes the ground colour. The change is a colour, not movement,
 * and under reduced motion it switches without a transition.
 */
export function AegeanBar({ children }: { children: React.ReactNode }) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setSolid(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className={styles.bar} data-solid={solid}>
      {children}
    </header>
  );
}
