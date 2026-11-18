import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
}

export default function SectionHeading({ eyebrow, title, children, align = "left", as = "h2" }: SectionHeadingProps) {
  const Tag = as;
  const alignment = align === "center" ? "mx-auto text-center" : "";
  return (
    <Reveal className={`max-w-2xl ${alignment}`}>
      <p className="eyebrow">{eyebrow}</p>
      <Tag className={`mt-3 text-balance font-display font-semibold ${as === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>
        {title}
      </Tag>
      {children && <div className="mt-4 text-base leading-relaxed text-ink-muted">{children}</div>}
    </Reveal>
  );
}
