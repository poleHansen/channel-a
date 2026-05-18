import { create } from "zustand";

import type { BrushPoint, BrushStroke, PromptPoint, ToolMode } from "../types/editor";

interface EditorState {
  activeTool: ToolMode;
  brushSize: number;
  draftStroke: BrushStroke | null;
  isApplyingBrush: boolean;
  isDrawing: boolean;
  promptPoints: PromptPoint[];
  setActiveTool: (tool: ToolMode) => void;
  setBrushSize: (size: number) => void;
  setDraftStroke: (stroke: BrushStroke | null) => void;
  appendDraftPoint: (point: BrushPoint) => void;
  clearDraftStroke: () => void;
  setIsApplyingBrush: (value: boolean) => void;
  setIsDrawing: (value: boolean) => void;
  addPromptPoint: (point: PromptPoint) => void;
  clearPromptPoints: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: "keep-point",
  brushSize: 36,
  draftStroke: null,
  isApplyingBrush: false,
  isDrawing: false,
  promptPoints: [],
  setActiveTool: (tool) => set({ activeTool: tool }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setDraftStroke: (draftStroke) => set({ draftStroke }),
  appendDraftPoint: (point) =>
    set((state) => {
      if (!state.draftStroke) {
        return state;
      }

      return {
        draftStroke: {
          ...state.draftStroke,
          points: [...state.draftStroke.points, point],
        },
      };
    }),
  clearDraftStroke: () => set({ draftStroke: null, isDrawing: false }),
  setIsApplyingBrush: (isApplyingBrush) => set({ isApplyingBrush }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  addPromptPoint: (point) =>
    set((state) => ({ promptPoints: [...state.promptPoints, point] })),
  clearPromptPoints: () => set({ promptPoints: [] }),
}));
