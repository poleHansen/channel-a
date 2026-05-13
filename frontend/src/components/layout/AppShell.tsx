import { EditorCanvas } from "../canvas/EditorCanvas";
import { FloatingToolBar } from "./FloatingToolBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <TopBar />
      <section className="grid min-h-[calc(100vh-88px)] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr_320px]">
        <LeftPanel />
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6">
          <h2 className="mb-4 text-xl font-semibold">Cutout Workspace</h2>
          <EditorCanvas />
        </div>
        <RightPanel />
      </section>
      <FloatingToolBar />
    </main>
  );
}
