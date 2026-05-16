import { create } from "zustand";

import type { AutoSegmentResult, TaskSummary } from "../types/task";

function withCacheBust(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${Date.now()}`;
}

interface TaskState {
  currentTaskId: string | null;
  previewRgbaPath: string | null;
  taskHistory: TaskSummary[];
  clearAutoSegmentResult: () => void;
  setPreviewRgbaPath: (previewRgbaPath: string) => void;
  setTaskHistory: (taskHistory: TaskSummary[]) => void;
  setCurrentTask: (task: AutoSegmentResult) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  currentTaskId: null,
  previewRgbaPath: null,
  taskHistory: [],
  clearAutoSegmentResult: () =>
    set({
      currentTaskId: null,
      previewRgbaPath: null,
    }),
  setPreviewRgbaPath: (previewRgbaPath) => set({ previewRgbaPath }),
  setTaskHistory: (taskHistory) => set({ taskHistory }),
  setCurrentTask: (task) =>
    set((state) => {
      const summary: TaskSummary = {
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
        currentTaskId: task.taskId,
        previewRgbaPath: withCacheBust(task.previewRgbaPath),
        taskHistory: nextHistory,
      };
    }),
}));
