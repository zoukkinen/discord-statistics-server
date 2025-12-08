/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import "./styles/global.css";

const root = document.getElementById("root");

const isDev = (import.meta as any).env?.DEV;

if (isDev && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(() => <App />, root!);

// Register service worker in production only
if ("serviceWorker" in navigator && !isDev) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        // Service worker registered successfully
      })
      .catch((registrationError) => {
        console.error("SW registration failed: ", registrationError);
      });
  });
}
