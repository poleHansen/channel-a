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
    <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <button
        className="rounded-full px-3 py-1 text-sm text-[var(--text)] transition disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || isAutoCuttingOut}
        onClick={() => void handleAutoCutout()}
        type="button"
        >
          {isAutoCuttingOut ? "Auto..." : "Auto Cutout"}
        </button>
      <button
        className="rounded-full px-3 py-1 text-sm text-[var(--text)] transition disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || !canUndo || isAutoCuttingOut}
        onClick={() => void handleUndo()}
        type="button"
      >
        Undo
      </button>
      <button
        className="rounded-full px-3 py-1 text-sm text-[var(--text)] transition disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || !canRedo || isAutoCuttingOut}
        onClick={() => void handleRedo()}
        type="button"
      >
        Redo
      </button>
      {toolButtons.map((tool) => (
        <button
          className={`rounded-full px-3 py-1 text-sm transition ${
            activeTool === tool.key
              ? "bg-[var(--text)] text-[var(--panel)]"
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
        className="rounded-full px-3 py-1 text-sm text-[var(--muted)] transition disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasTask || isAutoCuttingOut}
        onClick={clearPromptPoints}
        type="button"
      >
        Clear
      </button>
    </div>
  );
}
