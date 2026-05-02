import "./style.css";

import { createViewerApp } from "./viewer/createViewerApp.js";

function renderInitializationError(error) {
  console.error("Viewer initialization failed.", error);

  const errorMessage = error instanceof Error
    ? error.message
    : "Unexpected startup error.";
  const shell = document.createElement("div");
  shell.style.cssText = "min-height:100vh;display:grid;place-items:center;padding:24px;background:#050816;color:#e2e8f0;font-family:system-ui,sans-serif;";

  const card = document.createElement("div");
  card.style.cssText = "max-width:560px;padding:24px;border:1px solid rgba(148,163,184,0.3);border-radius:20px;background:rgba(15,23,42,0.9);box-shadow:0 20px 60px rgba(0,0,0,0.35);";

  const title = document.createElement("h1");
  title.textContent = "Viewer failed to start";
  title.style.cssText = "margin:0 0 12px;font-size:1.5rem;";

  const body = document.createElement("p");
  body.textContent = `${errorMessage} Check the browser console for technical details.`;
  body.style.cssText = "margin:0;line-height:1.6;color:#cbd5e1;";

  card.append(title, body);
  shell.append(card);

  const app = document.querySelector("#app");
  if (app) {
    app.replaceChildren(shell);
    return;
  }

  document.body.replaceChildren(shell);
}

const viewerApp = createViewerApp({
  app: document.querySelector("#app"),
});

function disposeViewerApp() {
  viewerApp.dispose();
}

viewerApp.init().catch((error) => {
  disposeViewerApp();
  renderInitializationError(error);
});

window.addEventListener("beforeunload", disposeViewerApp, { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeViewerApp();
  });
}
