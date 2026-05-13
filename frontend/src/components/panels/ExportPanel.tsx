export function ExportPanel() {
  return (
    <section className="mt-5 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.35)] p-4">
      <h3 className="text-sm font-semibold">Export</h3>
      <div className="mt-3 flex gap-3">
        <button
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled
          type="button"
        >
          RGBA PNG
        </button>
        <button
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled
          type="button"
        >
          RGB JPG
        </button>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Export actions will unlock after backend invocation is wired.
      </p>
    </section>
  );
}
