import { ExportPanel } from "../panels/ExportPanel";

export function RightPanel() {
  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 lg:flex lg:min-h-0 lg:flex-col">
      <div className="shrink-0">
        <p className="mt-2 text-sm text-[var(--muted)]">
          Configure RGB or RGBA output and background settings.
        </p>
      </div>
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-24">
        <ExportPanel />
      </div>
    </aside>
  );
}
