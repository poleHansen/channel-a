import { ExportPanel } from "../panels/ExportPanel";

export function RightPanel() {
  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5">
      <p className="mt-2 text-sm text-[var(--muted)]">
        Configure RGB or RGBA output and background settings.
      </p>
      <ExportPanel />
    </aside>
  );
}
