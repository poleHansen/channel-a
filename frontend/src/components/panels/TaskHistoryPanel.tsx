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
  const setCurrentTask = useTaskStore((state) => state.setCurrentTask);
  const setTaskHistory = useTaskStore((state) => state.setTaskHistory);
  const taskHistory = useTaskStore((state) => state.taskHistory);
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
    <section className="mt-5 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.35)] p-4">
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
          <button
            aria-label={`Open project saved ${formatHistoryTimestamp(task.updatedAt)}`}
            className={`w-full rounded-[20px] border p-2 text-left transition ${
              currentTaskId === task.taskId
                ? "border-[var(--text)] bg-white/75 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                : "border-[var(--border)] bg-white/45 hover:bg-white/70"
            }`}
            key={task.taskId}
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
              <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-[var(--muted)]">
                {task.status === "ready" ? "Saved" : "Draft"}
              </span>
            </div>
          </button>
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
