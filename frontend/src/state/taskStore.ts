import { create } from "zustand";

interface TaskState {
  currentTaskId: string | null;
  previewRgbaPath: string | null;
  clearAutoSegmentResult: () => void;
  setAutoSegmentResult: (payload: {
    taskId: string;
    previewRgbaPath: string;
  }) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  currentTaskId: null,
  previewRgbaPath: null,
  clearAutoSegmentResult: () =>
    set({
      currentTaskId: null,
      previewRgbaPath: null,
    }),
  setAutoSegmentResult: ({ taskId, previewRgbaPath }) =>
    set({
      currentTaskId: taskId,
      previewRgbaPath,
    }),
}));
