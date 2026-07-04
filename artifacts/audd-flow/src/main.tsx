import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// When the frontend is hosted separately from the API (e.g. Vercel frontend +
// Render backend), point every relative `/api/...` request at the deployed
// backend via VITE_API_URL. When unset (same-origin, incl. Replit dev), the
// client keeps making relative same-origin requests.
const apiBaseUrl = import.meta.env.VITE_API_URL;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
