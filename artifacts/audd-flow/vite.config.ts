import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ command }) => {
  const isServe = command === "serve";
  const rawPort = process.env.PORT;
  const basePath = process.env.BASE_PATH;

  // The Replit dev/preview server relies on PORT and BASE_PATH being injected
  // by the workflow, so enforce them when actually running a server. During an
  // external production build (e.g. Vercel), they are optional: BASE_PATH
  // defaults to "/" and PORT is irrelevant, so the build never throws.
  if (isServe) {
    if (!rawPort) {
      throw new Error(
        "PORT environment variable is required but was not provided.",
      );
    }
    if (!basePath) {
      throw new Error(
        "BASE_PATH environment variable is required but was not provided.",
      );
    }
    const port = Number(rawPort);
    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
  }

  const parsedPort = Number(rawPort);
  const serverPort =
    Number.isNaN(parsedPort) || parsedPort <= 0 ? 5173 : parsedPort;

  return {
    base: basePath ?? "/",
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: serverPort,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port: serverPort,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
