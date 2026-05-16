import { ImportPanel } from "../panels/ImportPanel";
import { TaskHistoryPanel } from "../panels/TaskHistoryPanel";

export function LeftPanel() {
  return (
    <aside
      className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 lg:flex lg:min-h-0 lg:flex-col"
      data-testid="left-panel"
    >
      <div className="shrink-0">
        <h2 className="text-lg font-medium">Materials</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Import source images and browse version history.
        </p>
      </div>
      <div
        className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-24"
        data-testid="left-panel-scroll-body"
      >
        <ImportPanel />
        <TaskHistoryPanel />
      </div>
    </aside>
  );
}
