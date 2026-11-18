import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { motion as tokens } from "../../design/tokens";

/** Scroll-triggered reveal: fade in with a slight upward drift. Framer skips motion under reduced motion. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: tokens.revealDistance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: tokens.revealDuration, ease: tokens.ease, delay }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: tokens.staggerChildren } },
};
const item: Variants = {
  hidden: { opacity: 0, y: tokens.revealDistance },
  show: { opacity: 1, y: 0, transition: { duration: tokens.revealDuration, ease: tokens.ease } },
};

/** Staggered group: wrap children in <StaggerItem>. */
export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
