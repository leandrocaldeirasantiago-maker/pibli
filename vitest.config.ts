import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Os testes importam "@/lib/…" (mesmo alias do tsconfig). Sem isto, quase todos falhariam ao resolver o caminho.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
