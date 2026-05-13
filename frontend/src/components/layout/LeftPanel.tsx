import { ImportPanel } from "../panels/ImportPanel";

export function LeftPanel() {
  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5">
      <h2 className="text-lg font-medium">Materials</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Import source images and browse version history.
      </p>
      <ImportPanel />
    </aside>
  );
}
