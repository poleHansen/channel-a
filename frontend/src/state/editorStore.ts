import { create } from "zustand";

import type { PromptPoint, ToolMode } from "../types/editor";

interface EditorState {
  activeTool: ToolMode;
  promptPoints: PromptPoint[];
  setActiveTool: (tool: ToolMode) => void;
  addPromptPoint: (point: PromptPoint) => void;
  clearPromptPoints: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: "keep-point",
  promptPoints: [],
  setActiveTool: (tool) => set({ activeTool: tool }),
  addPromptPoint: (point) =>
    set((state) => ({ promptPoints: [...state.promptPoints, point] })),
  clearPromptPoints: () => set({ promptPoints: [] }),
}));
