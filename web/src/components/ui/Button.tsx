import { forwardRef, useRef, type ReactNode, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { motion as motionTokens } from "../../design/tokens";
import { useIsTouch, usePrefersReducedMotion } from "../../lib/hooks";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  /** Internal route → renders a router Link */
  to?: string;
  /** External URL → renders an anchor */
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  magnetic?: boolean;
  className?: string;
  ariaLabel?: string;
}

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-pill px-5 py-2.5 text-sm font-medium " +
  "transition-[background-color,box-shadow,color,border-color] duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-cyan text-space-950 hover:shadow-glowCyan hover:bg-cyan-soft",
  secondary: "border border-line-strong bg-space-800/60 text-ink backdrop-blur hover:border-cyan/60 hover:text-cyan-soft",
  ghost: "text-ink-muted hover:text-ink",
};

const SPRING = { stiffness: 260, damping: 18, mass: 0.6 };

/** Pill button. Primary buttons are "magnetic": they lean toward the cursor (not on touch / reduced motion). */
const Button = forwardRef<HTMLDivElement, ButtonProps>(function Button(
  { children, variant = "primary", to, href, onClick, type = "button", disabled, magnetic, className = "", ariaLabel },
  _ref,
) {
  const isTouch = useIsTouch();
  const reducedMotion = usePrefersReducedMotion();
  const isMagnetic = (magnetic ?? variant === "primary") && !isTouch && !reducedMotion && !disabled;
  const wrapper = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), SPRING);
  const y = useSpring(useMotionValue(0), SPRING);

  const onMove = (e: MouseEvent) => {
    if (!isMagnetic || !wrapper.current) return;
    const rect = wrapper.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * motionTokens.magneticStrength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * motionTokens.magneticStrength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const classes = `${base} ${variants[variant]} ${className}`;
  let inner: ReactNode;
  if (to) {
    inner = (
      <Link to={to} className={classes} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  } else if (href) {
    inner = (
      <a href={href} className={classes} aria-label={ariaLabel} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  } else {
    inner = (
      <button type={type} onClick={onClick} disabled={disabled} className={classes} aria-label={ariaLabel}>
        {children}
      </button>
    );
  }

  return (
    <motion.div ref={wrapper} className="inline-flex" style={{ x, y }} onMouseMove={onMove} onMouseLeave={onLeave}>
      {inner}
    </motion.div>
  );
});

export default Button;
