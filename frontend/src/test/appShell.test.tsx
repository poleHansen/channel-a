import { render, screen } from "@testing-library/react";

import { App } from "../app/App";

test("renders workspace shell sections", () => {
  render(<App />);

  expect(screen.getByText("Cutout Workspace")).toBeInTheDocument();
  expect(screen.getByText("Materials")).toBeInTheDocument();
  expect(screen.getByText("Export")).toBeInTheDocument();
});
