import { create } from "zustand";

import { useEditorStore } from "./editorStore";
import type { AutoSegmentResult, TaskSummary } from "../types/task";

function withCacheBust(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${Date.now()}`;
}

function syncEditorExportSettings(exportSettings?: AutoSegmentResult["exportSettings"]): void {
  useEditorStore.setState({
    exportAspectRatio: exportSettings?.aspectRatio ?? "free",
    exportBox: exportSettings?.cropBox ?? null,
    exportPadding: exportSettings?.paddingPercent ?? 12,
    exportSizeMode: exportSettings?.sizeMode ?? "crop-size",
  });
}

interface TaskState {
  canRedo: boolean;
  canUndo: boolean;
  currentTaskId: string | null;
  previewRgbaPath: string | null;
  selectedTaskIds: string[];
  taskHistory: TaskSummary[];
  clearAutoSegmentResult: () => void;
  clearSelectedTasks: () => void;
  setEditAvailability: (canUndo: boolean, canRedo: boolean) => void;
  setPreviewRgbaPath: (previewRgbaPath: string) => void;
  toggleSelectedTask: (taskId: string) => void;
  setTaskHistory: (taskHistory: TaskSummary[]) => void;
  setCurrentTask: (task: AutoSegmentResult) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  canRedo: false,
  canUndo: false,
  currentTaskId: null,
  previewRgbaPath: null,
  selectedTaskIds: [],
  taskHistory: [],
  clearAutoSegmentResult: () => {
    syncEditorExportSettings();
    set({
      canRedo: false,
      canUndo: false,
      currentTaskId: null,
      previewRgbaPath: null,
    });
  },
  clearSelectedTasks: () => set({ selectedTaskIds: [] }),
  setEditAvailability: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setPreviewRgbaPath: (previewRgbaPath) => set({ previewRgbaPath }),
  toggleSelectedTask: (taskId) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.includes(taskId)
        ? state.selectedTaskIds.filter((item) => item !== taskId)
        : [...state.selectedTaskIds, taskId],
    })),
  setTaskHistory: (taskHistory) => set({ taskHistory }),
  setCurrentTask: (task) => {
    syncEditorExportSettings(task.exportSettings);
    set((state) => {
      const summary: TaskSummary = {
        canRedo: task.canRedo,
        canUndo: task.canUndo,
        createdAt: task.createdAt,
        exportSettings: task.exportSettings,
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
        selectedTaskIds: state.selectedTaskIds.filter((taskId) =>
          nextHistory.some((item) => item.taskId === taskId),
        ),
        taskHistory: nextHistory,
      };
    });
  },
}));
