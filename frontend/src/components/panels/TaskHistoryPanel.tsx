import { useEffect, useState } from "react";

import { getTask, listTasks } from "../../lib/api/client";
import { useEditorStore } from "../../state/editorStore";
import { useTaskStore } from "../../state/taskStore";

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
          No saved tasks yet. Upload an image to start a reusable history entry.
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {taskHistory.map((task) => (
          <button
            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition ${
              currentTaskId === task.taskId
                ? "border-[var(--text)] bg-white/70"
                : "border-[var(--border)] hover:bg-white/60"
            }`}
            key={task.taskId}
            onClick={() => void handleOpenTask(task.taskId)}
            type="button"
          >
            <span className="text-sm font-medium">{task.taskId}</span>
            <span className="text-xs text-[var(--muted)]">
              {task.mode === "auto" ? "Auto" : "Manual"}
            </span>
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
