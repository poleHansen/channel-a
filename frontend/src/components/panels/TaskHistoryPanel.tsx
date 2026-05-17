import { useEffect, useState } from "react";

import { getTask, listTasks } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";

function formatHistoryTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Recently saved";
  }

  return timestamp.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TaskHistoryPanel() {
  const clearPromptPoints = useEditorStore((state) => state.clearPromptPoints);
  const currentTaskId = useTaskStore((state) => state.currentTaskId);
  const selectedTaskIds = useTaskStore((state) => state.selectedTaskIds);
  const setCurrentTask = useTaskStore((state) => state.setCurrentTask);
  const setTaskHistory = useTaskStore((state) => state.setTaskHistory);
  const taskHistory = useTaskStore((state) => state.taskHistory);
  const toggleSelectedTask = useTaskStore((state) => state.toggleSelectedTask);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const tasks = await listTasks();
        if (isMounted) {
          setTaskHistory(tasks);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Task history failed to load.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isMounted = false;
    };
  }, [setTaskHistory]);

  async function handleOpenTask(taskId: string) {
    setErrorMessage(null);
    try {
      const task = await getTask(taskId);
      clearPromptPoints();
      setCurrentTask(task);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Task failed to load.");
    }
  }

  return (
    <section className="clay-card mt-5 rounded-[28px] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">History</h3>
        {isLoading ? <span className="text-xs text-[var(--muted)]">Loading...</span> : null}
      </div>
      {taskHistory.length === 0 && !isLoading ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          No saved projects yet. Upload an image to create a reusable history thumbnail.
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-3">
        {taskHistory.map((task) => (
          <div
            className={`w-full rounded-[24px] border p-2 transition ${
              currentTaskId === task.taskId
                ? "border-[var(--border-strong)] bg-white/70 shadow-[0_18px_36px_rgba(122,96,71,0.12),inset_0_6px_12px_rgba(255,255,255,0.86)]"
                : "border-[var(--border)] bg-white/46 hover:-translate-y-[1px] hover:bg-white/64"
            }`}
            key={task.taskId}
          >
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                <input
                  aria-label={`Select project saved ${formatHistoryTimestamp(task.updatedAt)}`}
                  checked={selectedTaskIds.includes(task.taskId)}
                  className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--accent-soft)] focus:ring-[var(--text)]"
                  onChange={() => toggleSelectedTask(task.taskId)}
                  type="checkbox"
                />
                Select
              </label>
              <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-[var(--muted)]">
                {task.status === "ready" ? "Saved" : "Draft"}
              </span>
            </div>
            <button
              aria-label={`Open project saved ${formatHistoryTimestamp(task.updatedAt)}`}
              className="w-full text-left"
              onClick={() => void handleOpenTask(task.taskId)}
              type="button"
            >
              <div className="overflow-hidden rounded-[16px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(231,236,241,0.85))]">
                <img
                  alt={`Project preview ${formatHistoryTimestamp(task.updatedAt)}`}
                  className="aspect-[4/3] w-full object-cover"
                  src={task.previewRgbaPath}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {task.mode === "auto" ? "Auto" : "Manual"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">
                    {formatHistoryTimestamp(task.updatedAt)}
                  </p>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
      {errorMessage ? (
        <p aria-live="assertive" className="mt-3 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
