import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useIsTouch, usePrefersReducedMotion } from "../../lib/hooks";

const GLOW_SIZE = 420;
const SPRING = { stiffness: 120, damping: 22, mass: 0.8 };

/** A soft cyan glow that trails the cursor. Off on touch devices and under reduced motion. */
export default function CursorGlow() {
  const isTouch = useIsTouch();
  const reducedMotion = usePrefersReducedMotion();
  const x = useSpring(useMotionValue(-GLOW_SIZE), SPRING);
  const y = useSpring(useMotionValue(-GLOW_SIZE), SPRING);
  const enabled = !isTouch && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX - GLOW_SIZE / 2);
      y.set(e.clientY - GLOW_SIZE / 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 -z-[5] rounded-full"
      style={{
        x,
        y,
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        background: "radial-gradient(circle, rgba(79,209,255,0.07) 0%, rgba(79,209,255,0) 65%)",
      }}
    />
  );
}
