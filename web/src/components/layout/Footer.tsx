import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-4 py-8 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-display text-ink">ExoVet</span> · Machine Learning (CSE2032) · BML Munjal University
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link to="/predict" className="hover:text-ink">Predict</Link>
          <Link to="/results" className="hover:text-ink">Results</Link>
          <Link to="/about" className="hover:text-ink">About</Link>
        </nav>
        <p className="font-mono text-xs">Data: NASA Kepler KOI table</p>
      </div>
    </footer>
  );
}
