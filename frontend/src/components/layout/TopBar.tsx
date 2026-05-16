import { useState } from "react";

import { autoSegmentExistingTask } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";

export function TopBar() {
  const clearPromptPoints = useEditorStore((state) => state.clearPromptPoints);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const setCurrentTask = useTaskStore((state) => state.setCurrentTask);
  const [isAutoCuttingOut, setIsAutoCuttingOut] = useState(false);

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

  return (
    <header className="flex min-h-[var(--topbar-height)] items-center justify-between px-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
          Offline editor
        </p>
        <h1 className="text-2xl font-semibold">Warm Cutout Studio</h1>
      </div>
      <button
        className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!currentTaskId || isAutoCuttingOut}
        onClick={() => void handleAutoCutout()}
        type="button"
      >
        {isAutoCuttingOut ? "Auto..." : "Auto Cutout"}
      </button>
    </header>
  );
}
