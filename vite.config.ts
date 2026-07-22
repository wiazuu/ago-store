import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart({ server: { entry: "server" }, importProtection: { behavior: "error" } }),
    nitro({
      preset: "node-server",
      noExternals: true,
      rolldownConfig: { external: ["@node-rs/argon2", /^@node-rs\/argon2-/] },
    }),
    viteReact(),
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: ["localhost", "127.0.0.1", "agogf.com.br", "www.agogf.com.br", ".ngrok-free.app"],
  },
});
