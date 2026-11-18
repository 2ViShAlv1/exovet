import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { breakpoints } from "../design/tokens";

/** True while a CSS media query matches. Safe on first render (reads synchronously). */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Phones and small tablets: get the lightweight planet instead of the WebGL one. */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${breakpoints.mobile - 1}px)`);
}

/** Touch-first devices: no cursor effects. */
export function useIsTouch(): boolean {
  return useMediaQuery("(hover: none), (pointer: coarse)");
}

/** Respect the OS "reduce motion" setting. */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

/** False while the tab is hidden, so animations can pause. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
