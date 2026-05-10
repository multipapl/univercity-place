import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const debugOverridesPath = path.join(rootDirectory, "public", "debug.scene-overrides.json");
const materialSettingsPath = path.join(rootDirectory, "public", "material-settings.json");
const ignoredWritableJsonGlobs = [
  "**/public/debug.scene-overrides.json",
  "**/public/material-settings.json",
];

function ignoreWritableJsonWatch(server) {
  server.watcher.unwatch([debugOverridesPath, materialSettingsPath]);
}

function debugSceneOverridesPlugin() {
  return {
    name: "debug-scene-overrides",
    apply: "serve",
    configureServer(server) {
      ignoreWritableJsonWatch(server);
      server.middlewares.use("/__debug/scene-overrides", async (request, response, next) => {
        if (request.method !== "POST") {
          next();
          return;
        }

        try {
          const body = await new Promise((resolve, reject) => {
            let chunks = "";
            request.setEncoding("utf8");
            request.on("data", (chunk) => {
              chunks += chunk;
            });
            request.on("end", () => resolve(chunks));
            request.on("error", reject);
          });
          const payload = JSON.parse(body || "{}");
          const serialized = `${JSON.stringify(payload, null, 2)}\n`;

          await mkdir(path.dirname(debugOverridesPath), { recursive: true });
          await writeFile(debugOverridesPath, serialized, "utf8");

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({
            ok: true,
            path: "public/debug.scene-overrides.json",
          }));
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown save error.",
          }));
        }
      });
    },
  };
}

function writableJsonPlugin({ route, filePath, publicPath }) {
  return {
    name: `writable-json:${route}`,
    apply: "serve",
    configureServer(server) {
      ignoreWritableJsonWatch(server);
      server.middlewares.use(route, async (request, response, next) => {
        if (request.method !== "POST") {
          next();
          return;
        }

        try {
          const body = await new Promise((resolve, reject) => {
            let chunks = "";
            request.setEncoding("utf8");
            request.on("data", (chunk) => {
              chunks += chunk;
            });
            request.on("end", () => resolve(chunks));
            request.on("error", reject);
          });
          const payload = JSON.parse(body || "{}");
          const serialized = `${JSON.stringify(payload, null, 2)}\n`;

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, serialized, "utf8");

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({
            ok: true,
            path: publicPath,
          }));
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown save error.",
          }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    basicSsl(),
    debugSceneOverridesPlugin(),
    writableJsonPlugin({
      route: "/__debug/material-settings",
      filePath: materialSettingsPath,
      publicPath: "public/material-settings.json",
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      ignored: ignoredWritableJsonGlobs,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
