import { create } from "zustand";

import type { AutoSegmentResult, TaskSummary } from "../types/task";

function withCacheBust(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${Date.now()}`;
}

interface TaskState {
  canRedo: boolean;
  canUndo: boolean;
  currentTaskId: string | null;
  previewRgbaPath: string | null;
  taskHistory: TaskSummary[];
  clearAutoSegmentResult: () => void;
  setEditAvailability: (canUndo: boolean, canRedo: boolean) => void;
  setPreviewRgbaPath: (previewRgbaPath: string) => void;
  setTaskHistory: (taskHistory: TaskSummary[]) => void;
  setCurrentTask: (task: AutoSegmentResult) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  canRedo: false,
  canUndo: false,
  currentTaskId: null,
  previewRgbaPath: null,
  taskHistory: [],
  clearAutoSegmentResult: () =>
    set({
      canRedo: false,
      canUndo: false,
      currentTaskId: null,
      previewRgbaPath: null,
    }),
  setEditAvailability: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setPreviewRgbaPath: (previewRgbaPath) => set({ previewRgbaPath }),
  setTaskHistory: (taskHistory) => set({ taskHistory }),
  setCurrentTask: (task) =>
    set((state) => {
      const summary: TaskSummary = {
        canRedo: task.canRedo,
        canUndo: task.canUndo,
        createdAt: task.createdAt,
        mode: task.mode,
        previewRgbaPath: task.previewRgbaPath,
        status: task.status,
        taskId: task.taskId,
        updatedAt: task.updatedAt,
      };
      const nextHistory = [
        summary,
        ...state.taskHistory.filter((item) => item.taskId !== task.taskId),
      ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

      return {
        canRedo: task.canRedo,
        canUndo: task.canUndo,
        currentTaskId: task.taskId,
        previewRgbaPath: withCacheBust(task.previewRgbaPath),
        taskHistory: nextHistory,
      };
    }),
}));
