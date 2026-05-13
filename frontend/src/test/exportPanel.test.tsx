import { render, screen } from "@testing-library/react";

import { ExportPanel } from "../components/panels/ExportPanel";

test("renders export format controls", () => {
  render(<ExportPanel />);

  expect(screen.getByRole("button", { name: "RGBA PNG" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "RGB JPG" })).toBeDisabled();
});
