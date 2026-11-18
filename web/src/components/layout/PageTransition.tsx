import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { motion as tokens } from "../../design/tokens";
import { usePrefersReducedMotion } from "../../lib/hooks";

/**
 * "Warp" page transition: the outgoing page zooms toward the viewer and blurs, the incoming page
 * settles in from a slight zoom-out. Total under 400 ms; a plain fade under reduced motion.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const half = tokens.pageTransition / 2;
  const variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.97, filter: "blur(8px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 1.04, filter: "blur(10px)" },
      };
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: half, ease: tokens.ease }}
      style={{ transformOrigin: "50% 30vh" }}
    >
      {children}
    </motion.div>
  );
}
