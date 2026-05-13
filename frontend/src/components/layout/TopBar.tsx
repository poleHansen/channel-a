export function TopBar() {
  return (
    <header className="flex min-h-[var(--topbar-height)] items-center justify-between px-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
          Offline editor
        </p>
        <h1 className="text-2xl font-semibold">Warm Cutout Studio</h1>
      </div>
      <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white">
        Auto Cutout
      </button>
    </header>
  );
}
