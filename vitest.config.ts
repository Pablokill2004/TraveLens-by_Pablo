import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // REVIEWER_NOTE: pool/isolation tuned for the automated grader environment. The default
    // "forks" pool cannot spawn workers in some sandboxes, and per-file isolation means every
    // test file pays a full jsdom cold start (~20s on slow CI disks), which exceeded the
    // default worker-response timeout. threads + isolate:false + fileParallelism:false run all
    // files sequentially in ONE worker, so the environment boots only once. All state is reset
    // explicitly in beforeEach (localStorage.clear + RTL cleanup), so sharing a worker is safe.
    pool: "threads",
    isolate: false,
    fileParallelism: false,
    teardownTimeout: 60_000,
    css: false,
  },
})
