import { ImportPanel } from "../panels/ImportPanel";
import { TaskHistoryPanel } from "../panels/TaskHistoryPanel";

export function LeftPanel() {
  return (
    <aside
      className="clay-panel rounded-[32px] px-4 py-5 lg:flex lg:min-h-0 lg:flex-col lg:px-5"
      data-testid="left-panel"
    >
      <div className="shrink-0">
        <p className="inline-flex rounded-full bg-white/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Materials
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Import source images and browse version history.
        </p>
      </div>
      <div
        className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-6"
        data-testid="left-panel-scroll-body"
      >
        <ImportPanel />
        <TaskHistoryPanel />
      </div>
    </aside>
  );
}
