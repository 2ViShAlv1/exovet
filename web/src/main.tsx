import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";

// Self-hosted variable fonts (no third-party font requests)
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles/index.css";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* reducedMotion="user": Framer Motion honours the OS setting for every animation */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
