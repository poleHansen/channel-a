import { beforeEach, expect, test } from "vitest";

import { useEditorStore } from "../state/editorStore";

beforeEach(() => {
  useEditorStore.setState({
    activeTool: "keep-point",
    promptPoints: [],
  });
});

test("editor store updates the active tool and accumulates prompt points", () => {
  useEditorStore.getState().setActiveTool("brush-add");
  useEditorStore.getState().addPromptPoint({
    x: 24,
    y: 12,
    type: "positive",
  });

  expect(useEditorStore.getState().activeTool).toBe("brush-add");
  expect(useEditorStore.getState().promptPoints).toEqual([
    { x: 24, y: 12, type: "positive" },
  ]);
});
