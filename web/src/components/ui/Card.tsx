import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Glass panels are for primary surfaces only; plain cards use a quieter fill */
  glass?: boolean;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddings = { sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

export default function Card({ children, glass = true, hover = false, padding = "md", className = "", ...rest }: CardProps) {
  const surface = glass ? "glass" : "rounded-lg border border-line bg-space-900/80";
  return (
    <div className={`${surface} ${hover ? "glass-hover" : ""} ${paddings[padding]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
