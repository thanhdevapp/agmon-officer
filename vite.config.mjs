import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromRoot = createRequire(import.meta.url);
const solidJsEntry = path.resolve(path.dirname(requireFromRoot.resolve("solid-js")), "solid.js");
const solidJsStoreEntry = path.resolve(path.dirname(requireFromRoot.resolve("solid-js/store")), "store.js");
const src = (p) => path.resolve(__dirname, "src", p);

export default defineConfig({
  root: __dirname,
  base: "./",
  publicDir: "public",
  define: {
    __AGMON_APP_VERSION__: JSON.stringify("plugin"),
  },
  resolve: {
    alias: [
      { find: "@/components/ui", replacement: src("components/ui/index.js") },
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "react/jsx-runtime", replacement: src("lib/solidDomJsx.js") },
      { find: "react/jsx-dev-runtime", replacement: src("lib/solidDomJsx.js") },
      { find: "react-dom/client", replacement: src("lib/solidDomRuntime.js") },
      { find: "react-dom", replacement: src("lib/solidDomRuntime.js") },
      { find: "react", replacement: src("lib/solidDomRuntime.js") },
      { find: "lucide-react", replacement: src("lib/solidIcons.js") },
      { find: "lucide-solid", replacement: src("lib/solidIcons.js") },
      { find: "@radix-ui/react-popover", replacement: src("components/ui/PopoverCompat.jsx") },
      { find: "solid-js/store", replacement: solidJsStoreEntry },
      { find: "solid-js", replacement: solidJsEntry },
    ],
    extensions: [".mjs", ".js", ".jsx", ".json"],
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
    jsx: "automatic",
  },
  build: {
    outDir: "plugin",
    emptyOutDir: true,
    sourcemap: false,
    target: "esnext",
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
});
