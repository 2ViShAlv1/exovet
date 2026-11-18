import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Starfield from "./components/space/Starfield";
import CursorGlow from "./components/ui/CursorGlow";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import PageTransition from "./components/layout/PageTransition";
import { OrbitLoader } from "./components/space/Orbit";
import Landing from "./pages/Landing";

// Landing is in the main bundle for a fast first paint; the other pages load on demand
const Predict = lazy(() => import("./pages/Predict"));
const Results = lazy(() => import("./pages/Results"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

const TITLES: Record<string, string> = {
  "/": "ExoVet · Kepler Signal Classifier",
  "/predict": "Predict · ExoVet",
  "/results": "Results · ExoVet",
  "/about": "About · ExoVet",
};

export default function App() {
  const location = useLocation();

  // New page: scroll to top and update the tab title
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    document.title = TITLES[location.pathname] ?? "Not found · ExoVet";
  }, [location.pathname]);

  return (
    <>
      <Starfield />
      <CursorGlow />
      <Navbar />
      <main id="main" className="pt-nav">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><OrbitLoader label="Loading…" /></div>}>
              <Routes location={location}>
                <Route path="/" element={<Landing />} />
                <Route path="/predict" element={<Predict />} />
                <Route path="/results" element={<Results />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
