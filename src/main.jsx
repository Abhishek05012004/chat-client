import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"

// Suppress console messages to keep the console clean in production and dev
if (import.meta.env.PROD || true) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
