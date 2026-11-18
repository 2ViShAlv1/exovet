/**
 * Lightweight planet for phones, reduced motion and as the loading placeholder for the WebGL one.
 * Pure CSS gradients: no JavaScript, no GPU work beyond compositing.
 */
export default function PlanetLite({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden="true">
      {/* Ring (back half) */}
      <div className="absolute left-1/2 top-1/2 h-[30%] w-[118%] -translate-x-1/2 -translate-y-1/2 -rotate-[16deg] rounded-[50%] border-[3px] border-amber-soft/30" />
      {/* Atmosphere glow */}
      <div className="absolute inset-[14%] rounded-full bg-cyan/25 blur-2xl" />
      {/* Planet body */}
      <div
        className="absolute inset-[18%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 30%, #7FD6E8 0%, #1E5C8A 32%, #0B2A4A 62%, #05060A 88%)," +
            "repeating-linear-gradient(170deg, rgba(255,255,255,0.05) 0 6px, transparent 6px 15px)",
          backgroundBlendMode: "overlay",
          boxShadow: "inset -18px -14px 40px rgba(5,6,10,0.9), 0 0 60px -10px rgba(79,209,255,0.45)",
        }}
      />
      {/* Ring (front half): clipped to the lower part so it passes in front of the planet */}
      <div
        className="absolute left-1/2 top-1/2 h-[30%] w-[118%] -translate-x-1/2 -translate-y-1/2 -rotate-[16deg] rounded-[50%] border-[3px] border-amber-soft/50"
        style={{ clipPath: "inset(50% 0 0 0)" }}
      />
      {/* Moon */}
      <div className="absolute right-[6%] top-[22%] h-[5%] w-[5%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#E8ECF6,#7A8299)]" />
    </div>
  );
}
