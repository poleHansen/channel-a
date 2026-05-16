import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";

export function FloatingToolBar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const clearPromptPoints = useEditorStore((state) => state.clearPromptPoints);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const hasTask = currentTaskId !== null;

  const toolButtons = [
    { key: "keep-point", label: "Keep" },
    { key: "remove-point", label: "Remove" },
    { key: "box", label: "Box" },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3">
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
        disabled={!hasTask}
        onClick={clearPromptPoints}
        type="button"
      >
        Clear
      </button>
    </div>
  );
}
