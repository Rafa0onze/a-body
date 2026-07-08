import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GH Pages usa subpath /a-body/; Vercel usa raiz
const base = process.env.GITHUB_PAGES ? "/a-body/" : "/";

export default defineConfig({
  plugins: [react()],
  base,
  build: { outDir: "dist" },
});
