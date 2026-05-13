export function FloatingToolBar() {
  return (
    <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <button className="text-sm">Keep</button>
      <button className="text-sm">Remove</button>
      <button className="text-sm">Brush</button>
      <button className="text-sm">Refine</button>
    </div>
  );
}
