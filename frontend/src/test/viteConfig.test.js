import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Vite dev server proxy", () => {
  test("proxies backend output assets during local preview", () => {
    const viteConfig = readFileSync(resolve(__dirname, "../../vite.config.ts"), "utf8");

    expect(viteConfig).toContain('"/outputs"');
    expect(viteConfig).toContain('target: "http://127.0.0.1:8000"');
    expect(viteConfig).toContain("changeOrigin: true");
  });
});
