import { lazy, Suspense, useEffect, useRef, useState } from "react";
import PlanetLite from "./PlanetLite";
import { useIsMobile, usePageVisible, usePrefersReducedMotion } from "../../lib/hooks";

// three.js + r3f live in their own chunk and load only when this component mounts on a desktop
const PlanetScene = lazy(() => import("./PlanetScene"));

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Chooses the right planet for the device:
 *  - phones / no WebGL → CSS planet (PlanetLite)
 *  - desktop → lazy WebGL planet, paused when the tab is hidden or the hero is off-screen
 *  - reduced motion → WebGL planet as a still frame (no rotation, no tilt)
 */
export default function PlanetHero({ className = "" }: { className?: string }) {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();
  const wrapper = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [webgl] = useState(supportsWebGL);

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const useLite = isMobile || !webgl;

  return (
    <div
      ref={wrapper}
      role="img"
      aria-label="Illustration: a ringed exoplanet with a glowing atmosphere and a small orbiting moon"
      className={`relative aspect-square ${className}`}
    >
      {useLite ? (
        <PlanetLite className="h-full w-full" />
      ) : (
        <Suspense fallback={<PlanetLite className="h-full w-full scale-90 opacity-60" />}>
          <PlanetScene animate={!reducedMotion} running={pageVisible && onScreen && !reducedMotion} />
        </Suspense>
      )}
    </div>
  );
}
