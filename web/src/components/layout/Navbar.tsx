import { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/predict", label: "Predict" },
  { to: "/results", label: "Results" },
  { to: "/about", label: "About" },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="ExoVet home">
      <span aria-hidden="true" className="relative grid h-8 w-8 place-items-center">
        <span className="absolute inset-0 rotate-[-18deg] rounded-[50%] border border-amber/70 [transform:rotate(-18deg)_scaleY(0.38)]" />
        <span className="h-4 w-4 rounded-full bg-gradient-to-br from-cyan-soft to-cyan-deep shadow-glowCyan" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">ExoVet</span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative rounded-pill px-3.5 py-1.5 text-sm transition-colors ${isActive ? "text-ink" : "text-ink-muted hover:text-ink"}`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 h-nav transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled ? "border-b border-line bg-space-950/70 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-cyan focus:px-3 focus:py-2 focus:text-space-950">
        Skip to content
      </a>
      <nav className="container-page flex h-full items-center justify-between" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === "/"} className={linkClass}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-pill border border-line-strong bg-space-800/70" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                    )}
                    {link.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <Link to="/predict" className="rounded-pill border border-cyan/50 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-cyan-soft transition-colors hover:bg-cyan/10">
            Run model
          </Link>
        </div>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md border border-line md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-3 w-5" aria-hidden="true">
            <span className={`absolute left-0 top-0 h-px w-5 bg-ink transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`} />
            <span className={`absolute bottom-0 left-0 h-px w-5 bg-ink transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
          </span>
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="glass mx-4 mt-1 flex flex-col p-2 md:hidden"
          >
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.to === "/"} className={({ isActive }) => `block rounded-md px-4 py-3 text-base ${isActive ? "bg-space-800 text-ink" : "text-ink-muted"}`}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
