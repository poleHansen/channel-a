import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { App } from "../app/App";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("renders workspace shell sections", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tasks: [] }),
    }),
  );

  render(<App />);

  expect(screen.getByText("Cutout Workspace")).toBeInTheDocument();
  expect(screen.getByText("Materials")).toBeInTheDocument();
  expect(screen.getByText("Export")).toBeInTheDocument();
  expect(await screen.findByText("No saved tasks yet. Upload an image to start a reusable history entry.")).toBeInTheDocument();
});
