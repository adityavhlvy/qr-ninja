import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DamageLab } from "./ui/DamageLab";
import "./styles.css";

// Two pages, one bundle. A router would be more code than the split needs.
const isDamageLab = /\/damage\/?$/.test(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isDamageLab ? <DamageLab /> : <App />}</StrictMode>,
);
