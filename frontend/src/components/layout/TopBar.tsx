import { useState } from "react";

import { autoSegmentExistingTask } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";

export function TopBar() {
  const clearDraftStroke = useEditorStore((state) => state.clearDraftStroke);
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
      clearDraftStroke();
      clearPromptPoints();
      setCurrentTask(task);
    } finally {
      setIsAutoCuttingOut(false);
    }
  }

  return (
    <header className="clay-panel rounded-[36px] px-5 py-3 sm:px-6">
      <div className="flex min-h-[var(--topbar-height)] flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="inline-flex rounded-full bg-white/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Offline editor
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-[2rem]">
            Warm Cutout Studio
          </h1>
        </div>
        <button
          className="clay-button clay-button-accent rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!currentTaskId || isAutoCuttingOut}
          onClick={() => void handleAutoCutout()}
          type="button"
        >
          {isAutoCuttingOut ? "Auto..." : "Auto Cutout"}
        </button>
      </div>
    </header>
  );
}
