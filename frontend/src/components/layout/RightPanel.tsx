import { ExportPanel } from "../panels/ExportPanel";

export function RightPanel() {
  return (
    <aside className="clay-panel rounded-[32px] px-4 py-5 lg:flex lg:min-h-0 lg:flex-col lg:px-5">
      <div className="shrink-0">
        <p className="inline-flex rounded-full bg-white/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Output
        </p>
        <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">Export</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Configure RGB or RGBA output and background settings.
        </p>
      </div>
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-6">
        <ExportPanel />
      </div>
    </aside>
  );
}
