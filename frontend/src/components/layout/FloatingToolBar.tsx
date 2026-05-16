import { autoSegmentExistingTask, redoTaskEdit, undoTaskEdit } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";
import { useState } from "react";

export function FloatingToolBar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const canRedo = useTaskStore((state) => state.canRedo);
  const canUndo = useTaskStore((state) => state.canUndo);
  const clearPromptPoints = useEditorStore((state) => state.clearPromptPoints);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const setCurrentTask = useTaskStore((state) => state.setCurrentTask);
  const hasTask = currentTaskId !== null;
  const [isAutoCuttingOut, setIsAutoCuttingOut] = useState(false);

  const toolButtons = [
    { key: "keep-point", label: "Keep" },
    { key: "remove-point", label: "Remove" },
    { key: "box", label: "Box" },
  ] as const;

  async function handleAutoCutout() {
    if (!currentTaskId || isAutoCuttingOut) {
      return;
    }

    setIsAutoCuttingOut(true);
    try {
      const task = await autoSegmentExistingTask(currentTaskId);
      clearPromptPoints();
      setCurrentTask(task);
    } finally {
      setIsAutoCuttingOut(false);
    }
  }

  async function handleUndo() {
    if (!currentTaskId || !canUndo || isAutoCuttingOut) {
      return;
    }

    setIsAutoCuttingOut(true);
    try {
      const task = await undoTaskEdit(currentTaskId);
      clearPromptPoints();
      setCurrentTask(task);
    } finally {
      setIsAutoCuttingOut(false);
    }
  }

  async function handleRedo() {
    if (!currentTaskId || !canRedo || isAutoCuttingOut) {
      return;
    }

    setIsAutoCuttingOut(true);
    try {
      const task = await redoTaskEdit(currentTaskId);
      clearPromptPoints();
      setCurrentTask(task);
    } finally {
      setIsAutoCuttingOut(false);
    }
  }

  return (
    <div
      className="clay-toolbar fixed bottom-5 left-1/2 z-30 flex w-[min(calc(100%-1.5rem),760px)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-[999px] px-3 py-3 sm:gap-3 sm:px-4 lg:static lg:bottom-auto lg:left-auto lg:z-10 lg:mt-4 lg:w-full lg:max-w-full lg:translate-x-0"
      data-testid="floating-toolbar"
    >
      <button
        className="clay-tool-button clay-button rounded-full px-3 py-2 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || isAutoCuttingOut}
        onClick={() => void handleAutoCutout()}
        type="button"
      >
        {isAutoCuttingOut ? "Auto..." : "Auto Cutout"}
      </button>
      <button
        className="clay-tool-button clay-button rounded-full px-3 py-2 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || !canUndo || isAutoCuttingOut}
        onClick={() => void handleUndo()}
        type="button"
      >
        Undo
      </button>
      <button
        className="clay-tool-button clay-button rounded-full px-3 py-2 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || !canRedo || isAutoCuttingOut}
        onClick={() => void handleRedo()}
        type="button"
      >
        Redo
      </button>
      {toolButtons.map((tool) => (
        <button
          className={`clay-tool-button clay-button rounded-full px-3 py-2 text-sm font-medium ${
            activeTool === tool.key
              ? "border-[rgba(153,110,80,0.32)] bg-[linear-gradient(180deg,#c59b7c,#b48463)] text-white shadow-[inset_0_4px_8px_rgba(255,255,255,0.25),inset_0_-8px_14px_rgba(102,68,42,0.22)]"
              : "text-[var(--text)]"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          disabled={!hasTask}
          key={tool.key}
          onClick={() => setActiveTool(tool.key)}
          type="button"
        >
          {tool.label}
        </button>
      ))}
      <button
        className="clay-tool-button clay-button rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || isAutoCuttingOut}
        onClick={clearPromptPoints}
        type="button"
      >
        Clear
      </button>
    </div>
  );
}
